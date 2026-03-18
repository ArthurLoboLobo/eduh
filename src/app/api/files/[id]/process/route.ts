import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import {
  verifyFileOwnership,
  getFile,
  updateFileStatus,
  updateFileExtractedText,
} from '@/lib/db/queries/files';
import { extractTextFromFile } from '@/lib/ai';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { id } = await params;
    const owns = await verifyFileOwnership(id, userId);
    if (!owns) {
      return NextResponse.json({ error: 'FILE_NOT_FOUND' }, { status: 404 });
    }

    const file = await getFile(id);
    if (!file) {
      return NextResponse.json({ error: 'FILE_NOT_FOUND' }, { status: 404 });
    }

    if (file.status === 'processed') {
      return NextResponse.json({ error: 'ALREADY_PROCESSED' }, { status: 409 });
    }

    await updateFileStatus(id, 'processing');

    try {
      const response = await fetch(file.blob_url);
      if (!response.ok) {
        throw new Error(`Failed to download file from Blob: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const extractedText = await extractTextFromFile(buffer, file.file_type);

      await updateFileExtractedText(id, extractedText);

      return NextResponse.json({ success: true, status: 'processed' });
    } catch (extractionError) {
      console.error(`File ${id} extraction failed:`, extractionError);
      await updateFileStatus(id, 'error');
      return NextResponse.json({ error: 'EXTRACTION_FAILED' }, { status: 500 });
    }
  } catch (err) {
    console.error('POST /api/files/:id/process error:', err);
    return NextResponse.json({ error: 'UNKNOWN' }, { status: 500 });
  }
}
