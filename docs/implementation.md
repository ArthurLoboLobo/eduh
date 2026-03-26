# Eduh — Implementation Reference

This document describes how each feature is implemented. If you have any doubt about how something works, refer to this file.

---

## Authentication

### Flow
Email + OTP (one-time code sent via Resend). No passwords.

1. User enters email on the auth page (`/`).
2. `POST /api/auth/send-code` — validates email, finds or creates user, generates a random 6-digit code, stores it in `otp_codes` (10-minute expiry), sends it via Resend. Rate limited: max 1 code per 60 seconds (returns 429 with `retryAfterSeconds`).
3. User enters the code. `POST /api/auth/verify-code` — validates code (not expired, < 3 attempts, correct match). On success: deletes all OTP codes for the user, signs a JWT, sets an HTTP-only cookie.
4. JWT is signed with `jose` (HS256), 30-day expiry. Cookie name: `eduh_token` (httpOnly, secure, sameSite=lax).
5. `POST /api/auth/logout` — deletes the cookie.

### Proxy (`src/proxy.ts`)
Runs on every request:
- Unauthenticated users visiting `(main)/` routes → redirected to `/`.
- Authenticated users visiting `/` → redirected to `/dashboard`.
- Unauthenticated API calls to non-auth endpoints → 401.

### Language Preference
Stored in a cookie (`eduh_language`), not in the database. Default: `pt-BR`. Updated via the navbar language switcher.

---

## Dashboard

### API
- `GET /api/sections` — lists all sections for the user with `total_topics` and `completed_topics` counts.
- `POST /api/sections` — creates a section (max 10 per user, error: `MAX_SECTIONS_REACHED`). Requires `name`, optional `description`. Section starts in `uploading` status.
- `GET /api/sections/:id` — returns section details (ownership verified).
- `DELETE /api/sections/:id` — deletes section, removes all files from Vercel Blob, cascades DB delete.

### Page (`src/app/(main)/dashboard/page.tsx`)
- Top bar: search input (client-side name filtering) + "Create new Section" button.
- Grid of section cards (3 columns on desktop, responsive). Each card shows: name, description, creation date, status badge, progress (studying only), delete button with confirmation dialog.
- Create section opens a modal with name and description fields.
- Clicking a card navigates to `/sections/[id]`.

---

## File Upload & Processing

### Upload Flow
1. Client sends file + `sectionId` to `POST /api/files` (multipart form data).
2. Server validates: ownership, section in `uploading` status, allowed MIME type (`application/pdf`, `text/plain`, `image/jpeg`, `image/png`, `image/webp`, `image/heif`, `image/heic`), file ≤ 4 MB, section total ≤ 10 MB.
3. Server uploads to Vercel Blob at `{sectionId}/{filename}` using `put()`.
4. Server creates file row with status `uploading`, returns it.
5. Client immediately calls `POST /api/files/:id/process` to trigger text extraction.

### Text Extraction (`POST /api/files/:id/process`)
1. Updates file status to `processing`.
2. Downloads raw bytes from Vercel Blob.
3. Sends file directly to Gemini as multimodal input (no conversion needed — Gemini handles PDF, images, text natively).
4. Uses `extractTextFromFile(fileBuffer, mimeType)` from `src/lib/ai.ts` with model `gemini-3.1-flash-lite-preview`.
5. Prompt instructs AI to extract: all text (Markdown), math formulas (LaTeX), image/diagram descriptions.
6. On success: saves extracted text, sets status `processed`. On failure: sets status `error`.
7. Client can retry failed files by calling the endpoint again.

### Polling
Client polls `GET /api/sections/:id/files/status` every 3 seconds to update file statuses.

### File Preview
Modal shows the original file — PDF in iframe, images displayed directly. Unsupported types show a message.

### Uploading UI (`src/components/UploadingView.tsx`)
- Drag-and-drop upload zone with dashed border.
- File list with status badges, preview on click, delete, retry for errors.
- "Start Planning" button enabled only when all files are `processed` and at least one file exists.

---

## Study Plan Generation

