# Ditchy — Implementation Journey

Progress tracker and implementation notes. Updated after each phase.

---

## Phase 1 — Project Setup
- [x] 1.1 Initialize the Next.js project
- [x] 1.2 Install dependencies
- [x] 1.3 Configure Tailwind CSS
- [x] 1.4 Create the folder structure
- [x] 1.5 Environment variables
- [x] 1.6 Vercel project

**Notes:**
- Switched from `@vercel/postgres` (deprecated) to `@neondatabase/serverless`. Uses HTTP mode (`neon()`) for single queries and WebSocket `Pool` for transactions. Same `sql` tagged template pattern.
- Env var names adjusted to match SDK defaults: `GOOGLE_GENERATIVE_AI_API_KEY` (not `GEMINI_API_KEY`), `DATABASE_URL` + `DATABASE_URL_UNPOOLED` (Neon integration sets both automatically on Vercel).
- Geist font loaded via `geist` npm package using `GeistSans` and `GeistMono` from `geist/font/sans` and `geist/font/mono`.
- Tailwind v4 uses `@theme inline` block in `globals.css` to define custom color tokens (e.g. `bg-surface`, `text-muted-text`, `bg-accent-blue`).
- Route group `(auth)` handles `/` (login page), `(main)` handles authenticated pages. `src/app/page.tsx` was removed to avoid conflict with `(auth)/page.tsx`.
- Vercel Blob not yet provisioned (`BLOB_READ_WRITE_TOKEN` still empty) — needed by Phase 6.

---

## Phase 2 — Database
- [x] 2.1 Set up node-pg-migrate
- [x] 2.2 Enable pgvector
- [x] 2.3 Create all tables
- [x] 2.4 Database connection module
- [x] 2.5 Run all migrations

**Notes:**
- Added `migrate` and `migrate:create` scripts to `package.json`. Uses `--database-url-var DATABASE_URL_UNPOOLED` so migrations run over a direct (non-pooled) connection — required for DDL statements.
- node-pg-migrate v8 auto-loads `.env.local` via dotenv, so no extra setup needed.
- 6 migration files in `db/migrations/`: pgvector extension, users+auth, sections+files, plan tables, study tables (topics/subtopics/chats/messages/summaries), embeddings.
- `messages` table uses `SERIAL` PK (not UUID) for guaranteed ordering.
- `order` columns are quoted (`"order"`) since it is a reserved SQL keyword.
- Embeddings table uses an HNSW index (`vector_cosine_ops`) for approximate nearest-neighbor search.
- `src/lib/db/connection.ts` exports `sql` using `neon()` HTTP mode for single queries. WebSocket `Pool` will be used for transactions when needed (imported directly from `@neondatabase/serverless` at the call site).

---

## Phase 3 — Authentication
- [x] 3.1 JWT utilities (`src/lib/auth.ts`)
- [x] 3.2 Proxy (`src/proxy.ts`)
- [x] 3.3 Database queries (`src/lib/db/queries/users.ts`)
- [x] 3.4 API routes
- [x] 3.5 Login / Register page (`src/app/(auth)/page.tsx`)

**Notes:**
- Auth flow: email → OTP via Resend → JWT in HTTP-only cookie (`ditchy_token`, 30-day expiry).
- `src/proxy.ts` is recognized as Next.js middleware via the exported `config.matcher`. Exempts `/api/auth/*` from both the 401 guard and the page-redirect guard (both checks must skip API routes to avoid redirecting API calls to `/`).
- `getLatestOtpCode` returns `elapsed_seconds` computed via `EXTRACT(EPOCH FROM (now() - created_at))` in SQL. This avoids a timezone mismatch bug: the `TIMESTAMP` column stores time in the DB server's local timezone, but `Date.now()` in Node.js is always UTC — computing elapsed time in SQL keeps both sides in the same timezone.
- Login/Register page (`src/app/(auth)/page.tsx`) is `'use client'`. Two-step form (email → code). Redirect after auth uses `window.location.href` (not `router.push`) so the proxy reads the freshly set cookie on a full navigation.
- `RESEND_FROM_EMAIL` defaults to `onboarding@resend.dev`; on Resend's free tier, can only send to your own verified email address.

