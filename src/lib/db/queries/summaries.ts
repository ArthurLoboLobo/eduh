import { sql } from '@/lib/db/connection';

export type Summary = {
  id: string;
  chat_id: string;
  summary_text: string;
  summarized_up_to_message_id: number;
  created_at: Date;
};

export async function getSummary(chatId: string): Promise<Summary | null> {
  const rows = await sql`
    SELECT * FROM chat_summaries WHERE chat_id = ${chatId} LIMIT 1
  `;
  return (rows[0] as Summary) ?? null;
}

export async function upsertSummary(
  chatId: string,
  summaryText: string,
  summarizedUpToMessageId: number,
): Promise<void> {
  const existing = await getSummary(chatId);
  if (existing) {
    await sql`
      UPDATE chat_summaries
      SET summary_text = ${summaryText}, summarized_up_to_message_id = ${summarizedUpToMessageId}
      WHERE id = ${existing.id}
    `;
  } else {
    await sql`
      INSERT INTO chat_summaries (id, chat_id, summary_text, summarized_up_to_message_id)
      VALUES (${crypto.randomUUID()}, ${chatId}, ${summaryText}, ${summarizedUpToMessageId})
    `;
  }
}
