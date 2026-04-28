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
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[oklch(0.155_0.008_30)] text-[oklch(0.93_0.012_80)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(68rem_42rem_at_18%_8%,oklch(0.52_0.12_30_/_0.16),transparent_64%),radial-gradient(46rem_34rem_at_88%_18%,oklch(0.46_0.13_20_/_0.11),transparent_68%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,oklch(0.155_0.008_30)_72%)]" />

      <div className="absolute right-5 top-5 z-50 md:right-8 md:top-8">
        <div className="flex overflow-hidden rounded-md border border-[oklch(0.93_0.012_80_/_0.16)] bg-[oklch(0.21_0.01_30_/_0.72)] text-[0.8125rem] font-medium">
          <button
            type="button"
            onClick={() => setLanguage('pt-BR')}
            className={`px-3.5 py-2 transition-colors cursor-pointer ${
              language === 'pt-BR'
                ? 'bg-[oklch(0.46_0.13_20)] text-[oklch(0.93_0.012_80)]'
                : 'text-[oklch(0.78_0.015_80)] hover:bg-[oklch(0.255_0.012_30)] hover:text-[oklch(0.93_0.012_80)]'
            }`}
          >
            PT
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-3.5 py-2 transition-colors cursor-pointer ${
              language === 'en'
                ? 'bg-[oklch(0.46_0.13_20)] text-[oklch(0.93_0.012_80)]'
                : 'text-[oklch(0.78_0.015_80)] hover:bg-[oklch(0.255_0.012_30)] hover:text-[oklch(0.93_0.012_80)]'
            }`}
          >
            EN
          </button>
        </div>
      </div>

      <section className="relative grid min-h-[88svh] items-center gap-12 px-5 pb-16 pt-28 md:px-10 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16 lg:px-16 xl:px-24">
        <div className="max-w-3xl animate-fade-in-up">
          <p className="mb-5 max-w-max border-b border-[oklch(0.93_0.012_80_/_0.16)] pb-2 text-[0.8125rem] font-medium text-[oklch(0.78_0.015_80)]">
            {t.auth.tagline}
          </p>
          <h1 className="max-w-[11ch] font-serif text-7xl font-normal leading-[0.88] text-[oklch(0.93_0.012_80)] md:text-8xl lg:text-9xl">
            Eduh
          </h1>
          <p className="mt-8 max-w-[34rem] text-lg font-normal leading-[1.7] text-[oklch(0.78_0.015_80)] md:text-xl">
            {t.auth.hero}
          </p>

          <button
            type="button"
            className="group mt-10 inline-flex items-center gap-2 border-b border-[oklch(0.93_0.012_80_/_0.22)] pb-2 text-sm font-medium text-[oklch(0.78_0.015_80)] transition-colors hover:text-[oklch(0.93_0.012_80)] cursor-pointer"
            onClick={() => window.scrollTo({ top: window.innerHeight * 0.88, behavior: 'smooth' })}
          >
            <span>{t.auth.learnMore}</span>
            <svg className="h-4 w-4 transition-transform group-hover:translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>

        <div className="w-full max-w-md justify-self-center lg:justify-self-end">
          <div className="relative rounded-[14px] bg-[oklch(0.21_0.01_30)] p-6 shadow-[0_0_60px_-12px_oklch(0.62_0.12_45_/_0.32)] md:p-8">
            <div className="pointer-events-none absolute inset-0 rounded-[14px] bg-[radial-gradient(120%_80%_at_50%_0%,oklch(0.62_0.12_45_/_0.16),transparent_70%)]" />
            <div className="relative">
              {step === 'email' ? (
                <form onSubmit={handleSendCode} className="animate-fade-in-up">
                  <label htmlFor="email" className="mb-2 block text-sm font-medium text-[oklch(0.93_0.012_80)]">
                    {t.auth.emailLabel}
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.auth.emailPlaceholder}
                    className="w-full rounded-md bg-[oklch(0.155_0.008_30_/_0.72)] px-4 py-3 text-[15px] font-normal text-[oklch(0.93_0.012_80)] placeholder:text-[oklch(0.62_0.01_80)] transition-shadow focus:outline-none focus:shadow-[0_0_0_3px_oklch(0.46_0.13_20_/_0.28)]"
                  />
                  {error && <p className="mt-3 text-sm font-medium text-[oklch(0.58_0.15_38)]">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-[oklch(0.46_0.13_20)] px-5 py-3 text-sm font-semibold text-[oklch(0.93_0.012_80)] transition-colors hover:bg-[oklch(0.56_0.16_22)] disabled:opacity-50 cursor-pointer"
                  >
                    {loading && <Spinner />}
                    {loading ? t.auth.sending : t.auth.sendCode}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyCode} className="animate-fade-in-up">
                  <label htmlFor="code" className="mb-2 block text-sm font-medium text-[oklch(0.93_0.012_80)]">
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
                    className="w-full rounded-md bg-[oklch(0.155_0.008_30_/_0.72)] px-4 py-4 text-center font-mono text-2xl text-[oklch(0.93_0.012_80)] placeholder:text-[oklch(0.62_0.01_80)] transition-shadow focus:outline-none focus:shadow-[0_0_0_3px_oklch(0.46_0.13_20_/_0.28)]"
                  />
                  {error && <p className="mt-3 text-sm font-medium text-[oklch(0.58_0.15_38)]">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-[oklch(0.46_0.13_20)] px-5 py-3 text-sm font-semibold text-[oklch(0.93_0.012_80)] transition-colors hover:bg-[oklch(0.56_0.16_22)] disabled:opacity-50 cursor-pointer"
                  >
                    {loading && <Spinner />}
                    {loading ? t.auth.verifying : t.auth.verify}
                  </button>

                  <div className="mt-6 flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="font-medium text-[oklch(0.78_0.015_80)] transition-colors hover:text-[oklch(0.93_0.012_80)] cursor-pointer"
                    >
                      {t.auth.back}
                    </button>
                    {countdown > 0 ? (
                      <span className="font-medium text-[oklch(0.78_0.015_80)]">
                        {t.auth.resendIn} {countdown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={loading}
                        className="font-medium text-[oklch(0.56_0.16_22)] transition-colors hover:text-[oklch(0.68_0.16_24)] disabled:opacity-50 cursor-pointer"
                      >
                        {t.auth.resendCode}
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className="mt-4 border-t border-[oklch(0.93_0.012_80_/_0.16)] pt-4 text-sm leading-relaxed text-[oklch(0.78_0.015_80)] animate-fade-in-up">
            <p className="font-semibold text-[oklch(0.93_0.012_80)]">
              {t.auth.bonusBadge}
            </p>
            <p className="mt-1">
              {t.auth.bonusDescription}
            </p>
          </div>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-7xl px-5 py-20 md:px-10 lg:px-16 lg:py-28 xl:px-24">
        <div className="mb-10 border-t border-[oklch(0.93_0.012_80_/_0.16)] pt-8 md:mb-14 md:flex md:items-end md:justify-between md:gap-10">
          <h2 className="font-serif text-4xl font-normal leading-tight text-[oklch(0.93_0.012_80)] md:text-5xl">
            {language === 'pt-BR' ? 'Como funciona' : 'How it works'}
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[oklch(0.78_0.015_80)] md:mt-0">
            {language === 'pt-BR'
              ? 'Três etapas, uma sequência clara: materiais, plano, estudo.'
              : 'Three steps, one clear sequence: materials, plan, study.'}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 md:gap-5">
          {t.auth.steps.map((stepItem, index) => (
            <StepCard
              key={stepItem.title}
              index={index}
              title={stepItem.title}
              description={stepItem.description}
              imageSrc={`/images/step${index + 1}.png`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function StepCard({
  index,
  title,
  description,
  imageSrc,
}: {
  index: number;
  title: string;
  description: string;
  imageSrc: string;
}) {
  return (
    <article className="group h-[26rem] [perspective:1200px]">
      <div className="relative h-full rounded-[10px] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] group-focus-within:[transform:rotateY(180deg)]">
        <div className="absolute inset-0 flex h-full flex-col rounded-[10px] bg-[oklch(0.21_0.01_30)] p-6 [backface-visibility:hidden] md:p-7">
          <div className="mb-8 flex items-center justify-between border-b border-[oklch(0.93_0.012_80_/_0.16)] pb-4">
            <span className="font-mono text-sm text-[oklch(0.62_0.01_80)]">
              0{index + 1}
            </span>
            <span className="h-2 w-2 rounded-full bg-[oklch(0.46_0.13_20)]" />
          </div>
          <h3 className="font-serif text-3xl font-normal leading-tight text-[oklch(0.93_0.012_80)]">
            {title}
          </h3>
          <p className="mt-5 max-w-[28ch] text-[15px] font-normal leading-relaxed text-[oklch(0.78_0.015_80)]">
            {description}
          </p>
          <div className="mt-auto h-1.5 w-12 rounded-full bg-[oklch(0.46_0.13_20)]" />
        </div>

        <div className="absolute inset-0 overflow-hidden rounded-[10px] bg-[oklch(0.21_0.01_30)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <Image
            src={imageSrc}
            alt=""
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,oklch(0.155_0.008_30_/_0.9),transparent)] p-6">
            <p className="font-serif text-2xl font-normal text-[oklch(0.93_0.012_80)]">
              {title}
            </p>
          </div>
        </div>
      </div>
    </article>
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
