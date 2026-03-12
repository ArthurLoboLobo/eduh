import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { getUserIdFromRequest } from '@/lib/auth';
import { getSection, deleteSection } from '@/lib/db/queries/sections';
import { sql } from '@/lib/db/connection';

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
    const section = await getSection(id, userId);
    if (!section) {
      return NextResponse.json({ error: 'SECTION_NOT_FOUND' }, { status: 404 });
    }

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
    const section = await getSection(id, userId);
    if (!section) {
      return NextResponse.json({ error: 'SECTION_NOT_FOUND' }, { status: 404 });
    }

    // Delete all associated files from Vercel Blob
    const fileRows = await sql`SELECT blob_url FROM files WHERE section_id = ${id}`;
    if (fileRows.length > 0) {
      const blobUrls = fileRows.map((r) => (r as { blob_url: string }).blob_url);
      await del(blobUrls);
    }

    await deleteSection(id, userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/sections/:id error:', err);
    return NextResponse.json({ error: 'UNKNOWN' }, { status: 500 });
  }
}
