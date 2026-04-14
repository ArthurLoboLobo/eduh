import { describe, it, expect } from 'vitest';
import { getWarningState, getWarningSeverity } from '@/lib/usage-warnings';

describe('getWarningState', () => {
  // Free plan, best phase
  it('returns null at 0% free best', () => {
    expect(getWarningState(0, 'free', 'best')).toBe(null);
  });

  it('returns null just below first threshold', () => {
    expect(getWarningState(74, 'free', 'best')).toBe(null);
  });

  it('returns best:75 at 75%', () => {
    expect(getWarningState(75, 'free', 'best')).toBe('best:75');
  });

  it('returns best:75 between thresholds', () => {
    expect(getWarningState(89, 'free', 'best')).toBe('best:75');
  });

  it('returns best:90 at 90%', () => {
    expect(getWarningState(90, 'free', 'best')).toBe('best:90');
  });

  // Free plan, degraded phase
  it('returns degraded at 0% free degraded', () => {
    expect(getWarningState(0, 'free', 'degraded')).toBe('degraded');
  });

  it('returns degraded:75 at 75% free degraded', () => {
    expect(getWarningState(75, 'free', 'degraded')).toBe('degraded:75');
  });

  it('returns degraded:90 at 90% free degraded', () => {
    expect(getWarningState(90, 'free', 'degraded')).toBe('degraded:90');
  });

  // Free plan, blocked phase
  it('returns blocked at 0% free blocked', () => {
    expect(getWarningState(0, 'free', 'blocked')).toBe('blocked');
  });

  // Pro plan, best phase
  it('returns best:75 at 75% pro best', () => {
    expect(getWarningState(75, 'pro', 'best')).toBe('best:75');
  });

  it('returns best:90 at 90% pro best', () => {
    expect(getWarningState(90, 'pro', 'best')).toBe('best:90');
  });

  // Pro plan, degraded phase (no thresholds)
  it('returns degraded at 0% pro degraded', () => {
    expect(getWarningState(0, 'pro', 'degraded')).toBe('degraded');
  });

  it('returns degraded at 90% pro degraded (no thresholds for pro degraded)', () => {
    expect(getWarningState(90, 'pro', 'degraded')).toBe('degraded');
  });
});

describe('getWarningSeverity', () => {
  it('returns 0 for null', () => {
    expect(getWarningSeverity(null)).toBe(0);
  });

  it('maintains strict ordering: null < best:75 < best:90 < degraded < degraded:75 < degraded:90 < blocked', () => {
    const states = [null, 'best:75', 'best:90', 'degraded', 'degraded:75', 'degraded:90', 'blocked'];
    const severities = states.map(getWarningSeverity);

    for (let i = 1; i < severities.length; i++) {
      expect(severities[i]).toBeGreaterThan(severities[i - 1]);
    }
  });

  it('all severity values are distinct', () => {
    const states = [null, 'best:75', 'best:90', 'degraded', 'degraded:75', 'degraded:90', 'blocked'];
    const severities = states.map(getWarningSeverity);
    const unique = new Set(severities);
    expect(unique.size).toBe(severities.length);
  });
});

describe('comparison logic', () => {
  it('null → best:75 = severity increased', () => {
    expect(getWarningSeverity('best:75')).toBeGreaterThan(getWarningSeverity(null));
  });

  it('best:75 → best:90 = severity increased', () => {
    expect(getWarningSeverity('best:90')).toBeGreaterThan(getWarningSeverity('best:75'));
  });

  it('best:90 → degraded = severity increased', () => {
    expect(getWarningSeverity('degraded')).toBeGreaterThan(getWarningSeverity('best:90'));
  });

  it('best:75 → best:75 = same severity', () => {
    expect(getWarningSeverity('best:75')).toBe(getWarningSeverity('best:75'));
  });

  it('degraded:90 → best:75 = severity decreased (e.g. new day)', () => {
    expect(getWarningSeverity('best:75')).toBeLessThan(getWarningSeverity('degraded:90'));
  });
});
