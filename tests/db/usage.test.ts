import { describe, it, expect, beforeEach } from 'vitest';
import { cleanDatabase, createTestUser } from '../helpers';
import { upsertDailyUsage, getDailyUsage } from '@/lib/db/queries/usage';

describe('Daily usage DB queries', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('upsertDailyUsage', () => {
    it('should return the inserted token count on first call', async () => {
      const user = await createTestUser();
      const total = await upsertDailyUsage(user.id, 5000);
      expect(total).toBe(5000);
    });

    it('should accumulate tokens on subsequent calls', async () => {
      const user = await createTestUser();
      await upsertDailyUsage(user.id, 5000);
      const total = await upsertDailyUsage(user.id, 3000);
      expect(total).toBe(8000);
    });
  });

  describe('getDailyUsage', () => {
    it('should return 0 when no usage exists', async () => {
      const user = await createTestUser();
      const usage = await getDailyUsage(user.id);
      expect(usage).toBe(0);
    });

    it('should return the accumulated usage', async () => {
      const user = await createTestUser();
      await upsertDailyUsage(user.id, 8000);
      const usage = await getDailyUsage(user.id);
      expect(usage).toBe(8000);
    });
  });
});
