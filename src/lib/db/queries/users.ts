import { sql } from '@/lib/db/connection';

export type User = {
  id: string;
  email: string;
  created_at: Date;
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
  const rows = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
  return (rows[0] as User) ?? null;
}

export async function createUser(email: string): Promise<User> {
  const rows = await sql`INSERT INTO users (email) VALUES (${email}) RETURNING *`;
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
