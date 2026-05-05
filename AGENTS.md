# Repository Guidelines

This file is the single source of truth for coding agents working in this repository (Claude Code, Gemini CLI, and any other assistant). `CLAUDE.md` and `GEMINI.md` are symlinks to this file — edit `AGENTS.md` and the others follow.

## Project Overview

Eduh is an AI-powered exam preparation platform for university students. Users upload study materials (past exams, slides, lecture notes), the AI generates a structured study plan, and then provides interactive tutoring through topic-specific and revision chats.

## Reference Documents

- `docs/what.md` — product scope and user flow
- `docs/tech.md` — technical overview (tech stack, AI models, RAG pipeline)
- `docs/implementation.md` — phased implementation plan
- `docs/future-todos.md` — known follow-ups and backlog
- `PRODUCT.md` — product positioning, target users, brand register
- `DESIGN.md` / `DESIGN.json` — design system (colors, typography, motion, tokens)

## Implementation Status

| Phase | Status |
|-------|--------|
| 1. Project Setup | Done |
| 2. Database | Done |
| 3. Authentication | Done |
| 4. Layout & UI Foundation | Done |
| 5. Dashboard & Sections | Done |
| 6. File Upload & Processing | Done |
| 7. Study Plan Generation | Done |
| 8. Embeddings (RAG Pipeline) | Done |
| 9. Studying Section Page | Done |
| 10. Chat | Done |
| 11. Subscription (AbacatePay PIX) | Done |
| 12. i18n Review | Not started |
| 13. Polish & Deploy | In progress — broader polish pending |

## Build, Test, and Development Commands

Do not run `npm run dev` by default. Assume the user likely already has the Next.js dev server running, and only start it if the user explicitly asks.

```bash
npm run dev             # Start the Next.js dev server
npm run build           # Build for production
npm run start           # Serve the production build
npm run lint            # Run ESLint
npm test                # Run Vitest once
npm run test:watch      # Run Vitest in watch mode
npm run migrate         # Apply local DB migrations (uses DATABASE_URL_UNPOOLED)
npm run migrate:test    # Apply migrations against the test database
npm run migrate:create  # Scaffold a new migration file
```

## Tech Stack

- **Framework**: Next.js 16 (App Router, API Routes)
- **Frontend**: React 19 + Tailwind CSS v4 (dark mode only, Geist font)
- **Database**: Neon Postgres + pgvector for embeddings
- **Database access**: Raw SQL via `@neondatabase/serverless` (no ORM). HTTP mode (`neon()`) for single queries, WebSocket `Pool` for transactions.
- **Migrations**: `node-pg-migrate` (uses `DATABASE_URL_UNPOOLED` — direct connection)
- **File storage**: Vercel Blob (signed URLs for direct upload)
- **Auth**: JWT in HTTP-only cookies (`jose`), OTP via Resend
- **AI**: Google Gemini via Vercel AI SDK (`ai` + `@ai-sdk/google`)
- **Payments**: AbacatePay (PIX QR codes for the Brazilian market)
- **Hosting**: Vercel

## Project Structure & Module Organization

```text
src/
  proxy.ts                   # Auth proxy (JWT verification)
  app/
    (auth)/                  # Login/register (no navbar) — serves /
    (main)/                  # Authenticated pages (navbar + breadcrumb)
      dashboard/
      sections/[id]/
      sections/[id]/chat/[chatId]/
      subscription/          # Subscription management page
      admin/ai-logs/         # Admin: AI call log viewer
    api/                     # REST API routes
  components/
    ui/                      # Generic reusable primitives
  hooks/
    useUser.ts               # Fetches /api/user, exposes { user, loading, refetch }
  lib/
    db/
      connection.ts          # Neon Postgres connection (exports sql function)
      queries/               # SQL functions grouped by entity
    i18n/                    # Translation strings (pt-BR.ts, en.ts) + useTranslation hook
    auth.ts                  # JWT utilities
    ai.ts                    # LLM wrappers
    abacatepay.ts            # AbacatePay API client (createPixQrCode, checkPixQrCode, simulatePixPayment)
    usage-warnings.ts        # getWarningState / getWarningSeverity for usage UI
  config/
    ai.ts                    # Model IDs, token limits, usage thresholds
    subscription.ts          # Price, duration, PIX expiry, university email suffixes
  prompts/
    index.ts                 # All prompt templates
db/
  migrations/                # node-pg-migrate SQL files
tests/
  unit/                      # Pure logic
  integration/               # End-to-end business flows
  db/                        # Database/migration coverage
```

