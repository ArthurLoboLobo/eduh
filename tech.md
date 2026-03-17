# Ditchy — Technical Specification

## Tech Stack

| Layer          | Choice                        |
| -------------- | ----------------------------- |
| Framework      | Next.js (full-stack)          |
| Frontend       | React (via Next.js)           |
| Backend        | Next.js API Routes            |
| Database       | Neon Postgres                 |
| File Storage   | Vercel Blob                   |
| Hosting        | Vercel                        |
| Email Service  | Resend                        |
| DB Queries     | Raw SQL via `@neondatabase/serverless` |
| Migrations     | `node-pg-migrate`              |
| Styling        | Tailwind CSS                   |

## Database Access

- **No ORM**. All database queries are written as raw SQL using `@neondatabase/serverless`'s `neon()` SQL tagged template, which handles parameterized queries (SQL injection prevention). Uses HTTP mode for single queries (faster in serverless) and WebSocket `Pool` for transactions.
- **Migrations** are managed with `node-pg-migrate`. Each migration is a plain SQL file stored in a migrations folder. The tool tracks which migrations have been applied via a tracking table in the database.

## Folder Structure

```
src/
  proxy.ts                        # Auth proxy (see below)
  app/
    (auth)/                     # Login/register + landing info (no navbar)
      page.tsx
      layout.tsx
    (main)/                     # Authenticated pages (navbar + breadcrumb)
      layout.tsx
      dashboard/page.tsx
      sections/[id]/page.tsx
      sections/[id]/chat/[chatId]/page.tsx
    api/                        # REST API routes (mirrors API Routes section)
      auth/...
      sections/...
      files/...
      topics/...
      chats/...
  components/
    ui/                         # Generic: Button, Modal, Spinner, Card, Input...
    ...                         # Feature-specific: SectionCard, TopicCard, ChatMessage, PlanEditor, Navbar, Breadcrumb...
  lib/
    db/
      connection.ts             # Neon Postgres connection
      queries/                  # SQL query functions grouped by entity (sections.ts, files.ts, messages.ts, etc.)
    i18n/                       # Translation strings (pt-BR.ts, en.ts) + useTranslation hook
    auth.ts                     # JWT signing/verification, cookie helpers
    ai.ts                       # LLM call wrappers (chat, extraction, plan generation, embedding)
  config/
    ai.ts                       # Tunable AI parameters
  prompts/
    index.ts                    # All prompt templates as named exports
db/
  migrations/                   # node-pg-migrate SQL migration files
```

- **Route groups**: `(auth)` and `(main)` use different layouts — auth has no navbar, main pages have navbar + breadcrumb.
- **Root page (`/`)**: For non-logged-in users, shows the login/register page with general information about the platform around the login form. Logged-in users are redirected to the dashboard.
- **API routes** follow the structure defined in the API Routes section below.
- **Migrations** live outside `src/` at the project root.
- **Proxy** (`src/proxy.ts`): Runs on every request. Verifies the JWT cookie and:
  - **Unauthenticated users** visiting `(main)/` routes → redirected to `/`.
  - **Authenticated users** visiting `/` → redirected to `/dashboard`.
  - **Unauthenticated API calls** to protected endpoints (everything except `/api/auth/*`) → returns 401.

## Environment Variables

| Variable                 | Description                        |
| ------------------------ | ---------------------------------- |
| `DATABASE_URL`                  | Neon Postgres pooled connection string   |
| `DATABASE_URL_UNPOOLED`         | Neon Postgres direct connection (for migrations) |
| `BLOB_READ_WRITE_TOKEN`        | Vercel Blob access token                 |
| `RESEND_API_KEY`                | Resend email service API key             |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google Gemini API key (default for `@ai-sdk/google`) |
| `JWT_SECRET`                    | Secret for signing JWTs                  |

## Authentication

- **Flow**: Email + OTP (one-time code sent via Resend).
- **OTP rules**:
  - Code is valid for 10 minutes.
  - Max 3 attempts per code. After 3 failed attempts, the user must request a new code.
- **Session**: HTTP-only cookie with a signed JWT, 30-day expiry. Stateless (no sessions table). Logout simply deletes the cookie.
- **Language preference**: Stored in a cookie (not in the database). Updated when the user switches language via the navbar dropdown.

## Client-Side Data Fetching

- Plain `fetch` for all API calls. No data fetching library (no SWR, React Query, etc.).
- Polling (file processing status, plan generation progress) uses `setInterval` with `fetch`.

