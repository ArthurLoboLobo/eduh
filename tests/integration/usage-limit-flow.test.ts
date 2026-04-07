import { describe, it, expect, beforeEach } from 'vitest';
import { cleanDatabase, createTestUser } from '../helpers';
import { upsertDailyUsage, getDailyUsage, getUsagePhase } from '@/lib/db/queries/usage';
import { activateProPlan } from '@/lib/db/queries/users';
import {
  DAILY_TOKEN_LIMIT_FREE_BEST,
  DAILY_TOKEN_LIMIT_FREE_CUTOFF,
  DAILY_TOKEN_LIMIT_PRO,
} from '@/config/ai';

describe('Usage limit enforcement flow', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('free user with 0 usage gets best phase', async () => {
    const user = await createTestUser();
    const usage = await getDailyUsage(user.id);
    const { phase } = getUsagePhase(usage, 'free');
    expect(phase).toBe('best');
  });

  it('free user at best-model threshold gets degraded phase', async () => {
    const user = await createTestUser();
    await upsertDailyUsage(user.id, DAILY_TOKEN_LIMIT_FREE_BEST);
    const usage = await getDailyUsage(user.id);
    const { phase } = getUsagePhase(usage, 'free');
    expect(phase).toBe('degraded');
  });

  it('free user at hard-cutoff threshold gets blocked phase', async () => {
    const user = await createTestUser();
    await upsertDailyUsage(user.id, DAILY_TOKEN_LIMIT_FREE_CUTOFF);
    const usage = await getDailyUsage(user.id);
    const { phase } = getUsagePhase(usage, 'free');
    expect(phase).toBe('blocked');
  });

  it('free user crossing best-model boundary transitions from best to degraded', async () => {
    const user = await createTestUser();
    const justBelow = Math.floor(DAILY_TOKEN_LIMIT_FREE_BEST * 0.99);
    await upsertDailyUsage(user.id, justBelow);

    const usageBefore = await getDailyUsage(user.id);
    expect(getUsagePhase(usageBefore, 'free').phase).toBe('best');

    const pushOver = DAILY_TOKEN_LIMIT_FREE_BEST - justBelow + 1;
    await upsertDailyUsage(user.id, pushOver);

    const usageAfter = await getDailyUsage(user.id);
    expect(getUsagePhase(usageAfter, 'free').phase).toBe('degraded');
  });

  it('free user crossing hard-cutoff boundary transitions from degraded to blocked', async () => {
    const user = await createTestUser();
    const justBelow = Math.floor(DAILY_TOKEN_LIMIT_FREE_CUTOFF * 0.99);
    await upsertDailyUsage(user.id, justBelow);

    const usageBefore = await getDailyUsage(user.id);
    expect(getUsagePhase(usageBefore, 'free').phase).toBe('degraded');

    const pushOver = DAILY_TOKEN_LIMIT_FREE_CUTOFF - justBelow + 1;
    await upsertDailyUsage(user.id, pushOver);

    const usageAfter = await getDailyUsage(user.id);
    expect(getUsagePhase(usageAfter, 'free').phase).toBe('blocked');
  });

  it('pro user at pro threshold gets degraded phase', async () => {
    const user = await createTestUser();
    await activateProPlan(user.id);
    await upsertDailyUsage(user.id, DAILY_TOKEN_LIMIT_PRO);
    const usage = await getDailyUsage(user.id);
    const { phase } = getUsagePhase(usage, 'pro');
    expect(phase).toBe('degraded');
  });

  it('pro user at 2x pro threshold is still degraded, never blocked', async () => {
    const user = await createTestUser();
    await activateProPlan(user.id);
    await upsertDailyUsage(user.id, DAILY_TOKEN_LIMIT_PRO * 2);
    const usage = await getDailyUsage(user.id);
    const { phase } = getUsagePhase(usage, 'pro');
    expect(phase).toBe('degraded');
  });
});
