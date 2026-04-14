import { neon } from '@neondatabase/serverless';

/**
 * Returns a fresh sql connection using the test DATABASE_URL.
 * Use this instead of importing from @/lib/db/connection
 * to ensure tests always hit the test DB.
 */
export function getTestSql() {
  return neon(process.env.DATABASE_URL!);
}

/**
 * Truncate all tables. Call in beforeEach() for test isolation.
 * CASCADE handles foreign key dependencies.
 */
export async function cleanDatabase() {
  const sql = getTestSql();
  await sql`TRUNCATE
    messages, chat_summaries, chats, embeddings,
    subtopics, topics, plan_drafts, files,
    daily_usage, payments, promotion_claims,
    sections, otp_codes, users
    CASCADE`;
}

/**
 * Insert a minimal test user. Returns { id, email }.
 */
export async function createTestUser(email = 'test@example.com') {
  const sql = getTestSql();
  const rows = await sql`
    INSERT INTO users (email) VALUES (${email})
    RETURNING id, email
  `;
  return rows[0] as { id: string; email: string };
}
