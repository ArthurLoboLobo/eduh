import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import {
  findUserByEmail,
  createUser,
  createOtpCode,
  getLatestOtpCode,
  deleteOtpCodes,
} from '@/lib/db/queries/users';
import { normalizeEmail } from '@/lib/email';

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Language = 'pt-BR' | 'en';

const EMAIL_CONTENT: Record<Language, { subject: string; body: (code: string) => string }> = {
  'pt-BR': {
    subject: 'Seu código de acesso ao Eduh',
    body: (code) => `Seu código de acesso é: ${code}\n\nEle expira em 10 minutos.`,
  },
  en: {
    subject: 'Your Eduh access code',
    body: (code) => `Your access code is: ${code}\n\nIt expires in 10 minutes.`,
  },
};

export async function POST(request: Request) {
  try {
    if (!process.env.RESEND_FROM_EMAIL) {
      console.error('RESEND_FROM_EMAIL is not set');
      return NextResponse.json({ error: 'CONFIG_ERROR' }, { status: 500 });
    }

    const body = await request.json().catch(() => null);
    const email = typeof body?.email === 'string' ? normalizeEmail(body.email) : '';
    const language: Language = body?.language === 'en' ? 'en' : 'pt-BR';

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'EMAIL_INVALID' }, { status: 400 });
    }

    let user = await findUserByEmail(email);
    if (!user) {
      user = await createUser(email);
    }

    const existing = await getLatestOtpCode(user.id);
    if (existing && existing.elapsed_seconds < 60) {
      return NextResponse.json(
        { error: 'RATE_LIMITED', retryAfterSeconds: 60 - existing.elapsed_seconds },
        { status: 429 }
      );
    }

    await deleteOtpCodes(user.id);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await createOtpCode(user.id, code, expiresAt);

    const { subject, body: bodyFn } = EMAIL_CONTENT[language];
    const { error: sendError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: email,
      subject,
      text: bodyFn(code),
    });

    if (sendError) {
      console.error('Resend error:', sendError);
      return NextResponse.json({ error: 'EMAIL_SEND_FAILED' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('send-code error:', err);
    return NextResponse.json({ error: 'UNKNOWN' }, { status: 500 });
  }
}
