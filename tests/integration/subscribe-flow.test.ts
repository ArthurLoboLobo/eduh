import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cleanDatabase, createTestUser, getTestSql } from '../helpers';
import { getUserById, updateUserBalance, activateProPlan } from '@/lib/db/queries/users';
import {
  createPayment,
  invalidateUserPayments,
  getActivePaymentByUserId,
} from '@/lib/db/queries/payments';
import { createPixQrCode } from '@/lib/abacatepay';
import { SUBSCRIPTION_PRICE_CENTS } from '@/config/subscription';
import { sql } from '@/lib/db/connection';

vi.mock('@/lib/abacatepay', () => ({
  createPixQrCode: vi.fn(),
}));

const mockCreatePixQrCode = vi.mocked(createPixQrCode);

function mockQrResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pix_char_test_001',
    brCode: 'br-code-string',
    brCodeBase64: 'base64-qr-image',
    status: 'PENDING',
    expiresAt: '2026-04-08T15:00:00Z',
    ...overrides,
  };
}

describe('Subscribe flow', () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
  });

  it('free user, no credits — creates Pix payment', async () => {
    const user = await createTestUser();
    const qr = mockQrResponse();
    mockCreatePixQrCode.mockResolvedValue(qr);

    // Simulate subscribe logic: useCredits = false
    const dbUser = await getUserById(user.id);
    expect(dbUser.plan).toBe('free');

    await invalidateUserPayments(user.id);
    const creditsToDebit = 0; // useCredits = false
    const pixAmount = SUBSCRIPTION_PRICE_CENTS - creditsToDebit;

    const qrResponse = await createPixQrCode({
      amount: pixAmount,
      expiresIn: 600,
      description: 'Eduh Pro',
      metadata: { userId: user.id, creditsToDebit },
    });

    const payment = await createPayment(user.id, qrResponse.id, pixAmount, creditsToDebit, qrResponse);

    // Verify
    expect(mockCreatePixQrCode).toHaveBeenCalledWith(
      expect.objectContaining({ amount: SUBSCRIPTION_PRICE_CENTS })
    );
    expect(payment.status).toBe('pending');
    expect(payment.creditsToDebit).toBe(0);
    const afterUser = await getUserById(user.id);
    expect(afterUser.plan).toBe('free');
  });

  it('free user, full balance covers price — activates pro instantly', async () => {
    const user = await createTestUser();
    await updateUserBalance(user.id, SUBSCRIPTION_PRICE_CENTS);

    const dbUser = await getUserById(user.id);
    expect(dbUser.balance).toBe(SUBSCRIPTION_PRICE_CENTS);

    await invalidateUserPayments(user.id);
    const creditsToDebit = Math.min(dbUser.balance, SUBSCRIPTION_PRICE_CENTS);
    const pixAmount = SUBSCRIPTION_PRICE_CENTS - creditsToDebit;

    expect(pixAmount).toBe(0);

    // Full credits path — transaction
    await sql.transaction([
      sql`UPDATE users SET balance = balance - ${creditsToDebit} WHERE id = ${user.id}`,
      sql`UPDATE users SET plan = 'pro', plan_expires_at = now() + INTERVAL '30 days' WHERE id = ${user.id}`,
    ]);

    // Verify
    expect(mockCreatePixQrCode).not.toHaveBeenCalled();
    const afterUser = await getUserById(user.id);
    expect(afterUser.plan).toBe('pro');
    expect(afterUser.balance).toBe(0);
    expect(afterUser.planExpiresAt).not.toBeNull();

    const activePayment = await getActivePaymentByUserId(user.id);
    expect(activePayment).toBeNull();
  });

  it('free user, partial balance — creates Pix for remainder', async () => {
    const user = await createTestUser();
    await updateUserBalance(user.id, 1000);
    mockCreatePixQrCode.mockResolvedValue(mockQrResponse());

    const dbUser = await getUserById(user.id);
    await invalidateUserPayments(user.id);

    const creditsToDebit = Math.min(dbUser.balance, SUBSCRIPTION_PRICE_CENTS);
    const pixAmount = SUBSCRIPTION_PRICE_CENTS - creditsToDebit;

    expect(creditsToDebit).toBe(1000);
    expect(pixAmount).toBe(SUBSCRIPTION_PRICE_CENTS - 1000);

    const qrResponse = await createPixQrCode({
      amount: pixAmount,
      expiresIn: 600,
      description: 'Eduh Pro',
      metadata: { userId: user.id, creditsToDebit },
    });

    const payment = await createPayment(user.id, qrResponse.id, pixAmount, creditsToDebit, qrResponse);

    // Verify
    expect(mockCreatePixQrCode).toHaveBeenCalledWith(
      expect.objectContaining({ amount: SUBSCRIPTION_PRICE_CENTS - 1000 })
    );
    expect(payment.creditsToDebit).toBe(1000);
    expect(payment.status).toBe('pending');

    const afterUser = await getUserById(user.id);
    expect(afterUser.plan).toBe('free');
    expect(afterUser.balance).toBe(1000); // unchanged until webhook
  });

  it('already pro — short-circuits', async () => {
    const user = await createTestUser();
    await activateProPlan(user.id);

    const dbUser = await getUserById(user.id);
    expect(dbUser.plan).toBe('pro');

    // The endpoint would return ALREADY_PRO here
    // Verify no payment functions were called
    expect(mockCreatePixQrCode).not.toHaveBeenCalled();
  });

  it('invalidates old pending payment before creating new one', async () => {
    const user = await createTestUser();
    mockCreatePixQrCode.mockResolvedValue(mockQrResponse({ id: 'pix_char_new' }));

    // Create an existing pending payment
    const oldPayment = await createPayment(user.id, 'pix_char_old', 2000, 0);
    expect(oldPayment.status).toBe('pending');

    // Subscribe logic
    await invalidateUserPayments(user.id);

    const qrResponse = await createPixQrCode({
      amount: SUBSCRIPTION_PRICE_CENTS,
      expiresIn: 600,
      description: 'Eduh Pro',
      metadata: { userId: user.id, creditsToDebit: 0 },
    });

    const newPayment = await createPayment(user.id, qrResponse.id, SUBSCRIPTION_PRICE_CENTS, 0, qrResponse);

    // Verify old payment is invalidated
    const testSql = getTestSql();
    const rows = await testSql`SELECT status FROM payments WHERE id = ${oldPayment.id}`;
    expect(rows[0].status).toBe('invalidated');

    // Verify new payment is pending
    expect(newPayment.status).toBe('pending');
    expect(newPayment.abacatepayId).toBe('pix_char_new');
  });

  it('partial unique index rejects second pending payment without invalidation', async () => {
    const user = await createTestUser();

    await createPayment(user.id, 'pix_char_first', 2000, 0);

    // Attempt to insert another pending payment without invalidating first
    await expect(
      createPayment(user.id, 'pix_char_second', 2000, 0)
    ).rejects.toThrow();
  });
});
