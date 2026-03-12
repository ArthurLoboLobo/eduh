'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useTranslation } from '@/lib/i18n';
import type { Translations } from '@/lib/i18n/pt-BR';

type Step = 'email' | 'code';

export default function AuthPage() {
  const { t, language, setLanguage } = useTranslation();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  function startCountdown(seconds: number) {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(seconds);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function getErrorMessage(errorCode: string): string {
    const key = errorCode as keyof Translations['errors'];
    return t.errors[key] ?? t.errors.UNKNOWN;
  }

  async function handleSendCode(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, language }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'RATE_LIMITED') {
          setStep('code');
          startCountdown(data.retryAfterSeconds ?? 60);
        } else {
          setError(getErrorMessage(data.error));
        }
        return;
      }

      setStep('code');
      startCountdown(60);
    } catch {
      setError(t.errors.UNKNOWN);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(getErrorMessage(data.error));
        return;
      }

      window.location.href = '/dashboard';
    } catch {
      setError(t.errors.UNKNOWN);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, language }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'RATE_LIMITED') {
          startCountdown(data.retryAfterSeconds ?? 60);
        } else {
          setError(getErrorMessage(data.error));
        }
        return;
      }

      setCode('');
      startCountdown(60);
    } catch {
      setError(t.errors.UNKNOWN);
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    setStep('email');
    setCode('');
    setError('');
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12 lg:flex-row lg:gap-20">
      {/* Language switcher */}
      <div className="absolute top-4 right-4">
        <div className="flex overflow-hidden rounded-md border border-border text-sm">
          <button
            type="button"
            onClick={() => setLanguage('pt-BR')}
            className={`px-3 py-1.5 transition-none ${
              language === 'pt-BR'
                ? 'bg-accent-blue text-primary-text'
                : 'bg-surface text-muted-text hover:text-primary-text'
            }`}
          >
            PT
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-3 py-1.5 transition-none ${
              language === 'en'
                ? 'bg-accent-blue text-primary-text'
                : 'bg-surface text-muted-text hover:text-primary-text'
            }`}
          >
            EN
          </button>
        </div>
      </div>

      {/* Left panel — info */}
      <div className="mb-10 max-w-md text-center lg:mb-0 lg:text-left">
        <h1 className="text-4xl font-bold tracking-tight">Ditchy</h1>
        <p className="mt-2 text-lg text-accent-blue">{t.auth.tagline}</p>
        <p className="mt-4 text-muted-text">{t.auth.hero}</p>

        <div className="mt-8 space-y-4">
          {t.auth.steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent-blue/15 text-sm font-semibold text-accent-blue">
                {i + 1}
              </span>
              <div>
                <p className="font-medium">{s.title}</p>
                <p className="text-sm text-muted-text">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6">
        {step === 'email' ? (
          <form onSubmit={handleSendCode}>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
              {t.auth.emailLabel}
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.auth.emailPlaceholder}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-primary-text placeholder:text-muted-text focus:border-accent-blue focus:outline-none"
            />
            {error && <p className="mt-2 text-sm text-danger-red">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-accent-blue px-4 py-2 text-sm font-medium text-primary-text hover:bg-accent-blue-hover disabled:opacity-50"
            >
              {loading && <Spinner />}
              {loading ? t.auth.sending : t.auth.sendCode}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode}>
            <label htmlFor="code" className="mb-1.5 block text-sm font-medium">
              {t.auth.codeLabel}
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder={t.auth.codePlaceholder}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-center font-mono text-lg tracking-[0.3em] text-primary-text placeholder:text-muted-text focus:border-accent-blue focus:outline-none"
            />
            {error && <p className="mt-2 text-sm text-danger-red">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-accent-blue px-4 py-2 text-sm font-medium text-primary-text hover:bg-accent-blue-hover disabled:opacity-50"
            >
              {loading && <Spinner />}
              {loading ? t.auth.verifying : t.auth.verify}
            </button>

            <div className="mt-4 flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={handleBack}
                className="text-muted-text hover:text-primary-text"
              >
                {t.auth.back}
              </button>
              {countdown > 0 ? (
                <span className="text-muted-text">
                  {t.auth.resendIn} {countdown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading}
                  className="text-accent-blue hover:text-accent-blue-hover disabled:opacity-50"
                >
                  {t.auth.resendCode}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
