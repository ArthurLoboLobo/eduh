import type { Translations } from './pt-BR';

const en: Translations = {
  auth: {
    tagline: 'Prepare for your exams with AI',
    hero: 'Turn your study materials into a personalized plan with intelligent tutoring.',
    steps: [
      { title: 'Upload your materials', description: 'Past exams, slides, notes...' },
      { title: 'Get a study plan', description: 'AI analyzes and creates a personalized plan' },
      { title: 'Study with AI tutoring', description: 'Topic-specific chats with access to your materials' },
      { title: 'Review and master', description: 'Track your progress and ask general questions' },
    ],
    emailLabel: 'Email',
    emailPlaceholder: 'you@email.com',
    sendCode: 'Send code',
    codeLabel: 'Verification code',
    codePlaceholder: '000000',
    verify: 'Verify',
    resendCode: 'Resend code',
    resendIn: 'Resend in',
    back: 'Back',
    sending: 'Sending...',
    verifying: 'Verifying...',
  },
  errors: {
    EMAIL_INVALID: 'Invalid email.',
    RATE_LIMITED: 'Please wait before sending another code.',
    USER_NOT_FOUND: 'User not found.',
    OTP_NOT_FOUND: 'Code not found. Please request a new one.',
    OTP_EXPIRED: 'Code expired. Please request a new one.',
    OTP_MAX_ATTEMPTS: 'Too many attempts. Please request a new code.',
    OTP_INVALID: 'Incorrect code. Try again.',
    EMAIL_SEND_FAILED: 'Failed to send email. Please try again.',
    UNKNOWN: 'An error occurred. Please try again.',
  },
} as const;

export default en;