### Generation Flow (`POST /api/sections/:id/start-planning`)
1. Validates section is in `uploading` status, all files are processed.
2. Changes section status to `planning`.
3. Gathers all extracted text via `getExtractedTexts(sectionId)`.
4. Calls `generatePlan(allText)` — sends all text to `gemini-3-flash-preview` with `PLAN_GENERATION_PROMPT`. Uses `generateObject()` with a schema to return structured JSON.
5. Validates the result against `PlanJSON` schema.
6. On success: creates a `plan_drafts` row. On failure: reverts status to `uploading`.

### PlanJSON Structure
```typescript
type PlanJSON = {
  topics: {
    title: string;
    subtopics: string[];
    isKnown?: boolean; // only set by user edits, never by AI
  }[];
};
```

### Plan Editing (Draft Stack)
Each edit creates a new `plan_drafts` row. The current plan is always the newest draft (highest `created_at`).

- `PUT /api/sections/:id/plan` — saves a new draft after user edits. Validates PlanJSON. Text edits save on blur (one draft per edit session). Structural changes (delete, reorder, create, mark as known) save immediately.
- `POST /api/sections/:id/plan/undo` — deletes the newest draft, revealing the previous one. Requires at least 2 drafts.
- `POST /api/sections/:id/plan/regenerate` — requires `guidance` text. Calls `regeneratePlan(allText, guidance, currentPlan)` which passes the current plan to the AI for targeted modifications. Creates a new draft on top of the existing stack.

### Planning UI (`src/components/PlanningView.tsx`)
- Loading state: spinner with message while plan generates.
- Plan editor: vertical list of topic cards with drag-and-drop reordering (`@dnd-kit`).
- Each topic card: drag handle, inline-editable title, "Already Known" checkbox, delete button (hover), subtopics (inline-editable, reorderable, deletable, addable).
- Buttons: Undo (disabled when only 1 draft), Regenerate (requires guidance text input), Start Studying.
- All edits use pessimistic updates: UI waits for server response, controls disabled during requests.

---

## Start Studying Transition

`POST /api/sections/:id/start-studying` performs all of the following in sequence:

1. Verifies ownership, section in `planning` status, plan draft exists with at least 1 topic.
2. Creates `topics` and `subtopics` rows from the plan via `createTopicsFromPlan()` (transactional). Topics with `isKnown: true` get `is_completed = true`.
3. Chunks all extracted text: `chunkText()` splits into ~512 token chunks with ~100 token overlap, breaking at paragraph/line/space boundaries.
4. Embeds all chunks using `embedTexts(chunks, 'RETRIEVAL_DOCUMENT')` with `gemini-embedding-2-preview` (1536 dimensions).
5. Stores embeddings in `pgvector` via `createEmbeddings()` (transactional).
6. Creates all chats via `createChatsForSection(sectionId, topicIds)` — one `topic` chat per topic + one `revision` chat (transactional).
7. Deletes all plan drafts (cleanup).
8. Changes section status to `studying`.

---

## Studying Section

### API
- `GET /api/sections/:id/topics` — returns all topics with subtopics, `chat_id`, user message count, progress (`completed`/`total`), and `revisionChatId`.
- `PATCH /api/topics/:id` — toggles `is_completed`.

### Studying UI (`src/components/StudyingView.tsx`)
- Progress widget: completion percentage, progress bar, "X / Y topics completed".
- Vertical timeline of topic cards (desktop: vertical line connecting nodes, each node is a numbered circle).
- Topic card shows: title, subtopics, interaction count (user messages), completion checkbox.
- Visual states: completed (dimmed, checkmark node), next to study (blue glow, accent border), other (neutral).
- Clicking a card navigates to `/sections/[id]/chat/[chatId]`.
- Revision chat card at the bottom with sparkles icon.

---

## Chat

### Initial AI Message
When `GET /api/chats/:id/messages` finds an empty chat:
1. Reads user language from `eduh_language` cookie.
2. Selects the appropriate fake user message template (topic/revision × pt-BR/en).
3. Calls the LLM with the system prompt + fake user message (not persisted).
4. Saves only the AI response as the first assistant message.
5. The fake user message sets the response language naturally via the system prompt's language rules.

### Sending Messages (`POST /api/chats/:id/messages`)
1. Rate limit check: `getMessageCountLastMinute(userId)`, max 10/min (429 if exceeded).
2. Saves user message to DB.
3. Builds LLM context:
   - System prompt (topic or revision, built from chat/section/topic data).
   - Previous summary (if any) injected as system context.
   - Unsummarized messages (after `summarized_up_to_message_id`).