## File Handling

### Supported File Types
- PDF, images (JPEG, PNG, etc.), TXT, DOCX, PPTX, and similar document formats.

### Storage
- Files are stored in **Vercel Blob**.
- **4 MB limit per file**, **10 MB limit per section** (total across all files in a section).
- **Upload flow** (server-side upload via `put()`):
  1. Client sends the file + `sectionId` to `POST /api/files` (multipart form data).
  2. Server validates: user is authenticated, section belongs to them, section is in "Uploading" status, file type is allowed, file is under 4 MB, adding this file wouldn't exceed the 10 MB section limit.
  3. Server uploads the file to Vercel Blob using `put()` from `@vercel/blob`.
  4. Server creates the file row in the database and returns it.
  5. Client immediately calls `POST /api/files/:id/process` to trigger text extraction.

### Processing (Text Extraction)
- Files are sent **directly to Gemini** as multimodal input — no image conversion step. Gemini natively handles PDF, TXT, DOCX, PPTX, JPEG, PNG, WEBP, and HEIF.
- The AI extracts:
  - All readable text (in Markdown)
  - Math formulas (converted to LaTeX)
  - Detailed descriptions of any images, diagrams, or non-text content
- Processing runs as a **background job** (`POST /api/files/:id/process`) with status polling from the client (`Uploading` → `Processing` → `Processed`). If extraction fails, the file status is set to `Error` and the user can retry.

> **Future optimization**: For plain text files or PDFs with selectable text, consider extracting text locally (via a library) to save on AI token costs, and only send scanned/image-heavy files to the AI.

## Background Jobs

- Study plan generation runs as a **self-chaining serverless function**.
- Each step is a separate API call that fits within Vercel's 60s function limit.
- **Chaining mechanism**: At the end of each step, the function fires a non-awaited `fetch()` call to its own API to trigger the next step, then returns. Vercel spins up a new function invocation for the next step. This means jobs complete even if the user closes the browser.
- **File processing**: Triggered by the client calling `POST /api/files/:id/process` immediately after `POST /api/files`. Processes one file per call. The client calls it once per file; multiple concurrent calls for different files are fine.
- **Plan generation**: The first step is triggered by `POST /api/sections/:id/start-planning`. Each step processes one batch (current plan + next batch → updated plan), then self-calls for the next batch. Stops after the last batch.
- The client polls for status updates (no WebSockets/SSE).
- This approach avoids the need for external queue services (QStash, Inngest, etc.) and works on Vercel's free tier.

## Internationalization

- Supported languages from launch: **English** and **Brazilian Portuguese** (pt-BR, default).
- LLM language rules (in priority order):
  1. Match the language of the user's last message.
  2. If unclear, match the language of the uploaded materials.
  3. If still unclear, fall back to the user's selected language (stored in cookie).

## LLM

### Provider & Models

- **Provider**: Google Gemini (official SDK).
- **Embedding model**: `gemini-embedding-001`
- Model identifiers are defined in a single config file (`config/ai.ts`) so they can be swapped by changing one constant.

| Task                          | Model                            |
| ----------------------------- | -------------------------------- |
| Teaching chat (topic & revision) | `gemini-3-flash-preview` |
| Text extraction               | `gemini-3-flash-preview`          |
| Study plan generation         | `gemini-3-flash-preview`          |
| Chat summarization            | `gemini-3-flash-preview`          |

### Config File (`config/ai.ts`)

A single configuration file containing all tunable AI parameters:
- Model identifiers (per task)
- Batch size (tokens/chars) for plan generation
- Chunk size for RAG (1000 tokens)
- Chunk overlap (100 tokens)
- Top N chunks returned per search tool call (4)
- Token threshold for summary + message history size (triggers summarization when exceeded)
- Rate limit (max messages per minute per user)

### Prompts File

A single file containing all prompt templates, each exported as a named constant:
- Text extraction prompt
- Study plan generation prompt (per-batch)
- Topic chat system prompt
- Revision chat system prompt (similar to topic chat, but for all topics rather than one)
- Chat summarization prompt
- Any other fixed LLM instructions

All prompts are hardcoded in the codebase. When a prompt is needed, it is imported from this file.

### Study Plan Generation

