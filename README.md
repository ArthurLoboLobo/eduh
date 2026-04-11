# Eduh

An AI-powered exam preparation platform for university students. Upload past exams, slides, and notes — the AI builds a structured study plan and provides interactive topic-by-topic tutoring with full access to your materials via RAG.

## Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) Postgres database (pgvector extension required)
- A [Google AI Studio](https://aistudio.google.com/apikey) API key (Gemini)
- A [Resend](https://resend.com) API key (OTP emails)
- A [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) token (file storage)
- An [AbacatePay](https://abacatepay.com) API key (PIX subscription payments)

## Local Setup

```bash
# 1. Clone and install
git clone <repo>
cd eduh
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in all variables in .env.local (see Environment Variables below)

# 3. Run database migrations
npm run migrate

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run lint          # ESLint
npm run migrate       # Run pending DB migrations (uses DATABASE_URL_UNPOOLED)
npm run migrate:create <name>  # Create a new migration file
```

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon pooled connection (runtime) |
| `DATABASE_URL_UNPOOLED` | Neon direct connection (migrations) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob access token |
| `RESEND_API_KEY` | Resend API key for OTP emails |
| `RESEND_FROM_EMAIL` | Sender address (`onboarding@resend.dev` on free tier) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key |
| `JWT_SECRET` | Random 32-byte hex string — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ADMIN_EMAIL` | Email that can access `/admin/ai-logs` |
| `ABACATEPAY_API_KEY` | AbacatePay API key |
| `ABACATEPAY_WEBHOOK_SECRET` | AbacatePay webhook secret (query param for verification) |

On Vercel, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, and `BLOB_READ_WRITE_TOKEN` are set automatically by their respective integrations.

## Architecture

Next.js 16 App Router with two route groups: `(auth)` (login, no navbar) and `(main)` (authenticated pages with navbar). API routes live under `src/app/api/`. Database access is raw SQL via `@neondatabase/serverless` — no ORM. All SQL functions are grouped by entity in `src/lib/db/queries/`.

The core study flow: upload files → AI extracts text → AI generates a topic plan → user edits/approves the plan → `start-studying` creates topics, embeddings, and per-topic chats. During chat, the AI retrieves relevant material chunks via pgvector similarity search (RAG).

Subscriptions use a free/pro model. Free users get a daily token budget with degraded model fallback before a hard cutoff. Pro users ($R 20/month via PIX) get a higher budget. University email addresses receive a promotional credit on first login.

See `CLAUDE.md` for full technical reference (API routes, DB schema, AI models, prompt templates, etc.).