4. Calls `streamText()` with model `gemini-3.1-pro-preview`, `maxSteps: 3` (allows tool calls), and `searchStudentMaterials` tool.
5. Streams response to client via Vercel AI SDK data stream protocol.
6. On finish: saves assistant message (text only, not tool steps), checks summarization.

### RAG (searchStudentMaterials Tool)
- Defined in `createSearchStudentMaterialsTool(sectionId)` in `src/lib/ai.ts`.
- When the LLM calls this tool with a `query` string:
  1. Embeds the query with `embedText(query, 'RETRIEVAL_QUERY')`.
  2. Searches `embeddings` table via cosine distance (`<=>` operator), filtered by `section_id`, returns top 4 chunks.
  3. Returns chunk texts joined by `\n\n---\n\n`.

### Chat Summarization
After saving each assistant message:
1. Estimates token count: `(summaryText.length + unsummarizedMessages.length) / 4`.
2. If > 30,000 tokens and > 5 unsummarized messages:
   - Summarizes older messages (all except last 5) using `summarizeChat()` with model `gemini-3-flash-preview`.
   - Upserts cumulative summary in `chat_summaries`.
3. Summary is cumulative: each summarization includes the previous summary + newly summarized messages.

### Message Undo (`POST /api/chats/:id/undo/:messageId`)
1. Validates the message is a `user` role message.
2. Checks it hasn't been summarized (id > `summarized_up_to_message_id`).
3. Deletes the message and all subsequent messages.
4. Returns the message content (client restores it to the input field).
5. Client updates `useChat` state via `setMessages()`.

### Chat UI (`src/app/(main)/sections/[id]/chat/[chatId]/page.tsx`)
- Uses `useChat` from `@ai-sdk/react` for message state and streaming.
- User messages: right-aligned bubble, undo button on hover.
- Assistant messages: left-aligned, no bubble, rendered with `react-markdown` + `remark-math` + `rehype-katex` + `react-syntax-highlighter`.
- Tool indicator: shows "Searching study materials" with animated dots when RAG tool is active.
- Input: auto-growing textarea, Enter sends, Shift+Enter for newlines, send button icon.
- The `summarizedUpToMessageId` is returned by the GET endpoint so the client hides undo buttons for summarized messages.

---

## Internationalization

### Setup (`src/lib/i18n/`)
- `useTranslation()` hook reads `eduh_language` cookie (default: `pt-BR`).
- Returns `{ t, language, setLanguage }`.
- SSR-safe: starts with `pt-BR`, syncs to cookie after hydration.
- Custom event `eduh:language-change` for cross-component sync.
- Translation files: `pt-BR.ts` and `en.ts` with keys organized by section (`auth`, `nav`, `dashboard`, `section`, `uploading`, `planning`, `studying`, `chat`, `errors`).

### LLM Language Rules (priority order)
1. Match the language of the user's last message.
2. If unclear, match the language of the uploaded materials.
3. Fall back to the user's selected language (cookie).

---

## AI Call Logging

### Database
Table `ai_call_logs` with columns: `id`, `label`, `model`, `input_tokens`, `output_tokens`, `input_text`, `output_text`, `user_id`, `section_id`, `duration_ms`, `created_at`. Index on `created_at`.

### Logging Points
All AI functions in `src/lib/ai.ts` are wrapped to log after completion (fire-and-forget, never blocks):

| Label | Call Site | Frequency |
|-------|-----------|-----------|
| `plan-generation` | `generatePlan()` | Once per section |
| `plan-regeneration` | `regeneratePlan()` | User-triggered |
| `text-extraction` | `extractTextFromFile()` | Once per uploaded file |
| `chat-summarization` | `summarizeChat()` | When token threshold exceeded |
| `embed-single` | `embedText()` | Per RAG query (tool call) |
| `embed-batch` | `embedTexts()` | Once per section (all chunks) |
| `chat-initial-greeting` | GET messages route | Once per chat first load |
| `chat-stream` | POST messages route | Every user message |

`user_id` and `section_id` are only populated in the messages route (both values already in scope). The `ai.ts` wrappers pass null for these.