## Architecture

### Key Patterns

- **Route groups**: `(auth)` has no navbar; `(main)` has navbar + breadcrumb. There is no `src/app/page.tsx` — the root `/` is served by `(auth)/page.tsx`. The auth page has a standalone language switcher (top-right) since there is no navbar.
- **RAG pipeline**: extracted text → chunked (~512 tokens, ~100 overlap) → embedded with `gemini-embedding-2-preview` (taskType: `RETRIEVAL_DOCUMENT`) → stored in pgvector → retrieved via cosine similarity search (top 4 chunks, query embedded with taskType: `RETRIEVAL_QUERY`). The LLM accesses retrieval through the `searchStudentMaterials` tool.
- **Initial AI message**: on first chat load, the GET messages endpoint generates an introductory AI message using a fake (unpersisted) user message to seed the response in the correct language.
- **Chat summarization**: after each assistant message, token count (chars/4 approximation) is checked against `SUMMARIZATION_TOKEN_THRESHOLD`. When exceeded, older messages are summarized and stored in `chat_summaries`, keeping only the last `MIN_UNSUMMARIZED_MESSAGES` in full.
- **Ownership verification**: each entity has a dedicated `verify*Ownership(entityId, userId)` query. API routes call it explicitly before proceeding — queries themselves don't embed ownership checks.
- **Plan draft stack**: plan edits create new `plan_drafts` rows. Undo deletes the newest draft, revealing the previous one. Drafts are cleaned up when the user starts studying.
- **Usage tiers**: each chat message call reads `daily_usage`, determines the usage phase (`best`/`degraded`/`blocked`), selects the appropriate model, then writes back the weighted token count. Free users hit `degraded` at 100k tokens/day and `blocked` at 200k; pro users degrade at 400k but are never hard-blocked.
- **Subscription flow**: `POST /api/subscription/subscribe` creates a PIX QR code via AbacatePay and inserts a `pending` payment row. `POST /api/webhooks/abacatepay` receives the `billing.paid` event, activates the pro plan, and marks the payment `paid`. The client polls `GET /api/subscription/payment-status` while displaying the QR code.
- **Promotions**: per-promotion eligibility and claim state live in code (`PROMOTION_IDS` + `getUserPromotion` switch) — there is no `promotions` table, only a `promotion_claims` join table with a `UNIQUE (user_id, promotion_id)` constraint. `claimPromo` runs the insert + balance update in a single transaction; a double-claim trips the unique index and is surfaced as `ALREADY_CLAIMED` by the API route. The frontend maps promotion `id` → translation keys via `camelCase(id)`, so titles/descriptions never come from the API.

### AI Models

| Task | Model |
|------|-------|
| Text extraction | `gemini-3.1-flash-lite-preview` |
| Plan generation | `gemini-3-flash-preview` |
| Teaching chat (best) | `gemini-3.1-pro-preview` |
| Teaching chat (degraded) | `gemini-3-flash-preview` |
| Summarization | `gemini-3.1-pro-preview` |
| Embeddings | `gemini-embedding-2-preview` |

The active model for a chat call is determined by the user's usage phase (`best` → pro model, `degraded` → flash model, `blocked` → rejected). Output tokens are weighted 6× input tokens when tracking daily usage. Tunable AI parameters live in `src/config/ai.ts`.

### Database

15 tables with UUID primary keys, CASCADE deletes, and timestamps. Messages use SERIAL IDs for ordering. Migrations live in `db/migrations/`.

Tables: `users`, `otp_codes`, `sections`, `files`, `plan_drafts`, `topics`, `subtopics`, `chats`, `messages`, `chat_summaries`, `embeddings`, `payments`, `daily_usage`, `ai_call_logs`, `promotion_claims`.

Key fields added by the subscription migration: `users.plan` (`free`|`pro`), `users.plan_expires_at`, `users.balance` (credits in cents). `getUserById` auto-expires stale pro subscriptions in-place on every read.

### API Routes

