import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { getLatestPaymentByUserId } from '@/lib/db/queries/payments';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const payment = await getLatestPaymentByUserId(userId);
    if (!payment) {
      return NextResponse.json({ status: 'none' });
    }

    return NextResponse.json({ status: payment.status });
  } catch (err) {
    console.error('GET /api/subscription/payment-status error:', err);
    return NextResponse.json({ error: 'UNKNOWN' }, { status: 500 });
  }
}
