import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { getUserIdFromRequest } from '@/lib/auth';
import { verifySectionOwnership, getSection, deleteSection } from '@/lib/db/queries/sections';
import { listFiles } from '@/lib/db/queries/files';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { id } = await params;
    const owns = await verifySectionOwnership(id, userId);
    if (!owns) {
      return NextResponse.json({ error: 'SECTION_NOT_FOUND' }, { status: 404 });
    }

    const section = await getSection(id);
    return NextResponse.json({ section });
  } catch (err) {
    console.error('GET /api/sections/:id error:', err);
    return NextResponse.json({ error: 'UNKNOWN' }, { status: 500 });
  }
}

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
    const owns = await verifySectionOwnership(id, userId);
    if (!owns) {
      return NextResponse.json({ error: 'SECTION_NOT_FOUND' }, { status: 404 });
    }

    // Delete all associated files from Vercel Blob
    const files = await listFiles(id);
    const blobUrls = files.map((f) => f.blob_url).filter(Boolean);
    if (blobUrls.length > 0) {
      await del(blobUrls);
    }

    await deleteSection(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/sections/:id error:', err);
    return NextResponse.json({ error: 'UNKNOWN' }, { status: 500 });
  }
}
