import { describe, it, expect, beforeEach } from 'vitest';
import { getTestSql, cleanDatabase, createTestUser } from '../helpers';

describe('Migration 008: Subscription fields', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('Step 1: User subscription fields', () => {
    it('should have correct defaults: plan=free, balance=0, plan_expires_at=NULL', async () => {
      const sql = getTestSql();
      const user = await createTestUser();

      const rows = await sql`
        SELECT plan, balance, plan_expires_at FROM users WHERE id = ${user.id}
      `;
      expect(rows[0].plan).toBe('free');
      expect(rows[0].balance).toBe(0);
      expect(rows[0].plan_expires_at).toBeNull();
    });

    it('should reject negative balance via CHECK constraint', async () => {
      const sql = getTestSql();
      const user = await createTestUser();

      await expect(
        sql`UPDATE users SET balance = -1 WHERE id = ${user.id}`
      ).rejects.toThrow();
    });
  });

  describe('Step 2: Payments table', () => {
    it('should reject duplicate abacatepay_id', async () => {
      const sql = getTestSql();
      const user = await createTestUser();

      await sql`
        INSERT INTO payments (user_id, abacatepay_id, amount)
        VALUES (${user.id}, ${'pix_char_001'}, ${2000})
      `;

      await expect(
        sql`
          INSERT INTO payments (user_id, abacatepay_id, amount)
          VALUES (${user.id}, ${'pix_char_001'}, ${2000})
        `
      ).rejects.toThrow();
    });

    it('should reject second pending payment for same user (partial unique index)', async () => {
      const sql = getTestSql();
      const user = await createTestUser();

      await sql`
        INSERT INTO payments (user_id, abacatepay_id, amount)
        VALUES (${user.id}, ${'pix_char_001'}, ${2000})
      `;

      await expect(
        sql`
          INSERT INTO payments (user_id, abacatepay_id, amount)
          VALUES (${user.id}, ${'pix_char_002'}, ${2000})
        `
      ).rejects.toThrow();
    });

    it('should allow new pending payment after invalidating old one', async () => {
      const sql = getTestSql();
      const user = await createTestUser();

      await sql`
        INSERT INTO payments (user_id, abacatepay_id, amount)
        VALUES (${user.id}, ${'pix_char_001'}, ${2000})
      `;

      await sql`
        UPDATE payments SET status = 'invalidated' WHERE user_id = ${user.id}
      `;

      const rows = await sql`
        INSERT INTO payments (user_id, abacatepay_id, amount)
        VALUES (${user.id}, ${'pix_char_002'}, ${2000})
        RETURNING id
      `;
      expect(rows).toHaveLength(1);
    });
  });

  describe('Step 3: Daily usage table', () => {
    it('should reject duplicate user_id + usage_date', async () => {
      const sql = getTestSql();
      const user = await createTestUser();
      const date = '2026-04-06';

      await sql`
        INSERT INTO daily_usage (user_id, usage_date, weighted_tokens)
        VALUES (${user.id}, ${date}, ${5000})
      `;

      await expect(
        sql`
          INSERT INTO daily_usage (user_id, usage_date, weighted_tokens)
          VALUES (${user.id}, ${date}, ${3000})
        `
      ).rejects.toThrow();
    });

    it('should accumulate tokens via ON CONFLICT upsert', async () => {
      const sql = getTestSql();
      const user = await createTestUser();
      const date = '2026-04-06';

      await sql`
        INSERT INTO daily_usage (user_id, usage_date, weighted_tokens)
        VALUES (${user.id}, ${date}, ${5000})
      `;

      const rows = await sql`
        INSERT INTO daily_usage (user_id, usage_date, weighted_tokens)
        VALUES (${user.id}, ${date}, ${3000})
        ON CONFLICT (user_id, usage_date)
        DO UPDATE SET weighted_tokens = daily_usage.weighted_tokens + EXCLUDED.weighted_tokens
        RETURNING weighted_tokens
      `;
      expect(Number(rows[0].weighted_tokens)).toBe(8000);
    });
  });
});

describe('Migration 009: Promotion claims table', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should reject duplicate (user_id, promotion_id) via UNIQUE constraint', async () => {
    const sql = getTestSql();
    const user = await createTestUser();

    await sql`
      INSERT INTO promotion_claims (user_id, promotion_id)
      VALUES (${user.id}, ${'university-email'})
    `;

    await expect(
      sql`
        INSERT INTO promotion_claims (user_id, promotion_id)
        VALUES (${user.id}, ${'university-email'})
      `
    ).rejects.toThrow();
  });

  it('should allow the same user to claim multiple different promotions', async () => {
    const sql = getTestSql();
    const user = await createTestUser();

    await sql`
      INSERT INTO promotion_claims (user_id, promotion_id)
      VALUES (${user.id}, ${'university-email'})
    `;
    await sql`
      INSERT INTO promotion_claims (user_id, promotion_id)
      VALUES (${user.id}, ${'launch-bonus'})
    `;

    const rows = await sql`
      SELECT promotion_id FROM promotion_claims WHERE user_id = ${user.id}
      ORDER BY promotion_id
    `;
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.promotion_id)).toEqual(['launch-bonus', 'university-email']);
  });

  it('should allow different users to claim the same promotion', async () => {
    const sql = getTestSql();
    const userA = await createTestUser('a@example.com');
    const userB = await createTestUser('b@example.com');

    await sql`
      INSERT INTO promotion_claims (user_id, promotion_id)
      VALUES (${userA.id}, ${'university-email'})
    `;
    const rows = await sql`
      INSERT INTO promotion_claims (user_id, promotion_id)
      VALUES (${userB.id}, ${'university-email'})
      RETURNING id
    `;
    expect(rows).toHaveLength(1);
  });

  it('should cascade delete claims when user is deleted', async () => {
    const sql = getTestSql();
    const user = await createTestUser();

    await sql`
      INSERT INTO promotion_claims (user_id, promotion_id)
      VALUES (${user.id}, ${'university-email'})
    `;
    await sql`DELETE FROM users WHERE id = ${user.id}`;

    const rows = await sql`
      SELECT id FROM promotion_claims WHERE user_id = ${user.id}
    `;
    expect(rows).toHaveLength(0);
  });
});
