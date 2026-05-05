import { NextResponse } from 'next/server';
import {
  findUserByEmail,
  getLatestOtpCode,
  incrementOtpAttempts,
  deleteOtpCodes,
} from '@/lib/db/queries/users';
import { signToken, setAuthCookie } from '@/lib/auth';
import { normalizeEmail } from '@/lib/email';

const MAX_ATTEMPTS = 3;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === 'string' ? normalizeEmail(body.email) : '';
    const code = body?.code?.trim();

    if (!email) return NextResponse.json({ error: 'EMAIL_MISSING' }, { status: 400 });
    if (!code) return NextResponse.json({ error: 'CODE_MISSING' }, { status: 400 });

    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 400 });
    }

    const otp = await getLatestOtpCode(user.id);
    if (!otp) {
      return NextResponse.json({ error: 'OTP_NOT_FOUND' }, { status: 400 });
    }

    if (new Date(otp.expires_at) < new Date()) {
      return NextResponse.json({ error: 'OTP_EXPIRED' }, { status: 400 });
    }

    if (otp.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: 'OTP_MAX_ATTEMPTS' }, { status: 400 });
    }

    if (code !== otp.code) {
      await incrementOtpAttempts(otp.id);
      const newAttempts = otp.attempts + 1;
      const errorCode = newAttempts >= MAX_ATTEMPTS ? 'OTP_MAX_ATTEMPTS' : 'OTP_INVALID';
      return NextResponse.json({ error: errorCode }, { status: 400 });
    }

    await deleteOtpCodes(user.id);

    const token = await signToken(user.id);
    const response = NextResponse.json({ success: true });
    setAuthCookie(response, token);

    return response;
  } catch (err) {
    console.error('verify-code error:', err);
    return NextResponse.json({ error: 'UNKNOWN' }, { status: 500 });
  }
}
