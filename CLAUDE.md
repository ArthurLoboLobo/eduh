# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Eduh is an AI-powered exam preparation platform for university students. Users upload study materials (past exams, slides, notes), the AI generates a structured study plan, and then provides interactive AI tutoring through topic-specific and revision chats.

Spec documents: `what.md` (features/user flow), `design.md` (UI/UX), `tech.md` (technical architecture), `plan.md` (12-phase implementation plan).

### Implementation Status

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
| 13. Polish & Deploy | Not started |

## Build & Run

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
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
- **Payments**: AbacatePay (PIX QR codes for Brazilian market)
- **Hosting**: Vercel

## Architecture

### Directory Structure

```
src/
  proxy.ts                  # Auth proxy (JWT verification)
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
    ui/                      # Generic reusable components
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
  migrations/                # node-pg-migrate SQL files (8 migrations)
```

### Key Patterns

- **Route groups**: `(auth)` has no navbar, `(main)` has navbar + breadcrumb. No `src/app/page.tsx` — the root `/` is served by `(auth)/page.tsx`. The auth page has a standalone language switcher (top-right) since there is no navbar.
- **RAG pipeline**: Extracted text → chunked (~512 tokens, ~100 overlap) → embedded with `gemini-embedding-2-preview` (taskType: `RETRIEVAL_DOCUMENT`) → stored in pgvector → retrieved via similarity search (top 4 chunks, query embedded with taskType: `RETRIEVAL_QUERY`). The LLM accesses this via the `searchStudentMaterials` tool.
- **Initial AI message**: On first chat load, the GET messages endpoint generates an introductory AI message using a fake (unpersisted) user message to seed the response in the correct language.
- **Chat summarization**: After each assistant message, token count (chars/4 approximation) is checked against `SUMMARIZATION_TOKEN_THRESHOLD`. When exceeded, older messages are summarized and stored in `chat_summaries`, keeping only the last `MIN_UNSUMMARIZED_MESSAGES` in full.
- **Ownership verification**: Each entity has a dedicated `verify*Ownership(entityId, userId)` query. API routes call it explicitly before proceeding — queries themselves don't embed ownership checks.
- **Plan draft stack**: Plan edits create new `plan_drafts` rows. Undo deletes the newest draft, revealing the previous one. Drafts are cleaned up when the user starts studying.
- **Usage tiers**: Each chat message call reads `daily_usage`, determines the usage phase (`best`/`degraded`/`blocked`), selects the appropriate model, then writes back the weighted token count. Free users hit `degraded` at 100k tokens/day and `blocked` at 200k; pro users degrade at 400k but are never hard-blocked.
- **Subscription flow**: `POST /api/subscription/subscribe` creates a PIX QR code via AbacatePay and inserts a `pending` payment row. The `POST /api/webhooks/abacatepay` endpoint receives the `billing.paid` event, activates the pro plan, and marks the payment `paid`. The client polls `GET /api/subscription/payment-status` while displaying the QR code.

### AI Models

| Task | Model |
|------|-------|
| Text extraction | `gemini-3.1-flash-lite-preview` |
| Plan generation | `gemini-3-flash-preview` |
| Teaching chat (best) | `gemini-3.1-pro-preview` |
| Teaching chat (degraded) | `gemini-3-flash-preview` |
| Summarization | `gemini-3.1-pro-preview` |
| Embeddings | `gemini-embedding-2-preview` |

The active model for a chat call is determined by the user's usage phase (`best` → pro model, `degraded` → flash model, `blocked` → rejected). Output tokens are weighted 6× input tokens when tracking daily usage.

### Database

15 tables with UUID primary keys, CASCADE deletes, timestamps. Messages use SERIAL IDs for ordering. 8 migrations in `db/migrations/`.

Tables: `users`, `otp_codes`, `sections`, `files`, `plan_drafts`, `topics`, `subtopics`, `chats`, `messages`, `chat_summaries`, `embeddings`, `payments`, `daily_usage`, `ai_call_logs`.

Key fields added by subscription migration: `users.plan` (`free`|`pro`), `users.plan_expires_at`, `users.balance` (credits in cents). `getUserById` auto-expires stale pro subscriptions in-place on every read.

### Existing API Routes

```
POST /api/auth/send-code          # Send OTP email
POST /api/auth/verify-code        # Verify OTP, set JWT cookie
POST /api/auth/logout             # Clear auth cookie

GET|POST /api/sections            # List / create sections
GET|DELETE /api/sections/:id      # Get / delete section
GET /api/sections/:id/files       # List files in section
GET /api/sections/:id/files/status # Poll file processing status
POST /api/sections/:id/start-planning   # Transition uploading → planning
GET|PUT /api/sections/:id/plan          # Get / update plan draft
POST /api/sections/:id/plan/undo        # Undo last plan edit
POST /api/sections/:id/plan/regenerate  # AI-regenerate plan with guidance
POST /api/sections/:id/start-studying   # Transition planning → studying (creates topics, embeddings, chats)
GET /api/sections/:id/topics            # List topics with chat info and progress

POST /api/files                   # Upload file
DELETE /api/files/:id             # Delete file
POST /api/files/:id/process       # Extract text from file via AI

PATCH /api/topics/:id             # Toggle topic completion

GET /api/chats/:id/messages       # Load messages (generates initial AI message on first load)
POST /api/chats/:id/messages      # Send message (streaming via useChat / AI SDK data stream)
POST /api/chats/:id/undo/:messageId  # Undo a user message and all subsequent messages

GET /api/user                         # Get current user (plan, balance, etc.)

POST /api/subscription/subscribe      # Create PIX QR code or activate via credits
GET  /api/subscription/payment-status # Poll latest payment status

POST /api/webhooks/abacatepay         # AbacatePay webhook (billing.paid event)

GET /api/admin/ai-logs               # AI call log summary + list (admin only)
```

### Existing Components

- **UI** (`src/components/ui/`): Button, Input, Modal, Card, Badge, Checkbox, ConfirmDialog, ProgressBar, Spinner, Toast (with `useToast` hook), TrashIcon, ExpandableText
- **Layout**: Navbar (with language switcher + logout dropdown), Breadcrumb (with section/topic dropdowns)
- **Views**: UploadingView, PlanningView (drag-and-drop via `@dnd-kit`), StudyingView
- **Subscription**: PaymentModal (PIX QR code display + polling for payment confirmation)

### Database Query Files

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

Translation keys are organized into sections: `auth`, `nav`, `dashboard`, `section`, `uploading`, `planning`, `studying`, `chat`, `errors`. The `useTranslation()` hook reads the `eduh_language` cookie (default: `pt-BR`) and returns `{ t, language, setLanguage }` with SSR-safe hydration.

## Tailwind v4

Custom colors are defined as CSS variables in `src/app/globals.css` and exposed via `@theme inline`. Available as utility classes:

`bg-background`, `bg-surface`, `border-border`, `border-border-hover`, `text-primary-text`, `text-muted-text`, `bg-accent-blue`, `bg-accent-blue-hover`, `bg-success-green`, `bg-danger-red`

## Design Constraints

- **Dark mode only** — no light mode
- **No animations** — static UI only
- **Flat design** with subtle hover effects and slightly rounded corners
- **i18n**: Default pt-BR, secondary English. LLM language priority: last user message language > materials language > user preference

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
