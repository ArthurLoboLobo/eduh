import { describe, it, expect, vi, afterEach } from 'vitest';
import { getUsageDate, getUsagePhase } from '@/lib/db/queries/usage';
import {
  DAILY_TOKEN_LIMIT_FREE_BEST,
  DAILY_TOKEN_LIMIT_FREE_CUTOFF,
  DAILY_TOKEN_LIMIT_PRO,
} from '@/config/ai';

describe('getUsageDate', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return previous day before 3 AM UTC', () => {
    vi.useFakeTimers();
    // 2:59 AM UTC on April 5, 2026
    vi.setSystemTime(new Date('2026-04-05T02:59:00Z'));
    expect(getUsageDate()).toBe('2026-04-04');
  });

  it('should return current day after 3 AM UTC', () => {
    vi.useFakeTimers();
    // 3:01 AM UTC on April 5, 2026
    vi.setSystemTime(new Date('2026-04-05T03:01:00Z'));
    expect(getUsageDate()).toBe('2026-04-05');
  });

  it('should return current day at exactly 3:00 AM UTC', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-05T03:00:00Z'));
    expect(getUsageDate()).toBe('2026-04-05');
  });

  it('should handle year boundary (midnight UTC Jan 1)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    expect(getUsageDate()).toBe('2025-12-31');
  });
});

describe('getUsagePhase (free)', () => {
  it('should return best/0% at 0 tokens', () => {
    expect(getUsagePhase(0, 'free')).toEqual({ phase: 'best', usagePercent: 0 });
  });

  it('should return best/50% at half the best threshold', () => {
    expect(getUsagePhase(DAILY_TOKEN_LIMIT_FREE_BEST / 2, 'free')).toEqual({
      phase: 'best',
      usagePercent: 50,
    });
  });

  it('should return degraded/0% at exactly the best threshold', () => {
    expect(getUsagePhase(DAILY_TOKEN_LIMIT_FREE_BEST, 'free')).toEqual({
      phase: 'degraded',
      usagePercent: 0,
    });
  });

  it('should return degraded/50% at midpoint of degraded range', () => {
    const mid =
      DAILY_TOKEN_LIMIT_FREE_BEST +
      (DAILY_TOKEN_LIMIT_FREE_CUTOFF - DAILY_TOKEN_LIMIT_FREE_BEST) / 2;
    expect(getUsagePhase(mid, 'free')).toEqual({ phase: 'degraded', usagePercent: 50 });
  });

  it('should return blocked/100% at the cutoff', () => {
    expect(getUsagePhase(DAILY_TOKEN_LIMIT_FREE_CUTOFF, 'free')).toEqual({
      phase: 'blocked',
      usagePercent: 100,
    });
  });

  it('should stay blocked beyond the cutoff', () => {
    expect(getUsagePhase(DAILY_TOKEN_LIMIT_FREE_CUTOFF * 2, 'free')).toEqual({
      phase: 'blocked',
      usagePercent: 100,
    });
  });

  it('should always return integer usagePercent', () => {
    // Use a value that would produce a non-integer without floor
    const result = getUsagePhase(1, 'free');
    expect(Number.isInteger(result.usagePercent)).toBe(true);
  });
});

describe('getUsagePhase (pro)', () => {
  it('should return best/0% at 0 tokens', () => {
    expect(getUsagePhase(0, 'pro')).toEqual({ phase: 'best', usagePercent: 0 });
  });

  it('should return best/50% at half the pro threshold', () => {
    expect(getUsagePhase(DAILY_TOKEN_LIMIT_PRO / 2, 'pro')).toEqual({
      phase: 'best',
      usagePercent: 50,
    });
  });

  it('should return degraded/0% at exactly the pro threshold', () => {
    expect(getUsagePhase(DAILY_TOKEN_LIMIT_PRO, 'pro')).toEqual({
      phase: 'degraded',
      usagePercent: 0,
    });
  });

  it('should stay degraded (never blocked) beyond the pro threshold', () => {
    expect(getUsagePhase(DAILY_TOKEN_LIMIT_PRO * 2, 'pro')).toEqual({
      phase: 'degraded',
      usagePercent: 0,
    });
  });

  it('should always return integer usagePercent', () => {
    const result = getUsagePhase(1, 'pro');
    expect(Number.isInteger(result.usagePercent)).toBe(true);
  });
});
