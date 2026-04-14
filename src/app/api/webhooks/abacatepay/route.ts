import { NextRequest, NextResponse } from 'next/server';
import { getPaymentByAbacatepayId, markPaymentPaid } from '@/lib/db/queries/payments';
import { updateUserBalance } from '@/lib/db/queries/users';
import { sql } from '@/lib/db/connection';

export function verifyWebhookSecret(secret: string | null): boolean {
  return !!secret && !!process.env.ABACATEPAY_WEBHOOK_SECRET && secret === process.env.ABACATEPAY_WEBHOOK_SECRET;
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const secret = url.searchParams.get('webhookSecret');
    if (!verifyWebhookSecret(secret)) {
      return NextResponse.json({ error: 'INVALID_SECRET' }, { status: 401 });
    }

    const payload = await request.json();

    if (payload.event !== 'billing.paid') {
      return NextResponse.json({ ok: true });
    }

    const abacatepayId = payload.data.pixQrCode.id as string;
    const payment = await getPaymentByAbacatepayId(abacatepayId);

    if (!payment) {
      console.warn('Webhook: unknown abacatepayId', abacatepayId);
      return NextResponse.json({ ok: true });
    }

    if (payment.status === 'paid') {
      return NextResponse.json({ ok: true });
    }

    if (payment.status === 'invalidated') {
      await updateUserBalance(payment.userId, payment.amount);
      await markPaymentPaid(payment.id);
      return NextResponse.json({ ok: true });
    }

    // pending — happy path
    await sql.transaction([
      sql`UPDATE users SET balance = balance - ${payment.creditsToDebit} WHERE id = ${payment.userId}`,
      sql`UPDATE users SET plan = 'pro', plan_expires_at = now() + INTERVAL '30 days' WHERE id = ${payment.userId}`,
      sql`UPDATE payments SET status = 'paid', updated_at = now() WHERE id = ${payment.id}`,
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/webhooks/abacatepay error:', err);
    return NextResponse.json({ error: 'UNKNOWN' }, { status: 500 });
  }
}
