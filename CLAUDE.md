# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ditchy is an AI-powered exam preparation platform for university students. Users upload study materials (past exams, slides, notes), the AI generates a structured study plan, and then provides interactive AI tutoring through topic-specific and revision chats.

Spec documents: `what.md` (features/user flow), `design.md` (UI/UX), `tech.md` (technical architecture), `plan.md` (10-phase implementation plan).

### Implementation Status

Phases 1–7 are complete. Next up is Phase 8 (Studying & Chat).

| Phase | Status |
|-------|--------|
| 1. Project Setup | Done |
| 2. Database | Done |
| 3. Authentication | Done |
| 4. Layout & UI Foundation | Done |
| 5. Dashboard & Sections | Done |
| 6. File Upload & Processing | Done |
| 7. Study Plan Generation | Done |
| 8. Studying & Chat | Not started |
| 9. i18n Review | Not started |
| 10. Polish & Deploy | Not started |

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

- **Route groups**: `(auth)` has no navbar, `(main)` has navbar + breadcrumb. No `src/app/page.tsx` — the root `/` is served by `(auth)/page.tsx`. The auth page has a standalone language switcher (top-right) since there is no navbar.
- **Self-chaining background jobs**: Plan generation uses self-invoking serverless functions to stay within Vercel's 60s timeout. File processing is triggered by the client (one call per file) and does not self-chain.
- **RAG pipeline** (not yet implemented): Extracted text → chunked (~512 tokens, ~100 overlap) → embedded with `gemini-embedding-2-preview` (taskType: `RETRIEVAL_DOCUMENT`) → stored in pgvector → retrieved via similarity search (top 4 chunks, query embedded with taskType: `RETRIEVAL_QUERY`).
- **Lazy chat creation** (not yet implemented): Chat records created on first open, not upfront.
- **Ownership verification**: Each entity has a dedicated `verify*Ownership(entityId, userId)` query. API routes call it explicitly before proceeding — queries themselves don't embed ownership checks.
- **Plan draft stack**: Plan edits create new `plan_drafts` rows. Undo deletes the newest draft, revealing the previous one. Drafts are cleaned up when the user starts studying.

### AI Models

| Task | Model | Implemented? |
|------|-------|--------------|
| Text extraction | `gemini-3-flash-preview` | Yes |
| Plan generation | `gemini-3-flash-preview` | Yes |
| Teaching chat | `gemini-3-flash-preview` | No |
| Summarization | `gemini-2.5-flash-lite` | No |
| Embeddings | `gemini-embedding-2-preview` | No |

### Database

12 tables with UUID primary keys, CASCADE deletes, timestamps. Messages use SERIAL IDs for ordering. See `tech.md` for full schema. 6 migrations exist in `db/migrations/`.

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
POST /api/sections/:id/start-studying   # Transition planning → studying

POST /api/files                   # Upload file
DELETE /api/files/:id             # Delete file
POST /api/files/:id/process       # Extract text from file via AI
```

### Existing Components

- **UI** (`src/components/ui/`): Button, Input, Modal, Card, Badge, Checkbox, ConfirmDialog, ProgressBar, Spinner
- **Layout**: Navbar, Breadcrumb
- **Views**: UploadingView (file upload + processing), PlanningView (plan editor with drag-and-drop via `@dnd-kit`)

### Database Query Files

- `users.ts` — user/OTP queries
- `sections.ts` — section CRUD, ownership verification, status updates
- `files.ts` — file CRUD, ownership verification, text extraction storage
- `plans.ts` — plan draft management (create, get current, undo, delete all)
- `topics.ts` — create topics from plan, list topics

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

See `.env.example` for setup instructions.