```
POST   /api/auth/send-code                # Send OTP email
POST   /api/auth/verify-code              # Verify OTP, set JWT cookie
POST   /api/auth/logout                   # Clear auth cookie

GET|POST   /api/sections                  # List / create sections
GET|DELETE /api/sections/:id              # Get / delete section
GET    /api/sections/:id/files            # List files in section
GET    /api/sections/:id/files/status     # Poll file processing status
POST   /api/sections/:id/start-planning   # Transition uploading → planning
GET|PUT /api/sections/:id/plan            # Get / update plan draft
POST   /api/sections/:id/plan/undo        # Undo last plan edit
POST   /api/sections/:id/plan/regenerate  # AI-regenerate plan with guidance
POST   /api/sections/:id/start-studying   # Transition planning → studying (creates topics, embeddings, chats)
GET    /api/sections/:id/topics           # List topics with chat info and progress

POST   /api/files                         # Upload file
DELETE /api/files/:id                     # Delete file
POST   /api/files/:id/process             # Extract text from file via AI

PATCH  /api/topics/:id                    # Toggle topic completion

GET    /api/chats/:id/messages            # Load messages (generates initial AI message on first load)
POST   /api/chats/:id/messages            # Send message (streaming via useChat / AI SDK data stream)
POST   /api/chats/:id/undo/:messageId     # Undo a user message and all subsequent messages

GET    /api/user                          # Get current user (plan, balance, etc.)

POST   /api/subscription/subscribe        # Create PIX QR code or activate via credits
GET    /api/subscription/payment-status   # Poll latest payment status

GET    /api/promotions                    # List promotions with eligibility/claimed status
POST   /api/promotions/:id/claim          # Claim a promotion (credits balance)

POST   /api/webhooks/abacatepay           # AbacatePay webhook (billing.paid event)

GET    /api/admin/ai-logs                 # AI call log summary + list (admin only)
```

### Components

- **UI primitives** (`src/components/ui/`): Button, Input, Modal, Card, Badge, Checkbox, ConfirmDialog, ProgressBar, Spinner, Toast (with `useToast` hook), TrashIcon, RefreshIcon, UndoIcon, ExpandableText
- **Layout**: Navbar (with language switcher + logout dropdown), Breadcrumb (with section/topic dropdowns)
- **Views**: UploadingView, PlanningView (drag-and-drop via `@dnd-kit`), StudyingView
- **Chat**: ChatComposer, ChatMessageItem
- **Subscription**: PaymentModal (PIX QR code display + payment polling), PromotionDetailModal (claim flow with eligible/ineligible/already-claimed states)

### Database Query Files (`src/lib/db/queries/`)

- `users.ts` — user/OTP queries; `getUserById` lazily expires stale pro subscriptions
- `sections.ts` — section CRUD, ownership verification, status updates, progress counts
- `files.ts` — file CRUD, ownership verification, text extraction storage, size tracking
- `plans.ts` — plan draft management (create, get current, undo, delete all)
- `topics.ts` — create topics from plan, list topics, toggle completion, list with chat info
- `chats.ts` — bulk create chats for section, get revision chat, get chat with full details, ownership verification
- `messages.ts` — message CRUD, rate limit tracking (`getMessageCountLastMinute`), delete from message ID onward
- `embeddings.ts` — bulk insert embeddings, cosine similarity search (`searchChunks`)
- `summaries.ts` — get/upsert chat summaries
- `payments.ts` — payment CRUD; statuses: `pending` → `paid` / `invalidated`
- `promotions.ts` — `getUserPromotion`, `getUserPromotions`, `claimPromo` (eligibility + atomic claim via transaction, guarded by `UNIQUE (user_id, promotion_id)`)
- `usage.ts` — `upsertDailyUsage`, `getDailyUsage`, `getUsagePhase` (free vs. pro thresholds)
- `aiLogs.ts` — `insertAiCallLog` (fire-and-forget), summary/list queries for admin view

### AI Functions (`src/lib/ai.ts`)

- `extractTextFromFile(fileBuffer, mimeType)` — multimodal Gemini call for text extraction
- `generatePlan(allText)` — generate `PlanJSON` from extracted text
- `regeneratePlan(allText, guidance)` — regenerate plan with user guidance
- `validatePlanJSON(data)` — type guard for `PlanJSON`
- `chunkText(text, chunkSize?, overlap?)` — split text into overlapping chunks
- `embedText(text, taskType)` — single embedding via `gemini-embedding-2-preview`
- `embedTexts(texts, taskType)` — batch embeddings
- `createSearchStudentMaterialsTool(sectionId)` — Vercel AI SDK tool for RAG retrieval
- `summarizeChat(previousSummary, messages)` — produce cumulative chat summary

