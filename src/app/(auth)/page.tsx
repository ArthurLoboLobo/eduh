'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import Image from 'next/image';
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
    <div className="relative flex flex-col min-h-screen overflow-x-hidden">
      {/* Language switcher */}
      <div className="absolute top-6 right-6 z-50">
        <div className="flex overflow-hidden rounded-full border border-border-subtle text-sm bg-surface/50 backdrop-blur-md shadow-sm">
          <button
            type="button"
            onClick={() => setLanguage('pt-BR')}
            className={`px-4 py-2 transition-colors cursor-pointer ${
              language === 'pt-BR'
                ? 'bg-accent-blue text-background font-semibold'
                : 'text-muted-text hover:text-primary-text hover:bg-surface-hover'
            }`}
          >
            PT
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-4 py-2 transition-colors cursor-pointer ${
              language === 'en'
                ? 'bg-accent-blue text-background font-semibold'
                : 'text-muted-text hover:text-primary-text hover:bg-surface-hover'
            }`}
          >
            EN
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative flex min-h-[90vh] flex-col items-center justify-center px-6 py-20 lg:flex-row lg:gap-24 animate-fade-in-up">
        {/* Left panel — info */}
        <div className="mb-12 max-w-xl text-center lg:mb-0 lg:text-left flex flex-col justify-center">
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight bg-gradient-to-r from-primary-text via-accent-blue to-primary-text bg-clip-text text-transparent pb-2">
            Eduh
          </h1>
          <p className="mt-4 text-xl lg:text-2xl font-medium text-accent-blue">{t.auth.tagline}</p>
          <p className="mt-6 text-lg text-muted-text leading-relaxed">
            {t.auth.hero}
          </p>

          <div className="mt-10 lg:mt-12 group inline-flex mx-auto lg:mx-0 items-center gap-2 text-sm font-medium text-muted-text hover:text-primary-text transition-colors cursor-pointer" onClick={() => window.scrollTo({ top: window.innerHeight * 0.9, behavior: 'smooth' })}>
            <span>{t.auth.learnMore}</span>
            <svg className="w-4 h-4 group-hover:translate-y-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>

        {/* Right panel — Auth form */}
        <div className="w-full max-w-md bg-surface/80 backdrop-blur-xl rounded-3xl border border-border-subtle p-8 shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="animate-fade-in-up">
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-primary-text">
                {t.auth.emailLabel}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.auth.emailPlaceholder}
                className="w-full rounded-2xl border border-border-subtle bg-background/50 backdrop-blur-sm px-4 py-3 text-[15px] text-primary-text placeholder:text-muted-text focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 focus:outline-none transition-all"
              />
              {error && <p className="mt-3 text-sm text-danger-red font-medium">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-accent-blue px-5 py-3 text-sm font-semibold text-background hover:bg-accent-blue-hover disabled:opacity-50 transition-colors cursor-pointer active:scale-95"
              >
                {loading && <Spinner />}
                {loading ? t.auth.sending : t.auth.sendCode}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="animate-fade-in-up">
              <label htmlFor="code" className="mb-2 block text-sm font-medium text-primary-text">
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
                className="w-full rounded-2xl border border-border-subtle bg-background/50 backdrop-blur-sm px-4 py-4 text-center font-mono text-2xl tracking-[0.5em] text-primary-text placeholder:text-muted-text focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 focus:outline-none transition-all"
              />
              {error && <p className="mt-3 text-sm text-danger-red font-medium">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-accent-blue px-5 py-3 text-sm font-semibold text-background hover:bg-accent-blue-hover disabled:opacity-50 transition-colors cursor-pointer active:scale-95"
              >
                {loading && <Spinner />}
                {loading ? t.auth.verifying : t.auth.verify}
              </button>

              <div className="mt-6 flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={handleBack}
                  className="font-medium text-muted-text hover:text-primary-text transition-colors cursor-pointer"
                >
                  {t.auth.back}
                </button>
                {countdown > 0 ? (
                  <span className="text-muted-text font-medium">
                    {t.auth.resendIn} {countdown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className="font-medium text-accent-blue hover:text-accent-blue-hover disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {t.auth.resendCode}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Details Section: The 3 Steps */}
      <section className="relative w-full max-w-5xl mx-auto px-6 py-24 lg:py-32 flex flex-col gap-24">
        
        {/* Step 1 */}
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24 opacity-0 animate-[fade-in-up_0.6s_ease-out_0.2s_forwards]">
          <div className="lg:w-1/2 flex justify-center">
            {/* Flip Container */}
            <div className="w-full group [perspective:1000px]">
              <div className="relative w-full aspect-video rounded-3xl transition-all duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] shadow-xl">
                
                {/* Front */}
                <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-surface to-background rounded-3xl border border-border-subtle flex items-center justify-center [backface-visibility:hidden]">
                  {/* Abstract decorative icon for Uploading */}
                  <svg className="w-24 h-24 text-accent-blue/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>

                {/* Back */}
                <div className="absolute inset-0 w-full h-full bg-surface rounded-3xl border border-border-subtle flex items-center justify-center [backface-visibility:hidden] [transform:rotateY(180deg)] overflow-hidden">
                  {/* Image Placeholder */}
                  <Image
                    src="/images/step1.png"
                    alt="Step 1 Preview"
                    fill
                    className="object-cover"
                  />
                </div>

              </div>
            </div>
          </div>
          <div className="lg:w-1/2 space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-blue/10 text-accent-blue font-bold text-xl mb-2">1</div>
            <h2 className="text-3xl font-bold text-primary-text">{t.auth.steps[0].title}</h2>
            <p className="text-lg text-muted-text leading-relaxed">
              {t.auth.steps[0].description}
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-24 opacity-0 animate-[fade-in-up_0.6s_ease-out_0.4s_forwards]">
          <div className="lg:w-1/2 flex justify-center">
            {/* Flip Container */}
            <div className="w-full group [perspective:1000px]">
              <div className="relative w-full aspect-video rounded-3xl transition-all duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] shadow-xl">
                
                {/* Front */}
                <div className="absolute inset-0 w-full h-full bg-gradient-to-bl from-surface to-background rounded-3xl border border-border-subtle flex items-center justify-center [backface-visibility:hidden]">
                  {/* Abstract decorative icon for Planning */}
                  <svg className="w-24 h-24 text-accent-blue/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>

                {/* Back */}
                <div className="absolute inset-0 w-full h-full bg-surface rounded-3xl border border-border-subtle flex items-center justify-center [backface-visibility:hidden] [transform:rotateY(180deg)] overflow-hidden">
                  {/* Image Placeholder */}
                  <Image
                    src="/images/step2.png"
                    alt="Step 2 Preview"
                    fill
                    className="object-cover"
                  />
                </div>

              </div>
            </div>
          </div>
          <div className="lg:w-1/2 space-y-4 text-left lg:text-right">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-blue/10 text-accent-blue font-bold text-xl mb-2 lg:ml-auto">2</div>
            <h2 className="text-3xl font-bold text-primary-text">{t.auth.steps[1].title}</h2>
            <p className="text-lg text-muted-text leading-relaxed">
              {t.auth.steps[1].description}
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24 opacity-0 animate-[fade-in-up_0.6s_ease-out_0.6s_forwards]">
          <div className="lg:w-1/2 flex justify-center">
            {/* Flip Container */}
            <div className="w-full group [perspective:1000px]">
              <div className="relative w-full aspect-video rounded-3xl transition-all duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] shadow-xl">
                
                {/* Front */}
                <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-surface to-background rounded-3xl border border-border-subtle flex items-center justify-center [backface-visibility:hidden]">
                  {/* Abstract decorative icon for Studying/Chat */}
                  <svg className="w-24 h-24 text-accent-blue/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>

                {/* Back */}
                <div className="absolute inset-0 w-full h-full bg-surface rounded-3xl border border-border-subtle flex items-center justify-center [backface-visibility:hidden] [transform:rotateY(180deg)] overflow-hidden">
                  {/* Image Placeholder */}
                  <Image
                    src="/images/step3.png"
                    alt="Step 3 Preview"
                    fill
                    className="object-cover"
                  />
                </div>

              </div>
            </div>
          </div>
          <div className="lg:w-1/2 space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-blue/10 text-accent-blue font-bold text-xl mb-2">3</div>
            <h2 className="text-3xl font-bold text-primary-text">{t.auth.steps[2].title}</h2>
            <p className="text-lg text-muted-text leading-relaxed">
              {t.auth.steps[2].description}
            </p>
          </div>
        </div>

      </section>
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
