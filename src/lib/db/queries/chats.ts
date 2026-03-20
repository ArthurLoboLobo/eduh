import { sql } from '@/lib/db/connection';

export type Chat = {
  id: string;
  section_id: string;
  topic_id: string | null;
  type: string;
  created_at: Date;
};

export async function createChatsForSection(
  sectionId: string,
  topicIds: string[],
): Promise<void> {
  const queries = [];

  for (const topicId of topicIds) {
    queries.push(
      sql`INSERT INTO chats (id, section_id, topic_id, type)
          VALUES (${crypto.randomUUID()}, ${sectionId}, ${topicId}, 'topic')`,
    );
  }

  // One revision chat per section
  queries.push(
    sql`INSERT INTO chats (id, section_id, topic_id, type)
        VALUES (${crypto.randomUUID()}, ${sectionId}, ${null}, 'revision')`,
  );

  await sql.transaction(queries);
}

export async function getRevisionChat(sectionId: string): Promise<Chat | null> {
  const rows = await sql`
    SELECT * FROM chats WHERE section_id = ${sectionId} AND type = 'revision' LIMIT 1
  `;
  return (rows[0] as Chat) ?? null;
}

export async function verifyChatOwnership(chatId: string, userId: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM chats c
    JOIN sections s ON s.id = c.section_id
    WHERE c.id = ${chatId} AND s.user_id = ${userId}
    LIMIT 1
  `;
  return rows.length > 0;
}

export type ChatWithDetails = {
  id: string;
  section_id: string;
  topic_id: string | null;
  type: string;
  section_name: string;
  topic_title: string | null;
};

export async function getChat(chatId: string): Promise<ChatWithDetails | null> {
  const rows = await sql`
    SELECT c.id, c.section_id, c.topic_id, c.type,
           s.name AS section_name,
           t.title AS topic_title
    FROM chats c
    JOIN sections s ON s.id = c.section_id
    LEFT JOIN topics t ON t.id = c.topic_id
    WHERE c.id = ${chatId}
    LIMIT 1
  `;
  return (rows[0] as ChatWithDetails) ?? null;
}
