import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { verifySectionOwnership } from '@/lib/db/queries/sections';
import { listFileStatuses } from '@/lib/db/queries/files';

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

    const statuses = await listFileStatuses(id);
    return NextResponse.json({ statuses });
  } catch (err) {
    console.error('GET /api/sections/:id/files/status error:', err);
    return NextResponse.json({ error: 'UNKNOWN' }, { status: 500 });
  }
}
