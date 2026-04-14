import { describe, it, expect, beforeEach } from 'vitest';
import { getTestSql, cleanDatabase, createTestUser } from '../helpers';
import {
  getUserPromotion,
  getUserPromotions,
  claimPromo,
} from '@/lib/db/queries/promotions';
import { UNIVERSITY_PROMO_CREDIT_CENTS } from '@/config/subscription';

describe('Promotion queries', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('getUserPromotions', () => {
    it('returns university-email as ineligible for non-university emails', async () => {
      const user = await createTestUser('someone@gmail.com');
      const promos = await getUserPromotions(user.id);

      expect(promos).toHaveLength(1);
      expect(promos[0]).toEqual({
        id: 'university-email',
        creditAmount: UNIVERSITY_PROMO_CREDIT_CENTS,
        eligible: false,
        claimed: false,
      });
    });

    it('returns university-email as eligible for unicamp emails', async () => {
      const user = await createTestUser('student@dac.unicamp.br');
      const promos = await getUserPromotions(user.id);

      expect(promos).toHaveLength(1);
      expect(promos[0].eligible).toBe(true);
      expect(promos[0].claimed).toBe(false);
    });

    it('reflects claimed status after a successful claim', async () => {
      const user = await createTestUser('student@dac.unicamp.br');
      const promo = await getUserPromotion(user.id, 'university-email');
      await claimPromo(user.id, promo!);

      const promos = await getUserPromotions(user.id);
      expect(promos[0].eligible).toBe(true);
      expect(promos[0].claimed).toBe(true);
    });

    it('matches @usp.br suffix', async () => {
      const user = await createTestUser('student@usp.br');
      const promos = await getUserPromotions(user.id);
      expect(promos[0].eligible).toBe(true);
    });

    it('does not match suffixes that appear mid-string', async () => {
      const user = await createTestUser('someone@dac.unicamp.br.fake.com');
      const promos = await getUserPromotions(user.id);
      expect(promos[0].eligible).toBe(false);
    });
  });

  describe('getUserPromotion', () => {
    it('returns the same shape as one entry from getUserPromotions', async () => {
      const user = await createTestUser('student@dac.unicamp.br');
      const one = await getUserPromotion(user.id, 'university-email');
      const all = await getUserPromotions(user.id);
      expect(one).toEqual(all[0]);
    });

    it('returns null for an unknown promotionId', async () => {
      const user = await createTestUser('student@dac.unicamp.br');
      const promo = await getUserPromotion(user.id, 'does-not-exist');
      expect(promo).toBeNull();
    });
  });

  describe('claimPromo', () => {
    it('increments user balance and inserts a promotion_claims row', async () => {
      const sql = getTestSql();
      const user = await createTestUser('student@dac.unicamp.br');
      const promo = await getUserPromotion(user.id, 'university-email');

      await claimPromo(user.id, promo!);

      const userRows = await sql`SELECT balance FROM users WHERE id = ${user.id}`;
      expect(userRows[0].balance).toBe(UNIVERSITY_PROMO_CREDIT_CENTS);

      const claimRows = await sql`
        SELECT user_id, promotion_id FROM promotion_claims
        WHERE user_id = ${user.id} AND promotion_id = 'university-email'
      `;
      expect(claimRows).toHaveLength(1);
    });

    it('throws on double-claim and does not double-credit the balance', async () => {
      const sql = getTestSql();
      const user = await createTestUser('student@dac.unicamp.br');
      const promo = await getUserPromotion(user.id, 'university-email');

      await claimPromo(user.id, promo!);

      await expect(claimPromo(user.id, promo!)).rejects.toThrow();

      const userRows = await sql`SELECT balance FROM users WHERE id = ${user.id}`;
      expect(userRows[0].balance).toBe(UNIVERSITY_PROMO_CREDIT_CENTS);
    });
  });
});
