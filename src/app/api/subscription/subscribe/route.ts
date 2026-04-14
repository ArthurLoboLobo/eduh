import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { getUserById } from '@/lib/db/queries/users';
import { invalidateUserPayments, createPayment } from '@/lib/db/queries/payments';
import { createPixQrCode } from '@/lib/abacatepay';
import { SUBSCRIPTION_PRICE_CENTS, PIX_EXPIRATION_SECONDS } from '@/config/subscription';
import { sql } from '@/lib/db/connection';

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const user = await getUserById(userId);
    if (user.plan === 'pro') {
      return NextResponse.json({ error: 'ALREADY_PRO' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const useCredits = body?.useCredits === true;

    await invalidateUserPayments(userId);

    const creditsToDebit = useCredits ? Math.min(user.balance, SUBSCRIPTION_PRICE_CENTS) : 0;
    const pixAmount = SUBSCRIPTION_PRICE_CENTS - creditsToDebit;

    if (pixAmount === 0) {
      await sql.transaction([
        sql`UPDATE users SET balance = balance - ${creditsToDebit} WHERE id = ${userId}`,
        sql`UPDATE users SET plan = 'pro', plan_expires_at = now() + INTERVAL '30 days' WHERE id = ${userId}`,
      ]);
      return NextResponse.json({ status: 'activated' });
    }

    let qrResponse;
    try {
      qrResponse = await createPixQrCode({
        amount: pixAmount,
        expiresIn: PIX_EXPIRATION_SECONDS,
        description: 'Eduh Pro',
        metadata: { userId, creditsToDebit },
      });
    } catch {
      return NextResponse.json({ error: 'PAYMENT_CREATION_FAILED' }, { status: 502 });
    }

    const payment = await createPayment(userId, qrResponse.id, pixAmount, creditsToDebit, qrResponse);

    return NextResponse.json({
      status: 'pending',
      brCode: qrResponse.brCode,
      brCodeBase64: qrResponse.brCodeBase64,
      expiresAt: qrResponse.expiresAt,
      paymentId: payment.id,
    });
  } catch (err) {
    console.error('POST /api/subscription/subscribe error:', err);
    return NextResponse.json({ error: 'UNKNOWN' }, { status: 500 });
  }
}
