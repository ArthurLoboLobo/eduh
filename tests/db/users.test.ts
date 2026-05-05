import { describe, it, expect, beforeEach } from 'vitest';
import { getTestSql, cleanDatabase, createTestUser } from '../helpers';
import {
  getUserById,
  activateProPlan,
  updateUserBalance,
  createUser,
  findUserByEmail,
} from '@/lib/db/queries/users';

describe('User plan & balance queries', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('email query normalization', () => {
    it('should store normalized emails when creating users', async () => {
      const user = await createUser('User+promo@Example.com');

      expect(user.email).toBe('user@example.com');
    });

    it('should find existing users through aliased emails', async () => {
      const testUser = await createTestUser('user@example.com');
      const user = await findUserByEmail('User+other@Example.com');

      expect(user?.id).toBe(testUser.id);
      expect(user?.email).toBe('user@example.com');
    });
  });

  describe('getUserById', () => {
    it('should return full user row with camelCase fields and correct defaults', async () => {
      const testUser = await createTestUser();
      const user = await getUserById(testUser.id);

      expect(user.id).toBe(testUser.id);
      expect(user.email).toBe(testUser.email);
      expect(user.plan).toBe('free');
      expect(user.planExpiresAt).toBeNull();
      expect(user.balance).toBe(0);
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should return pro plan after activation', async () => {
      const testUser = await createTestUser();
      await activateProPlan(testUser.id);

      const user = await getUserById(testUser.id);
      expect(user.plan).toBe('pro');
      expect(user.planExpiresAt).toBeInstanceOf(Date);

      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const diff = Math.abs(user.planExpiresAt!.getTime() - thirtyDaysFromNow.getTime());
      expect(diff).toBeLessThan(60_000); // within 1 minute
    });

    it('should auto-expire a stale pro plan and persist the change', async () => {
      const sql = getTestSql();
      const testUser = await createTestUser();

      // Activate pro, then set expiry to the past
      await activateProPlan(testUser.id);
      await sql`
        UPDATE users SET plan_expires_at = now() - INTERVAL '1 day'
        WHERE id = ${testUser.id}
      `;

      const user = await getUserById(testUser.id);
      expect(user.plan).toBe('free');
      expect(user.planExpiresAt).toBeNull();

      // Verify the change persisted in DB
      const rows = await sql`SELECT plan, plan_expires_at FROM users WHERE id = ${testUser.id}`;
      expect(rows[0].plan).toBe('free');
      expect(rows[0].plan_expires_at).toBeNull();
    });
  });

  describe('activateProPlan', () => {
    it('should set plan to pro with ~30 day expiry', async () => {
      const sql = getTestSql();
      const testUser = await createTestUser();

      await activateProPlan(testUser.id);

      const rows = await sql`SELECT plan, plan_expires_at FROM users WHERE id = ${testUser.id}`;
      expect(rows[0].plan).toBe('pro');

      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const diff = Math.abs(new Date(rows[0].plan_expires_at).getTime() - thirtyDaysFromNow.getTime());
      expect(diff).toBeLessThan(60_000);
    });
  });

  describe('updateUserBalance', () => {
    it('should credit balance', async () => {
      const testUser = await createTestUser();
      const balance = await updateUserBalance(testUser.id, 500);
      expect(balance).toBe(500);
    });

    it('should debit balance to zero', async () => {
      const testUser = await createTestUser();
      await updateUserBalance(testUser.id, 500);
      const balance = await updateUserBalance(testUser.id, -500);
      expect(balance).toBe(0);
    });

    it('should throw on insufficient balance', async () => {
      const testUser = await createTestUser();
      await expect(updateUserBalance(testUser.id, -1)).rejects.toThrow('Insufficient balance');
    });

    it('should handle multiple increments and decrements correctly', async () => {
      const testUser = await createTestUser();
      await updateUserBalance(testUser.id, 100);
      const balance = await updateUserBalance(testUser.id, -50);
      expect(balance).toBe(50);
    });
  });
});
