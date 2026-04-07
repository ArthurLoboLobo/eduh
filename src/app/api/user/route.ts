import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { getUserById } from '@/lib/db/queries/users';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const user = await getUserById(userId);
    return NextResponse.json(user);
  } catch (err) {
    console.error('GET /api/user error:', err);
    return NextResponse.json({ error: 'UNKNOWN' }, { status: 500 });
  }
}
