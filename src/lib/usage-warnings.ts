import { USAGE_WARNING_THRESHOLDS } from '@/config/ai';

export function getWarningState(
  usagePercent: number,
  plan: 'free' | 'pro',
  phase: 'best' | 'degraded' | 'blocked'
): string | null {
  if (phase === 'blocked') return 'blocked';
  if (plan === 'pro' && phase === 'degraded') return 'degraded';

  // Check thresholds descending — return highest crossed
  const sorted = [...USAGE_WARNING_THRESHOLDS].sort((a, b) => b - a);
  for (const t of sorted) {
    if (usagePercent >= t) return `${phase}:${t}`;
  }

  // No threshold crossed
  if (phase === 'degraded') return 'degraded';
  return null;
}

export function getWarningSeverity(state: string | null): number {
  const sorted = [...USAGE_WARNING_THRESHOLDS].sort((a, b) => a - b);
  const severityMap = new Map<string | null, number>();
  let s = 0;
  severityMap.set(null, s);
  for (const t of sorted) { s++; severityMap.set(`best:${t}`, s); }
  s++; severityMap.set('degraded', s);
  for (const t of sorted) { s++; severityMap.set(`degraded:${t}`, s); }
  s++; severityMap.set('blocked', s);
  return severityMap.get(state) ?? 0;
}
