import { sql } from '@/lib/db/connection';

export type Payment = {
  id: string;
  userId: string;
  abacatepayId: string;
  amount: number;
  creditsToDebit: number;
  status: 'pending' | 'paid' | 'invalidated';
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

const PAYMENT_COLUMNS = `
  id, user_id AS "userId", abacatepay_id AS "abacatepayId",
  amount, credits_to_debit AS "creditsToDebit", status,
  metadata, created_at AS "createdAt", updated_at AS "updatedAt"
`;

export async function createPayment(
  userId: string,
  abacatepayId: string,
  amount: number,
  creditsToDebit: number,
  metadata: Record<string, unknown> | null = null
): Promise<Payment> {
  const rows = await sql`
    INSERT INTO payments (user_id, abacatepay_id, amount, credits_to_debit, metadata)
    VALUES (${userId}, ${abacatepayId}, ${amount}, ${creditsToDebit}, ${JSON.stringify(metadata)})
    RETURNING ${sql.unsafe(PAYMENT_COLUMNS)}
  `;
  return rows[0] as Payment;
}

export async function getActivePaymentByUserId(userId: string): Promise<Payment | null> {
  const rows = await sql`
    SELECT ${sql.unsafe(PAYMENT_COLUMNS)}
    FROM payments
    WHERE user_id = ${userId} AND status = 'pending'
    LIMIT 1
  `;
  return (rows[0] as Payment) ?? null;
}

export async function getPaymentByAbacatepayId(abacatepayId: string): Promise<Payment | null> {
  const rows = await sql`
    SELECT ${sql.unsafe(PAYMENT_COLUMNS)}
    FROM payments
    WHERE abacatepay_id = ${abacatepayId}
    LIMIT 1
  `;
  return (rows[0] as Payment) ?? null;
}

export async function invalidateUserPayments(userId: string): Promise<void> {
  await sql`
    UPDATE payments SET status = 'invalidated', updated_at = now()
    WHERE user_id = ${userId} AND status = 'pending'
  `;
}

export async function getLatestPaymentByUserId(userId: string): Promise<Payment | null> {
  const rows = await sql`
    SELECT ${sql.unsafe(PAYMENT_COLUMNS)}
    FROM payments
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return (rows[0] as Payment) ?? null;
}

export async function markPaymentPaid(paymentId: string): Promise<void> {
  await sql`
    UPDATE payments SET status = 'paid', updated_at = now()
    WHERE id = ${paymentId}
  `;
}
