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

const EMAIL_STRINGS: Record<Language, { subject: string; title: string; description: string; footer: string; plainText: (code: string) => string }> = {
  'pt-BR': {
    subject: 'Seu código de acesso ao Eduh',
    title: 'Seu código de acesso',
    description: 'Use o código abaixo para entrar no Eduh. Ele expira em 10 minutos.',
    footer: 'Se você não solicitou este código, pode ignorar este email.',
    plainText: (code) => `Seu código de acesso é: ${code}\n\nEle expira em 10 minutos.`,
  },
  en: {
    subject: 'Your Eduh access code',
    title: 'Your access code',
    description: 'Use the code below to enter Eduh. It expires in 10 minutes.',
    footer: "If you didn't request this code, you can ignore this email.",
    plainText: (code) => `Your access code is: ${code}\n\nIt expires in 10 minutes.`,
  },
};

function buildEmailHtml(code: string, language: Language): string {
  const s = EMAIL_STRINGS[language];
  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Newsreader:wght@400;600&display=swap');
    :root { color-scheme: light dark; }
    body {
      margin: 0; padding: 0;
      background-color: transparent;
      font-family: Georgia, 'Times New Roman', serif;
      -webkit-text-size-adjust: 100%;
    }
    .wrapper { background-color: transparent; padding: 48px 20px; }
    .card {
      background-color: #eae5da;
      border-radius: 14px;
      max-width: 460px;
      margin: 0 auto;
      padding: 48px 40px 40px;
      text-align: center;
    }
    .brand {
      font-family: 'Newsreader', Georgia, serif;
      font-size: 26px;
      font-weight: 400;
      color: #1a1916;
      margin: 0 0 36px;
      letter-spacing: -0.3px;
    }
    .title {
      font-family: 'Newsreader', Georgia, serif;
      font-size: 20px;
      font-weight: 600;
      color: #1a1916;
      margin: 0 0 14px;
    }
    .description {
      font-family: Georgia, serif;
      font-size: 14px;
      color: #6b6660;
      line-height: 1.65;
      margin: 0 0 28px;
    }
    .code-box {
      background-color: #ffffff;
      border-radius: 10px;
      padding: 22px 24px;
      margin: 0 auto 28px;
      display: block;
    }
    .code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 38px;
      font-weight: 400;
      color: #7a1a1a;
      letter-spacing: 10px;
      margin: 0;
      text-indent: 10px;
      white-space: nowrap;
    }
    @media (max-width: 480px) {
      .card { padding: 36px 20px 28px; }
      .code { font-size: 28px; letter-spacing: 6px; text-indent: 6px; }
      .code-box { padding: 16px 12px; }
    }
    .footer {
      font-family: Georgia, serif;
      font-size: 12px;
      color: #9a9590;
      line-height: 1.55;
      margin: 0;
    }
    @media (prefers-color-scheme: dark) {
      body { background-color: transparent !important; }
      .wrapper { background-color: transparent !important; }
      .card { background-color: #242420 !important; }
      .brand { color: #f0ede6 !important; }
      .title { color: #f0ede6 !important; }
      .description { color: #aaa89f !important; }
      .code-box { background-color: #0f0e0b !important; }
      .code { color: #f0ede6 !important; }
      .footer { color: #777469 !important; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <p class="brand">Eduh</p>
      <p class="title">${s.title}</p>
      <p class="description">${s.description}</p>
      <div class="code-box">
        <p class="code">${code}</p>
      </div>
      <p class="footer">${s.footer}</p>
    </div>
  </div>
</body>
</html>`;
}

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

    const { subject, plainText } = EMAIL_STRINGS[language];
    const { error: sendError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: email,
      subject,
      text: plainText(code),
      html: buildEmailHtml(code, language),
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
