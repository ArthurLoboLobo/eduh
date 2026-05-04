import { sql } from '@/lib/db/connection';

function nullableInteger(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.trunc(value)
    : null;
}

export async function insertAiCallLog(params: {
  label: string;
  model: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  inputText?: string | null;
  outputText?: string | null;
  userId?: string | null;
  sectionId?: string | null;
  durationMs: number;
}): Promise<void> {
  try {
    const id = crypto.randomUUID();
    const inputTokens = nullableInteger(params.inputTokens);
    const outputTokens = nullableInteger(params.outputTokens);
    const durationMs = nullableInteger(params.durationMs) ?? 0;

    await sql`
      INSERT INTO ai_call_logs (id, label, model, input_tokens, output_tokens, input_text, output_text, user_id, section_id, duration_ms)
      VALUES (
        ${id},
        ${params.label},
        ${params.model},
        ${inputTokens},
        ${outputTokens},
        ${params.inputText ?? null},
        ${params.outputText ?? null},
        ${params.userId ?? null},
        ${params.sectionId ?? null},
        ${durationMs}
      )
    `;
  } catch (err) {
    console.error('Failed to insert AI call log:', err);
  }
}

export type AiLogSummaryRow = {
  label: string;
  count: number;
  total_input_tokens: number;
  total_output_tokens: number;
  cost_score: number;
  avg_duration_ms: number;
};

export async function getAiLogsSummary(from: string, to: string): Promise<AiLogSummaryRow[]> {
  const rows = await sql`
    SELECT
      label,
      COUNT(*)::int AS count,
      COALESCE(SUM(input_tokens), 0)::int AS total_input_tokens,
      COALESCE(SUM(output_tokens), 0)::int AS total_output_tokens,
      (COALESCE(SUM(input_tokens), 0) + 6 * COALESCE(SUM(output_tokens), 0))::int AS cost_score,
      ROUND(AVG(duration_ms))::int AS avg_duration_ms
    FROM ai_call_logs
    WHERE created_at >= ${from}::timestamptz AND created_at < ${to}::timestamptz
    GROUP BY label
    ORDER BY count DESC
  `;
  return rows as AiLogSummaryRow[];
}

export type AiLogRow = {
  id: string;
  label: string;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  input_text: string | null;
  output_text: string | null;
  user_id: string | null;
  section_id: string | null;
  duration_ms: number;
  created_at: string;
};

export async function getAiLogsList(
  from: string,
  to: string,
  page: number,
  pageSize: number,
): Promise<{ rows: AiLogRow[]; total: number }> {
  const offset = (page - 1) * pageSize;

  const countResult = await sql`
    SELECT COUNT(*)::int AS total
    FROM ai_call_logs
    WHERE created_at >= ${from}::timestamptz AND created_at < ${to}::timestamptz
  `;
  const total = (countResult[0] as { total: number }).total;

  const rows = await sql`
    SELECT *
    FROM ai_call_logs
    WHERE created_at >= ${from}::timestamptz AND created_at < ${to}::timestamptz
    ORDER BY created_at DESC
    LIMIT ${pageSize} OFFSET ${offset}
  `;

  return { rows: rows as AiLogRow[], total };
}
