import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { getUserPromotions } from '@/lib/db/queries/promotions';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const promotions = await getUserPromotions(userId);
    return NextResponse.json(promotions);
  } catch (err) {
    console.error('GET /api/promotions error:', err);
    return NextResponse.json({ error: 'UNKNOWN' }, { status: 500 });
  }
}