---

## Phase 4 — Layout & UI Foundation
- [x] 4.1 Internationalization infrastructure (`src/lib/i18n/`)
- [ ] 4.2 Generic UI components (`src/components/ui/`)
- [ ] 4.3 Navbar (`src/components/Navbar.tsx`)
- [ ] 4.4 Breadcrumb bar (`src/components/Breadcrumb.tsx`)
- [ ] 4.5 Main layout (`src/app/(main)/layout.tsx`)

**Notes:**
- i18n: `pt-BR.ts` defines the `Translations` interface and default strings; `en.ts` implements the same interface. `index.ts` exports `useTranslation()` hook (reads/writes `ditchy_language` cookie, 1-year expiry, default pt-BR) and `Language` type.
- Language switcher on auth page is absolute-positioned top-right (standalone, no navbar available on auth routes).

---

## Phase 5 — Dashboard & Sections
- [ ] 5.1 Database queries (`src/lib/db/queries/sections.ts`)
- [ ] 5.2 API routes
- [ ] 5.3 Dashboard page (`src/app/(main)/dashboard/page.tsx`)
- [ ] 5.4 Section page shell (`src/app/(main)/sections/[id]/page.tsx`)

**Notes:**

---

## Phase 6 — File Upload & Processing
- [ ] 6.1 Database queries (`src/lib/db/queries/files.ts`)
- [ ] 6.2 API routes
- [ ] 6.3 AI text extraction setup
- [ ] 6.4 `src/config/ai.ts` (initial version)
- [ ] 6.5 File-to-image conversion (`src/lib/file-conversion.ts`)
- [ ] 6.6 AI wrapper (`src/lib/ai.ts`) — initial version
- [ ] 6.7 Uploading UI (`src/app/(main)/sections/[id]/` — Uploading component)

**Notes:**

---

## Phase 7 — Study Plan Generation
- [ ] 7.1 Prompts (`src/prompts/index.ts` — additions)
- [ ] 7.2 AI config additions (`src/config/ai.ts`)
- [ ] 7.3 AI wrapper additions (`src/lib/ai.ts`)
- [ ] 7.4 Database queries (`src/lib/db/queries/plans.ts`)
- [ ] 7.5 Database queries (`src/lib/db/queries/topics.ts`)
- [ ] 7.6 API routes
- [ ] 7.7 Planning UI (`src/app/(main)/sections/[id]/` — Planning component)

**Notes:**

---

## Phase 8 — Studying & Chat
- [ ] 8.1 RAG setup
- [ ] 8.2 AI config additions (`src/config/ai.ts`)
- [ ] 8.3 Prompts (`src/prompts/index.ts` — additions)
- [ ] 8.4 Database queries
- [ ] 8.5 API routes
- [ ] 8.6 `searchFiles` tool implementation
- [ ] 8.7 Initial chat message
- [ ] 8.8 Chat summarization
- [ ] 8.9 Studying UI (`src/app/(main)/sections/[id]/` — Studying component)
- [ ] 8.10 Chat UI (`src/app/(main)/sections/[id]/chat/[chatId]/page.tsx`)

**Notes:**

---

## Phase 9 — Internationalization Review
- [ ] 9.1 Translation coverage audit
- [ ] 9.2 Language switcher verification
- [ ] 9.3 LLM language

**Notes:**

---

## Phase 10 — Polish & Deploy
- [ ] 10.1 Error handling
- [ ] 10.2 Empty states
- [ ] 10.3 Responsive design
- [ ] 10.4 Loading states
- [ ] 10.5 Final review
- [ ] 10.6 Vercel deployment

**Notes:**
