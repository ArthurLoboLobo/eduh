import { sql } from '@/lib/db/connection';

export type Section = {
  id: string;
  user_id: string;
  name: string;
  status: string;
  created_at: Date;
};

export type SectionWithProgress = Section & {
  total_topics: number;
  completed_topics: number;
};

export async function listSections(userId: string): Promise<SectionWithProgress[]> {
  const rows = await sql`
    SELECT
      s.*,
      COUNT(t.id)::int AS total_topics,
      COUNT(CASE WHEN t.is_completed THEN 1 END)::int AS completed_topics
    FROM sections s
    LEFT JOIN topics t ON t.section_id = s.id
    WHERE s.user_id = ${userId}
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `;
  return rows as SectionWithProgress[];
}

export async function createSection(
  userId: string,
  name: string,
): Promise<Section> {
  const countRows = await sql`
    SELECT COUNT(*)::int AS count FROM sections WHERE user_id = ${userId}
  `;
  const count = (countRows[0] as { count: number }).count;
  if (count >= 10) {
    throw new Error('MAX_SECTIONS_REACHED');
  }

  const rows = await sql`
    INSERT INTO sections (user_id, name, status, created_at)
    VALUES (${userId}, ${name}, 'uploading', now())
    RETURNING *
  `;
  return rows[0] as Section;
}

export async function verifySectionOwnership(sectionId: string, userId: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM sections WHERE id = ${sectionId} AND user_id = ${userId} LIMIT 1
  `;
  return rows.length > 0;
}

export async function getSection(sectionId: string): Promise<Section | null> {
  const rows = await sql`
    SELECT * FROM sections WHERE id = ${sectionId} LIMIT 1
  `;
  return (rows[0] as Section) ?? null;
}

export async function deleteSection(sectionId: string): Promise<void> {
  await sql`
    DELETE FROM sections WHERE id = ${sectionId}
  `;
}

export async function updateSectionStatus(sectionId: string, status: string): Promise<void> {
  await sql`
    UPDATE sections SET status = ${status} WHERE id = ${sectionId}
  `;
}
