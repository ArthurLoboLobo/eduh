import { sql } from '@/lib/db/connection';

export type File = {
  id: string;
  section_id: string;
  blob_url: string;
  original_name: string;
  file_type: string;
  size_bytes: number;
  status: string;
  extracted_text: string | null;
  created_at: Date;
};

export async function listFiles(sectionId: string): Promise<File[]> {
  const rows = await sql`
    SELECT * FROM files WHERE section_id = ${sectionId} ORDER BY created_at ASC
  `;
  return rows as File[];
}
