'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import type { Translations } from '@/lib/i18n/pt-BR';
import type { UserPromotion } from '@/lib/db/queries/promotions';

interface PromotionDetailModalProps {
  open: boolean;
  promotion: UserPromotion | null;
  onClose: () => void;
  onClaimed: () => void;
}

function toCamelCase(id: string): string {
  return id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

export function getPromotionStrings(
  t: Translations,
  promotion: Pick<UserPromotion, 'id'>
): { title: string; description: string } {
  const key = toCamelCase(promotion.id);
  const promoStrings = t.promotions as unknown as Record<string, string>;
  const title = promoStrings[`${key}Title`] ?? t.promotions.unknownTitle;
  const description = promoStrings[`${key}Description`] ?? t.promotions.unknownDescription;
  return { title, description };
}

export function formatCredits(cents: number): string {
  return 'R$' + (cents / 100).toFixed(2);
}

export default function PromotionDetailModal({
  open,
  promotion,
  onClose,
  onClaimed,
}: PromotionDetailModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [claiming, setClaiming] = useState(false);

  if (!promotion) return null;

  const { title, description } = getPromotionStrings(t, promotion);
  const creditFormatted = formatCredits(promotion.creditAmount);
  const creditLine = t.promotions.creditAmount.replace('{amount}', creditFormatted);

  async function handleClaim() {
    if (!promotion) return;
    setClaiming(true);
    try {
      const res = await fetch(`/api/promotions/${promotion.id}/claim`, {
        method: 'POST',
      });

      if (res.ok) {
        showToast(t.promotions.claimSuccess, 'success');
        onClaimed();
      } else if (res.status === 400) {
        let errorCode = '';
        try {
          const data = await res.json();
          errorCode = data?.error ?? '';
        } catch {
          // ignore malformed body
        }
        if (errorCode === 'ALREADY_CLAIMED') {
          showToast(t.promotions.alreadyClaimed, 'error');
          onClaimed();
        } else if (errorCode === 'NOT_ELIGIBLE') {
          showToast(t.promotions.notEligible, 'error');
          onClaimed();
        } else {
          showToast(t.promotions.claimError, 'error');
        }
      } else {
        showToast(t.promotions.claimError, 'error');
      }
    } catch {
      showToast(t.promotions.claimError, 'error');
    } finally {
      setClaiming(false);
      onClose();
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-title text-[1.25rem] text-page-cream">{title}</h2>
          {promotion.claimed && <Badge variant="green">{t.promotions.claimed}</Badge>}
        </div>

        <p className="font-body text-[14px] text-page-cream-muted">{description}</p>

        <div className="bg-desk-surface rounded-[6px] p-4 border border-hairline">
          <p className="font-body text-[14px] text-page-cream">{creditLine}</p>
        </div>

        {promotion.claimed ? (
          <p className="font-body text-[14px] text-page-cream-muted">{t.promotions.alreadyClaimed}</p>
        ) : !promotion.eligible ? (
          <p className="font-body text-[14px] text-page-cream-muted">{t.promotions.notEligible}</p>
        ) : (
          <Button onClick={handleClaim} loading={claiming} className="w-full">
            {t.promotions.claim}
          </Button>
        )}
      </div>
    </Modal>
  );
}
