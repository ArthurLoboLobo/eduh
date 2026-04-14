import { sql } from '@/lib/db/connection';
import {
  UNIVERSITY_EMAIL_SUFFIXES,
  UNIVERSITY_PROMO_CREDIT_CENTS,
} from '@/config/subscription';

export type UserPromotion = {
  id: string;
  creditAmount: number;
  eligible: boolean;
  claimed: boolean;
};

const PROMOTION_IDS = ['university-email'] as const;

async function isClaimed(userId: string, promotionId: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM promotion_claims
    WHERE user_id = ${userId} AND promotion_id = ${promotionId}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function getUserPromotion(
  userId: string,
  promotionId: string
): Promise<UserPromotion | null> {
  switch (promotionId) {
    case 'university-email': {
      const rows = await sql`SELECT email FROM users WHERE id = ${userId} LIMIT 1`;
      if (rows.length === 0) return null;
      const email = (rows[0] as { email: string }).email.toLowerCase();
      const eligible = UNIVERSITY_EMAIL_SUFFIXES.some((suffix) => email.endsWith(suffix));
      const claimed = await isClaimed(userId, promotionId);
      return {
        id: promotionId,
        creditAmount: UNIVERSITY_PROMO_CREDIT_CENTS,
        eligible,
        claimed,
      };
    }
    default:
      return null;
  }
}

export async function getUserPromotions(userId: string): Promise<UserPromotion[]> {
  const results = await Promise.all(
    PROMOTION_IDS.map((id) => getUserPromotion(userId, id))
  );
  return results.filter((p): p is UserPromotion => p !== null);
}

export async function claimPromo(userId: string, promo: UserPromotion): Promise<void> {
  await sql.transaction([
    sql`INSERT INTO promotion_claims (user_id, promotion_id) VALUES (${userId}, ${promo.id})`,
    sql`UPDATE users SET balance = balance + ${promo.creditAmount} WHERE id = ${userId}`,
  ]);
}
