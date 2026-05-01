'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import { SUBSCRIPTION_PRICE_CENTS } from '@/config/subscription';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  balance: number;
  onSuccess: () => void;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PaymentModal({ open, onClose, balance, onSuccess }: PaymentModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [step, setStep] = useState<'confirmation' | 'qr' | 'success'>('confirmation');
  const [useCredits, setUseCredits] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState<{
    brCode: string;
    brCodeBase64: string;
    expiresAt: string;
    paymentId: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [expired, setExpired] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep('confirmation');
      setUseCredits(false);
      setLoading(false);
      setQrData(null);
      setCopied(false);
      setSecondsLeft(0);
      setExpired(false);
    }
  }, [open]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  // Countdown timer for QR step
  useEffect(() => {
    if (step !== 'qr' || !qrData) return;

    const expiresMs = new Date(qrData.expiresAt).getTime();
    const computeRemaining = () => Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));

    const initial = computeRemaining();
    setSecondsLeft(initial);
    setExpired(initial <= 0);

    if (initial <= 0) return;

    countdownRef.current = setInterval(() => {
      const remaining = computeRemaining();
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        if (pollingRef.current) clearInterval(pollingRef.current);
        setExpired(true);
      }
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [step, qrData]);

  // Payment status polling for QR step
  useEffect(() => {
    if (step !== 'qr') return;

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/subscription/payment-status');
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === 'paid') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (countdownRef.current) clearInterval(countdownRef.current);
          setStep('success');
        } else if (data.status === 'invalidated' || data.status === 'none') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (countdownRef.current) clearInterval(countdownRef.current);
        }
      } catch {
        // silently fail, will retry next interval
      }
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [step]);

  // Derived values
  const creditsToApply = useCredits ? Math.min(balance, SUBSCRIPTION_PRICE_CENTS) : 0;
  const pixAmount = SUBSCRIPTION_PRICE_CENTS - creditsToApply;
  const canPayWithCreditsOnly = useCredits && balance >= SUBSCRIPTION_PRICE_CENTS;
  const pixAmountFormatted = (pixAmount / 100).toFixed(2);
  const balanceFormatted = 'R$' + (balance / 100).toFixed(2);

  async function handleSubscribe() {
    setLoading(true);
    try {
      const res = await fetch('/api/subscription/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useCredits }),
      });

      if (!res.ok) {
        throw new Error();
      }

      const data = await res.json();

      if (data.status === 'activated') {
        setStep('success');
      } else if (data.status === 'pending') {
        setQrData({
          brCode: data.brCode,
          brCodeBase64: data.brCodeBase64,
          expiresAt: data.expiresAt,
          paymentId: data.paymentId,
        });
        setStep('qr');
      }
    } catch {
      showToast(t.subscription.paymentFailed, 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!qrData) return;
    navigator.clipboard.writeText(qrData.brCode);
    setCopied(true);
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (step === 'success') {
      onSuccess();
    }
    onClose();
  }

  const modalTitle =
    step === 'confirmation' ? t.subscription.confirmationTitle :
    step === 'qr' ? undefined :
    undefined;

  return (
    <Modal open={open} onClose={handleClose} title={modalTitle}>
      {/* Confirmation Step */}
      {step === 'confirmation' && (
        <div className="flex flex-col gap-4">
          <div className="bg-desk-surface rounded-[6px] p-4 border border-hairline">
            <p className="font-body text-[14px] text-page-cream-muted">
              {t.subscription.yourBalance.replace('{amount}', balanceFormatted)}
            </p>
          </div>

          <Checkbox
            id="use-balance"
            label={t.subscription.useBalance}
            checked={useCredits}
            onChange={(e) => setUseCredits(e.target.checked)}
            disabled={balance === 0}
            className={balance === 0 ? 'opacity-50' : ''}
          />

          <Button onClick={handleSubscribe} loading={loading} className="w-full">
            {canPayWithCreditsOnly
              ? t.subscription.confirmSubscription
              : t.subscription.payWithPix.replace('{amount}', pixAmountFormatted)}
          </Button>
        </div>
      )}

      {/* QR Code Step */}
      {step === 'qr' && qrData && (
        <div className="flex flex-col items-center gap-4">
          {!expired ? (
            <>
              <div className="bg-desk-surface rounded-[6px] p-3 border border-hairline">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrData.brCodeBase64} alt="Pix QR Code" className="w-48 h-48 rounded-[4px]" />
              </div>

              <p className="font-body text-[14px] text-page-cream-muted text-center">
                {t.subscription.pixInstructions}
              </p>

              <p className="font-body text-[14px] text-page-cream-muted">
                {t.subscription.payWithinMinutes.replace('{time}', formatTime(secondsLeft))}
              </p>

              <div className="w-full bg-desk-surface rounded-[6px] p-3 border border-hairline">
                <code className="font-label text-[12px] text-page-cream-muted break-all block mb-2 max-h-20 overflow-y-auto">
                  {qrData.brCode}
                </code>
                <Button variant="ghost" onClick={handleCopy} className="w-full">
                  {copied ? t.subscription.copied : t.subscription.copyCode}
                </Button>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <p className="font-body text-[14px] text-page-cream-muted">{t.subscription.paymentExpired}</p>
            </div>
          )}
        </div>
      )}

      {/* Success Step */}
      {step === 'success' && (
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="w-16 h-16 rounded-full bg-forest-success/20 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 13l4 4L19 7"
                stroke="var(--forest-success)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <p className="font-title text-[1.25rem] text-page-cream text-center">
            {t.subscription.youAreNowPro}
          </p>

          <Button onClick={handleClose} className="w-full">
            {t.subscription.close}
          </Button>
        </div>
      )}
    </Modal>
  );
}