- Runs as a **background job** with status polling.
- Uses a **sequential batch approach**:
  1. All extracted text from the section's files is split into batches according to a max token/char limit (defined in config).
  2. The first batch is sent to the LLM with no existing plan — the LLM creates an initial plan from scratch.
  3. Each subsequent batch is sent together with the current plan. The LLM outputs an updated plan incorporating the new material.
  4. After the last batch is processed, the resulting plan is the final study plan.
- The LLM returns the plan as **structured JSON** (easy to parse and store directly in the database).

### RAG (Retrieval-Augmented Generation)

- Extracted text from uploaded files is split into **~1000 token chunks with ~100 token overlap**.
- Chunks are embedded using `gemini-embedding-001` and stored in **pgvector** (via the pgvector extension on Neon Postgres).
- Chunks are stored alongside metadata (section ID, source file name, chunk index) for filtering.

### Topic Chat

#### Context
- **System prompt** includes:
  - The full study plan with completion status for each topic.
  - The current topic and its subtopics (so the LLM knows what to teach).
  - Pedagogical instructions on how to teach.
  - Language rules (see Internationalization section).
- **File contents are NOT included** in the base context. The LLM retrieves relevant content on demand via the search tool.

#### Tool: `searchFiles`
- The LLM decides when to call this tool (e.g., when it needs to reference uploaded material, find an exam question, etc.).
- **Parameters**: `query` (string) — a natural language search query.
- **Behavior**: The query is embedded, searched against the section's chunks in pgvector, and the top 4 most relevant chunks are returned to the LLM.
- Implementation uses the Vercel AI SDK's tool calling system:
  - Define the tool schema (name, description, parameters).
  - The SDK manages the back-and-forth: LLM requests tool call → server executes → result goes back to LLM → LLM continues its response.

#### Streaming
- Chat responses are **streamed token-by-token** to the client using the Vercel AI SDK's streaming support.
- Streaming is used for both topic chats and the revision chat.

#### Long Conversations & Summarization
- When the combined token size of the **summary + message history** exceeds a configurable threshold (defined in `config/ai.ts`), older messages are **summarized** using Flash Lite.
- The summary replaces the older messages in the context. The number of recent messages kept in full is **dynamic based on token count**, but **at least the last 2 messages** are always kept unsummarized.
- The summary is **cumulative**: each new summarization includes the previous summary + the newly summarized messages, producing one updated summary.

#### Message Undo
- Messages are stored as **individual rows** in the database (not a JSON array).
- Undo is supported only for messages that have **not been summarized** (i.e., the last N messages still in full context).
- When the user clicks the undo button (↩) on a message, the conversation reverts to the state before that message, and the message text is placed back in the input box.

### Revision Chat

- A special chat at the end of the topic list, for general questions across all topics in the section.
- Uses the same tools (`searchFiles`) with access to the same file chunks as topic chats.
- Has its own separate system prompt (similar to the topic chat prompt, but framed for general revision rather than a specific topic).

### Rate Limiting

- Users are limited to a **max number of messages per minute** (defined in config).
- If the limit is exceeded, a message appears asking the student to wait one minute before sending another message.

### Error Handling

- If an LLM call fails (network error, rate limit from Google, etc.), the UI shows an **error message with a "Retry" button**.
- No silent auto-retry.

### Limits

- **Max 10 sections per user**. To create more, the user must delete an existing section.
- **10 MB file limit per section** (defined in File Handling).

### File Preview

- The file preview modal in the Uploading phase shows the **original file** (rendered PDF, displayed image, etc.), not the extracted text.

## Database Schema

All tables use UUID primary keys and `created_at` timestamps. Messages use serial integer IDs for guaranteed ordering.

- **Cascade deletes**: All foreign keys use `ON DELETE CASCADE`, so deleting a section automatically removes its files, topics, subtopics, chats, messages, summaries, embeddings, and plan drafts. Vercel Blob files must be deleted explicitly in the API route (since Blob is external to the DB).
- **Chat creation**: Chats are created **lazily** — when the user first opens a topic's chat (or the revision chat), the API checks if a chat row exists. If not, it creates one and generates the initial AI introductory message.

### `users`
| Column       | Type      | Notes                     |
| ------------ | --------- | ------------------------- |
| `id`         | UUID (PK) | Default: `gen_random_uuid()` |
| `email`      | TEXT      | Unique                    |
| `created_at` | TIMESTAMP | Default: `now()`          |

