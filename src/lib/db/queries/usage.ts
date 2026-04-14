import { sql } from '@/lib/db/connection';
import {
  DAILY_TOKEN_LIMIT_FREE_BEST,
  DAILY_TOKEN_LIMIT_FREE_CUTOFF,
  DAILY_TOKEN_LIMIT_PRO,
} from '@/config/ai';

export type UsagePhase = {
  phase: 'best' | 'degraded' | 'blocked';
  usagePercent: number;
};

export function getUsageDate(): string {
  const d = new Date();
  d.setUTCHours(d.getUTCHours() - 3);
  return d.toISOString().slice(0, 10);
}

export async function upsertDailyUsage(userId: string, weightedTokens: number): Promise<number> {
  const usageDate = getUsageDate();
  const rows = await sql`
    INSERT INTO daily_usage (user_id, usage_date, weighted_tokens)
    VALUES (${userId}, ${usageDate}, ${weightedTokens})
    ON CONFLICT (user_id, usage_date)
    DO UPDATE SET weighted_tokens = daily_usage.weighted_tokens + ${weightedTokens}
    RETURNING weighted_tokens
  `;
  return Number(rows[0].weighted_tokens);
}

export async function getDailyUsage(userId: string): Promise<number> {
  const usageDate = getUsageDate();
  const rows = await sql`
    SELECT weighted_tokens FROM daily_usage
    WHERE user_id = ${userId} AND usage_date = ${usageDate}
  `;
  if (rows.length === 0) return 0;
  return Number(rows[0].weighted_tokens);
}

export function getUsagePhase(weightedTokens: number, plan: 'free' | 'pro'): UsagePhase {
  if (plan === 'pro') {
    if (weightedTokens < DAILY_TOKEN_LIMIT_PRO) {
      return {
        phase: 'best',
        usagePercent: Math.floor((weightedTokens / DAILY_TOKEN_LIMIT_PRO) * 100),
      };
    }
    return { phase: 'degraded', usagePercent: 0 };
  }

  // Free plan
  if (weightedTokens < DAILY_TOKEN_LIMIT_FREE_BEST) {
    return {
      phase: 'best',
      usagePercent: Math.floor((weightedTokens / DAILY_TOKEN_LIMIT_FREE_BEST) * 100),
    };
  }
  if (weightedTokens < DAILY_TOKEN_LIMIT_FREE_CUTOFF) {
    return {
      phase: 'degraded',
      usagePercent: Math.floor(
        ((weightedTokens - DAILY_TOKEN_LIMIT_FREE_BEST) /
          (DAILY_TOKEN_LIMIT_FREE_CUTOFF - DAILY_TOKEN_LIMIT_FREE_BEST)) *
          100
      ),
    };
  }
  return { phase: 'blocked', usagePercent: 100 };
}
