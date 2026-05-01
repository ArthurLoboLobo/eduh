'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useUser } from '@/hooks/useUser';
import Spinner from '@/components/ui/Spinner';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import PaymentModal from '@/components/PaymentModal';
import PromotionDetailModal, {
  formatCredits,
  getPromotionStrings,
} from '@/components/PromotionDetailModal';
import { SUBSCRIPTION_PRICE_CENTS } from '@/config/subscription';
import type { UserPromotion } from '@/lib/db/queries/promotions';

export default function SubscriptionPage() {
  const { t, language } = useTranslation();
  const { user, loading, refetch } = useUser();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [promotions, setPromotions] = useState<UserPromotion[] | null>(null);
  const [promotionsError, setPromotionsError] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<UserPromotion | null>(null);
  const [promoDismissed, setPromoDismissed] = useState(false);
  const [subscribeDismissed, setSubscribeDismissed] = useState(false);

  function handleDismissPromo(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setPromoDismissed(true);
  }

  function handleDismissSubscribe(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setSubscribeDismissed(true);
  }

  const loadPromotions = useCallback(async () => {
    try {
      const res = await fetch('/api/promotions');
      if (!res.ok) throw new Error();
      const data: UserPromotion[] = await res.json();
      setPromotions(data);
      setPromotionsError(false);
    } catch {
      setPromotionsError(true);
    }
  }, []);

  useEffect(() => {
    loadPromotions();
  }, [loadPromotions]);

  const handlePromotionClaimed = useCallback(() => {
    loadPromotions();
    refetch();
  }, [loadPromotions, refetch]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-5.5rem)]">
        <Spinner size={28} />
        <p className="mt-3 font-body text-[14px] text-page-cream-muted">{t.section.loading}</p>
      </div>
    );
  }

  if (!user) return null;

  const isFree = user.plan === 'free';
  const isPro = user.plan === 'pro';
  const priceFormatted = 'R$' + (SUBSCRIPTION_PRICE_CENTS / 100).toFixed(2);
  const balanceFormatted = 'R$' + (user.balance / 100).toFixed(2);
  const expiresFormatted = user.planExpiresAt
    ? new Date(user.planExpiresAt).toLocaleDateString(language === 'pt-BR' ? 'pt-BR' : 'en-US')
    : '';

  return (
    <div className="flex flex-col min-h-[calc(100vh-5.5rem)] pb-16 max-w-4xl mx-auto w-full px-4 sm:px-6">
      {/* Hero Header */}
      <div className="text-center py-10 lg:py-14 animate-[fade-in-up_0.4s_ease-out_forwards]">
        <h1 className="font-display text-[clamp(2.5rem,5vw,3rem)] leading-[1.05] tracking-[-0.01em] text-page-cream mb-4">
          {t.subscription.choosePlan}
        </h1>
        <p className="font-body-prose text-[1.0625rem] text-page-cream-muted max-w-lg mx-auto leading-[1.65]">
          {t.subscription.choosePlanSubtitle}
        </p>
      </div>

      {/* Pro Banner */}
      {isPro && (
        <div className="mb-8 p-4 rounded-[10px] bg-desk-surface border border-hairline flex items-center justify-center gap-3 animate-[fade-in-up_0.5s_ease-out_0.1s_forwards] opacity-0 font-body text-[14px] text-page-cream shadow-sm">
          <svg className="w-4 h-4 text-oxblood flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-center">{t.subscription.proUntil.replace('{date}', expiresFormatted)}</span>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {/* Free plan card */}
        <div className={`flex flex-col p-[32px] rounded-[14px] bg-desk-surface border ${isFree ? 'border-oxblood-tint ring-[3px] ring-oxblood-tint' : 'border-hairline'} animate-[fade-in-up_0.6s_ease-out_0.2s_forwards] opacity-0 transition-all`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-title text-[1.25rem] text-page-cream">{t.subscription.freePlan}</h2>
            {isFree && <Badge variant="default">{t.subscription.currentPlan}</Badge>}
          </div>
          <p className="font-display text-[2.5rem] leading-none text-page-cream mb-8">
            R$0<span className="font-body text-[15px] text-page-cream-muted ml-1.5">/{t.subscription.perMonth}</span>
          </p>
          <ul className="space-y-4 mb-8 flex-1">
            {t.subscription.featuresFree.map((feature, i) => (
              <li key={i} className="flex items-start gap-3 font-body text-[14px] text-page-cream-muted">
                <svg className="w-4 h-4 text-page-cream-faint shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="leading-relaxed">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pro plan card */}
        <div className={`flex flex-col p-[32px] rounded-[14px] bg-desk-surface border ${isPro ? 'border-oxblood/50 ring-[3px] ring-oxblood-tint' : 'border-hairline'} animate-[fade-in-up_0.6s_ease-out_0.3s_forwards] opacity-0 relative transition-all`}>
          <div className="absolute top-0 right-0 pt-6 pr-8">
             <div className="inline-flex items-center font-label text-[12px] text-oxblood-bright">
               {t.subscription.recommended}
             </div>
          </div>
          
          <div className="flex items-center justify-between mb-6 mt-1">
            <h2 className="font-title text-[1.25rem] text-page-cream">{t.subscription.proPlan}</h2>
            {isPro && <Badge variant="blue" className="mr-24">{t.subscription.currentPlan}</Badge>}
          </div>
          <p className="font-display text-[2.5rem] leading-none text-page-cream mb-8">
            {priceFormatted}
            <span className="font-body text-[15px] text-page-cream-muted ml-1.5">/{t.subscription.perMonth}</span>
          </p>
          <ul className="space-y-4 mb-8 flex-1">
            {t.subscription.featuresPro.map((feature, i) => (
              <li key={i} className="flex items-start gap-3 font-body text-[14px] text-page-cream">
                <svg className="w-4 h-4 text-oxblood shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="leading-relaxed">{feature}</span>
              </li>
            ))}
          </ul>
          <div className="mt-auto relative z-10 w-full">
            {isFree ? (
              <div className="relative w-full">
                {user.balance >= SUBSCRIPTION_PRICE_CENTS && !subscribeDismissed && (
                  <div className="absolute bottom-[130%] left-1/2 -translate-x-1/2 mb-2 w-[280px] p-4 rounded-[14px] bg-desk-surface border border-hairline modal-lift animate-[fade-in-up_0.4s_ease-out_forwards]" onClick={(e) => e.stopPropagation()}>
                    <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-[10px] h-[10px] bg-desk-surface border-b border-r border-hairline transform rotate-45" />
                    <div className="flex items-start justify-between gap-3 relative">
                      <div className="w-7 h-7 rounded-full bg-forest-success/20 flex items-center justify-center text-forest-success shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="font-body text-[13px] text-page-cream leading-relaxed">{t.promotions.claimTooltipSubscribe}</span>
                      <button onClick={handleDismissSubscribe} className="shrink-0 text-page-cream-muted hover:text-page-cream transition-colors mt-0.5 cursor-pointer" aria-label="Close">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
                <Button onClick={() => setPaymentOpen(true)} className="w-full h-[44px] shadow-sm focus-within:lamp-halo focus:lamp-halo">{t.subscription.subscribe}</Button>
              </div>
            ) : (
              <div className="flex items-center justify-center font-label text-[13px] text-page-cream-muted bg-lamp-night border border-hairline rounded-[6px] h-[44px] w-full">
                {t.subscription.youAreNowPro}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="h-px bg-hairline my-10 w-full animate-[fade-in-up_0.6s_ease-out_0.35s_forwards] opacity-0" />

      {/* Dashboard-like bottom section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-[fade-in-up_0.6s_ease-out_0.4s_forwards] opacity-0">
        
        {/* Wallet area */}
        <div className="flex flex-col gap-4">
           <h2 className="font-label text-[12px] tracking-[0.05em] text-page-cream-muted uppercase">{t.subscription.walletTitle}</h2>
           <Card className="flex flex-col p-8 h-full justify-center">
             <p className="font-label text-[11px] text-page-cream-faint mb-2 uppercase tracking-wider">{t.subscription.yourBalance.replace('{amount}', '').replace(':', '').trim()}</p>
             <p className="font-display text-[2.5rem] leading-none text-page-cream mb-4">
               {balanceFormatted}
             </p>
             <p className="font-body text-[14px] text-page-cream-muted">{t.subscription.walletSubtitle}</p>
           </Card>
        </div>

        {/* Promotions area */}
        <div className="flex flex-col gap-4">
           <h2 className="font-label text-[12px] tracking-[0.05em] text-page-cream-muted uppercase">{t.promotions.title}</h2>
           {promotionsError ? (
              <Card className="p-8"><p className="font-body text-[14px] text-rust-danger">{t.promotions.loadError}</p></Card>
            ) : promotions === null ? (
              <Card className="flex justify-center items-center py-12"><Spinner size={24} /></Card>
            ) : promotions.length === 0 ? (
              <Card className="p-8"><p className="font-body text-[14px] text-page-cream-muted">Nenhuma promoção disponível no momento.</p></Card>
            ) : (
              <div className="flex flex-col gap-3">
                {promotions.map((promo) => {
                  const { title, description } = getPromotionStrings(t, promo);
                  const creditLine = t.promotions.creditAmount.replace(
                    '{amount}',
                    formatCredits(promo.creditAmount)
                  );
                  return (
                    <Card
                      key={promo.id}
                      clickable
                      onClick={() => setSelectedPromotion(promo)}
                      className="p-6 flex flex-col justify-between gap-3 relative overflow-visible"
                    >
                      {promo.eligible && !promo.claimed && !promoDismissed && (
                        <div className="absolute bottom-[105%] left-1/2 -translate-x-1/2 mb-2 w-[260px] p-4 rounded-[14px] bg-desk-surface border border-hairline modal-lift animate-[fade-in-up_0.4s_ease-out_forwards] z-10" onClick={(e) => e.stopPropagation()}>
                          <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-[10px] h-[10px] bg-desk-surface border-b border-r border-hairline transform rotate-45" />
                          <div className="flex items-start justify-between gap-3 relative">
                            <div className="w-6 h-6 rounded-full bg-oxblood-tint flex items-center justify-center text-oxblood-bright shrink-0 mt-0.5">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <span className="font-body text-[13px] text-page-cream leading-relaxed">{t.promotions.claimTooltipCard}</span>
                            <button onClick={handleDismissPromo} className="shrink-0 text-page-cream-muted hover:text-page-cream transition-colors mt-1 cursor-pointer" aria-label="Close">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6L6 18M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                      <div>
                         <div className="flex items-center gap-2 lg:gap-3 mb-2 flex-wrap">
                           <h3 className="font-title text-[1.125rem] text-page-cream leading-tight">{title}</h3>
                           {promo.claimed && (
                             <Badge variant="green" className="py-[2px] px-[8px] text-[10px] uppercase tracking-wider font-semibold">{t.promotions.claimed}</Badge>
                           )}
                         </div>
                         <p className="font-label text-[13px] text-oxblood-bright mb-3">{creditLine}</p>
                         <p className="font-body text-[14px] text-page-cream-muted leading-[1.6]">{description}</p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
        </div>
      </div>

      <PaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        balance={user.balance}
        onSuccess={refetch}
      />

      <PromotionDetailModal
        open={selectedPromotion !== null}
        promotion={selectedPromotion}
        onClose={() => setSelectedPromotion(null)}
        onClaimed={handlePromotionClaimed}
      />
    </div>
  );
}
