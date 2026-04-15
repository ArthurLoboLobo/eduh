# Eduh — Technical Overview

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, API Routes) |
| Frontend | React 19 + Tailwind CSS v4 |
| Database | Neon Postgres + pgvector extension |
| Database access | Raw SQL via `@neondatabase/serverless` (no ORM) |
| Migrations | `node-pg-migrate` |
| File storage | Vercel Blob |
| Auth | JWT in HTTP-only cookies (`jose`), OTP via Resend |
| AI | Google Gemini via Vercel AI SDK (`ai` + `@ai-sdk/google`) |
| Payments | AbacatePay (PIX QR codes for the Brazilian market) |
| Hosting | Vercel |

## AI Models

| Task | Model |
|------|-------|
| Text extraction | `gemini-3.1-flash-lite-preview` |
| Plan generation | `gemini-3-flash-preview` |
| Plan regeneration | `gemini-3-flash-preview` |
| Teaching chat (best phase) | `gemini-3.1-pro-preview` |
| Teaching chat (degraded phase) | `gemini-3-flash-preview` |
| Chat summarization | `gemini-3-flash-preview` |
| Embeddings | `gemini-embedding-2-preview` (1536 dimensions) |

Model IDs and all tunable AI parameters are centralized in `src/config/ai.ts`. The active chat model is selected per request based on the user's usage phase (`best`/`degraded`/`blocked`).

## Database Access

No ORM. All queries are raw SQL using `@neondatabase/serverless`'s `neon()` SQL tagged template, which handles parameterized queries (SQL injection prevention). HTTP mode for single queries (faster in serverless), `sql.transaction()` for multi-query transactions.

Migrations are managed with `node-pg-migrate`. Each migration is a JS file in `db/migrations/`. Uses `DATABASE_URL_UNPOOLED` (direct connection) for DDL operations.

## Directory Structure

```
src/
  proxy.ts                  # Auth proxy (JWT verification on every request)
  app/
    (auth)/                  # Login/register (no navbar)
    (main)/                  # Authenticated pages (navbar + breadcrumb)
      dashboard/
      sections/[id]/
      sections/[id]/chat/[chatId]/
      subscription/          # Plan status, payment modal, promotions
      admin/ai-logs/         # Admin-only AI call monitoring dashboard
    api/                     # REST API routes (includes /subscription, /promotions, /webhooks/abacatepay, /user)
  components/
    ui/                      # Generic reusable components
    Navbar.tsx               # Top navigation bar (with Subscribe-to-Pro chip for free users)
    Breadcrumb.tsx           # Location breadcrumb with section/topic dropdowns
    UploadingView.tsx        # File upload interface
    PlanningView.tsx         # Plan editor with drag-and-drop
    StudyingView.tsx         # Topic list with progress
    PaymentModal.tsx         # PIX QR code flow
    PromotionDetailModal.tsx # Promotion eligibility + claim
  hooks/
    useUser.ts               # Fetches /api/user (plan, balance, expiry)
  lib/
    db/
      connection.ts          # Neon Postgres connection (exports sql function)
      queries/               # SQL functions grouped by entity
    i18n/                    # Translation strings (pt-BR.ts, en.ts) + useTranslation hook
    auth.ts                  # JWT utilities + isAdmin helper
    ai.ts                    # LLM wrappers + RAG tool
    abacatepay.ts            # AbacatePay API client (createPixQrCode, checkPixQrCode, simulatePixPayment)
    usage-warnings.ts        # Warning-state + severity helpers for chat usage toasts
  config/
    ai.ts                    # Model IDs, token thresholds, warning thresholds
    subscription.ts          # Subscription price, PIX expiry, university email suffixes
  prompts/
    index.ts                 # All prompt templates
db/
  migrations/                # node-pg-migrate migration files (9 total)
```

## Key Architectural Decisions

### Route Groups
`(auth)` has no navbar — serves the login page at `/`. `(main)` has navbar + breadcrumb for all authenticated pages. No `src/app/page.tsx` — root `/` is served by `(auth)/page.tsx`.

### Auth Proxy
`src/proxy.ts` runs on every request, verifies JWT, and handles redirects/401s. Auth cookie is `eduh_token` (httpOnly, secure, sameSite=lax, 30-day expiry).

### Client-Side Data Fetching
Plain `fetch` for all API calls. No SWR, React Query, or other data-fetching libraries. Polling uses `setInterval` with `fetch`.

### Ownership Verification
Each entity has a dedicated `verify*Ownership(entityId, userId)` query. API routes call it explicitly before proceeding — queries themselves don't embed ownership checks.

### Plan Draft Stack
Plan edits create new `plan_drafts` rows (undo stack). Undo deletes the newest draft. Drafts are cleaned up when the user starts studying.

