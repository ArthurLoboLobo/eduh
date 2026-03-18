import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { getUserIdFromRequest } from '@/lib/auth';
import { verifyFileOwnership, getFile, deleteFile } from '@/lib/db/queries/files';

export async function DELETE(
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

    if (file.blob_url) {
      await del(file.blob_url);
    }

    await deleteFile(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/files/:id error:', err);
    return NextResponse.json({ error: 'UNKNOWN' }, { status: 500 });
  }
}