### Admin Dashboard (`src/app/(main)/admin/ai-logs/page.tsx`)
- Protected by `isAdmin(userId)` — compares user email against `ADMIN_EMAIL` env var. Returns 404 if not admin.
- Summary table grouped by label: count, total input/output tokens, cost score (`input_tokens + 6 × output_tokens`), average duration.
- Paginated list of recent calls with expandable input/output text.
- Date range filtering via query params (`?from=&to=`). Defaults to last 7 days.

---

## Ownership Verification Pattern

Each entity has a dedicated ownership query that resolves the ownership chain via JOINs:
- `verifySectionOwnership(sectionId, userId)` — sections.ts
- `verifyFileOwnership(fileId, userId)` — files.ts (joins files → sections)
- `verifyTopicOwnership(topicId, userId)` — topics.ts (joins topics → sections)
- `verifyChatOwnership(chatId, userId)` — chats.ts (joins chats → sections)

API routes call the ownership check first, return 404 if it fails, then proceed with the actual operation. Queries themselves don't embed ownership checks.

---

## Database

### Tables (12 total, UUIDs, CASCADE deletes)

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `users` | email (unique) | |
| `otp_codes` | user_id FK, code, attempts, expires_at | Max 3 attempts, 10-min expiry |
| `sections` | user_id FK, name, description, status | Status: uploading/planning/studying |
| `files` | section_id FK, blob_url, original_name, file_type, size_bytes, status, extracted_text | Status: uploading/processing/processed/error |
| `plan_drafts` | section_id FK, plan_json (JSONB) | Newest = current draft |
| `topics` | section_id FK, title, order, is_completed | |
| `subtopics` | topic_id FK, text, order | |
| `chats` | section_id FK, topic_id FK (nullable), type | Type: topic/revision |
| `messages` | SERIAL id, chat_id FK, role, content | Serial for guaranteed ordering |
| `chat_summaries` | chat_id FK, summary_text, summarized_up_to_message_id | One per chat, updated in place |
| `embeddings` | section_id FK, file_id FK, chunk_index, chunk_text, embedding VECTOR(1536) | HNSW index with cosine distance |
| `ai_call_logs` | label, model, input/output tokens, input/output text, user_id, section_id, duration_ms | Fire-and-forget logging |

### Migrations (7 files in `db/migrations/`)
1. Enable pgvector extension
2. Users + OTP codes
3. Sections + files
4. Plan drafts
5. Topics, subtopics, chats, messages, chat summaries
6. Embeddings (with HNSW index)
7. AI call logs

### Connection (`src/lib/db/connection.ts`)
Uses `@neondatabase/serverless` HTTP mode (`neon()`) for single queries. Supports `sql.transaction(queries)` for multi-query transactions.

---

## API Routes Summary

### Authentication
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/send-code` | Send OTP email |
| POST | `/api/auth/verify-code` | Verify OTP, set JWT cookie |
| POST | `/api/auth/logout` | Clear auth cookie |

### Sections
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/sections` | List sections with progress |
| POST | `/api/sections` | Create section (max 10) |
| GET | `/api/sections/:id` | Get section details |
| DELETE | `/api/sections/:id` | Delete section + Blob files |

### Files
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/sections/:id/files` | List files |
| GET | `/api/sections/:id/files/status` | Poll processing statuses |
| POST | `/api/files` | Upload file |
| POST | `/api/files/:id/process` | Trigger text extraction |
| DELETE | `/api/files/:id` | Delete file + Blob |

### Planning
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/sections/:id/start-planning` | Generate plan, transition to planning |
| GET | `/api/sections/:id/plan` | Get current plan draft |
| PUT | `/api/sections/:id/plan` | Save plan edit (new draft) |
| POST | `/api/sections/:id/plan/undo` | Undo last edit |
| POST | `/api/sections/:id/plan/regenerate` | AI regenerate with guidance |
| POST | `/api/sections/:id/start-studying` | Finalize plan, create topics/embeddings/chats |

### Topics
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/sections/:id/topics` | List topics with chat info + progress |
| PATCH | `/api/topics/:id` | Toggle completion |

### Chat
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/chats/:id/messages` | Load messages (generates initial AI message on first load) |
| POST | `/api/chats/:id/messages` | Send message (streaming) |
| POST | `/api/chats/:id/undo/:messageId` | Undo user message |
