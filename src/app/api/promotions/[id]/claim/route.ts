import { NextRequest, NextResponse } from 'next/server';
import { NeonDbError } from '@neondatabase/serverless';
import { getUserIdFromRequest } from '@/lib/auth';
import { getUserPromotion, claimPromo } from '@/lib/db/queries/promotions';

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
    const promo = await getUserPromotion(userId, id);
    if (!promo) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    if (!promo.eligible) {
      return NextResponse.json({ error: 'NOT_ELIGIBLE' }, { status: 400 });
    }
    if (promo.claimed) {
      return NextResponse.json({ error: 'ALREADY_CLAIMED' }, { status: 400 });
    }

    try {
      await claimPromo(userId, promo);
    } catch (err) {
      if (err instanceof NeonDbError && err.code === '23505') {
        return NextResponse.json({ error: 'ALREADY_CLAIMED' }, { status: 400 });
      }
      throw err;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/promotions/[id]/claim error:', err);
    return NextResponse.json({ error: 'UNKNOWN' }, { status: 500 });
  }
}
