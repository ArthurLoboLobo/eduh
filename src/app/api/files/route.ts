import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getUserIdFromRequest } from '@/lib/auth';
import { verifySectionOwnership, getSection } from '@/lib/db/queries/sections';
import { createFile, getTotalSizeForSection } from '@/lib/db/queries/files';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heif',
  'image/heic',
]);

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB
const MAX_SECTION_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const formData = await request.formData();
    const sectionId = formData.get('sectionId') as string | null;
    const file = formData.get('file') as globalThis.File | null;

    if (!sectionId || !file) {
      return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 });
    }

    const owns = await verifySectionOwnership(sectionId, userId);
    if (!owns) {
      return NextResponse.json({ error: 'SECTION_NOT_FOUND' }, { status: 404 });
    }

    const section = await getSection(sectionId);
    if (!section || section.status !== 'uploading') {
      return NextResponse.json({ error: 'INVALID_SECTION_STATUS' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'INVALID_FILE_TYPE' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'FILE_TOO_LARGE' }, { status: 400 });
    }

    const currentTotal = await getTotalSizeForSection(sectionId);
    if (currentTotal + file.size > MAX_SECTION_SIZE) {
      return NextResponse.json({ error: 'SIZE_LIMIT_EXCEEDED' }, { status: 409 });
    }

    const blob = await put(file.name, file, { access: 'public' });

    const dbFile = await createFile(
      sectionId,
      blob.url,
      file.name,
      file.type,
      file.size,
    );

    return NextResponse.json({ file: dbFile }, { status: 201 });
  } catch (err) {
    console.error('POST /api/files error:', err);
    return NextResponse.json({ error: 'UNKNOWN' }, { status: 500 });
  }
}
