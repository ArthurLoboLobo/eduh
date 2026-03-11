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
- [ ] 2.1 Set up node-pg-migrate
- [ ] 2.2 Enable pgvector
- [ ] 2.3 Create all tables
- [ ] 2.4 Database connection module
- [ ] 2.5 Run all migrations

**Notes:**

---

## Phase 3 — Authentication
- [ ] 3.1 JWT utilities (`src/lib/auth.ts`)
- [ ] 3.2 Proxy (`src/proxy.ts`)
- [ ] 3.3 Database queries (`src/lib/db/queries/users.ts`)
- [ ] 3.4 API routes
- [ ] 3.5 Login / Register page (`src/app/(auth)/page.tsx`)

**Notes:**

---

## Phase 4 — Layout & UI Foundation
- [ ] 4.1 Internationalization infrastructure (`src/lib/i18n/`)
- [ ] 4.2 Generic UI components (`src/components/ui/`)
- [ ] 4.3 Navbar (`src/components/Navbar.tsx`)
- [ ] 4.4 Breadcrumb bar (`src/components/Breadcrumb.tsx`)
- [ ] 4.5 Main layout (`src/app/(main)/layout.tsx`)

**Notes:**

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
