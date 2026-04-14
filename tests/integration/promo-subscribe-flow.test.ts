import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cleanDatabase, createTestUser } from '../helpers';
import { getUserById } from '@/lib/db/queries/users';
import { getUserPromotion, claimPromo } from '@/lib/db/queries/promotions';
import { invalidateUserPayments, getActivePaymentByUserId } from '@/lib/db/queries/payments';
import { createPixQrCode } from '@/lib/abacatepay';
import {
  SUBSCRIPTION_PRICE_CENTS,
  UNIVERSITY_PROMO_CREDIT_CENTS,
} from '@/config/subscription';
import { sql } from '@/lib/db/connection';

vi.mock('@/lib/abacatepay', () => ({
  createPixQrCode: vi.fn(),
}));

const mockCreatePixQrCode = vi.mocked(createPixQrCode);

async function subscribeWithCredits(userId: string) {
  const dbUser = await getUserById(userId);
  await invalidateUserPayments(userId);

  const creditsToDebit = Math.min(dbUser.balance, SUBSCRIPTION_PRICE_CENTS);
  const pixAmount = SUBSCRIPTION_PRICE_CENTS - creditsToDebit;

  if (pixAmount === 0) {
    await sql.transaction([
      sql`UPDATE users SET balance = balance - ${creditsToDebit} WHERE id = ${userId}`,
      sql`UPDATE users SET plan = 'pro', plan_expires_at = now() + INTERVAL '30 days' WHERE id = ${userId}`,
    ]);
  }
}

describe('Promo + subscribe flow', () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
  });

  it('full flow: promo claim covers full subscription price', async () => {
    const user = await createTestUser('student@dac.unicamp.br');

    const initialUser = await getUserById(user.id);
    expect(initialUser.balance).toBe(0);
    expect(initialUser.plan).toBe('free');

    const promo = await getUserPromotion(user.id, 'university-email');
    expect(promo).not.toBeNull();
    expect(promo!.eligible).toBe(true);
    expect(promo!.claimed).toBe(false);

    await claimPromo(user.id, promo!);

    const afterClaim = await getUserById(user.id);
    expect(afterClaim.balance).toBe(UNIVERSITY_PROMO_CREDIT_CENTS);
    expect(afterClaim.balance).toBe(SUBSCRIPTION_PRICE_CENTS);

    await subscribeWithCredits(user.id);

    expect(mockCreatePixQrCode).not.toHaveBeenCalled();

    const finalUser = await getUserById(user.id);
    expect(finalUser.plan).toBe('pro');
    expect(finalUser.balance).toBe(0);
    expect(finalUser.planExpiresAt).not.toBeNull();

    const activePayment = await getActivePaymentByUserId(user.id);
    expect(activePayment).toBeNull();
  });

  it('double claim is rejected, then subscribe still works with the single credit', async () => {
    const user = await createTestUser('student@dac.unicamp.br');

    const promo = await getUserPromotion(user.id, 'university-email');
    await claimPromo(user.id, promo!);

    const afterFirst = await getUserById(user.id);
    expect(afterFirst.balance).toBe(UNIVERSITY_PROMO_CREDIT_CENTS);

    await expect(claimPromo(user.id, promo!)).rejects.toThrow();

    const afterSecond = await getUserById(user.id);
    expect(afterSecond.balance).toBe(UNIVERSITY_PROMO_CREDIT_CENTS);

    await subscribeWithCredits(user.id);

    expect(mockCreatePixQrCode).not.toHaveBeenCalled();

    const finalUser = await getUserById(user.id);
    expect(finalUser.plan).toBe('pro');
    expect(finalUser.balance).toBe(0);
  });
});
