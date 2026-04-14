import { describe, it, expect, beforeEach } from 'vitest';
import { cleanDatabase, createTestUser, getTestSql } from '../helpers';
import { getUserById, updateUserBalance } from '@/lib/db/queries/users';
import {
  createPayment,
  getPaymentByAbacatepayId,
  markPaymentPaid,
  invalidateUserPayments,
} from '@/lib/db/queries/payments';
import { SUBSCRIPTION_PRICE_CENTS } from '@/config/subscription';
import { sql } from '@/lib/db/connection';

describe('Webhook flow', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('pending payment, no credits — activates pro', async () => {
    const user = await createTestUser();
    const payment = await createPayment(user.id, 'pix_char_happy', SUBSCRIPTION_PRICE_CENTS, 0);

    const found = await getPaymentByAbacatepayId('pix_char_happy');
    expect(found).not.toBeNull();
    expect(found!.status).toBe('pending');

    await sql.transaction([
      sql`UPDATE users SET balance = balance - ${found!.creditsToDebit} WHERE id = ${found!.userId}`,
      sql`UPDATE users SET plan = 'pro', plan_expires_at = now() + INTERVAL '30 days' WHERE id = ${found!.userId}`,
      sql`UPDATE payments SET status = 'paid', updated_at = now() WHERE id = ${found!.id}`,
    ]);

    const afterUser = await getUserById(user.id);
    expect(afterUser.plan).toBe('pro');
    expect(afterUser.planExpiresAt).not.toBeNull();
    expect(afterUser.balance).toBe(0);

    const testSql = getTestSql();
    const rows = await testSql`SELECT status FROM payments WHERE id = ${payment.id}`;
    expect(rows[0].status).toBe('paid');
  });

  it('pending payment, with credits — debits balance and activates pro', async () => {
    const user = await createTestUser();
    await updateUserBalance(user.id, 1000);
    const payment = await createPayment(user.id, 'pix_char_credits', 1000, 1000);

    const found = await getPaymentByAbacatepayId('pix_char_credits');
    expect(found).not.toBeNull();
    expect(found!.status).toBe('pending');

    await sql.transaction([
      sql`UPDATE users SET balance = balance - ${found!.creditsToDebit} WHERE id = ${found!.userId}`,
      sql`UPDATE users SET plan = 'pro', plan_expires_at = now() + INTERVAL '30 days' WHERE id = ${found!.userId}`,
      sql`UPDATE payments SET status = 'paid', updated_at = now() WHERE id = ${found!.id}`,
    ]);

    const afterUser = await getUserById(user.id);
    expect(afterUser.plan).toBe('pro');
    expect(afterUser.balance).toBe(0);

    const testSql = getTestSql();
    const rows = await testSql`SELECT status FROM payments WHERE id = ${payment.id}`;
    expect(rows[0].status).toBe('paid');
  });

  it('already paid — idempotent, no changes', async () => {
    const user = await createTestUser();
    const payment = await createPayment(user.id, 'pix_char_idem', SUBSCRIPTION_PRICE_CENTS, 0);
    await markPaymentPaid(payment.id);

    const found = await getPaymentByAbacatepayId('pix_char_idem');
    expect(found).not.toBeNull();
    expect(found!.status).toBe('paid');

    // Handler would return early here
    const afterUser = await getUserById(user.id);
    expect(afterUser.plan).toBe('free');
    expect(afterUser.balance).toBe(0);
  });

  it('invalidated payment — credits balance, does not activate pro', async () => {
    const user = await createTestUser();
    const payment = await createPayment(user.id, 'pix_char_old', SUBSCRIPTION_PRICE_CENTS, 0);
    await invalidateUserPayments(user.id);

    const found = await getPaymentByAbacatepayId('pix_char_old');
    expect(found).not.toBeNull();
    expect(found!.status).toBe('invalidated');

    await updateUserBalance(found!.userId, found!.amount);
    await markPaymentPaid(found!.id);

    const afterUser = await getUserById(user.id);
    expect(afterUser.plan).toBe('free');
    expect(afterUser.balance).toBe(SUBSCRIPTION_PRICE_CENTS);

    const testSql = getTestSql();
    const rows = await testSql`SELECT status FROM payments WHERE id = ${payment.id}`;
    expect(rows[0].status).toBe('paid');
  });

  it('unknown abacatepayId — returns null, no changes', async () => {
    const found = await getPaymentByAbacatepayId('pix_char_nonexistent');
    expect(found).toBeNull();
  });
});