### `otp_codes`
| Column       | Type      | Notes                          |
| ------------ | --------- | ------------------------------ |
| `id`         | UUID (PK) |                                |
| `user_id`    | UUID (FK) | References `users.id`          |
| `code`       | TEXT      | The OTP code                   |
| `attempts`   | INTEGER   | Default: 0, max 3              |
| `expires_at` | TIMESTAMP | `created_at` + 10 minutes      |
| `created_at` | TIMESTAMP |                                |

### `sections`
| Column        | Type      | Notes                                          |
| ------------- | --------- | ---------------------------------------------- |
| `id`          | UUID (PK) |                                                |
| `user_id`     | UUID (FK) | References `users.id`                          |
| `name`        | TEXT      |                                                |
| `description` | TEXT      | Nullable                                       |
| `status`      | TEXT      | `uploading` / `planning` / `studying`          |
| `plan_total_batches`     | INTEGER   | Nullable. Total batches for plan generation. Set when planning starts. |
| `plan_processed_batches` | INTEGER   | Nullable. Number of batches processed so far. |
| `created_at`  | TIMESTAMP |                                                |

### `files`
| Column           | Type      | Notes                                      |
| ---------------- | --------- | ------------------------------------------ |
| `id`             | UUID (PK) |                                            |
| `section_id`     | UUID (FK) | References `sections.id`                   |
| `blob_url`       | TEXT      | Vercel Blob URL                            |
| `original_name`  | TEXT      | Original file name                         |
| `file_type`      | TEXT      | MIME type or extension                     |
| `size_bytes`     | INTEGER   |                                            |
| `status`         | TEXT      | `uploading` / `processing` / `processed` / `error` |
| `extracted_text`  | TEXT      | Full concatenated extraction result        |
| `created_at`     | TIMESTAMP |                                            |

### `plan_drafts`
| Column        | Type      | Notes                              |
| ------------- | --------- | ---------------------------------- |
| `id`          | UUID (PK) |                                    |
| `section_id`  | UUID (FK) | References `sections.id`           |
| `plan_json`   | JSONB     | Full study plan as structured JSON |
| `created_at`  | TIMESTAMP | Newest = current draft             |

- The current draft is the row with the highest `created_at` for a given section.
- **Undo** = delete the newest draft; the previous one becomes current.
- **Regenerate Plan** = create a new draft row with the regenerated plan. Old drafts remain, so undo can walk back through regenerations.
- When the user clicks "Start Studying", the current draft's `plan_json` is written into the `topics` and `subtopics` tables. All drafts for the section are then deleted.

### `plan_batches`
| Column        | Type      | Notes                              |
| ------------- | --------- | ---------------------------------- |
| `id`          | UUID (PK) |                                    |
| `section_id`  | UUID (FK) | References `sections.id`           |
| `batch_index` | INTEGER   | Sequential index (0, 1, 2, ...)    |
| `content`     | TEXT      | Text content for this batch        |

- Stores pre-split text batches during plan generation so each chained function call can retrieve the next batch by index.
- Deleted after generation completes.

### `topics`
| Column         | Type      | Notes                              |
| -------------- | --------- | ---------------------------------- |
| `id`           | UUID (PK) |                                    |
| `section_id`   | UUID (FK) | References `sections.id`           |
| `title`        | TEXT      |                                    |
| `order`        | INTEGER   | Display/study order                |
| `is_completed` | BOOLEAN   | Default: false. Topics marked "Already Known" during planning start as true. |
| `created_at`   | TIMESTAMP |                                    |

### `subtopics`
| Column     | Type      | Notes                      |
| ---------- | --------- | -------------------------- |
| `id`       | UUID (PK) |                            |
| `topic_id` | UUID (FK) | References `topics.id`     |
| `text`     | TEXT      |                            |
| `order`    | INTEGER   | Display order within topic |

### `chats`
| Column       | Type      | Notes                                          |
| ------------ | --------- | ---------------------------------------------- |
| `id`         | UUID (PK) |                                                |
| `section_id` | UUID (FK) | References `sections.id`                       |
| `topic_id`   | UUID (FK) | Nullable. References `topics.id`. Null = revision chat. |
| `type`       | TEXT      | `topic` / `revision`                           |
| `created_at` | TIMESTAMP |                                                |

- Exactly one chat per topic, and one revision chat per section.

### `messages`
| Column       | Type         | Notes                              |
| ------------ | ------------ | ---------------------------------- |
| `id`         | SERIAL (PK)  | Auto-incrementing for guaranteed ordering |
| `chat_id`    | UUID (FK)    | References `chats.id`              |
| `role`       | TEXT         | `user` / `assistant`               |
| `content`    | TEXT         |                                    |
| `created_at` | TIMESTAMP    |                                    |

