# Subscription and Paywall

## Tiers

- **Free tier**: available to all users, with daily usage limits.
- **Pro tier**: R$20/month (~US$4), higher daily usage limits.
- Both tiers start on the best model and switch to a degraded model after a usage threshold. Pro users get a higher best-model threshold and can use the degraded model with no daily limit. Free users have a second threshold after which they're blocked entirely.

## Payment

- **Provider**: AbacatePay (abacatepay.com). See `docs/abacatepay.md` for full API reference.
- **API used**: PIX QR Code API (`POST /v1/pixQrCode/create`) — generates the QR code and copy-paste code directly, displayed inline in our modal. We do NOT use the Billing/Checkout API (which redirects to AbacatePay's hosted page).
- **Payment method**: Pix only for now.
- Every user has a **credit balance** (in BRL cents). This makes it easy to implement promotions like "get R$X in credits by doing Y".
- Credits do not expire.

## Subscription Page (`/subscription`)

Single page that adapts based on user status.

### Navigation

- The **profile icon dropdown** in the navbar has a "Subscription" option that links to this page (always visible, both tiers).
- For **free users only**: a **chip** with the text "Subscribe to Pro" appears to the left of the profile icon in the navbar. Clicking it also leads to this page.

### For free users

- **Plan comparison** at the top: two side-by-side cards (Free vs Pro). The free card emphasizes the limitation (e.g. "Limited daily usage"). The Pro card emphasizes unlimited usage and the price. The goal is to make it clear that free is a taste and Pro is the real experience.
- **"Subscribe to Pro"** button → opens the payment modal.
- **Balance display**.
- **Promotions section** below (see Promotions section).

### For Pro users

- **Status card** at the top: "You are Pro until [date]".
- The plan comparison cards are still visible below but the subscribe button is replaced by the status.
- **Balance display**.
- **Promotions section** below (see Promotions section).

## Payment Modal Flow

Triggered when a free user clicks "Subscribe to Pro".

### Step 1: Confirmation screen

- **Credits box** at the top: shows user balance ("Your balance: R$X.XX") with a toggle **"Use my balance"**.
  - If balance is 0: the box looks disabled/greyed out and the toggle is not clickable.
  - If toggled on: the Pix amount adjusts to `subscription_price - balance`. The stored `credits_to_debit` is locked to the current balance at this moment.
  - If toggled off: the full price is shown (user can choose to save credits for later even if they have enough).
- **Action button** at the bottom:
  - If toggle is on AND `balance >= subscription_price`: button says **"Confirm subscription"**. Clicking it debits the balance and activates Pro immediately (no Pix needed). Modal transitions to success state.
  - Otherwise: button says **"Pay R$X.XX with Pix"** (showing the amount after credits, or full price if toggle is off).

### Step 2: Pix QR code screen

- When the user clicks "Pay R$X.XX with Pix", the modal content replaces entirely with:
  - The **Pix QR code** filling most of the modal.
  - The **Copy and Paste** code for the Pix payment.
  - An **expiration timer**: "Pay within X:XX minutes" (10 minutes, configurable in AbacatePay).
  - Instructions at the bottom: "Scan the QR code with your bank app to pay with Pix."
- The frontend **polls** the backend every 3 seconds to check if the payment was confirmed (same pattern as file processing status polling).
- The modal has an **X button** (top-right corner) to close it. It is ok to just not pay — the QR code will expire on its own.
- If the user closes and clicks subscribe again, a **new QR code** is generated (the old one is invalidated).
- **Constraint**: each user can have at most **1 active payment** at a time. This prevents double-discount exploits where a user could use their balance credit on multiple concurrent payments.

### Step 3: Success state

- When the webhook confirms the Pix payment (or when the user confirmed with balance only), the modal transitions to: **"You're now Pro!"** with a **"Close"** button.
- If the user already closed the modal or the page before the webhook arrives, the subscription is still activated server-side — the success modal just doesn't show.

## Payment Logic (Backend)

When subscribing:
1. Invalidate any existing active payment for this user **in our DB**. AbacatePay has no cancel endpoint — old QR codes just expire naturally. If a webhook arrives for an invalidated payment, **credit the paid amount to the user's balance** instead of activating the subscription (the user paid real money, so they must not lose it).
2. User chooses whether to use credits. If yes, lock `credits_to_debit = min(balance, subscription_price)`.
3. Calculate `pix_amount = subscription_price - credits_to_debit`.
4. If `pix_amount > 0`: call `POST /v1/pixQrCode/create` with `amount` (in cents), `expiresIn: 600` (10 min), and `metadata: { userId, credits_to_debit }`. The response contains `brCodeBase64` (QR image), `brCode` (copy-paste code), and `id` (payment ID). Store the payment ID and `credits_to_debit` in our DB.
5. On webhook confirmation (or immediately if `pix_amount == 0`):
   - Debit `credits_to_debit` from balance.
   - Activate Pro for 30 days.
   - These two operations must happen **atomically in a database transaction**.
6. The balance is only debited **after** the Pix payment is confirmed, never when the QR code is generated.

## Subscription Lifecycle

- Pro lasts for **30 days** from activation (not calendar month).
- Expiration is checked **on every API request** that needs the user's plan: if `plan_expires_at < now`, treat as free. No cron job needed for now.
- A user cannot extend/stack subscriptions while already subscribed. They just see "You are Pro until [date]".

## User Data for the Frontend

Currently the app has no client-side user context — components fetch data via API calls, and the server extracts `userId` from the JWT cookie.

### `GET /api/user` endpoint

Returns `{ plan, planExpiresAt, balance, email }`. Used by:
- **Navbar**: fetches on mount to decide whether to show the "Subscribe to Pro" chip (free users only).
- **Subscription page**: fetches for plan status, expiration date, and balance display.

### Chat usage metadata

The `GET /api/chats/:id/messages` response (page load) and the `POST /api/chats/:id/messages` response (sending a message) both include **`phase`** and **`usagePercent`**:
- **`phase`**: `'best' | 'degraded' | 'blocked'` for free users, `'best' | 'degraded'` for pro users. Indicates which model the user is currently on (or if they're blocked).
- **`usagePercent`**: integer relative to the current phase's threshold. For pro users in `'degraded'` phase, this is irrelevant (no cap).

The frontend combines this with the plan info to determine behavior:
- `usagePercent` crosses 75 or 90 → show warning toast (applies in both `'best'` and `'degraded'` phases for free, and `'best'` phase for pro).
- `phase` changes from `'best'` to `'degraded'` → show degradation toast (with upgrade link for free users).
- Free user, `phase === 'blocked'` → message bounces back to input box (see "When Limits Are Reached"), show cutoff toast.

## Usage Limits

- The only thing that counts towards the daily limit is **chat with AI** (not plan generation or text extraction). The others are just rate limited.
- Usage is measured in weighted tokens: `(input_tokens + output_tokens * 6)`. The 6x ratio reflects the approximate cost difference between input and output tokens.
- There is a **single cumulative token counter** per user per day. No separate counters per phase.
- **Free users** have two thresholds on that single counter:
  1. **Best-model threshold** (~2.5 topics): user starts on the best model. After crossing this threshold, they switch to the degraded model mid-conversation.
  2. **Hard-cutoff threshold** (~5 topics): after crossing this, the user is fully blocked until the next day.
- **Pro users** have one threshold (~10 topics) after which they switch to the degraded model. There is no hard cutoff — pro users can use the degraded model indefinitely.
- The actual token limit numbers will be derived from measuring real usage per topic.
- Usage resets every day at **3 AM UTC** (midnight BRT).
- Limits are enforced at the API layer.

## Chat Error Handling

When a message fails to send for **any reason** (usage limit reached, API error, network failure, etc.), the message is **bounced back to the input box** (same behavior as the existing undo feature) and a toast notification explains what went wrong. The user can try sending again and will get the same toast if the issue persists.

This is a new behavior that applies to all chat errors, not just usage limits.

## When Limits Are Reached

- **Free users — best-model threshold**: graceful degradation. The API switches to the degraded model mid-conversation. A toast explains that a lighter model will be used and offers an upgrade link.
- **Free users — hard-cutoff threshold**: hard cutoff. The API rejects the message, it bounces back to the input box, and a toast shows: "You've reached your daily usage limit. Come back tomorrow or subscribe to the Pro tier!" with a link to the subscription page.
- **Pro users — best-model threshold**: graceful degradation. Switch to the degraded model for the rest of the day. Show a one-time toast explaining that a lighter model will be used. No hard cutoff — the degraded model can be used indefinitely.
- The best and degraded models are configured in `src/config/ai.ts`.

## Usage Warnings

- We don't show the user exactly how much usage they have left.
- Instead, show **toast notifications** at fixed thresholds:
  - **75%**: "You've used 75% of your daily usage limit."
  - **90%**: "You've used 90% of your daily usage limit."
- These warnings apply **per phase**:
  - **Free "best" phase**: warnings at 75%/90% of the best-model threshold. Mention that after the limit, a lighter model will be used.
  - **Free "degraded" phase**: warnings at 75%/90% of the hard-cutoff threshold. Mention that after the limit, usage will be blocked.
  - **Pro "best" phase**: warnings at 75%/90% of the pro threshold. Mention that after the limit, a lighter model will be used.
  - **Pro "degraded" phase**: no warnings (no limit to warn about).

## Promotions

Promotions are **hardcoded** — each one can have its own logic, UI details, and eligibility check. There won't be many, and adding a new one is rare, so it's fine to code each one individually.

### How promotions appear on the page

The promotions section is directly on the subscription page (not behind a button/modal). It shows a list of **promotion cards**. Each card displays:
- The promotion **title**.
- The **credit amount** (e.g. "R$20.00 in credits").
- A "Claimed" badge if already claimed.

Clicking a card opens a **promotion detail modal** with:
- The promotion **title**.
- A short **description** explaining the promotion and how to qualify.
- Optionally, **progress info** specific to that promotion (e.g. "2/5 friends invited").
- A **"Claim"** button:
  - **Enabled** if the user meets the eligibility criteria and hasn't claimed it yet.
  - **Disabled** (greyed out) if the user hasn't met the criteria yet. Show a short explanation of what's missing.
  - **Hidden or replaced with "Already claimed"** if the user already claimed this promotion.

### How promotions work (backend)

- Each promotion is fully independent — its own logic, its own DB table for tracking claims. Since promotions are rare and each one is different, this is simpler than a generic system.
- The claim endpoint checks eligibility **server-side** before crediting — never trust the client.
- Claiming credits the user's balance atomically with storing the claim.

### First promotion: Unicamp & USP

- **Title**: "Estuda na Unicamp ou USP? Ganhe 1 mês grátis!"
- **Credits**: R$20.00 (equivalent to 1 month of Pro).
- **Description**: "Se o email da sua conta pertence à Unicamp ou USP, resgate R$20 em créditos — o suficiente para 1 mês de Pro."
- **Eligibility check**: the user's email ends with one of the hardcoded suffixes (e.g. `@unicamp.br`, `@usp.br`, `@dac.unicamp.br`, etc.) and they didn't claimed it yet. The list of accepted suffixes is hardcoded in the config.
- **Claim flow**: user clicks "Claim" → backend verifies email suffix → credits balance → stores claim.
- Since the user's email is already known (they logged in with it), the modal just shows whether they qualify or not. No additional input needed.
- **DB table**: `promo_university_email` — stores user_id (unique) and claimed_at timestamp.

## Webhook Handling

- AbacatePay sends a **`pix.paid`** webhook event when a Pix payment is confirmed.
- The webhook endpoint must be **idempotent**: processing the same webhook twice must not double-credit the user. Use the AbacatePay payment ID (`pix_char_xxx`) as a deduplication key.
- Before processing, check that the payment is still **active in our DB** (not invalidated by a newer payment attempt).
- Verify webhook authenticity via AbacatePay's HMAC-SHA256 signature (`X-Webhook-Signature` header).

## Development & Testing

- AbacatePay has a **Dev Mode** where all operations are simulated.
- Use `POST /v1/pixQrCode/simulate-payment?id=xxx` to simulate a Pix payment in dev mode, which triggers the webhook flow without real money.

## Configuration

- AI-related config in `src/config/ai.ts`: model IDs (best/degraded), daily token limits (free best-model threshold, free hard-cutoff threshold, pro best-model threshold), warning thresholds.
- Subscription-related config in `src/config/subscription.ts`: subscription price, promotion definitions, university email suffixes.
