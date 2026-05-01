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
      const finalCode = code.replace(/\s/g, '');
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: finalCode }),
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
    <div className="relative flex flex-col min-h-screen overflow-x-hidden bg-lamp-night text-page-cream font-body selection:bg-oxblood-tint selection:text-oxblood-bright">
      {/* Language switcher */}
      <div className="absolute top-8 right-8 z-50">
        <div className="flex overflow-hidden rounded-[6px] text-[13px] font-label font-medium">
          <button
            type="button"
            onClick={() => setLanguage('pt-BR')}
            className={`px-3 py-1.5 transition-colors cursor-pointer ${
              language === 'pt-BR'
                ? 'text-page-cream'
                : 'text-page-cream-faint hover:text-page-cream'
            }`}
          >
            PT
          </button>
          <span className="text-hairline py-1.5">|</span>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-3 py-1.5 transition-colors cursor-pointer ${
              language === 'en'
                ? 'text-page-cream'
                : 'text-page-cream-faint hover:text-page-cream'
            }`}
          >
            EN
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative flex min-h-[90vh] flex-col items-center justify-center px-6 py-20 lg:flex-row lg:gap-32 animate-fade-in-up max-w-[1200px] mx-auto w-full">
        {/* Left panel — info */}
        <div className="mb-16 max-w-xl text-center lg:mb-0 lg:text-left flex flex-col justify-center hero-drift">
          <h1 className="font-display text-[clamp(2.75rem,7vw,5rem)] leading-[1.05] tracking-[-0.01em] text-page-cream pb-4">
            Eduh
          </h1>
          <p className="font-headline text-[1.75rem] leading-[1.2] tracking-[-0.005em] text-page-cream-muted max-w-[32ch] mx-auto lg:mx-0">
            {t.auth.tagline}
          </p>
          <p className="mt-4 font-body-prose text-[1.0625rem] leading-[1.65] text-page-cream-faint max-w-[40ch] mx-auto lg:mx-0">
            {t.auth.hero}
          </p>

          <div 
            className="mt-12 group inline-flex mx-auto lg:mx-0 items-center gap-2 font-label text-[13px] text-page-cream-muted hover:text-page-cream transition-colors cursor-pointer" 
            onClick={() => window.scrollTo({ top: window.innerHeight * 0.9, behavior: 'smooth' })}
          >
            <span>{t.auth.learnMore}</span>
            <svg className="w-4 h-4 group-hover:translate-y-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-full max-w-[380px] flex flex-col gap-6 relative z-10 lg:mt-8 hero-drift">
          {/* Auth form */}
          <div className="bg-desk-surface rounded-[10px] p-8 transition-all duration-500 relative">
          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="animate-fade-in-up relative z-10">
              <label htmlFor="email" className="mb-2 block font-label text-[13px] text-page-cream-muted">
                {t.auth.emailLabel}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.auth.emailPlaceholder}
                className="w-full rounded-[6px] border border-hairline bg-lamp-night px-[14px] py-[12px] font-body text-[15px] text-page-cream placeholder:text-page-cream-faint focus:input-focus-glow focus:outline-none transition-shadow"
              />
              {error && <p className="mt-3 text-[13px] text-rust-danger font-medium">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-[6px] bg-oxblood px-[20px] py-[10px] font-label text-[13px] text-page-cream hover:bg-oxblood-bright disabled:opacity-50 transition-colors cursor-pointer"
              >
                {loading && <Spinner />}
                {loading ? t.auth.sending : t.auth.sendCode}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="animate-fade-in-up relative z-10">
              <label htmlFor="code" className="mb-2 block font-label text-[13px] text-page-cream-muted">
                {t.auth.codeLabel}
              </label>
              <div className="flex justify-between gap-2 sm:gap-3">
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const char = code[index] || '';
                  const displayChar = char === ' ' ? '' : char;
                  return (
                    <input
                      key={index}
                      id={index === 0 ? "code" : undefined}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      required={index === 0}
                      value={displayChar}
                      disabled={loading}
                      onPaste={(e) => {
                        e.preventDefault();
                        if (error) setError('');
                        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                        if (pasted) {
                          setCode(pasted);
                          const inputs = e.currentTarget.parentElement?.querySelectorAll('input');
                          const focusIndex = Math.min(5, pasted.length);
                          if (inputs?.[focusIndex]) {
                            (inputs[focusIndex] as HTMLInputElement).focus();
                          } else if (inputs?.[5]) {
                            (inputs[5] as HTMLInputElement).focus();
                          }
                        }
                      }}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        if (error) setError('');
                        
                        const val = e.target.value.replace(/\D/g, '');
                        
                        const newCodeArray = code.padEnd(6, ' ').split('');
                        
                        if (!val) {
                          newCodeArray[index] = ' ';
                          setCode(newCodeArray.join('').replace(/\s+$/, ''));
                          return;
                        }

                        if (val.length > 1) {
                          const pastedChars = val.split('');
                          for (let i = 0; i < pastedChars.length && index + i < 6; i++) {
                            newCodeArray[index + i] = pastedChars[i];
                          }
                          setCode(newCodeArray.join('').replace(/\s+$/, ''));
                          const inputs = e.currentTarget.parentElement?.querySelectorAll('input');
                          const nextIndex = Math.min(5, index + pastedChars.length);
                          if (inputs?.[nextIndex]) {
                            (inputs[nextIndex] as HTMLInputElement).focus();
                          }
                          return;
                        }

                        newCodeArray[index] = val.slice(-1);
                        setCode(newCodeArray.join('').replace(/\s+$/, ''));
                        
                        if (index < 5) {
                          const inputs = e.currentTarget.parentElement?.querySelectorAll('input');
                          if (inputs?.[index + 1]) {
                            (inputs[index + 1] as HTMLInputElement).focus();
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !displayChar && index > 0) {
                          const inputs = e.currentTarget.parentElement?.querySelectorAll('input');
                          if (inputs?.[index - 1]) {
                            (inputs[index - 1] as HTMLInputElement).focus();
                          }
                        }
                      }}
                      className={`w-full aspect-[4/5] max-h-[64px] rounded-none border-0 border-b-2 bg-transparent px-0 py-0 text-center font-mono text-[24px] text-page-cream caret-oxblood focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 ease-out ${
                        error
                          ? 'border-rust-danger text-rust-danger focus:border-rust-danger'
                          : 'border-hairline hover:border-page-cream-muted focus:border-oxblood'
                      }`}
                    />
                  );
                })}
              </div>
              {error && <p className="mt-3 text-[13px] text-rust-danger font-medium">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-[6px] bg-oxblood px-[20px] py-[10px] font-label text-[13px] text-page-cream hover:bg-oxblood-bright disabled:opacity-50 transition-colors cursor-pointer"
              >
                {loading && <Spinner />}
                {loading ? t.auth.verifying : t.auth.verify}
              </button>

              <div className="mt-6 flex items-center justify-between font-label text-[13px]">
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-page-cream-faint hover:text-page-cream transition-colors cursor-pointer"
                >
                  {t.auth.back}
                </button>
                {countdown > 0 ? (
                  <span className="text-page-cream-faint">
                    {t.auth.resendIn} {countdown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className="text-oxblood-bright hover:text-page-cream transition-colors cursor-pointer"
                  >
                    {t.auth.resendCode}
                  </button>
                )}
              </div>
            </form>
          )}
          </div>
        </div>
      </section>

      {/* Break Rule */}
      <div className="w-full max-w-[1000px] mx-auto px-6">
        <hr className="border-0 border-t border-hairline hairline-reveal" />
      </div>

      {/* Details Section: The 3 Steps */}
      <section className="relative w-full max-w-[1000px] mx-auto px-6 py-24 lg:py-32 flex flex-col gap-24 lg:gap-32">
        <div className="scroll-reveal max-w-[760px]">
          <h2 className="font-display text-[clamp(2.25rem,5vw,4rem)] leading-[1.05] tracking-[-0.01em] text-page-cream">
            {t.auth.howItWorksTitle}
          </h2>
          <hr className="mt-8 w-20 border-0 border-t border-hairline" />
        </div>
        
        {/* Step 1 */}
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24 scroll-reveal">
          <div className="lg:w-1/2 flex justify-center w-full">
            {/* Flip Container */}
            <div className="w-full max-w-sm lg:max-w-none group [perspective:1200px]">
              <div className="relative w-full aspect-[2306/1292] rounded-[10px] transition-transform duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                
                {/* Front */}
                <div className="absolute inset-0 w-full h-full bg-desk-surface rounded-[10px] border border-hairline flex items-center justify-center [backface-visibility:hidden]">
                  <span className="font-display text-[6rem] text-page-cream-faint opacity-30 select-none">1</span>
                </div>

                {/* Back */}
                <div className="absolute inset-0 w-full h-full bg-desk-surface-hover rounded-[10px] border border-hairline flex items-center justify-center [backface-visibility:hidden] [transform:rotateY(180deg)] overflow-hidden">
                  <Image
                    src="/images/step1.png"
                    alt="Step 1 Preview"
                    fill
                    className="object-cover opacity-90 transition-opacity group-hover:opacity-100"
                  />
                </div>

              </div>
            </div>
          </div>
          <div className="lg:w-1/2 space-y-5">
            <h3 className="font-title text-[1.25rem] leading-[1.3] text-page-cream">{t.auth.steps[0].title}</h3>
            <hr className="w-12 border-0 border-t border-hairline" />
            <p className="font-body-prose text-[1.0625rem] leading-[1.65] text-page-cream-muted max-w-[60ch]">
              {t.auth.steps[0].description}
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-24 scroll-reveal">
          <div className="lg:w-1/2 flex justify-center w-full">
            {/* Flip Container */}
            <div className="w-full max-w-sm lg:max-w-none group [perspective:1200px]">
              <div className="relative w-full aspect-[2306/1292] rounded-[10px] transition-transform duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                
                {/* Front */}
                <div className="absolute inset-0 w-full h-full bg-desk-surface rounded-[10px] border border-hairline flex items-center justify-center [backface-visibility:hidden]">
                  <span className="font-display text-[6rem] text-page-cream-faint opacity-30 select-none">2</span>
                </div>

                {/* Back */}
                <div className="absolute inset-0 w-full h-full bg-desk-surface-hover rounded-[10px] border border-hairline flex items-center justify-center [backface-visibility:hidden] [transform:rotateY(180deg)] overflow-hidden">
                  <Image
                    src="/images/step2.png"
                    alt="Step 2 Preview"
                    fill
                    className="object-cover opacity-90 transition-opacity group-hover:opacity-100"
                  />
                </div>

              </div>
            </div>
          </div>
          <div className="lg:w-1/2 space-y-5">
            <h3 className="font-title text-[1.25rem] leading-[1.3] text-page-cream">{t.auth.steps[1].title}</h3>
            <hr className="w-12 border-0 border-t border-hairline" />
            <p className="font-body-prose text-[1.0625rem] leading-[1.65] text-page-cream-muted max-w-[60ch]">
              {t.auth.steps[1].description}
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24 scroll-reveal">
          <div className="lg:w-1/2 flex justify-center w-full">
            {/* Flip Container */}
            <div className="w-full max-w-sm lg:max-w-none group [perspective:1200px]">
              <div className="relative w-full aspect-[2306/1292] rounded-[10px] transition-transform duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                
                {/* Front */}
                <div className="absolute inset-0 w-full h-full bg-desk-surface rounded-[10px] border border-hairline flex items-center justify-center [backface-visibility:hidden]">
                  <span className="font-display text-[6rem] text-page-cream-faint opacity-30 select-none">3</span>
                </div>

                {/* Back */}
                <div className="absolute inset-0 w-full h-full bg-desk-surface-hover rounded-[10px] border border-hairline flex items-center justify-center [backface-visibility:hidden] [transform:rotateY(180deg)] overflow-hidden">
                  <Image
                    src="/images/step3.png"
                    alt="Step 3 Preview"
                    fill
                    className="object-cover opacity-90 transition-opacity group-hover:opacity-100"
                  />
                </div>

              </div>
            </div>
          </div>
          <div className="lg:w-1/2 space-y-5">
            <h3 className="font-title text-[1.25rem] leading-[1.3] text-page-cream">{t.auth.steps[2].title}</h3>
            <hr className="w-12 border-0 border-t border-hairline" />
            <p className="font-body-prose text-[1.0625rem] leading-[1.65] text-page-cream-muted max-w-[60ch]">
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
