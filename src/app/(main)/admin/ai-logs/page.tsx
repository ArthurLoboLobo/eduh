import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { verifyToken, isAdmin } from '@/lib/auth';
import { getAiLogsSummary, getAiLogsList } from '@/lib/db/queries/aiLogs';
import ExpandableText from '@/components/ui/ExpandableText';

export default async function AiLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; page?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('eduh_token')?.value;
  if (!token) notFound();

  const result = await verifyToken(token);
  if (!result) notFound();

  const admin = await isAdmin(result.userId);
  if (!admin) redirect('/dashboard');

  const params = await searchParams;
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const from = params.from ?? sevenDaysAgo.toISOString().split('T')[0];
  const to = params.to ?? new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const pageSize = 50;

  const [summary, { rows: logs, total }] = await Promise.all([
    getAiLogsSummary(from, to),
    getAiLogsList(from, to, page, pageSize),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const COST_ESTIMATE_MULTIPLIER = 0.5 / 1_000_000;

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary-text mb-6">AI Call Logs</h1>

      {/* Date range info */}
      <p className="text-muted-text text-sm mb-6">
        Showing data from <span className="text-primary-text">{from}</span> to <span className="text-primary-text">{to}</span>
        {' '}({total} calls)
      </p>

      {/* Summary table */}
      <h2 className="text-lg font-semibold text-primary-text mb-3">Summary by Label</h2>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border border-border">
          <thead>
            <tr className="bg-surface">
              <th className="text-left p-3 border-b border-border text-muted-text font-medium">Label</th>
              <th className="text-right p-3 border-b border-border text-muted-text font-medium">Count</th>
              <th className="text-right p-3 border-b border-border text-muted-text font-medium">Input Tokens</th>
              <th className="text-right p-3 border-b border-border text-muted-text font-medium">Output Tokens</th>
              <th className="text-right p-3 border-b border-border text-muted-text font-medium">Cost Score</th>
              <th className="text-right p-3 border-b border-border text-muted-text font-medium">Cost Estimate</th>
              <th className="text-right p-3 border-b border-border text-muted-text font-medium">Avg Duration</th>
            </tr>
          </thead>
          <tbody>
            {summary.length === 0 && (
              <tr><td colSpan={7} className="p-3 text-muted-text text-center">No data</td></tr>
            )}
            {summary.map((row) => (
              <tr key={row.label} className="border-b border-border">
                <td className="p-3 text-primary-text font-mono">{row.label}</td>
                <td className="p-3 text-right text-primary-text">{row.count.toLocaleString()}</td>
                <td className="p-3 text-right text-primary-text">{row.total_input_tokens.toLocaleString()}</td>
                <td className="p-3 text-right text-primary-text">{row.total_output_tokens.toLocaleString()}</td>
                <td className="p-3 text-right text-primary-text">{row.cost_score.toLocaleString()}</td>
                <td className="p-3 text-right text-primary-text">${(row.cost_score * COST_ESTIMATE_MULTIPLIER).toFixed(6)}</td>
                <td className="p-3 text-right text-primary-text">{row.avg_duration_ms.toLocaleString()}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent calls list */}
      <h2 className="text-lg font-semibold text-primary-text mb-3">Recent Calls</h2>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border border-border">
          <thead>
            <tr className="bg-surface">
              <th className="text-left p-3 border-b border-border text-muted-text font-medium">Time</th>
              <th className="text-left p-3 border-b border-border text-muted-text font-medium">Label</th>
              <th className="text-left p-3 border-b border-border text-muted-text font-medium">Model</th>
              <th className="text-right p-3 border-b border-border text-muted-text font-medium">In</th>
              <th className="text-right p-3 border-b border-border text-muted-text font-medium">Out</th>
              <th className="text-right p-3 border-b border-border text-muted-text font-medium">Cost Score</th>
              <th className="text-right p-3 border-b border-border text-muted-text font-medium">Cost Estimate</th>
              <th className="text-right p-3 border-b border-border text-muted-text font-medium">Duration</th>
              <th className="text-left p-3 border-b border-border text-muted-text font-medium">Input</th>
              <th className="text-left p-3 border-b border-border text-muted-text font-medium">Output</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr><td colSpan={10} className="p-3 text-muted-text text-center">No calls found</td></tr>
            )}
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-border">
                <td className="p-3 text-muted-text whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="p-3 text-primary-text font-mono">{log.label}</td>
                <td className="p-3 text-muted-text font-mono text-xs">{log.model}</td>
                <td className="p-3 text-right text-primary-text">{log.input_tokens?.toLocaleString() ?? '-'}</td>
                <td className="p-3 text-right text-primary-text">{log.output_tokens?.toLocaleString() ?? '-'}</td>
                {(() => {
                  const costScore = (log.input_tokens ?? 0) + 6 * (log.output_tokens ?? 0);
                  return (
                    <>
                      <td className="p-3 text-right text-primary-text">{costScore.toLocaleString()}</td>
                      <td className="p-3 text-right text-primary-text">${(costScore * COST_ESTIMATE_MULTIPLIER).toFixed(6)}</td>
                    </>
                  );
                })()}
                <td className="p-3 text-right text-primary-text whitespace-nowrap">{log.duration_ms.toLocaleString()}ms</td>
                <td className="p-3 max-w-xs">
                  <ExpandableText text={log.input_text} />
                </td>
                <td className="p-3 max-w-xs">
                  <ExpandableText text={log.output_text} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-3 text-sm">
          {page > 1 && (
            <a href={`?from=${from}&to=${to}&page=${page - 1}`} className="text-accent-blue hover:underline">
              Previous
            </a>
          )}
          <span className="text-muted-text">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <a href={`?from=${from}&to=${to}&page=${page + 1}`} className="text-accent-blue hover:underline">
              Next
            </a>
          )}
        </div>
      )}
    </div>
  );
}
