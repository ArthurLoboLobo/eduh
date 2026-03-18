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

export type FileStatus = {
  id: string;
  original_name: string;
  status: string;
};

export async function listFiles(sectionId: string): Promise<File[]> {
  const rows = await sql`
    SELECT * FROM files WHERE section_id = ${sectionId} ORDER BY created_at ASC
  `;
  return rows as File[];
}

export async function verifyFileOwnership(fileId: string, userId: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM files f
    JOIN sections s ON s.id = f.section_id
    WHERE f.id = ${fileId} AND s.user_id = ${userId}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function listFileStatuses(sectionId: string): Promise<FileStatus[]> {
  const rows = await sql`
    SELECT id, original_name, status FROM files
    WHERE section_id = ${sectionId}
    ORDER BY created_at ASC
  `;
  return rows as FileStatus[];
}

export async function createFile(
  sectionId: string,
  blobUrl: string,
  originalName: string,
  fileType: string,
  sizeBytes: number,
): Promise<File> {
  const rows = await sql`
    INSERT INTO files (section_id, blob_url, original_name, file_type, size_bytes, status, created_at)
    VALUES (${sectionId}, ${blobUrl}, ${originalName}, ${fileType}, ${sizeBytes}, 'uploading', now())
    RETURNING *
  `;
  return rows[0] as File;
}

export async function updateFileStatus(fileId: string, status: string): Promise<void> {
  await sql`
    UPDATE files SET status = ${status} WHERE id = ${fileId}
  `;
}

export async function updateFileExtractedText(fileId: string, extractedText: string): Promise<void> {
  await sql`
    UPDATE files SET extracted_text = ${extractedText}, status = 'processed' WHERE id = ${fileId}
  `;
}

export async function deleteFile(fileId: string): Promise<void> {
  await sql`
    DELETE FROM files WHERE id = ${fileId}
  `;
}

export async function getFile(fileId: string): Promise<File | null> {
  const rows = await sql`
    SELECT * FROM files WHERE id = ${fileId} LIMIT 1
  `;
  return (rows[0] as File) ?? null;
}

export async function getTotalSizeForSection(sectionId: string): Promise<number> {
  const rows = await sql`
    SELECT COALESCE(SUM(size_bytes), 0)::int AS total FROM files WHERE section_id = ${sectionId}
  `;
  return (rows[0] as { total: number }).total;
}