### RAG Pipeline
Extracted text → chunked (~512 tokens, ~100 token overlap) → embedded with `gemini-embedding-2-preview` (taskType: `RETRIEVAL_DOCUMENT`) → stored in pgvector with HNSW index → retrieved via cosine similarity search (top 4 chunks, query embedded with taskType: `RETRIEVAL_QUERY`). The LLM accesses this via the `searchStudentMaterials` tool.

### Chat Summarization
After each assistant message, token count (`chars/4` approximation) is checked against threshold (30,000). When exceeded, older messages are summarized and stored in `chat_summaries`, keeping the last 5 messages unsummarized. Summary is cumulative.

### Initial AI Message
On first chat load, the GET messages endpoint generates an introductory AI message using a fake (unpersisted) user message to seed the response in the correct language.

### File Processing
Client-triggered: `POST /api/files` then immediately `POST /api/files/:id/process`. No self-chaining background jobs. Files are sent directly to Gemini as multimodal input — no conversion step.

### Chat Creation
Eager, not lazy. All chats (one per topic + one revision) are created during `start-studying`. Every topic already has a `chat_id` when the studying UI loads.

### AI Call Logging
Every LLM/embedding API call is logged to `ai_call_logs` with token usage, latency, and full input/output text. Fire-and-forget (never blocks AI calls). Admin dashboard at `/admin/ai-logs` (protected by `ADMIN_EMAIL` env var).

### Subscription & Usage Tiers
- **Free** / **Pro** plan stored on the user row (`plan`, `plan_expires_at`, `balance`). Pro is 30 days from activation; expiration is lazy-checked by `getUserById` on every read.
- **Daily usage** is tracked as weighted tokens (`input + output × 6`) in `daily_usage`, reset at 3 AM UTC. Only chat counts.
- `getUsagePhase(plan, tokens)` returns `best`/`degraded`/`blocked`. Each chat call picks its model from this phase and writes the response tokens back.
- **Promotions** are hardcoded in code (`getUserPromotion` switch + `PROMOTION_IDS`) with eligibility checks, but share a single `promotion_claims` table guarded by `UNIQUE (user_id, promotion_id)`.
- **Payments** flow through AbacatePay's PIX QR Code API. `POST /api/subscription/subscribe` creates a `pending` payments row, `POST /api/webhooks/abacatepay` receives `billing.paid` and activates Pro atomically. Webhook handler is idempotent (dedup by `abacatepay_id`) and credits the user's balance if the matched payment has already been invalidated.

## Environment Variables

| Variable | Purpose | Auto-set by Vercel? |
|----------|---------|---------------------|
| `DATABASE_URL` | Neon pooled connection (app runtime) | Yes (Neon integration) |
| `DATABASE_URL_UNPOOLED` | Neon direct connection (migrations) | Yes (Neon integration) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob access | Yes (Blob integration) |
| `RESEND_API_KEY` | Resend email service | No |
| `RESEND_FROM_EMAIL` | Sender address | No |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API | No |
| `JWT_SECRET` | JWT signing secret | No |
| `ADMIN_EMAIL` | Email for admin dashboard access | No |
| `ABACATEPAY_API_KEY` | AbacatePay API key for PIX payments | No |
| `ABACATEPAY_WEBHOOK_SECRET` | Secret query param used to verify webhook requests | No |

## Internationalization

- Supported: **Brazilian Portuguese** (pt-BR, default) and **English**.
- `useTranslation()` hook reads `eduh_language` cookie, returns `{ t, language, setLanguage }`.
- SSR-safe with hydration sync. Cross-component sync via custom `eduh:language-change` event.
- Translation keys organized by section: `auth`, `nav`, `dashboard`, `section`, `uploading`, `planning`, `studying`, `chat`, `errors`, `subscription`, `promotions`. Promotion titles/descriptions are keyed by `camelCase(id)` with `unknownTitle`/`unknownDescription` fallback.

## Limits

| Limit | Value |
|-------|-------|
| Max sections per user | 10 |
| Max file size | 4 MB |
| Max total files per section | 10 MB |
| Chat messages per minute per user | 10 |
| OTP rate limit | 1 per 60 seconds |
| OTP max attempts | 3 |
| OTP expiry | 10 minutes |
| RAG top chunks returned | 4 |
| Summarization token threshold | 30,000 |
| Min unsummarized messages kept | 5 |
| Free daily best-model threshold | ~100k weighted tokens |
| Free daily hard cutoff | ~200k weighted tokens |
| Pro daily best-model threshold | ~400k weighted tokens |
| Output token weight (usage accounting) | 6× input |
| Daily usage reset | 3 AM UTC |
| Subscription price / duration | R$20 / 30 days |
| PIX QR code expiry | 10 minutes |
| Concurrent pending payments per user | 1 |
