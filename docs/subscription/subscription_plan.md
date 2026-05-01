# Subscription Implementation Plan

This plan implements everything in `docs/subscription.md`. Subscription comes first, promotion after. Each step includes what to test.

---

## Step 0: Test Infrastructure Setup

### 0A: Create test Neon database (manual — outside code)

> **You must do these steps manually before writing any test code.**

1. Go to the [Neon Console](https://console.neon.tech).
2. Create a new project (e.g., "eduh-test") — or create a new branch on the existing project. A separate project is cleaner.
3. Copy the **pooled** connection string (`DATABASE_URL`) from the new project's dashboard.
4. Create a `.env.test` file at the project root (already in `.gitignore` via the `.env*` pattern):
   ```
   DATABASE_URL=postgres://...your-test-neon-pooled-url...
   DATABASE_URL_UNPOOLED=postgres://...your-test-neon-direct-url...
   ```
5. Run migrations against the test database:
   ```bash
   DATABASE_URL_UNPOOLED=postgres://...your-test-neon-direct-url... npx node-pg-migrate up
   ```
6. Verify it worked: connect to the test DB and confirm the tables exist.

### 0B: Install Vitest

```bash
npm install -D vitest
```

### 0C: Vitest config

Create `vitest.config.ts` at the project root:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      // Vitest loads .env.test automatically when this is set
      // But we explicitly load it for clarity
    },
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    // Run test files sequentially — they share a single test DB
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 0D: dotenv loading + DB cleanup helper

Create `tests/setup.ts`:

```typescript
import dotenv from 'dotenv';
import path from 'path';

// Load .env.test BEFORE any other imports that use process.env
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
```

Create `tests/helpers.ts`:

```typescript
import { neon } from '@neondatabase/serverless';

/**
 * Returns a fresh sql connection using the test DATABASE_URL.
 * Use this instead of importing from @/lib/db/connection
 * to ensure tests always hit the test DB.
 */
export function getTestSql() {
  return neon(process.env.DATABASE_URL!);
}

/**
 * Truncate all tables. Call in beforeEach() for test isolation.
 * CASCADE handles foreign key dependencies.
 */
export async function cleanDatabase() {
  const sql = getTestSql();
  await sql`TRUNCATE
    messages, chat_summaries, chats, embeddings,
    subtopics, topics, plan_drafts, files,
    daily_usage, payments, sections, otp_codes, users
    CASCADE`;
}

/**
 * Insert a minimal test user. Returns { id, email }.
 */
export async function createTestUser(email = 'test@example.com') {
  const sql = getTestSql();
  const rows = await sql`
    INSERT INTO users (email) VALUES (${email})
    RETURNING id, email
  `;
  return rows[0] as { id: string; email: string };
}
```

### 0E: npm script

Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

### 0F: Directory structure

```
tests/
  setup.ts              ← dotenv loading (runs before all tests)
  helpers.ts            ← cleanDatabase, createTestUser, getTestSql
  unit/                 ← pure function tests (no DB)
    usage.test.ts
    config.test.ts
  db/                   ← database query tests (need test DB)
    users.test.ts
    payments.test.ts
    usage.test.ts
    promotions.test.ts
  integration/          ← multi-layer tests (queries + business logic together)
    subscribe-flow.test.ts
    webhook-flow.test.ts
    usage-limit-flow.test.ts
```

**Test**: Run `npx vitest run` with an empty test file to confirm Vitest picks up the config, loads `.env.test`, and connects to the test DB.

---

## Step 1: Database Migration — User Subscription Fields

Add columns to the `users` table:

```sql
ALTER TABLE users
  ADD COLUMN plan TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN plan_expires_at TIMESTAMPTZ,
  ADD COLUMN balance INTEGER NOT NULL DEFAULT 0
    CHECK (balance >= 0);
```

- `plan`: `'free'` or `'pro'` (TEXT not ENUM, for future Ultra tier).
- `plan_expires_at`: NULL for free users, set when Pro activated.
- `balance`: BRL cents. Default 0. `CHECK (balance >= 0)` prevents negative balance at the DB level as a safety net.

**Migration file**: `008_add_subscription_fields.js`

**Test** (`tests/db/migrations.test.ts` — needs DB):

Run migration up/down manually against the test DB before/after this step. The automated tests verify the schema constraints:

- Insert a user via `createTestUser`. Query the row directly — verify defaults: `plan = 'free'`, `balance = 0`, `plan_expires_at = NULL`.
- Insert a user. Attempt `UPDATE users SET balance = -1` — verify the CHECK constraint rejects it with an error.

---

## Step 2: Database Migration — Payments Table

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  abacatepay_id TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  credits_to_debit INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_abacatepay_id ON payments(abacatepay_id);
CREATE UNIQUE INDEX idx_one_pending_payment ON payments(user_id) WHERE status = 'pending';
```

- `status`: `'pending'`, `'paid'`, `'invalidated'`, `'expired'`.
- `abacatepay_id`: the `pix_char_xxx` ID from AbacatePay.
- `credits_to_debit`: locked at payment creation time, debited on confirmation.
- `metadata`: stores the full AbacatePay create-QR response for debugging/reference. Not used in business logic.
- **Partial unique index** `idx_one_pending_payment`: ensures at most 1 pending payment per user at the DB level, preventing double-discount race conditions where two concurrent subscribe requests could both use credits.

**Migration file**: `008_add_subscription_fields.js` (same migration as Step 1 — both in one file).

**Test** (add to `tests/db/migrations.test.ts` — needs DB):

- Insert a payment for a user. Insert another payment with the same `abacatepay_id` — verify the UNIQUE constraint rejects it.
- Insert a pending payment for user A. Attempt to insert a second pending payment for user A with a different `abacatepay_id` — verify the partial unique index rejects it.
- Insert a pending payment for user A. Update its status to `'invalidated'`. Now insert a new pending payment for user A — verify it succeeds (the partial unique index only covers `status = 'pending'`).

---

## Step 3: Database Migration — Daily Usage Table

```sql
CREATE TABLE daily_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  weighted_tokens BIGINT NOT NULL DEFAULT 0,
  UNIQUE(user_id, usage_date)
);
CREATE INDEX idx_daily_usage_user_date ON daily_usage(user_id, usage_date);
```

- One row per user per day. Upserted on each chat message.
- `usage_date`: uses the 3 AM UTC reset boundary (e.g., messages at 2 AM UTC on April 5 count as April 4).

**Migration file**: same `008_add_subscription_fields.js`.

**Test** (add to `tests/db/migrations.test.ts` — needs DB):

- Insert a row for user A on a given date. Insert another row for the same user and date — verify the UNIQUE constraint rejects it.
- Insert a row. Use `ON CONFLICT DO UPDATE` to upsert with additional tokens — verify the row's `weighted_tokens` is the sum of both inserts.

---

## Step 4: Config Files

### `src/config/subscription.ts` (new file)

```typescript
export const SUBSCRIPTION_PRICE_CENTS = 2000; // R$20.00
export const SUBSCRIPTION_DURATION_DAYS = 30;
export const PIX_EXPIRATION_SECONDS = 600; // 10 minutes

export const UNIVERSITY_EMAIL_SUFFIXES = [
  '@dac.unicamp.br',
  '@usp.br',
  // add more as needed
];

export const UNIVERSITY_PROMO_CREDIT_CENTS = 2000; // R$20.00
```

### `src/config/ai.ts` (add to existing)

```typescript
// Usage limits (weighted tokens per day)
// Estimate: ~7 messages/topic, ~2000 input + ~500 output tokens each
// Weighted per message: 2000 + 500*6 = 5000, per topic: ~35,000
// These are starting estimates — tune after measuring real usage.
// Free users have two thresholds on a single cumulative counter:
export const DAILY_TOKEN_LIMIT_FREE_BEST = 100_000;    // ~2.5 topics (best model)
export const DAILY_TOKEN_LIMIT_FREE_CUTOFF = 200_000;   // ~5 topics (hard cutoff)
// Pro users have one threshold (degraded model is unlimited after):
export const DAILY_TOKEN_LIMIT_PRO = 400_000;            // ~10 topics (best model)
export const TOKEN_WEIGHT_OUTPUT_MULTIPLIER = 6;         // output tokens cost 6x input

// Usage warning thresholds (percentage of current phase's limit)
export const USAGE_WARNING_THRESHOLDS = [75, 90];

