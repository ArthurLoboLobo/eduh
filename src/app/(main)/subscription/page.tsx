'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useUser } from '@/hooks/useUser';
import Spinner from '@/components/ui/Spinner';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import PaymentModal from '@/components/PaymentModal';
import { SUBSCRIPTION_PRICE_CENTS } from '@/config/subscription';

export default function SubscriptionPage() {
  const { t, language } = useTranslation();
  const { user, loading, refetch } = useUser();
  const [paymentOpen, setPaymentOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-5.5rem)]">
        <Spinner size={28} />
        <p className="mt-3 text-sm text-muted-text">{t.section.loading}</p>
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
    <div className="animate-fade-in-up">
      <h1 className="text-xl font-semibold text-primary-text mb-6">{t.subscription.title}</h1>

      {isPro && (
        <Card className="mb-6 border-accent-blue/40">
          <p className="text-[15px] text-primary-text">
            {t.subscription.proUntil.replace('{date}', expiresFormatted)}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Free plan card */}
        <Card className={isFree ? 'border-accent-blue/40' : ''}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-primary-text">{t.subscription.freePlan}</h2>
            {isFree && <Badge variant="blue">{t.subscription.currentPlan}</Badge>}
          </div>
          <p className="text-sm text-muted-text mt-2">{t.subscription.limitedUsage}</p>
        </Card>

        {/* Pro plan card */}
        <Card className={isPro ? 'border-accent-blue/40 shadow-lg' : ''}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-primary-text">{t.subscription.proPlan}</h2>
            {isPro && <Badge variant="blue">{t.subscription.currentPlan}</Badge>}
          </div>
          <p className="text-2xl font-semibold text-primary-text mt-3">
            {priceFormatted}
            <span className="text-sm font-normal text-muted-text ml-1">/{t.subscription.perMonth}</span>
          </p>
          <p className="text-sm text-muted-text mt-2">{t.subscription.unlimitedUsage}</p>
          {isFree && (
            <div className="mt-4">
              <Button onClick={() => setPaymentOpen(true)}>{t.subscription.subscribe}</Button>
            </div>
          )}
        </Card>
      </div>

      <div className="mb-8">
        <p className="text-[15px] text-primary-text">
          {t.subscription.yourBalance.replace('{amount}', balanceFormatted)}
        </p>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-primary-text mb-3">{t.subscription.promotions}</h2>
        <Card>
          <p className="text-sm text-muted-text text-center py-4">—</p>
        </Card>
      </div>

      <PaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        balance={user.balance}
        onSuccess={refetch}
      />
    </div>
  );
}
