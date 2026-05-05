import { sql } from '@/lib/db/connection';
import { normalizeEmail } from '@/lib/email';

export type User = {
  id: string;
  email: string;
  plan: 'free' | 'pro';
  planExpiresAt: Date | null;
  balance: number;
  createdAt: Date;
};

export type OtpCode = {
  id: string;
  user_id: string;
  code: string;
  attempts: number;
  expires_at: Date;
  created_at: Date;
};

export async function findUserByEmail(email: string): Promise<User | null> {
  const normalized = normalizeEmail(email);
  const rows = await sql`SELECT * FROM users WHERE email = ${normalized} LIMIT 1`;
  return (rows[0] as User) ?? null;
}

export async function createUser(email: string): Promise<User> {
  const normalized = normalizeEmail(email);
  const rows = await sql`INSERT INTO users (email) VALUES (${normalized}) RETURNING *`;
  return rows[0] as User;
}

export async function createOtpCode(
  userId: string,
  code: string,
  expiresAt: Date
): Promise<void> {
  await sql`
    INSERT INTO otp_codes (user_id, code, expires_at)
    VALUES (${userId}, ${code}, ${expiresAt})
  `;
}

export type OtpCodeWithElapsed = OtpCode & { elapsed_seconds: number };

export async function getLatestOtpCode(userId: string): Promise<OtpCodeWithElapsed | null> {
  const rows = await sql`
    SELECT *, EXTRACT(EPOCH FROM (now() - created_at))::int AS elapsed_seconds
    FROM otp_codes
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return (rows[0] as OtpCodeWithElapsed) ?? null;
}

export async function incrementOtpAttempts(otpId: string): Promise<void> {
  await sql`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ${otpId}`;
}

export async function deleteOtpCodes(userId: string): Promise<void> {
  await sql`DELETE FROM otp_codes WHERE user_id = ${userId}`;
}

export async function getUserById(userId: string): Promise<User> {
  // Try to expire a stale pro plan in-place
  const expired = await sql`
    UPDATE users
    SET plan = 'free', plan_expires_at = NULL
    WHERE id = ${userId} AND plan = 'pro' AND plan_expires_at < now()
    RETURNING id, email, plan, plan_expires_at AS "planExpiresAt", balance, created_at AS "createdAt"
  `;
  if (expired.length > 0) {
    return expired[0] as User;
  }

  const rows = await sql`
    SELECT id, email, plan, plan_expires_at AS "planExpiresAt", balance, created_at AS "createdAt"
    FROM users WHERE id = ${userId}
  `;
  return rows[0] as User;
}

export async function updateUserBalance(userId: string, deltaAmount: number): Promise<number> {
  const rows = await sql`
    UPDATE users
    SET balance = balance + ${deltaAmount}
    WHERE id = ${userId} AND balance + ${deltaAmount} >= 0
    RETURNING balance
  `;
  if (rows.length === 0) {
    throw new Error('Insufficient balance');
  }
  return rows[0].balance as number;
}

export async function activateProPlan(userId: string): Promise<void> {
  await sql`
    UPDATE users
    SET plan = 'pro', plan_expires_at = now() + INTERVAL '30 days'
    WHERE id = ${userId}
  `;
}
