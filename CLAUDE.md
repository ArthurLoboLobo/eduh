# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ditchy is an AI-powered exam preparation platform for university students. Users upload study materials (past exams, slides, notes), the AI generates a structured study plan, and then provides interactive AI tutoring through topic-specific and revision chats.

Spec documents: `what.md` (features/user flow), `design.md` (UI/UX), `tech.md` (technical architecture), `plan.md` (10-phase implementation plan). Progress is tracked in `journey.md`.

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
    api/                     # REST API routes
  components/
    ui/                      # Generic reusable components
  lib/
    db/
      connection.ts          # Neon Postgres connection (exports sql function)
      queries/               # SQL functions grouped by entity
    i18n/                    # Translation strings (pt-BR.ts, en.ts) + useTranslation hook
    auth.ts                  # JWT utilities
    ai.ts                    # LLM wrappers
  config/
    ai.ts                    # Model IDs and tunable AI parameters
  prompts/
    index.ts                 # All prompt templates
db/
  migrations/                # node-pg-migrate SQL files
```

### Key Patterns

- **Route groups**: `(auth)` has no navbar, `(main)` has navbar + breadcrumb. No `src/app/page.tsx` — the root `/` is served by `(auth)/page.tsx`.
- **Self-chaining background jobs**: Long-running tasks (file extraction, plan generation) use self-invoking serverless functions to stay within Vercel's 60s timeout.
- **RAG pipeline**: Extracted text → chunked (~1000 tokens, ~100 overlap) → embedded with `gemini-embedding-001` → stored in pgvector → retrieved via similarity search (top 4 chunks).
- **Lazy chat creation**: Chat records created on first open, not upfront.

### AI Models

| Task | Model |
|------|-------|
| Teaching chat | `gemini-3.1-flash-lite-preview` |
| Text extraction | `gemini-2.5-flash-lite` |
| Plan generation | `gemini-2.5-flash-lite` |
| Summarization | `gemini-2.5-flash-lite` |
| Embeddings | `gemini-embedding-001` |

### Database

12 tables with UUID primary keys, CASCADE deletes, timestamps. Messages use SERIAL IDs for ordering. See `tech.md` for full schema.

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
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API (default for `@ai-sdk/google`) | No |
| `JWT_SECRET` | JWT signing secret | No |

See `.env.example` for setup instructions.
