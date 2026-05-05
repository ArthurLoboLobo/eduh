import { sql } from '@/lib/db/connection';

export type Message = {
  id: number;
  chat_id: string;
  role: string;
  content: string;
  created_at: Date;
};

export async function getMessage(messageId: number): Promise<Message | null> {
  const rows = await sql`
    SELECT * FROM messages WHERE id = ${messageId} LIMIT 1
  `;
  return (rows[0] as Message) ?? null;
}

export async function getMessages(chatId: string): Promise<Message[]> {
  const rows = await sql`
    SELECT * FROM messages WHERE chat_id = ${chatId} ORDER BY id ASC
  `;
  return rows as Message[];
}

export async function getMessagesAfterSummary(chatId: string): Promise<Message[]> {
  const rows = await sql`
    SELECT m.* FROM messages m
    LEFT JOIN chat_summaries cs ON cs.chat_id = m.chat_id
    WHERE m.chat_id = ${chatId}
      AND (cs.summarized_up_to_message_id IS NULL OR m.id > cs.summarized_up_to_message_id)
    ORDER BY m.id ASC
  `;
  return rows as Message[];
}

export async function createMessage(chatId: string, role: string, content: string): Promise<Message> {
  const rows = await sql`
    INSERT INTO messages (chat_id, role, content) VALUES (${chatId}, ${role}, ${content}) RETURNING *
  `;
  return rows[0] as Message;
}

export async function createMessageIfChatEmpty(
  chatId: string,
  role: string,
  content: string,
): Promise<Message | null> {
  const results = await sql.transaction((tx) => [
    tx`SELECT pg_advisory_xact_lock(hashtext(${chatId}))`,
    tx`
      INSERT INTO messages (chat_id, role, content)
      SELECT ${chatId}, ${role}, ${content}
      WHERE NOT EXISTS (
        SELECT 1 FROM messages WHERE chat_id = ${chatId}
      )
      RETURNING *
    `,
  ]);
  const rows = results[1] as Message[];
  return rows[0] ?? null;
}

export async function deleteMessagesFrom(chatId: string, messageId: number): Promise<void> {
  await sql`
    DELETE FROM messages WHERE chat_id = ${chatId} AND id >= ${messageId}
  `;
}

export async function getMessageCountLastMinute(userId: string): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM messages m
    JOIN chats c ON c.id = m.chat_id
    JOIN sections s ON s.id = c.section_id
    WHERE s.user_id = ${userId}
      AND m.role = 'user'
      AND m.created_at > NOW() - INTERVAL '1 minute'
  `;
  return (rows[0] as { count: number }).count;
}
