import { describe, it, expect, beforeEach } from 'vitest';
import { getTestSql, cleanDatabase, createTestUser } from '../helpers';
import {
  createPayment,
  getActivePaymentByUserId,
  getPaymentByAbacatepayId,
  invalidateUserPayments,
  markPaymentPaid,
} from '@/lib/db/queries/payments';

describe('Payment queries', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('createPayment', () => {
    it('should return the new payment with all expected fields', async () => {
      const user = await createTestUser();
      const payment = await createPayment(user.id, 'pix_char_001', 2000, 0, { source: 'test' });

      expect(payment.id).toBeDefined();
      expect(payment.userId).toBe(user.id);
      expect(payment.abacatepayId).toBe('pix_char_001');
      expect(payment.amount).toBe(2000);
      expect(payment.creditsToDebit).toBe(0);
      expect(payment.status).toBe('pending');
      expect(payment.metadata).toEqual({ source: 'test' });
      expect(payment.createdAt).toBeInstanceOf(Date);
      expect(payment.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('getActivePaymentByUserId', () => {
    it('should return the pending payment', async () => {
      const user = await createTestUser();
      const created = await createPayment(user.id, 'pix_char_001', 2000, 0);

      const payment = await getActivePaymentByUserId(user.id);
      expect(payment).not.toBeNull();
      expect(payment!.id).toBe(created.id);
    });

    it('should return null when no payments exist', async () => {
      const user = await createTestUser();
      const payment = await getActivePaymentByUserId(user.id);
      expect(payment).toBeNull();
    });
  });

  describe('getPaymentByAbacatepayId', () => {
    it('should return the correct payment', async () => {
      const user = await createTestUser();
      await createPayment(user.id, 'pix_char_test', 2000, 0);

      const payment = await getPaymentByAbacatepayId('pix_char_test');
      expect(payment).not.toBeNull();
      expect(payment!.abacatepayId).toBe('pix_char_test');
    });

    it('should return null for non-existent ID', async () => {
      const payment = await getPaymentByAbacatepayId('nonexistent');
      expect(payment).toBeNull();
    });
  });

  describe('invalidateUserPayments', () => {
    it('should invalidate pending payments and confirm via DB', async () => {
      const sql = getTestSql();
      const user = await createTestUser();
      const created = await createPayment(user.id, 'pix_char_001', 2000, 0);

      await invalidateUserPayments(user.id);

      const active = await getActivePaymentByUserId(user.id);
      expect(active).toBeNull();

      const rows = await sql`SELECT status FROM payments WHERE id = ${created.id}`;
      expect(rows[0].status).toBe('invalidated');
    });
  });

  describe('markPaymentPaid', () => {
    it('should set status to paid and update updated_at', async () => {
      const sql = getTestSql();
      const user = await createTestUser();
      const created = await createPayment(user.id, 'pix_char_001', 2000, 0);

      await markPaymentPaid(created.id);

      const rows = await sql`SELECT status, updated_at FROM payments WHERE id = ${created.id}`;
      expect(rows[0].status).toBe('paid');
      expect(new Date(rows[0].updated_at).getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
    });
  });

  describe('combined flow', () => {
    it('should handle full lifecycle: create → active → invalidate → new → paid', async () => {
      const sql = getTestSql();
      const user = await createTestUser();

      // Create first payment and verify it's active
      const first = await createPayment(user.id, 'pix_char_001', 2000, 0);
      expect(await getActivePaymentByUserId(user.id)).not.toBeNull();

      // Invalidate and verify gone
      await invalidateUserPayments(user.id);
      expect(await getActivePaymentByUserId(user.id)).toBeNull();

      // Create second payment and mark paid
      const second = await createPayment(user.id, 'pix_char_002', 2000, 0);
      await markPaymentPaid(second.id);

      // Verify final states
      const rows = await sql`SELECT id, status FROM payments WHERE user_id = ${user.id} ORDER BY created_at`;
      expect(rows).toHaveLength(2);
      expect(rows[0].status).toBe('invalidated');
      expect(rows[0].id).toBe(first.id);
      expect(rows[1].status).toBe('paid');
      expect(rows[1].id).toBe(second.id);
    });
  });
});