### `chat_summaries`
| Column                      | Type      | Notes                                    |
| --------------------------- | --------- | ---------------------------------------- |
| `id`                        | UUID (PK) |                                          |
| `chat_id`                   | UUID (FK) | References `chats.id`                    |
| `summary_text`              | TEXT      | Cumulative summary of older messages     |
| `summarized_up_to_message_id` | INTEGER | References `messages.id` — all messages up to this ID are summarized |
| `created_at`                | TIMESTAMP |                                          |

- One summary row per chat (updated in place as more messages are summarized).
- Undo is only supported for messages with `id` > `summarized_up_to_message_id`.

### `embeddings`
| Column        | Type         | Notes                              |
| ------------- | ------------ | ---------------------------------- |
| `id`          | UUID (PK)    |                                    |
| `section_id`  | UUID (FK)    | References `sections.id`           |
| `file_id`     | UUID (FK)    | References `files.id`              |
| `chunk_index` | INTEGER      | Order of chunk within the file     |
| `chunk_text`  | TEXT         | The text content of this chunk     |
| `embedding`   | VECTOR(1536) | pgvector column (`gemini-embedding-001` with `outputDimensionality=1536`) |
| `created_at`  | TIMESTAMP    |                                    |

## API Routes

All routes are REST. Protected routes require a valid JWT in the HTTP-only cookie.

### Authentication
| Method | Route                  | Description                          |
| ------ | ---------------------- | ------------------------------------ |
| POST   | `/api/auth/send-code`  | Send OTP code to email via Resend    |
| POST   | `/api/auth/verify-code`| Verify OTP code, return JWT cookie   |
| POST   | `/api/auth/logout`     | Delete JWT cookie                    |

### Sections
| Method | Route                          | Description                              |
| ------ | ------------------------------ | ---------------------------------------- |
| GET    | `/api/sections`                | List all sections for the current user   |
| POST   | `/api/sections`                | Create a new section (enforces 10 max)   |
| GET    | `/api/sections/:id`            | Get section details + status             |
| DELETE | `/api/sections/:id`            | Delete section and all related data      |

### Files
| Method | Route                              | Description                                          |
| ------ | ---------------------------------- | ---------------------------------------------------- |
| GET    | `/api/sections/:id/files`          | List files in a section                              |
| POST   | `/api/files`                       | Upload file to Blob, create DB record                |
| POST   | `/api/files/:id/process`           | Trigger text extraction for a single file            |
| DELETE | `/api/files/:id`                   | Remove file from section and Blob                    |

### Planning
| Method | Route                                  | Description                                     |
| ------ | -------------------------------------- | ----------------------------------------------- |
| POST   | `/api/sections/:id/start-planning`     | Transition section to planning, trigger plan generation |
| GET    | `/api/sections/:id/plan`               | Get the current plan draft                       |
| PUT    | `/api/sections/:id/plan`               | Save a new plan draft (after user edit)          |
| POST   | `/api/sections/:id/plan/undo`          | Delete the newest draft (undo)                   |
| POST   | `/api/sections/:id/plan/regenerate`    | Regenerate plan with optional guidance text      |
| GET    | `/api/sections/:id/plan/status`        | Poll planning job status (generating / ready) + batch progress as percentage |
| POST   | `/api/sections/:id/start-studying`     | Finalize plan, write to topics/subtopics, transition to studying |

### Topics
| Method | Route                          | Description                              |
| ------ | ------------------------------ | ---------------------------------------- |
| GET    | `/api/sections/:id/topics`     | List topics with completion status       |
| PATCH  | `/api/topics/:id`              | Toggle `is_completed`                    |

### Chat
| Method | Route                          | Description                              |
| ------ | ------------------------------ | ---------------------------------------- |
| POST   | `/api/sections/:id/chats`      | Find or create a chat (`{ topicId }` or `{ type: 'revision' }`) |
| GET    | `/api/chats/:id/messages`      | Get chat messages (summary + recent)     |
| POST   | `/api/chats/:id/messages`      | Send a message, get streamed AI response |
| POST   | `/api/chats/:id/undo/:messageId` | Undo to before a specific message       |

### Processing Status (Polling)
| Method | Route                              | Description                              |
| ------ | ---------------------------------- | ---------------------------------------- |
| GET    | `/api/sections/:id/files/status`   | Poll file processing statuses            |
