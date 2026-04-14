import { describe, it, expect, afterEach } from 'vitest';
import { verifyWebhookSecret } from '@/app/api/webhooks/abacatepay/route';

describe('verifyWebhookSecret', () => {
  const originalSecret = process.env.ABACATEPAY_WEBHOOK_SECRET;

  afterEach(() => {
    if (originalSecret !== undefined) {
      process.env.ABACATEPAY_WEBHOOK_SECRET = originalSecret;
    } else {
      delete process.env.ABACATEPAY_WEBHOOK_SECRET;
    }
  });

  it('returns true when secret matches', () => {
    process.env.ABACATEPAY_WEBHOOK_SECRET = 'my-secret';
    expect(verifyWebhookSecret('my-secret')).toBe(true);
  });

  it('returns false when secret does not match', () => {
    process.env.ABACATEPAY_WEBHOOK_SECRET = 'my-secret';
    expect(verifyWebhookSecret('wrong-secret')).toBe(false);
  });

  it('returns false when secret is null', () => {
    process.env.ABACATEPAY_WEBHOOK_SECRET = 'my-secret';
    expect(verifyWebhookSecret(null)).toBe(false);
  });
});