**Type**: `PlanJSON = { topics: { title: string; subtopics: string[]; isKnown?: boolean }[] }`

### Prompts (`src/prompts/index.ts`)

- `TEXT_EXTRACTION_PROMPT` — extract text to Markdown, LaTeX for math, describe images
- `PLAN_GENERATION_PROMPT` — generate structured `PlanJSON` from study materials
- `planRegenerationPrompt(guidance)` — regenerate plan incorporating user guidance
- `topicChatSystemPrompt(params)` — topic chat system prompt (pedagogical flow + language rules)
- `revisionChatSystemPrompt(params)` — revision chat system prompt
- `CHAT_SUMMARIZATION_PROMPT` — summarize conversation cumulatively
- `TOPIC_CHAT_INITIAL_USER_MESSAGE_PT/EN` — seeded fake user message to trigger initial AI greeting
- `REVISION_CHAT_INITIAL_USER_MESSAGE_PT/EN` — same for revision chat

### i18n

Translation keys are organized into sections: `auth`, `nav`, `dashboard`, `section`, `uploading`, `planning`, `studying`, `chat`, `errors`, `subscription`, `promotions`. The `useTranslation()` hook reads the `eduh_language` cookie (default: `pt-BR`) and returns `{ t, language, setLanguage }` with SSR-safe hydration. Per-promotion copy is keyed by `camelCase(id)` (e.g. `universityEmailTitle`) with `unknownTitle`/`unknownDescription` fallback — no id→key map, the transform is the map.

## Tailwind v4

Custom colors are defined as CSS variables in `src/app/globals.css` and exposed via `@theme inline`. Available as utility classes:

`bg-background`, `bg-surface`, `border-border`, `border-border-hover`, `text-primary-text`, `text-muted-text`, `bg-accent-blue`, `bg-accent-blue-hover`, `bg-success-green`, `bg-danger-red`

## Coding Style & Naming Conventions

- TypeScript with strict mode; the `@/*` alias imports from `src`.
- 2-space indentation, double quotes, semicolons.
- PascalCase for React components, camelCase for functions and variables, numeric-prefix migration filenames (e.g. `009_create_promotion_claims.js`).
- Keep query files focused by entity. Put ownership and request validation in route handlers rather than burying them in SQL helpers.
- Match existing UI patterns unless a change intentionally updates the design system.

## Testing Guidelines

- Vitest is the test runner.
- Place pure logic tests in `tests/unit`, end-to-end business flows in `tests/integration`, and database/migration coverage in `tests/db`.
- Use `*.test.ts` naming.
- Run `npm test` and `npm run lint` before opening a PR.
- If a change touches SQL, subscriptions, webhooks, or usage limits, update the related integration or DB coverage in the same change.

## Design Constraints

- **Dark mode only** — no light mode.
- **No lots of animations** — mostly static UI.
- **Flat design** with subtle hover effects and slightly rounded corners.
- **i18n**: default `pt-BR`, secondary English. LLM language priority: last user message language > materials language > user preference.

## Environment Variables

| Variable | Purpose | Auto-set by Vercel? |
|---|---|---|
| `DATABASE_URL` | Neon pooled connection (app runtime) | Yes (Neon integration) |
| `DATABASE_URL_UNPOOLED` | Neon direct connection (migrations) | Yes (Neon integration) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob access | Yes (Blob integration) |
| `RESEND_API_KEY` | Resend email service | No |
| `RESEND_FROM_EMAIL` | Sender address (free tier: `onboarding@resend.dev`) | No |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API (default for `@ai-sdk/google`) | No |
| `JWT_SECRET` | JWT signing secret | No |
| `ABACATEPAY_API_KEY` | AbacatePay API key for PIX payments | No |
| `ABACATEPAY_WEBHOOK_SECRET` | Secret query param for webhook verification | No |

See `.env.example` for setup instructions.

## Security & Configuration Tips

- Never commit `.env*` secrets.
- `DATABASE_URL` is for app runtime; `DATABASE_URL_UNPOOLED` is for migrations.
- Configure Gemini, Resend, AbacatePay, JWT, and Blob credentials before testing those flows locally.
