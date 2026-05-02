import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { listSections, createSection } from '@/lib/db/queries/sections';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const sections = await listSections(userId);
    return NextResponse.json({ sections });
  } catch (err) {
    console.error('GET /api/sections error:', err);
    return NextResponse.json({ error: 'UNKNOWN' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const name = body?.name?.trim();

    if (!name) {
      return NextResponse.json({ error: 'NAME_MISSING' }, { status: 400 });
    }

    const section = await createSection(userId, name);
    return NextResponse.json({ section }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === 'MAX_SECTIONS_REACHED') {
      return NextResponse.json({ error: 'MAX_SECTIONS_REACHED' }, { status: 409 });
    }
    console.error('POST /api/sections error:', err);
    return NextResponse.json({ error: 'UNKNOWN' }, { status: 500 });
  }
}