// Degraded model (used after best-model threshold for both plans)
export const DEGRADED_CHAT_MODEL = 'gemini-3-flash-preview';
```
---

## Step 5: Database Queries — User Plan & Balance

### `src/lib/db/queries/users.ts` (extend)

New functions:

- `getUserById(userId)` — returns the full user row: `{ id, email, plan, planExpiresAt, balance, createdAt }` (camelCase). Expires pro plans directly in the DB: `UPDATE users SET plan = 'free', plan_expires_at = NULL WHERE id = $userId AND plan = 'pro' AND plan_expires_at < now() RETURNING *`. If the UPDATE returns a row, use it (plan was just expired). Otherwise, do a normal `SELECT * FROM users WHERE id = $userId`. This ensures the DB is always in sync — no stale `plan = 'pro'` rows with past expiry dates. This is the single function used everywhere a user's data is needed.
- `updateUserBalance(userId, deltaAmount)` — atomic increment: `UPDATE users SET balance = balance + $delta WHERE id = $userId AND balance + $delta >= 0 RETURNING balance`. If no row returned, the debit failed (insufficient balance) — throw an error. The `CHECK (balance >= 0)` constraint is a DB-level safety net, but the `WHERE` clause prevents the error from reaching the constraint.
- `activateProPlan(userId)` — `UPDATE users SET plan = 'pro', plan_expires_at = now() + INTERVAL '30 days' WHERE id = $userId`.

**Test** (`tests/db/users.test.ts` — needs DB):

`getUserById`:
- Create a user. Call `getUserById` — verify it returns `{ id, email, plan: 'free', planExpiresAt: null, balance: 0, createdAt }` with all fields in camelCase.
- Activate pro on a user. Call `getUserById` — verify `plan: 'pro'` and `planExpiresAt` is approximately 30 days from now.
- Set a user's `plan_expires_at` to a past date directly in the DB (raw SQL). Call `getUserById` — verify it returns `plan: 'free'`, `planExpiresAt: null`. Then query the DB row directly to confirm the UPDATE actually persisted (the function expired the plan in-place, not just in the return value).

`activateProPlan`:
- Create a user. Call `activateProPlan`. Query the DB row directly — verify `plan = 'pro'` and `plan_expires_at` is roughly `now() + 30 days`.

`updateUserBalance`:
- Create a user. Call `updateUserBalance(userId, +500)` — verify returned balance is 500.
- Call `updateUserBalance(userId, -500)` — verify returned balance is 0.
- Call `updateUserBalance(userId, -1)` — verify it throws an insufficient balance error (balance is 0, can't go negative).
- Create a user. Call `updateUserBalance(userId, +100)`, then `updateUserBalance(userId, -50)` — verify returned balance is 50. Confirms atomic increment/decrement works across multiple calls.

---

## Step 6: Database Queries — Payments

### `src/lib/db/queries/payments.ts` (new file)

- `createPayment(userId, abacatepayId, amount, creditsToDebit, metadata)` — inserts a new payment.
- `getActivePaymentByUserId(userId)` — returns the pending payment for this user (if any).
- `getPaymentByAbacatepayId(abacatepayId)` — for webhook lookup.
- `invalidateUserPayments(userId)` — sets all `pending` payments for this user to `invalidated`.
- `markPaymentPaid(paymentId)` — sets `status = 'paid'`, `updated_at = now()`.

**Test** (`tests/db/payments.test.ts` — needs DB):

`createPayment`:
- Create a user. Call `createPayment` with valid args — verify the returned row has all expected fields (`id`, `userId`, `abacatepayId`, `amount`, `creditsToDebit`, `status: 'pending'`, `metadata`, `createdAt`, `updatedAt`).

`getActivePaymentByUserId`:
- Create a user with a pending payment. Call `getActivePaymentByUserId` — verify it returns the payment.
- Create a user with no payments. Call `getActivePaymentByUserId` — verify it returns null/undefined.

`getPaymentByAbacatepayId`:
- Create a payment with `abacatepayId = 'pix_char_test'`. Call `getPaymentByAbacatepayId('pix_char_test')` — verify it returns the correct payment.
- Call with a non-existent ID — verify it returns null/undefined.

`invalidateUserPayments`:
- Create a user with a pending payment. Call `invalidateUserPayments`. Call `getActivePaymentByUserId` — verify no active payment exists. Query the row directly — verify `status = 'invalidated'`.

`markPaymentPaid`:
- Create a pending payment. Call `markPaymentPaid`. Query the row — verify `status = 'paid'` and `updated_at` has changed.

**Combined flow**:
- Create a payment → verify it's active → invalidate → verify gone → create another → mark paid → verify status is `'paid'` and the invalidated one is still `'invalidated'`.

---

## Step 7: Database Queries — Daily Usage

### `src/lib/db/queries/usage.ts` (new file)

- `getUsageDate()` — pure JS function (no DB call). Returns the current usage date as a `YYYY-MM-DD` string, considering the 3 AM UTC boundary: `const d = new Date(); d.setUTCHours(d.getUTCHours() - 3); return d.toISOString().slice(0, 10);`. Before 3 AM UTC = previous day.
- `upsertDailyUsage(userId, weightedTokens)` — `INSERT INTO daily_usage (user_id, usage_date, weighted_tokens) VALUES ($userId, $usageDate, $tokens) ON CONFLICT (user_id, usage_date) DO UPDATE SET weighted_tokens = daily_usage.weighted_tokens + $tokens RETURNING weighted_tokens`. Returns the new total.
- `getDailyUsage(userId)` — `SELECT weighted_tokens FROM daily_usage WHERE user_id = $userId AND usage_date = $usageDate`. Returns `weighted_tokens` or `0` if no row.
- `getUsagePhase(weightedTokens, plan)` — pure JS function (no DB call). Returns `{ phase: 'best' | 'degraded' | 'blocked', usagePercent: number }`.
  - **Free** (`plan === 'free'`):
    - If `weightedTokens < DAILY_TOKEN_LIMIT_FREE_BEST`: phase is `'best'`, usagePercent is `Math.floor((weightedTokens / DAILY_TOKEN_LIMIT_FREE_BEST) * 100)`.
    - If `weightedTokens < DAILY_TOKEN_LIMIT_FREE_CUTOFF`: phase is `'degraded'`, usagePercent is `Math.floor(((weightedTokens - DAILY_TOKEN_LIMIT_FREE_BEST) / (DAILY_TOKEN_LIMIT_FREE_CUTOFF - DAILY_TOKEN_LIMIT_FREE_BEST)) * 100)`.
    - Otherwise: phase is `'blocked'`, usagePercent is 100.
  - **Pro** (`plan === 'pro'`):
    - If `weightedTokens < DAILY_TOKEN_LIMIT_PRO`: phase is `'best'`, usagePercent is `Math.floor((weightedTokens / DAILY_TOKEN_LIMIT_PRO) * 100)`.
    - Otherwise: phase is `'degraded'`, usagePercent is 0 (irrelevant — no cap on degraded model for pro).

**Test — pure functions** (`tests/unit/usage.test.ts` — no DB):

`getUsageDate`:
- Mock the current time to 2:59 AM UTC on April 5. Call `getUsageDate` — verify it returns `'2026-04-04'` (previous day, because it's before the 3 AM boundary).
- Mock the current time to 3:01 AM UTC on April 5. Call `getUsageDate` — verify it returns `'2026-04-05'` (current day).
- Mock the current time to exactly 3:00 AM UTC. Call `getUsageDate` — verify it returns `'2026-04-05'` (boundary itself counts as the new day).
- Mock midnight UTC on January 1. Call `getUsageDate` — verify it returns the previous year's last day (`'2025-12-31'`). Confirms year boundary works.

`getUsagePhase` (free):
- `getUsagePhase(0, 'free')` → `{ phase: 'best', usagePercent: 0 }`.
- `getUsagePhase(DAILY_TOKEN_LIMIT_FREE_BEST / 2, 'free')` → `{ phase: 'best', usagePercent: 50 }`.
- `getUsagePhase(DAILY_TOKEN_LIMIT_FREE_BEST, 'free')` → `{ phase: 'degraded', usagePercent: 0 }` (exactly at the threshold = start of degraded).
- `getUsagePhase(DAILY_TOKEN_LIMIT_FREE_BEST + (DAILY_TOKEN_LIMIT_FREE_CUTOFF - DAILY_TOKEN_LIMIT_FREE_BEST) / 2, 'free')` → `{ phase: 'degraded', usagePercent: 50 }`.
- `getUsagePhase(DAILY_TOKEN_LIMIT_FREE_CUTOFF, 'free')` → `{ phase: 'blocked', usagePercent: 100 }`.
- `getUsagePhase(DAILY_TOKEN_LIMIT_FREE_CUTOFF * 2, 'free')` → `{ phase: 'blocked', usagePercent: 100 }` (stays blocked).
- Verify usagePercent is always an integer (floored).

`getUsagePhase` (pro):
- `getUsagePhase(0, 'pro')` → `{ phase: 'best', usagePercent: 0 }`.
- `getUsagePhase(DAILY_TOKEN_LIMIT_PRO / 2, 'pro')` → `{ phase: 'best', usagePercent: 50 }`.
- `getUsagePhase(DAILY_TOKEN_LIMIT_PRO, 'pro')` → `{ phase: 'degraded', usagePercent: 0 }`.
- `getUsagePhase(DAILY_TOKEN_LIMIT_PRO * 2, 'pro')` → `{ phase: 'degraded', usagePercent: 0 }` (stays degraded, never blocked).
- Verify usagePercent is always an integer (floored).

**Test — DB queries** (`tests/db/usage.test.ts` — needs DB):

`upsertDailyUsage`:
- Create a user. Call `upsertDailyUsage(userId, 5000)` — verify it returns 5000.
- Call again with 3000 for the same user — verify it returns 8000 (accumulated via ON CONFLICT upsert).

`getDailyUsage`:
- Create a user with no usage. Call `getDailyUsage` — verify it returns 0.
- Upsert 8000 tokens for a user. Call `getDailyUsage` — verify it returns 8000.

---

## Step 8: API — `GET /api/user`

### `src/app/api/user/route.ts` (new file)

Returns the full user object: `{ id, email, plan, planExpiresAt, balance, createdAt }`.

- Extract `userId` from JWT → 401 if missing.
- Call `getUserById(userId)`.
- Return JSON.

**Test**: This is an API route — test manually or via integration tests. No dedicated unit test file (it's a thin wrapper around `getUserById` which is already tested in `tests/db/users.test.ts`). Manual checks: call unauthenticated → 401. Call as free user → correct JSON shape. Activate pro, call again → `plan: 'pro'`. Expire the plan, call again → `plan: 'free'`.

---

## Step 9: API — Usage Tracking in Chat Messages

### Modify `POST /api/chats/:id/messages`

In the existing `onFinish({ text, usage: streamUsage })` callback (right after `insertAiCallLog`):

1. Read `streamUsage.promptTokens` and `streamUsage.completionTokens` (already available — the codebase uses these for `insertAiCallLog`).
2. Calculate `weightedTokens = promptTokens + (completionTokens * TOKEN_WEIGHT_OUTPUT_MULTIPLIER)`.
3. Call `upsertDailyUsage(userId, weightedTokens)` — returns new total.

No need to include `usagePercent` in the stream response. The frontend already refetches `GET /api/chats/:id/messages` in its `onFinish` callback (see chat page lines 66-84), so it picks up the updated `usagePercent` from the GET response.

### Modify `GET /api/chats/:id/messages`

After loading messages, before returning:

1. Get the user's plan info via `getUserById(userId)`.
2. Get daily usage via `getDailyUsage(userId)`.
3. Compute `{ phase, usagePercent } = getUsagePhase(weightedTokens, plan)`.
4. Add to the response: `{ messages, summarizedUpToMessageId, phase, usagePercent }`.

**Note**: The initial AI greeting (first chat load, generated by GET) does **not** count towards usage. It's system-generated, not user-initiated. Only POST tracks usage.

**Test**: No dedicated unit test — the weighted token calculation is straightforward arithmetic (`promptTokens + completionTokens * TOKEN_WEIGHT_OUTPUT_MULTIPLIER`), and `upsertDailyUsage` is already tested in `tests/db/usage.test.ts`. The `phase`/`usagePercent` response fields rely on `getUsagePhase` which is tested in `tests/unit/usage.test.ts`. Verify the wiring manually: load a chat, send a message, check the refetched GET response includes `phase` and `usagePercent > 0`.

---

## Step 10: API — Usage Limit Enforcement

### Modify `POST /api/chats/:id/messages` (before streaming)

Insert after the existing rate limit check (line ~141) and before message extraction:

1. `const planInfo = await getUserById(userId)`.
2. `const currentUsage = await getDailyUsage(userId)`.
3. `const { phase } = getUsagePhase(currentUsage, planInfo.plan)`.
4. **`phase === 'blocked'`** (free users only): `return NextResponse.json({ error: 'USAGE_LIMIT_REACHED' }, { status: 429 })`.
5. **`phase === 'degraded'`** (both plans): set `modelToUse = DEGRADED_CHAT_MODEL`.
6. **`phase === 'best'`** (both plans): set `modelToUse = TEACHING_CHAT_MODEL` (same as current behavior).

The enforcement applies to **both** topic and revision chats — they share the same `POST /api/chats/:id/messages` handler.

Note: The check is **before** the message, but usage is recorded **after** the response. This means the last message that pushes the user over the limit still goes through, which is the desired UX (you don't get cut off mid-thought).

**Test** (`tests/integration/usage-limit-flow.test.ts` — needs DB):

This tests the enforcement logic in isolation by calling the query functions directly (not the full HTTP route), simulating what the API route does:

- Create a free user with 0 usage. Call `getDailyUsage` + `getUsagePhase` — verify `phase === 'best'`, so the user gets the best model.
- Create a free user. Upsert `DAILY_TOKEN_LIMIT_FREE_BEST` tokens — verify `getUsagePhase` returns `phase === 'degraded'`. This is the state where the API would switch to `DEGRADED_CHAT_MODEL`.
- Create a free user. Upsert `DAILY_TOKEN_LIMIT_FREE_CUTOFF` tokens — verify `getUsagePhase` returns `phase === 'blocked'`. This is the state where the API would return 429 `USAGE_LIMIT_REACHED`.
- Create a free user at 99% of the best-model threshold. Upsert a small amount to push past — verify phase changes from `'best'` to `'degraded'`. Confirms the boundary.
- Create a free user at 99% of the hard-cutoff threshold (in the degraded phase). Upsert a small amount to push past — verify phase changes from `'degraded'` to `'blocked'`. Confirms the second boundary.
- Create a pro user (use `activateProPlan` first). Upsert `DAILY_TOKEN_LIMIT_PRO` tokens — verify `getUsagePhase` returns `phase === 'degraded'`. This is the state where the API would switch to `DEGRADED_CHAT_MODEL`.
- Create a pro user. Upsert `DAILY_TOKEN_LIMIT_PRO * 2` tokens — verify `getUsagePhase` still returns `phase === 'degraded'` (never `'blocked'`).

---

## Step 11: Frontend — Chat Error Handling (Bounce-back)

### Modify chat page component (`page.tsx`)

Currently, errors show inline text (rate limit message or `chatError`). New behavior: **all** errors bounce the message back to the input box + show a toast.

**How the error path works**:
- Pre-stream errors (429, 401, 400): The API returns JSON `{ error: 'ERROR_CODE' }` before streaming starts. The backend has NOT saved the user message to DB (rate limit and usage limit checks happen before `createMessage`). `useChat` fires `onError` with an Error whose message contains the response body.
- Mid-stream errors (AI API failure): The backend already saved the user message but the catch block cleans it up via `deleteMessagesFrom`. `useChat` fires `onError`.
- In both cases: `useChat` has optimistically added the user message to the `messages` array in the UI.

**Implementation in `onError`**:

```typescript
onError(error) {
  // 1. Find the last user message in the messages array
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  const msgText = lastUserMsg?.parts?.find(p => p.type === 'text')?.text ?? '';

  // 2. Remove it from UI (bounce back to input)
  if (lastUserMsg) {
    setMessages(prev => prev.filter(m => m.id !== lastUserMsg.id));
  }
  setInputValue(msgText);

  // 3. Show error-specific toast
  const errStr = error.message ?? '';
  if (errStr.includes('USAGE_LIMIT_REACHED')) {
    showToast(t.subscription.usageLimitFree, 'error');
  } else if (errStr.includes('RATE_LIMITED')) {
    showToast(t.chat.rateLimited, 'error');
  } else {
    showToast(t.chat.streamError, 'error');
  }
}
```

Remove the old inline `rateLimitMsg` state and the `chatError` inline display — everything is now toasts + bounce-back.

**i18n keys used**: `t.subscription.usageLimitFree` (added in this step to both `pt-BR.ts` and `en.ts` `subscription` section).

**Test**: Frontend-only — no unit test. Verify manually: set `DAILY_TOKEN_LIMIT_FREE = 1` temporarily. Send two messages as free user. Second message bounces back to input box, toast shows usage limit message. Verify no orphaned message in DB. Test with a simulated API error — message bounces back, generic toast appears.

---

## Step 12: Frontend — Usage Warnings

### Create `src/lib/usage-warnings.ts` (new file)

Two pure functions. Both derive their behavior dynamically from `USAGE_WARNING_THRESHOLDS` — changing, adding, or removing thresholds in the config automatically updates the warning logic without touching any other code.

**Warning state**: a `string | null` representing the user's current warning level. For thresholds `[75, 90]`, the full severity hierarchy (least → most) is:

- Free: `null` < `'best:75'` < `'best:90'` < `'degraded'` < `'degraded:75'` < `'degraded:90'` < `'blocked'`
- Pro: `null` < `'best:75'` < `'best:90'` < `'degraded'`

The hierarchy is not hardcoded — it is built from `USAGE_WARNING_THRESHOLDS`.

**`getWarningState(usagePercent, plan, phase)`** — returns the current warning state:

```typescript
function getWarningState(
  usagePercent: number,
  plan: 'free' | 'pro',
  phase: 'best' | 'degraded' | 'blocked'
): string | null {
  if (phase === 'blocked') return 'blocked';
  if (plan === 'pro' && phase === 'degraded') return 'degraded';

  // Check thresholds descending — return highest crossed
  const sorted = [...USAGE_WARNING_THRESHOLDS].sort((a, b) => b - a);
  for (const t of sorted) {
    if (usagePercent >= t) return `${phase}:${t}`;
  }

  // No threshold crossed
  if (phase === 'degraded') return 'degraded';
  return null;
}
```

**`getWarningSeverity(state)`** — maps a warning state to a numeric severity, built dynamically from `USAGE_WARNING_THRESHOLDS`:

```typescript
function getWarningSeverity(state: string | null): number {
  const sorted = [...USAGE_WARNING_THRESHOLDS].sort((a, b) => a - b);
  const severityMap = new Map<string | null, number>();
  let s = 0;
  severityMap.set(null, s);
  for (const t of sorted) { s++; severityMap.set(`best:${t}`, s); }
  s++; severityMap.set('degraded', s);
  for (const t of sorted) { s++; severityMap.set(`degraded:${t}`, s); }
  s++; severityMap.set('blocked', s);
  return severityMap.get(state) ?? 0;
}
```

### Modify chat page component

**State**: a single ref replaces the two delta-tracking refs.

- `warningStateRef = useRef<string | null>(null)` — tracks the last known warning state.

**On initial page load** (GET response): compute the warning state, store it in the ref, and show the toast if non-null. If the user opens the app at 80%, they see the appropriate warning immediately.

```typescript
const state = getWarningState(data.usagePercent, plan, data.phase);
warningStateRef.current = state;
if (state !== null) {
  showWarningToast(state, plan);
}
```

**On refetch after each message** (inside `onFinish`): compute the new state and show a toast only if severity increased.

```typescript
const newState = getWarningState(data.usagePercent, plan, data.phase);
if (getWarningSeverity(newState) > getWarningSeverity(warningStateRef.current)) {
  showWarningToast(newState, plan);
}
warningStateRef.current = newState;
```

If severity stayed the same or decreased (e.g., daily reset happened mid-session), the ref updates silently — no toast.

**`showWarningToast(state, plan)`** — maps the warning state to the correct translation key:

```typescript
function showWarningToast(state: string | null, plan: 'free' | 'pro') {
  if (!state) return;

  if (state === 'degraded') {
    showToast(plan === 'free' ? t.subscription.freeDegraded : t.subscription.proDegraded, 'warning');
    return;
  }

  const [phase, thresholdStr] = state.split(':');
  const threshold = Number(thresholdStr);
  if (plan === 'pro') {
    showToast(t.subscription[`usageWarning${threshold}Pro`], 'warning');
  } else if (phase === 'best') {
    showToast(t.subscription[`usageWarning${threshold}FreeBest`], 'warning');
  } else if (phase === 'degraded') {
    showToast(t.subscription[`usageWarning${threshold}FreeDegraded`], 'warning');
  }
}
```

The `blocked` state is never passed to `showWarningToast` — it is handled by the bounce-back error path in Step 11.

The user's `plan` is needed here. Fetch it once on mount (from `GET /api/user`) and store in a ref. This is a lightweight call that the navbar also makes.

**Test — pure functions** (`tests/unit/usage-warnings.test.ts` — no DB):

`getWarningState`:
- `getWarningState(0, 'free', 'best')` → `null`.
- `getWarningState(74, 'free', 'best')` → `null` (just below first threshold).
- `getWarningState(75, 'free', 'best')` → `'best:75'`.
- `getWarningState(89, 'free', 'best')` → `'best:75'` (between thresholds).
- `getWarningState(90, 'free', 'best')` → `'best:90'`.
- `getWarningState(0, 'free', 'degraded')` → `'degraded'` (no threshold crossed).
- `getWarningState(75, 'free', 'degraded')` → `'degraded:75'`.
- `getWarningState(90, 'free', 'degraded')` → `'degraded:90'`.
- `getWarningState(0, 'free', 'blocked')` → `'blocked'`.
- `getWarningState(75, 'pro', 'best')` → `'best:75'`.
- `getWarningState(90, 'pro', 'best')` → `'best:90'`.
- `getWarningState(0, 'pro', 'degraded')` → `'degraded'` (no thresholds for pro degraded).
- `getWarningState(90, 'pro', 'degraded')` → `'degraded'` (still no thresholds).

`getWarningSeverity`:
- `getWarningSeverity(null)` → `0`.
- Verify strict ordering: `null < best:75 < best:90 < degraded < degraded:75 < degraded:90 < blocked`. All values distinct.

Dynamic threshold test — override `USAGE_WARNING_THRESHOLDS` to `[50, 75, 95]`:
- `getWarningState(50, 'free', 'best')` → `'best:50'`.
- `getWarningState(75, 'free', 'best')` → `'best:75'`.
- `getWarningState(95, 'free', 'best')` → `'best:95'`.
- Severity ordering: `best:50 < best:75 < best:95 < degraded`.

Comparison logic:
- Previous `null`, new `'best:75'` → severity increased → toast.
- Previous `'best:75'`, new `'best:90'` → severity increased → toast.
- Previous `'best:90'`, new `'degraded'` → severity increased → toast.
- Previous `'best:75'`, new `'best:75'` → same → no toast.
- Previous `'degraded:90'`, new `'best:75'` → severity decreased (e.g., new day) → no toast.

**Test — manual** (frontend):
- Set `DAILY_TOKEN_LIMIT_FREE_BEST = 10000`. Open a chat as free user at 0% → no toast. Send messages until `usagePercent` crosses 75 → toast with "best" wording. Continue until 90 → second toast. Continue until phase switches to `'degraded'` → degradation toast with upgrade link. Continue sending → usagePercent resets relative to degraded phase. Cross 75 again → new toast with "degraded" wording. Cross 90 → another toast.
- Refresh page mid-degraded-phase at 80% → toast on load showing the `degraded:75` warning. This is the key difference from before: the user is informed of their situation immediately.
- Refresh page mid-best-phase at 50% → no toast on load (state is `null`).
- For pro user: send messages until phase switches to `'degraded'` → degradation toast. No further warnings (no limit in pro degraded).

**i18n keys used**: `t.subscription.freeDegraded`, `t.subscription.proDegraded`, `t.subscription.usageWarningPro`, `t.subscription.usageWarningFreeBest`, `t.subscription.usageWarningFreeDegraded`, `t.subscription.usageWarningFreeDegradedFinal` (all added in this step to both `pt-BR.ts` and `en.ts` `subscription` section).

---

## Step 13: Frontend — Navbar Changes

### Modify `src/components/Navbar.tsx`

### Create `src/hooks/useUser.ts` (new file)

Simple hook — consistent with the codebase pattern of each component fetching its own data (no shared context/provider):

```typescript
export function useUser() {
  const [user, setUser] = useState<{ id: string; email: string; plan: string; planExpiresAt: string | null; balance: number; createdAt: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const res = await fetch('/api/user');
    if (res.ok) setUser(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  return { user, loading, refetch: fetchUser };
}
```

Each component that calls `useUser()` makes its own fetch. The navbar and subscription page each call it independently. This is a lightweight call (single DB query).

### Modify `src/components/Navbar.tsx`

1. Call `useUser()` on mount.

3. **Profile dropdown**: Add "Subscription" menu item linking to `/subscription`, for both plans. Place it above "Logout".
4. While `loading` is true, don't show the chip (prevent flash of wrong state).

**i18n keys used**: `t.subscription.subscribeToPro`, `t.nav.subscription` (added in this step).

**Test**: Frontend-only — no unit test. Verify manually: free user sees the "Subscribe to Pro" chip; clicking navigates to `/subscription`. Pro user does not see the chip. "Subscription" appears in the dropdown for both plans.

---

## Step 14: Frontend — Subscription Page (Route + Layout)

### `src/app/(main)/subscription/page.tsx` (new file)

### Breadcrumb update

The Breadcrumb component (`src/components/Breadcrumb.tsx`) builds segments based on `pathname` and route params. For `/subscription`, add:

```typescript
const isOnSubscription = pathname === '/subscription';
// After the dashboard segment, if isOnSubscription:
// <span>›</span> <span>Subscription</span>  (using t.subscription.title)
```

### Page component

1. Call `useUser()` on mount.
2. Show `<Spinner>` while loading (centered, same pattern as chat page).
3. Conditional rendering based on `plan`:
   - Free: plan comparison cards + subscribe button + balance + promotions placeholder.
   - Pro: status card ("You are Pro until [date]") + plan comparison (no subscribe button) + balance + promotions placeholder.

### Plan comparison cards

Two side-by-side cards:
- **Free card**: "Free" title, "Limited daily usage" description, current plan badge if free.
- **Pro card**: "Pro" title, "R$20/month" price, "Unlimited usage" description, current plan badge if pro, "Subscribe" button if free.

### Balance display

Simple text: "Your balance: R$X.XX" (format `balance / 100` with 2 decimals).

**i18n keys added**: `t.subscription.title`, `t.subscription.freePlan`, `t.subscription.proPlan`, `t.subscription.currentPlan`, `t.subscription.limitedUsage`, `t.subscription.unlimitedUsage`, `t.subscription.perMonth`, `t.subscription.subscribe`, `t.subscription.proUntil`, `t.subscription.yourBalance`, `t.subscription.promotions` (added in this step to both `pt-BR.ts` and `en.ts` `subscription` section, plus the `Translations` interface).

**Test**: Frontend-only — no unit test. Verify manually: free user sees plan cards, subscribe button, balance. Pro user sees status card, no subscribe button. Balance displays correctly with both 0 and non-zero values.

---

## Step 15: AbacatePay Client Library

### `src/lib/abacatepay.ts` (new file)

Thin wrapper around AbacatePay API using `fetch`. All functions throw on non-2xx responses with a descriptive error message (including the AbacatePay error body for debugging). The caller handles errors.

```typescript
const BASE_URL = 'https://api.abacatepay.com';
const headers = () => ({
  'Authorization': `Bearer ${process.env.ABACATEPAY_API_KEY}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
});

async function abacateRequest(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`AbacatePay ${method} ${path} failed: ${res.status} ${JSON.stringify(data)}`);
  }
  return data.data;
}

export async function createPixQrCode(params: {
  amount: number;       // cents
  expiresIn: number;    // seconds
  description?: string;
  metadata?: Record<string, unknown>;
}): Promise<{
  id: string;           // e.g. "pix_char_123456"
  brCode: string;       // copy-paste Pix code
  brCodeBase64: string; // data:image/png;base64,... QR image
  status: string;       // "PENDING"
  expiresAt: string;    // ISO datetime
}> {
  return abacateRequest('POST', '/v1/pixQrCode/create', params);
}

export async function checkPixQrCode(id: string): Promise<{
  status: string;       // "PENDING" | "PAID" | "EXPIRED" | "CANCELLED" | "REFUNDED"
  expiresAt: string;
  id: string;
  amount: number;
}> {
  return abacateRequest('GET', `/v1/pixQrCode/check?id=${id}`);
}

// Dev mode only — triggers the webhook flow without real money
export async function simulatePixPayment(id: string): Promise<void> {
  await abacateRequest('POST', `/v1/pixQrCode/simulate-payment?id=${id}`, {});
}
```

Uses `ABACATEPAY_API_KEY` env var.

**Test** (`tests/unit/abacatepay.test.ts` — no DB, mocks `fetch`):

`abacateRequest` (internal helper):
- Mock `fetch` to return a 200 with `{ data: { id: 'pix_char_1' } }`. Call `createPixQrCode` — verify it sends the correct method, URL, headers (including `Authorization: Bearer ...`), and body. Verify it returns `{ id: 'pix_char_1' }` (unwraps `data`).
- Mock `fetch` to return a 400 with `{ error: 'bad request' }`. Call `createPixQrCode` — verify it throws with a descriptive error message that includes the status code and response body.
- Mock `fetch` to return a 200 but with `{ error: 'something' }` in the body (AbacatePay error format). Verify it throws.

`createPixQrCode`:
- Mock `fetch` to return the expected shape: `{ data: { id, brCode, brCodeBase64, status, expiresAt } }`. Verify the return type matches. Verify the request body includes `amount`, `expiresIn`, `description`, `metadata`.

`checkPixQrCode`:
- Mock `fetch`. Verify the request is a GET to `/v1/pixQrCode/check?id=<id>`. Verify the response is unwrapped correctly.

`simulatePixPayment`:
- Mock `fetch`. Verify the request is a POST to `/v1/pixQrCode/simulate-payment?id=<id>`. Verify it doesn't throw on success.

---

## Step 16: API — Subscribe Endpoint

### `POST /api/subscription/subscribe` (new file)

Request body: `{ useCredits: boolean }`

Flow:
1. Auth check → 401.
2. `getUserById(userId)`. If `plan === 'pro'` → `return json({ error: 'ALREADY_PRO' }, 400)`.
3. `invalidateUserPayments(userId)` — clears any old pending payment. This also unblocks the partial unique index so a new pending payment can be created.
4. Calculate:
   - `creditsToDebit = useCredits ? Math.min(balance, SUBSCRIPTION_PRICE_CENTS) : 0`
   - `pixAmount = SUBSCRIPTION_PRICE_CENTS - creditsToDebit`
5. If `pixAmount === 0` (balance covers it fully):
   - Use `sql.transaction([...])` (same Neon HTTP-mode transaction pattern as `createChatsForSection`): debit balance (`UPDATE users SET balance = balance - $creditsToDebit WHERE id = $userId`) + activate pro (`UPDATE users SET plan = 'pro', plan_expires_at = now() + INTERVAL '30 days' WHERE id = $userId`).
   - Return `{ status: 'activated' }`.
6. If `pixAmount > 0`:
   - Call `createPixQrCode({ amount: pixAmount, expiresIn: PIX_EXPIRATION_SECONDS, description: 'Eduh Pro', metadata: { userId, creditsToDebit } })`. The metadata comes back in the webhook at `data.pixQrCode.metadata` (confirmed via testing). The primary lookup is via `data.pixQrCode.id` (the `pix_char_xxx` stored as `abacatepay_id` in our DB).
   - `createPayment(userId, qrResponse.id, pixAmount, creditsToDebit, qrResponse)` — stores the full AbacatePay response in the `metadata` JSONB column. The partial unique index ensures this fails if a pending payment somehow still exists (race condition safety net).
   - Return `{ status: 'pending', brCode: qrResponse.brCode, brCodeBase64: qrResponse.brCodeBase64, expiresAt: qrResponse.expiresAt, paymentId: payment.id }`.
7. If the AbacatePay API call fails → `return json({ error: 'PAYMENT_CREATION_FAILED' }, 502)`.

**Test** (`tests/integration/subscribe-flow.test.ts` — needs DB, mock AbacatePay):

These tests call the query functions directly to simulate the subscribe endpoint's logic, with AbacatePay's `createPixQrCode` mocked.

**Free user, no credits, Pix payment path**:
- Create a free user with 0 balance. Run the subscribe logic with `useCredits: false`. Verify: `createPixQrCode` was called with `amount = SUBSCRIPTION_PRICE_CENTS`, a payment row was created with `status: 'pending'` and `credits_to_debit = 0`. User is still `plan: 'free'`.

**Free user, full balance covers price**:
- Create a free user. Set balance to `SUBSCRIPTION_PRICE_CENTS` via `updateUserBalance`. Run subscribe logic with `useCredits: true`. Verify: `createPixQrCode` was NOT called. User is now `plan: 'pro'`, `balance = 0`. No payment row created.

**Free user, partial balance**:
- Create a free user with balance = 1000 (R$10). Run subscribe logic with `useCredits: true`. Verify: `createPixQrCode` was called with `amount = SUBSCRIPTION_PRICE_CENTS - 1000`. Payment row has `credits_to_debit = 1000`. User is still `plan: 'free'`, balance unchanged (credits aren't debited until webhook confirms payment).

**Already pro**:
- Create a user, activate pro. Run subscribe logic — verify it short-circuits with `ALREADY_PRO` error before calling any payment functions.

**Invalidation of old payment**:
- Create a user with an existing pending payment. Run subscribe logic — verify `invalidateUserPayments` was called (old payment is now `'invalidated'`), and a new pending payment was created successfully.

**Race condition safety**:
- Create a user with a pending payment. Attempt to insert another pending payment directly (without invalidating first) — verify the partial unique index rejects it. This confirms the DB-level safety net works even if the invalidation step were somehow skipped.

---

## Step 17: API — Payment Status Polling

### `GET /api/subscription/payment-status` (new file)

Returns current payment status for the user.

1. Auth check → 401.
2. `getActivePaymentByUserId(userId)` — this queries for the **most recent** payment (not just pending), so the frontend sees the transition from `pending` to `paid`: `SELECT status FROM payments WHERE user_id = $userId ORDER BY created_at DESC LIMIT 1`.
3. If no payment exists → `{ status: 'none' }`.
4. If payment exists → `{ status: payment.status }`.

The frontend polls this every 3 seconds via `setInterval` while the QR code modal is open (same pattern as `GET /api/sections/:id/files/status`). The interval is cleared when the modal unmounts or the status changes to `paid`.

**Test**: Thin API route — no dedicated unit test. The query `getActivePaymentByUserId` is already tested in `tests/db/payments.test.ts`. Verify manually: no payment → `{ status: 'none' }`. Create payment → `{ status: 'pending' }`. Mark paid → `{ status: 'paid' }`. Unauthenticated → 401.

---

## Step 18: API — Webhook Handler

### `POST /api/webhooks/abacatepay` (new file)

**Prerequisite — proxy bypass**: The auth proxy (`src/proxy.ts`) blocks unauthenticated API calls. The webhook is called by AbacatePay, not by a logged-in user. Update the proxy to bypass auth for webhook routes:

```typescript
// In proxy.ts, change the unauthenticated API check:
if (!userId && pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/') && !pathname.startsWith('/api/webhooks/')) {
```

**Webhook security — dashboard Secret field + URL query string**: The AbacatePay dashboard "Criar webhook" form has a dedicated **Secret** field separate from the URL. Enter the clean endpoint URL and put the secret in the Secret field. AbacatePay then **automatically appends** `?webhookSecret=<secret>` to the URL on every POST — confirmed via webhook.site testing (2026-04-08). It also sends it as the `x-webhook-secret` header.

Register:
- **URL**: `https://<your-vercel-domain>/api/webhooks/abacatepay`
- **Secret**: your generated secret (stored as `ABACATEPAY_WEBHOOK_SECRET` in Vercel)

In the handler, verify the query string secret before processing:

```typescript
const url = new URL(request.url);
const secret = url.searchParams.get('webhookSecret');
if (secret !== process.env.ABACATEPAY_WEBHOOK_SECRET) {
  return NextResponse.json({ error: 'INVALID_SECRET' }, { status: 401 });
}
const payload = await request.json();
```

Note: AbacatePay also sends `x-webhook-signature` (HMAC) and `x-webhook-secret` headers — skip HMAC verification for now and add later if needed.

**Webhook payload** (confirmed via dev mode testing on 2026-04-08):

```json
{
  "id": "log_hzYP4haJXuhMt0sQrc0Rwy5T",
  "event": "billing.paid",
  "data": {
    "pixQrCode": {
      "id": "pix_char_xxx",
      "amount": 100,
      "kind": "PIX",
      "status": "PAID",
      "metadata": {
        "userId": "user-uuid",
        "creditsToDebit": 0
      }
    },
    "payment": {
      "amount": 100,
      "fee": 80,
      "method": "PIX"
    }
  },
  "devMode": true
}
```

Key fields: `event` is `billing.paid` (not `pix.paid`). The PIX QR Code ID is at `data.pixQrCode.id`. Our `metadata` comes back at `data.pixQrCode.metadata`. The top-level `id` is a webhook log ID, not the payment ID.

**Handler flow**:

1. Verify `webhookSecret` query param → 401 if invalid.
2. Parse JSON body. If `event !== 'billing.paid'` → return 200 (ignore other events).
3. Extract `abacatepayId = payload.data.pixQrCode.id`.
4. `getPaymentByAbacatepayId(abacatepayId)`.
5. **Not found** → return 200 + log warning (return 200 to prevent AbacatePay retries for payments we don't know about).
6. **Already `paid`** (idempotency) → return 200.
7. **`invalidated`**: the user started a new payment, but then paid the old QR.
   - `updateUserBalance(payment.user_id, payment.amount)` — credit the paid amount.
   - `markPaymentPaid(payment.id)`.
   - Return 200.
8. **`pending`**: happy path.
   - `sql.transaction([...])`: debit `credits_to_debit` from balance + activate pro + mark payment paid. Three queries in one atomic transaction.
   - Return 200.

**Test** (`tests/integration/webhook-flow.test.ts` — needs DB):

These tests call the query functions directly to simulate the webhook handler's logic (no HTTP calls, no real webhook secret check — the handler logic is what matters).

**Happy path (pending payment)**:
- Create a user with 0 balance. Create a pending payment with `credits_to_debit = 0`. Simulate the webhook logic: `getPaymentByAbacatepayId` → found, status is `'pending'` → run the transaction (debit credits, activate pro, mark paid). Verify: user is `plan: 'pro'`, `plan_expires_at` set, payment `status = 'paid'`, balance still 0.

**Happy path with credits**:
- Create a user with balance = 1000. Create a pending payment with `credits_to_debit = 1000`. Run the webhook logic. Verify: user is `plan: 'pro'`, balance debited to 0, payment `status = 'paid'`.

**Idempotency (already paid)**:
- Create a user. Create a payment, mark it as `'paid'`. Run the webhook logic again for the same `abacatepayId`. Verify: no error, user state unchanged, balance unchanged. The handler returns early.

**Invalidated payment (late payment on old QR)**:
- Create a user with 0 balance. Create a payment, invalidate it (simulating the user started a new subscription flow). Run the webhook logic for the invalidated payment's `abacatepayId`. Verify: user is NOT activated to pro. User balance is credited by the payment's `amount` (the user paid real money, so they get balance). Payment status changed to `'paid'`.

**Unknown payment ID**:
- Run the webhook logic with a non-existent `abacatepayId`. Verify: no error thrown, no DB changes (handler returns early).

**Webhook secret verification** (`tests/unit/webhook-secret.test.ts` — no DB):
- Given a request URL with `?webhookSecret=correct_secret` and `ABACATEPAY_WEBHOOK_SECRET=correct_secret`, verify the check passes.
- Given a request URL with `?webhookSecret=wrong_secret`, verify the check fails.
- Given a request URL with no `webhookSecret` param, verify the check fails.

---

## Step 19: Frontend — Payment Modal (Confirmation Step)

### `src/components/PaymentModal.tsx` (new file)

Modal component triggered by "Subscribe to Pro" button.

Uses the existing `Modal` component from `src/components/ui/`. Receives `balance` as a prop (already fetched by the subscription page via `useUser`).

Internal state: `step: 'confirmation' | 'qr' | 'success'`, `useCredits: boolean`, `loading: boolean`, `qrData: { brCode, brCodeBase64, expiresAt, paymentId } | null`.

**Step 1 — Confirmation screen**:
- Credits box: "Your balance: R$X.XX" with toggle "Use my balance".
  - If `balance === 0`: toggle disabled, greyed out, text muted.
  - If toggled on: show adjusted price: `"Pay R$" + ((SUBSCRIPTION_PRICE_CENTS - Math.min(balance, SUBSCRIPTION_PRICE_CENTS)) / 100).toFixed(2) + " with Pix"`.
- Button:
  - Shows spinner while `loading` is true (API call in progress).
  - If toggle on AND `balance >= SUBSCRIPTION_PRICE_CENTS`: text = "Confirm subscription" → `POST /api/subscription/subscribe { useCredits: true }` → expects `{ status: 'activated' }` → set `step = 'success'`.
  - Otherwise: text = "Pay R$X.XX with Pix" → POST → expects `{ status: 'pending', brCode, brCodeBase64, expiresAt, paymentId }` → store in `qrData`, set `step = 'qr'`.
  - If POST returns an error → `showToast(t.subscription.paymentFailed, 'error')`, stay on confirmation step, set `loading = false`.

**i18n keys added**: `t.subscription.confirmationTitle`, `t.subscription.useBalance`, `t.subscription.confirmSubscription`, `t.subscription.payWithPix`, `t.subscription.paymentFailed` (added in this step to both `pt-BR.ts` and `en.ts` `subscription` section, plus the `Translations` interface).

**Test**: Frontend-only — no unit test. Verify manually: 0 balance → toggle disabled, button shows full price. R$10 balance, toggle on → "Pay R$10.00". Toggle off → "Pay R$20.00". R$20+ balance, toggle on → "Confirm subscription". Confirm → spinner → success. API error → toast, stays on confirmation.

---

## Step 20: Frontend — Payment Modal (QR Code Step)

**Step 2 — QR code screen**:
- Display `brCodeBase64` as an `<img>` tag (it's already a `data:image/png;base64,...` URI). Center it in the modal.
- Display `brCode` in a code box with a "Copy" button: `navigator.clipboard.writeText(brCode)`. Button text changes to "Copied!" for 2 seconds.
- **Expiration countdown timer**: Parse `expiresAt` (ISO string from AbacatePay), compute remaining seconds, decrement every second via `setInterval`. Display as `MM:SS`. Text: "Pay within X:XX".
- **X button** (top-right, from existing Modal component) to close.
- **Polling**: `setInterval` every 3 seconds calling `GET /api/subscription/payment-status`. Same pattern as file processing status polling. Clear interval on unmount or when step changes.
  - When poll returns `{ status: 'paid' }` → stop polling, set `step = 'success'`.
  - When poll returns `{ status: 'invalidated' }` or `{ status: 'none' }` → stop polling (edge case: another tab subscribed).
- **When timer reaches 0**: stop polling, replace QR code with text "Payment expired". The X button is still there to close. User can click "Subscribe to Pro" again to start a fresh flow.
- **When user closes the modal** (X or overlay click): stop polling, clear interval. The QR code expires naturally on AbacatePay's side. If the user later clicks "Subscribe" again, the subscribe endpoint invalidates the old payment and creates a new one.

**i18n keys added**: `t.subscription.pixInstructions`, `t.subscription.payWithinMinutes`, `t.subscription.copyCode`, `t.subscription.copied`, `t.subscription.paymentExpired` (added in this step).

**Test**: Frontend-only — no unit test. Verify manually: QR image renders, "Copy" button works, timer counts down. Simulate payment → modal transitions to success within one poll cycle. Close modal before payment → subscribe again → new QR. Timer expires → "Payment expired" text.

---

## Step 21: Frontend — Payment Modal (Success Step)

**Step 3 — Success screen**:
- Centered text: "You're now Pro!" (use `t.subscription.youAreNowPro`).
- "Close" button below.
- On close: call `refetch()` from the `useUser` hook (both the subscription page's instance and the navbar's instance will refetch on their next render since they're independent hooks — but the subscription page can call its `refetch` directly). The subscription page re-renders with pro status. The navbar chip disappears on next mount/navigation (or refetch if we trigger it).
- To ensure the navbar updates immediately without navigation: the payment modal's `onClose` callback (passed from subscription page) triggers both the subscription page's `useUser().refetch()` and can set a flag or use a simple event. Simplest: the subscription page refetches, and the navbar refetches on any route change (it already re-runs `useEffect` on mount). Since closing the modal doesn't cause navigation, the navbar updates when the user next navigates. This is acceptable UX — the chip disappears as soon as they go to another page.

**i18n keys added**: `t.subscription.youAreNowPro`, `t.subscription.close` (added in this step).

**Test**: Frontend-only — no unit test. Verify manually: payment completes → success screen shows. Close modal → subscription page reflects pro status. Navigate away → navbar chip gone.

---

## Step 22: End-to-End Testing — Subscription Flow

This step has no new code — it's a checkpoint to verify everything works together. Two categories:

### Automated integration tests (already written in previous steps)

By this point, the following test files should pass with `npm test`:

- `tests/db/migrations.test.ts` — schema constraints (Steps 1-3)
- `tests/unit/config.test.ts` — config values (Step 4)
- `tests/db/users.test.ts` — `getUserById`, `updateUserBalance`, `activateProPlan` (Step 5)
- `tests/db/payments.test.ts` — payment CRUD, unique index, invalidation (Step 6)
- `tests/unit/usage.test.ts` — `getUsageDate`, `calculateUsagePercent` (Step 7)
- `tests/db/usage.test.ts` — `upsertDailyUsage`, `getDailyUsage` (Step 7)
- `tests/unit/abacatepay.test.ts` — AbacatePay client with mocked fetch (Step 15)
- `tests/unit/webhook-secret.test.ts` — webhook secret verification (Step 18)
- `tests/integration/subscribe-flow.test.ts` — full subscribe logic (Step 16)
- `tests/integration/webhook-flow.test.ts` — full webhook logic (Step 18)
- `tests/integration/usage-limit-flow.test.ts` — usage enforcement logic (Step 10)

Run `npm test` and confirm all pass against the test Neon DB.

### Manual full-flow tests (frontend + backend together)

These require running the dev server and interacting with the UI. They verify the frontend wiring, the visual UX, and the real AbacatePay integration.

> **Local testing setup**: AbacatePay cannot reach `localhost`, so the webhook can't complete the flow if you register a localhost URL. The recommended approach:
> 1. Create a separate test Neon DB (never use production data for manual testing).
> 2. Deploy your branch to a **Vercel Preview** — it gets a stable URL like `ditchy-git-feat-subscription.vercel.app`. Set the test DB as `DATABASE_URL` on that preview environment in Vercel.
> 3. Register the preview URL as the webhook in AbacatePay (`https://<preview-url>/api/webhooks/abacatepay`).
> 4. Point your local `.env` to the **same test Neon DB**.
> 5. Run the app on `localhost:3000` and use it normally. AbacatePay will POST to the preview URL, which updates the shared test DB, and your local app will pick up the change via polling.
>
> You only need to redeploy the preview when you change the webhook handler itself. All other local changes (UI, other routes) work immediately without redeploying.

1. **Free user subscribes with Pix (no credits)**:
   - Visit /subscription → see free plan → click subscribe → modal opens → see full price → click pay → QR code appears → simulate payment → success → navbar updates → /subscription shows pro.

2. **Free user subscribes with full balance**:
   - Add credits (via DB or future promotion) → visit /subscription → click subscribe → modal → toggle credits → "Confirm subscription" → instant success → balance debited.

3. **Free user subscribes with partial balance**:
   - Add R$10 → subscribe → toggle credits → pay R$10 with Pix → simulate → success → balance should be 0.

4. **Pro user visits /subscription**:
   - See pro status card, no subscribe button. Balance visible.

5. **Usage limits (free)**:
   - Chat until limit → message bounces back → toast with subscribe link → click link → /subscription page.

6. **Usage limits (pro)**:
   - Chat until limit → degradation toast → continue chatting with weaker model.

7. **Payment invalidation**:
   - Start payment → close modal → start payment again → old payment invalidated → new QR works.

8. **Late payment on invalidated QR**:
   - Start payment → close → start new → simulate payment on OLD QR → balance credited (not pro activated).

9. **Plan expiration**:
   - Activate pro → manually set expiry to past → GET /api/user returns free → navbar chip reappears.

---

## Step 23: Database Migration — Promotion Claims Table

```sql
CREATE TABLE promotion_claims (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  promotion_id TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, promotion_id)
);
```

One row per `(user, promotion)` pair. The `UNIQUE (user_id, promotion_id)` constraint prevents double claims of the same promotion, while still allowing a user to claim multiple different promotions. `promotion_id` is a free-form string that matches one of the ids in `PROMOTION_IDS` (Step 24) — no FK, since the list of known promotions lives in code.

**Migration file**: `009_create_promotion_claims.js`

**Test** (add to `tests/db/migrations.test.ts` — needs DB):

Run migration up/down manually against the test DB. Automated tests:
- Insert a claim for user A with `promotion_id = 'university-email'`. Attempt to insert the same pair again — verify the UNIQUE constraint rejects it.
- Insert a claim for user A with `promotion_id = 'university-email'`, then another with `promotion_id = 'launch-bonus'` — verify both succeed (same user, different promotions).
- Insert a claim for user A and another for user B with the same `promotion_id` — verify both succeed (different users, same promotion).

**Test isolation**: Add `promotion_claims` to the `TRUNCATE` list in `cleanDatabase()` in `tests/helpers.ts` (place it alongside `daily_usage, payments` — the other subscription-era tables). Without this, claim rows leak between tests and the unique-constraint assertions in Step 24 become order-dependent. `cleanDatabase()` is the only place in `tests/` that enumerates tables (verified via grep for `TRUNCATE` / table lists) — no other fixtures need updating.

---

## Step 24: Database Queries — Promotions

### `src/lib/db/queries/promotions.ts` (new file)

This file is the single source of truth for every promotion the app offers. All per-promotion logic — eligibility rules, credit amounts, anything else — lives directly inside `getUserPromotion`. A small `PROMOTION_IDS` constant lists the known ids so `getUserPromotions` can iterate without any other abstraction.

```ts
export type UserPromotion = {
  id: string;
  creditAmount: number;
  eligible: boolean;
  claimed: boolean;
};

const PROMOTION_IDS = ['university-email'] as const;
```

Functions:

- `getUserPromotion(userId, promotionId)` — returns `UserPromotion | null`. This is where **all** per-promotion logic lives: a `switch (promotionId)` (or equivalent) with one branch per known id. Each branch fetches whatever it needs (the user row, the matching `promotion_claims` row, etc.) and returns `{ id, creditAmount, eligible, claimed }`. The default case returns `null` so unknown ids become 404s at the route layer. The `university-email` branch fetches the user, checks `UNIVERSITY_EMAIL_SUFFIXES.some((suffix) => user.email.toLowerCase().endsWith(suffix))` for `eligible`, looks up `promotion_claims` for `claimed`, and hardcodes `creditAmount: UNIVERSITY_PROMO_CREDIT_CENTS`. Emails are already normalized to lowercase at the auth boundary (`src/app/api/auth/send-code/route.ts`, `verify-code/route.ts`) and again in `findUserByEmail` / `createUser`, so the `.toLowerCase()` here is defensive — keep it anyway since `endsWith` is case-sensitive and the cost is zero.
- `getUserPromotions(userId)` — loops over `PROMOTION_IDS` and calls `getUserPromotion(userId, id)` for each, filtering out any `null` results (there shouldn't be any in normal operation, since every id in `PROMOTION_IDS` should have a branch, but the filter keeps the return type clean). Returns `UserPromotion[]`. This function contains **no** per-promotion logic — adding a new promotion means adding its id to `PROMOTION_IDS` and its branch to `getUserPromotion`, nothing else.
- `claimPromo(userId, promo)` — `Promise<void>`. Takes the `UserPromotion` object produced by `getUserPromotion` — never a raw id or amount from the route. Reads `promo.id` and `promo.creditAmount` off that trusted value, then atomically inserts into `promotion_claims` and increments `users.balance` via `sql.transaction([...])` from `@/lib/db/connection` (same pattern as `src/app/api/webhooks/abacatepay/route.ts:43`). On a duplicate claim the Postgres unique-violation surfaces as a thrown `NeonDbError` with `code === '23505'`; re-throw unchanged so the API route can map it.

**Test** (`tests/db/promotions.test.ts` — needs DB):

`getUserPromotions`:
- Create a user with `@gmail.com` email and no claims — verify the returned list contains the `university-email` entry with `eligible: false`, `claimed: false`, `creditAmount: 2000`.
- Create a user with `@dac.unicamp.br` email and no claims — verify the `university-email` entry has `eligible: true`, `claimed: false`.
- Same user, then claim `university-email` — verify `eligible: true`, `claimed: true`.
- Verify suffix matching: `@usp.br` user is eligible; `@dac.unicamp.br.fake.com` user is not (suffix appears mid-string, not at the end); empty-email edge case is not eligible.

`getUserPromotion`:
- Returns the same shape as one entry from `getUserPromotions` for a known id.
- Returns `null` for an unknown `promotionId` like `'does-not-exist'`.

`claimPromo`:
- Create a `@dac.unicamp.br` user with 0 balance. Fetch `promo = await getUserPromotion(userId, 'university-email')`, then call `claimPromo(userId, promo!)` (returns `void`). Query the user row — confirm `balance = 2000`. Query `promotion_claims` — confirm a row exists for `(userId, 'university-email')`.
- Call `claimPromo(userId, promo!)` again with the same `promo` — verify it throws (unique constraint). Query the user row — confirm `balance` is still 2000 (not double-credited, transaction rolled back).

Note: there is no "unknown id" test for `claimPromo` because the signature doesn't allow one — unknown ids can't produce a `UserPromotion`, so they're rejected at the route layer before `claimPromo` is ever called. The unique-constraint coverage for cross-promotion independence lives in the Step 23 migration tests.

---

## Step 25: API — Promotions Endpoints

Both routes are thin wrappers around the queries defined in Step 24. There is no `src/lib/promotions.ts` — all per-promotion logic lives in `src/lib/db/queries/promotions.ts`.

### `GET /api/promotions` (new file)

Returns the list of promotions with eligibility and claim status for the current user. The response only includes `id`, `creditAmount`, `eligible`, `claimed` — the frontend maps `id` to translation keys for title/description (since the app supports both pt-BR and English).

```json
[
  {
    "id": "university-email",
    "creditAmount": 2000,
    "eligible": true,
    "claimed": false
  }
]
```

Logic:
1. Auth check → 401.
2. Return `await getUserPromotions(userId)`.

### `POST /api/promotions/[id]/claim` (new file, dynamic route)

1. Auth check → 401.
2. `const promo = await getUserPromotion(userId, params.id)` → if `null`, `return json({ error: 'NOT_FOUND' }, 404)`.
3. If `!promo.eligible`, `return json({ error: 'NOT_ELIGIBLE' }, 400)`.
4. If `promo.claimed`, `return json({ error: 'ALREADY_CLAIMED' }, 400)`.
5. `claimPromo(userId, promo)` inside a `try/catch` — pass the `UserPromotion` from step 2 directly, so the id and credit amount come from the queries layer and not from `params.id` or the request body. On `NeonDbError` with `err.code === '23505'` (unique violation — concurrent claim between step 4 and here), `return json({ error: 'ALREADY_CLAIMED' }, 400)`; any other error falls through to the outer 500 handler. Import `NeonDbError` from `@neondatabase/serverless`.
6. Return `{ success: true }`.

**Test**: no dedicated test file — both routes are thin wrappers around `getUserPromotions`, `getUserPromotion`, and `claimPromo`, which are already covered by `tests/db/promotions.test.ts`. Verify manually: `@dac.unicamp.br` user claims `university-email` → balance +2000. Claim again → 400 `ALREADY_CLAIMED`. `@gmail.com` user → 400 `NOT_ELIGIBLE`. Unknown id → 404 `NOT_FOUND`. Unauthenticated → 401.

---

## Step 26: Frontend — Promotions Section on Subscription Page

All additions happen in `src/app/(main)/subscription/page.tsx` and one new component, `PromotionDetailModal`. No new hooks, no global state — the subscription page owns everything.

### Data loading

On mount, the subscription page fires `GET /api/promotions` via a plain `useEffect` + `fetch` (matching how the rest of the page already treats one-shot reads — we don't have React Query). Local state:

- `promotions: UserPromotion[] | null` — `null` while loading, array after the first fetch.
- `promotionsError: boolean` — set when the fetch fails.

Alongside the existing `const { user, loading, refetch } = useUser()` call. The promotions fetch is independent from the user fetch, so both loading states are tracked separately; the promotions section renders its own small spinner while `promotions === null`, without blocking the rest of the page.

After a successful claim, the page refreshes both sources of truth: it re-fires the `GET /api/promotions` request (to flip the claimed card) and calls `refetch()` from `useUser` (to update the on-page balance display). These are the only two pieces of state affected, so a full page reload is not needed.

### Rendering the cards

A new section is added **below** the existing balance display (so the flow reads: plan → balance → promotions). Structure:

- Section title from `t.promotions.title`.
- If `promotions === null`: small inline spinner.
- If `promotionsError`: a muted one-liner from `t.promotions.loadError`, no retry button.
- Otherwise: a responsive grid of `Card` components, one per entry in `promotions`, in the order the API returned them. Each card shows:
  - Title and description resolved via a pure `camelCase(id)` transform: id `university-email` → `t.promotions.universityEmailTitle` and `t.promotions.universityEmailDescription`. No manual id → key mapping table — the transform is the mapping.
  - Credit amount formatted as `R$X.XX` by the page (reuse the `SUBSCRIPTION_PRICE_CENTS` formatter already in the file), then interpolated into `t.promotions.creditAmount` via `.replace('{amount}', formatted)` — same pattern as `t.subscription.proUntil` elsewhere on the page. The number is **never** baked into any translation string; only the placeholder substitution happens at render time. The modal uses the same `t.promotions.creditAmount` string so card and modal stay visually consistent.
  - A `Badge` with `t.promotions.claimed` in the top-right when `claimed === true`.
  - The whole card is clickable (pointer cursor, hover state) and opens the modal for that promotion.

Per Step 25's API contract the frontend maps promotion `id` → translation keys, so no title/description ever comes from the API. If a future promotion id is added on the backend but the frontend i18n bundle doesn't yet have `${camelCase(id)}Title` / `${camelCase(id)}Description` keys, the card should fall back to `t.promotions.unknownTitle` / `t.promotions.unknownDescription` — no crash.

### Promotion detail modal (`src/components/PromotionDetailModal.tsx`, new file)

Reuses the existing `Modal` UI primitive (same as `PaymentModal`). Props: the selected `UserPromotion`, an `onClose` handler, and an `onClaimed` handler the page uses to trigger the two refetches above.

Local state inside the modal:

- `claiming: boolean` — true while the POST request is in flight.

All user feedback for claim results goes through `useToast`, matching how `PaymentModal`, `UploadingView`, and the chat page report outcomes. The modal never renders an inline error message — it always closes after a claim attempt resolves, and the toast carries the message.

Rendered content depends on the promotion's flags (these are informational views for when the user opens the modal on a card already in that state — not error states):

- **Eligible, not claimed** — show title, description, credit amount, and an enabled `Claim` button. Clicking the button:
  1. Sets `claiming = true`.
  2. Calls `POST /api/promotions/[id]/claim`.
  3. On 200: show toast `t.promotions.claimSuccess` (`'success'` variant), fire `onClaimed()` (triggers the two parent refetches), close the modal.
  4. On 400 `ALREADY_CLAIMED`: show toast `t.promotions.alreadyClaimed` (`'error'` variant), fire `onClaimed()` so the parent refetches and the card flips to "Claimed", close the modal. This can happen if the user claimed in another tab or if the page data is stale.
  5. On 400 `NOT_ELIGIBLE`: show toast `t.promotions.notEligible` (`'error'` variant), fire `onClaimed()` so the card re-renders with the correct state, close the modal.
  6. On 404 `NOT_FOUND` / 5xx / network error: show toast `t.promotions.claimError` (`'error'` variant), close the modal. No refetch.
  7. In all cases: set `claiming = false` before closing.
  - While `claiming === true`, the button shows a small spinner and is disabled. The modal can still be closed normally.
- **Not eligible** — show title, description, credit amount, and a muted `t.promotions.notEligible` line. No button. Close button works normally.
- **Already claimed** — show title, description, credit amount, and a muted `t.promotions.alreadyClaimed` line with a "Claimed" badge next to the title. No button.

No optimistic updates — the modal waits for the POST to return before firing `onClaimed()` and closing. Given the claim is a one-shot server action with real money implications (credits), the clarity of pessimistic UI is worth the ~200ms latency.

### Accessibility & design constraints

- Dark-mode only, flat design, no animations — same as the rest of the app.
- Card hover state uses the existing `border-border-hover` utility.
- Modal close on backdrop click and `Escape` (both inherited from the `Modal` primitive).

**Test**: Frontend-only — no unit test. Verify manually, with a `@dac.unicamp.br` user:

1. Load `/subscription` → promotions section appears below balance, single "university-email" card visible with `eligible: true, claimed: false`.
2. Click the card → modal opens → click `Claim` → button shows spinner → success toast → modal closes → card shows "Claimed" badge → navbar balance chip updated to +R$20.
3. Reopen the card → modal shows "Already claimed" line, no button.
4. Open a second tab, claim there first, then click `Claim` in the first tab → modal closes → error toast with `t.promotions.alreadyClaimed` → the underlying card flips to "Claimed" after the background refetch.

With a `@gmail.com` user:

5. Load `/subscription` → card visible with `eligible: false, claimed: false` → click → modal shows "Not eligible" → no button.

Network failure:

6. Offline the tab, click `Claim` → modal closes → error toast with `t.promotions.claimError` → card state unchanged.

---

## Step 27: i18n — Promotion Strings

### Extend translations

Keys follow the `camelCase(id)` convention set in Step 26 — the `university-email` promo's title is `universityEmailTitle`, not `universityTitle`. The credit amount is **never** baked into a translation; strings that need to mention it use `{amount}` placeholders that the frontend `.replace()`s at render time (same pattern as the existing `t.subscription.proUntil`).

```
promotions: {
  title: 'Promotions' / 'Promoções',

  // Per-promotion strings — keyed by camelCase(id)
  universityEmailTitle: 'Estuda na Unicamp ou USP? Ganhe 1 mês grátis!' / 'Studying at Unicamp or USP? Get 1 month free!',
  universityEmailDescription: 'Se o email da sua conta pertence à Unicamp ou USP, resgate R$20 em créditos — o suficiente para um mês inteiro de Pro.' / 'If your account email belongs to Unicamp or USP, claim R$20 in credits — enough for a full month of Pro.',

  // Fallback when the backend returns an id the frontend doesn't know
  unknownTitle: 'Promoção' / 'Promotion',
  unknownDescription: 'Detalhes indisponíveis.' / 'Details unavailable.',

  // Shared UI strings
  creditAmount: '{amount} em créditos' / '{amount} in credits',
  claimed: 'Resgatado' / 'Claimed',
  claim: 'Resgatar' / 'Claim',
  notEligible: 'Seu email não é de uma universidade qualificada.' / 'Your email is not from a qualifying university.',
  alreadyClaimed: 'Você já resgatou esta promoção.' / 'You already claimed this promotion.',
  claimSuccess: 'Créditos adicionados ao seu saldo!' / 'Credits added to your balance!',
  claimError: 'Não foi possível resgatar a promoção. Tente novamente.' / 'Could not claim promotion. Please try again.',
  loadError: 'Não foi possível carregar as promoções.' / 'Could not load promotions.',
}
```

`claimError` is the generic fallback the claim modal uses for 404 / 5xx / network failures; `loadError` is the inline message shown on the subscription page when `GET /api/promotions` fails. Both live under `promotions.*` rather than `errors.*` so all promo copy stays in one section.

**Test**: Frontend-only — no unit test. Verify manually: switch language, confirm all `promotions.*` keys render in both pt-BR and English, and that `creditAmount` correctly interpolates the amount.

---

## Step 28: End-to-End Testing — Promotions

Same structure as Step 22: checkpoint to verify everything works together.

### Automated tests (already written in previous steps)

By this point, additionally passing:

- `tests/db/migrations.test.ts` — now also includes `promotion_claims` unique constraint on `(user_id, promotion_id)` (Step 23)
- `tests/db/promotions.test.ts` — `getUserPromotions`, `getUserPromotion`, `claimPromo` (Step 24)

### Automated integration test (`tests/integration/promo-subscribe-flow.test.ts` — needs DB)

**Full flow: promotion + subscription**:
- Create a user with `@dac.unicamp.br` email and 0 balance. Fetch `promo = await getUserPromotion(userId, 'university-email')`, then call `claimPromo(userId, promo!)` — verify balance is now 2000. Run the subscribe logic with `useCredits: true` — since balance covers the full price, verify: user is `plan: 'pro'`, balance = 0, `createPixQrCode` was NOT called. This tests the promo-to-subscription pipeline end-to-end at the query layer.

**Double claim then subscribe**:
- Create a user with `@dac.unicamp.br`. Claim promo → balance = 2000. Attempt to claim again → verify it fails. Run subscribe with `useCredits: true` → verify user is pro and balance = 0. Confirms the unique constraint prevents double-crediting even in a multi-step flow.

### Manual full-flow tests

1. **Eligible user claims promotion**:
   - User with `@dac.unicamp.br` → /subscription → sees promotion card → clicks → modal → claims → balance = R$20 → can now subscribe for free using credits.

2. **Full flow: promotion + subscription**:
   - Claim promo → get R$20 → subscribe → toggle "Use balance" → "Confirm subscription" → instant pro. Balance = R$0.

3. **Ineligible user**:
   - User with `@gmail.com` → sees card → clicks → "Not eligible" message → claim button disabled.

4. **Double claim prevention**:
   - Claim once → visit again → card shows "Claimed" → modal says "Already claimed".

---

## Step 29: Environment Variables & Deployment

### New env vars

| Variable | Purpose |
|---|---|
| `ABACATEPAY_API_KEY` | AbacatePay Bearer token (from AbacatePay dashboard) |
| `ABACATEPAY_WEBHOOK_SECRET` | Secret entered in the AbacatePay dashboard "Secret" field — AbacatePay automatically appends it as `?webhookSecret=<secret>` to the URL on every POST (you generate this — any long random string) |

### Update `.env.example`

Add both variables with descriptions and placeholder values.

### Webhook URL registration

In the AbacatePay dashboard ("Criar webhook"):
1. Generate a random secret (e.g., `openssl rand -hex 32`) and set it as `ABACATEPAY_WEBHOOK_SECRET` in Vercel.
2. **URL** field: `https://<your-vercel-domain>/api/webhooks/abacatepay` (no query params — AbacatePay appends the secret automatically).
3. **Secret** field: paste the same secret value.
4. Select the `billing.paid` event (confirmed via dev mode testing on 2026-04-08).

### Vercel environment variables

Add `ABACATEPAY_API_KEY` and `ABACATEPAY_WEBHOOK_SECRET` to Vercel project settings (Settings → Environment Variables) for all environments (production, preview, development).

**Test**: No unit test. Verify manually after deploying: env vars are loaded (subscribe endpoint doesn't crash). Register the preview URL as webhook. Full flow: subscribe → QR code → simulate payment → webhook fires → user becomes pro.

---

## Implementation Order Summary

| Step | What | Dependencies |
|------|------|-------------|
| 0 | Test infrastructure (Neon test DB, Vitest, helpers) | None (do first) |
| 1-3 | Database migrations (users fields, payments, daily_usage) | Step 0 |
| 4 | Config files (subscription.ts, ai.ts updates) | None |
| 5-7 | DB queries (users, payments, usage) + their tests | Steps 0-3 |
| 8 | GET /api/user | Step 5 |
| 9 | Usage tracking in chat | Steps 7, 4 |
| 10 | Usage limit enforcement + integration test | Steps 9, 5 |
| 11-12 | Frontend chat error handling + warnings + i18n keys | Steps 9-10 |
| 13 | Navbar changes + i18n keys | Step 8 |
| 14 | Subscription page shell + i18n keys | Step 8 |
| 15 | AbacatePay client library + unit tests | Step 4 |
| 16 | Subscribe endpoint + integration test | Steps 5-6, 15 |
| 17 | Payment status polling endpoint | Step 6 |
| 18 | Webhook handler + integration test + secret verification test | Steps 6, 5 |
| 19-21 | Payment modal (3 steps) + i18n keys | Steps 16-17 |
| 22 | E2E testing — subscription (checkpoint: all tests pass) | All above |
| 23-24 | Promotion DB + queries + tests | Step 1 |
| 25 | Promotion API endpoints + email suffix tests | Steps 24, 4 |
| 26 | Promotion UI | Steps 25, 14 |
| 27 | i18n for promotions | Step 26 |
| 28 | E2E testing — promotions (checkpoint + integration test) | All above |
| 29 | Env vars + deployment | All above |
