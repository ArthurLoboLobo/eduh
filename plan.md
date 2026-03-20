# Ditchy — Implementation Plan

This document describes every phase needed to build Ditchy from scratch, in order. Each phase must be fully completed before moving to the next one, as later phases depend on earlier ones.

The default language of the platform is **Brazilian Portuguese**. English is the secondary language, available via the language switcher.

---

## Ownership Verification Pattern

Database query functions do **not** embed ownership checks. Instead, each entity has a dedicated ownership verification query, and API routes call it explicitly before proceeding with the actual operation.

- **`verifySectionOwnership(sectionId, userId)`** — returns `true` if the section belongs to the user. Lives in `sections.ts`.
- **`verifyFileOwnership(fileId, userId)`** — joins `files → sections` to check the user owns the file's section. Lives in `files.ts`.
- **`verifyTopicOwnership(topicId, userId)`** — joins `topics → sections` to check the user owns the topic's section. Lives in `topics.ts`.
- **`verifyChatOwnership(chatId, userId)`** — joins `chats → sections` to check the user owns the chat's section. Lives in `chats.ts`.

Each entity has its own ownership query that internally resolves the ownership chain. API routes call a single function without needing to know the parent hierarchy.

**API route pattern:**
1. Authenticate (extract `userId` from JWT).
2. Call the relevant ownership check (e.g., `verifySectionOwnership`). Return 404 if it fails.
3. Call the data query (e.g., `getSection(sectionId)` — no `userId` parameter).

This keeps queries single-purpose, reusable in internal contexts (e.g., background jobs), and makes the ownership boundary explicit at the route level.

---

## Phase 1 — Project Setup

### 1.1 Initialize the Next.js project
- Run `npx create-next-app@latest` with TypeScript, App Router, Tailwind CSS, and ESLint enabled.
- Remove all boilerplate content (default page content, sample styles, icons).

### 1.2 Install dependencies
- `@neondatabase/serverless` — database queries (HTTP mode for single queries, WebSocket `Pool` for transactions)
- `@vercel/blob` — file storage
- `node-pg-migrate` — database migrations
- `jose` — JWT signing and verification (lightweight, no native dependencies, works in all Next.js runtimes)
- `resend` — email sending
- `ai` and `@ai-sdk/google` — Vercel AI SDK for streaming, tool calling, and embeddings (covers all Gemini interactions — no need for `@google/genai` separately)
- Any other utility packages needed (e.g., `uuid` if not using `crypto.randomUUID()`)

### 1.3 Configure Tailwind CSS
- Set up the custom color palette as CSS variables in `src/app/globals.css` using the `@theme inline` block (Tailwind v4 — no `tailwind.config.js` extend):
  - `background: #191B1F`
  - `surface: #21242B`
  - `border: #2D3140`
  - `border-hover: #3A3F52`
  - `primary-text: #E4E6EB`
  - `muted-text: #8B90A0`
  - `accent-blue: #2B5CE6`
  - `accent-blue-hover: #3451D1`
  - `success-green: #3D8B5E`
  - `danger-red: #D94444`
- Configure the Geist font (install `geist` npm package, set up in the root layout).
- Dark mode only — set `#191B1F` as the default body background and `#E4E6EB` as the default text color.

### 1.4 Create the folder structure
Create all directories following the structure defined in `tech.md`:
```
src/
  proxy.ts
  app/
    (auth)/
      page.tsx
      layout.tsx
    (main)/
      layout.tsx
      dashboard/page.tsx
      sections/[id]/page.tsx
      sections/[id]/chat/[chatId]/page.tsx
    api/
      auth/
      sections/
      files/
      topics/
      chats/
  components/
    ui/
  lib/
    db/
      connection.ts
      queries/
    auth.ts
    ai.ts
  config/
    ai.ts
  prompts/
    index.ts
db/
  migrations/
```
Place empty placeholder files where needed so the structure exists from the start.

### 1.5 Environment variables
- Create a `.env.local` file with placeholders for all required variables:
  - `DATABASE_URL`
  - `DATABASE_URL_UNPOOLED`
  - `BLOB_READ_WRITE_TOKEN`
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL` — sender address (use `onboarding@resend.dev` for Resend free tier; set to your verified domain in production)
  - `GOOGLE_GENERATIVE_AI_API_KEY`
  - `JWT_SECRET`
- Add `.env.local` to `.gitignore` (Next.js does this by default).

### 1.6 Vercel project
- Create a new Vercel project linked to the Git repository.
- Install the Neon integration from the Vercel Marketplace — this gives you `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
- Provision Vercel Blob — this gives you the `BLOB_READ_WRITE_TOKEN`.
- Add all environment variables to the Vercel project settings.

---

## Phase 2 — Database

### 2.1 Set up node-pg-migrate
- Add a migration script to `package.json` pointing to the `db/migrations/` folder.
- Configure it to use the `DATABASE_URL_UNPOOLED` environment variable (direct connection, required for DDL/migrations).
- Run a test migration to confirm the connection works and the tracking table (`pgmigrations`) is created.

### 2.2 Enable pgvector
- Create the first migration that runs `CREATE EXTENSION IF NOT EXISTS vector;` to enable the pgvector extension on the database.

### 2.3 Create all tables
Write migration files that create the tables in dependency order:

1. **`users`** — `id` (UUID PK, default `gen_random_uuid()`), `email` (TEXT, UNIQUE), `created_at` (TIMESTAMP, default `now()`).
2. **`otp_codes`** — `id` (UUID PK), `user_id` (UUID FK → users, ON DELETE CASCADE), `code` (TEXT), `attempts` (INTEGER, default 0), `expires_at` (TIMESTAMP), `created_at` (TIMESTAMP).
3. **`sections`** — `id` (UUID PK), `user_id` (UUID FK → users, ON DELETE CASCADE), `name` (TEXT), `description` (TEXT, nullable), `status` (TEXT, default `'uploading'`), `created_at` (TIMESTAMP).
4. **`files`** — `id` (UUID PK), `section_id` (UUID FK → sections, ON DELETE CASCADE), `blob_url` (TEXT), `original_name` (TEXT), `file_type` (TEXT), `size_bytes` (INTEGER), `status` (TEXT, default `'uploading'`), `extracted_text` (TEXT, nullable), `created_at` (TIMESTAMP).
5. **`plan_drafts`** — `id` (UUID PK), `section_id` (UUID FK → sections, ON DELETE CASCADE), `plan_json` (JSONB), `created_at` (TIMESTAMP).
6. **`topics`** — `id` (UUID PK), `section_id` (UUID FK → sections, ON DELETE CASCADE), `title` (TEXT), `order` (INTEGER), `is_completed` (BOOLEAN, default false), `created_at` (TIMESTAMP).
8. **`subtopics`** — `id` (UUID PK), `topic_id` (UUID FK → topics, ON DELETE CASCADE), `text` (TEXT), `order` (INTEGER).
9. **`chats`** — `id` (UUID PK), `section_id` (UUID FK → sections, ON DELETE CASCADE), `topic_id` (UUID FK → topics, ON DELETE CASCADE, nullable), `type` (TEXT), `created_at` (TIMESTAMP).
10. **`messages`** — `id` (SERIAL PK), `chat_id` (UUID FK → chats, ON DELETE CASCADE), `role` (TEXT), `content` (TEXT), `created_at` (TIMESTAMP).
11. **`chat_summaries`** — `id` (UUID PK), `chat_id` (UUID FK → chats, ON DELETE CASCADE), `summary_text` (TEXT), `summarized_up_to_message_id` (INTEGER, references messages.id), `created_at` (TIMESTAMP).
12. **`embeddings`** — `id` (UUID PK), `section_id` (UUID FK → sections, ON DELETE CASCADE), `file_id` (UUID FK → files, ON DELETE CASCADE), `chunk_index` (INTEGER), `chunk_text` (TEXT), `embedding` (VECTOR(1536)), `created_at` (TIMESTAMP).

Add appropriate indexes:
- `embeddings.embedding` — IVFFlat or HNSW index for vector similarity search.
- `sections.user_id` — for listing a user's sections.
- `files.section_id` — for listing a section's files.
- `topics.section_id` — for listing a section's topics.
- `messages.chat_id` — for listing a chat's messages.
- Any other foreign key columns that will be queried frequently.

### 2.4 Database connection module
- Write `src/lib/db/connection.ts` — export a `sql` query function using `neon()` from `@neondatabase/serverless` for use in query files.

### 2.5 Run all migrations
- Run the migrations against the Neon Postgres database to confirm everything works.

---

## Phase 3 — Authentication

### 3.1 JWT utilities (`src/lib/auth.ts`)
- `signToken(userId: string): string` — signs a JWT with the user ID, 30-day expiry, using `JWT_SECRET`.
- `verifyToken(token: string): { userId: string } | null` — verifies and decodes the token, returns null if invalid/expired.
- `setAuthCookie(response, token)` — sets the HTTP-only, secure, SameSite cookie with the JWT.
- `removeAuthCookie(response)` — deletes the auth cookie.
- `getUserIdFromRequest(request): string | null` — extracts and verifies the JWT from the request cookies.

### 3.2 Proxy (`src/proxy.ts`)
- Runs on every request (use the `config.matcher` export to include all routes).
- Reads the JWT from the cookie and verifies it.
- **Unauthenticated users** visiting any `(main)/` route → redirect to `/`.
- **Authenticated users** visiting `/` → redirect to `/dashboard`.
- **Unauthenticated API calls** to any endpoint except `/api/auth/*` → return 401 JSON response.
- Authenticated requests continue normally.

### 3.3 Database queries (`src/lib/db/queries/users.ts`)
- `findUserByEmail(email)` — returns the user row or null.
- `createUser(email)` — inserts a new user and returns the row.
- `createOtpCode(userId, code, expiresAt)` — inserts a new OTP code.
- `getLatestOtpCode(userId)` — returns the most recent OTP code for the user.
- `incrementOtpAttempts(otpId)` — increments the attempts counter.
- `deleteOtpCodes(userId)` — deletes all OTP codes for a user (cleanup after successful verification).

### 3.4 API routes

#### `POST /api/auth/send-code`
- Receives `{ email, language }` in the request body. `language` is `'pt-BR'` or `'en'` (default: `'pt-BR'`).
- Validates the email format.
- Finds or creates the user in the database.
- Checks if the user already has an OTP code created less than 60 seconds ago — if so, return 429 with `{ error: 'RATE_LIMITED', retryAfterSeconds: N }` where N is `60 - elapsed seconds since last code`.
- Deletes any existing OTP codes for the user.
- Generates a random 6-digit code.
- Stores the OTP code in the `otp_codes` table (expires in 10 minutes).
- Sends the code via Resend to the user's email, in the language specified by the request.
- Returns success (does not reveal whether the email already existed).

#### `POST /api/auth/verify-code`
- Receives `{ email, code }` in the request body.
- Finds the user by email.
- Gets the latest OTP code for that user.
- Checks: code not expired, attempts < 3, code matches.
- If code is wrong: increment attempts, return error. If attempts reach 3, tell the user to request a new code.
- If code is correct: delete all OTP codes for the user, sign a JWT, set the auth cookie, return success.

#### `POST /api/auth/logout`
- Deletes the auth cookie.
- Returns success.

### 3.5 Login / Register page (`src/app/(auth)/page.tsx`)
- This is the root page (`/`) and serves as both the landing page and the auth page.
- **Layout** (`src/app/(auth)/layout.tsx`): No navbar, no breadcrumb. Just the page content.
- **Page content**:
  - General information about Ditchy (what it is, how it works) displayed around the form.
  - A centered form with:
    - Email input field.
    - "Enviar código" (Send code) button.
  - After the code is sent, the form transitions to show:
    - A code input field (6 digits).
    - "Verificar" (Verify) button.
    - A "Reenviar código" (Resend code) button. If the API returns 429 with `retryAfterSeconds`, disable this button and show a live countdown (e.g., "Aguarde 42s") using a client-side `setInterval` that ticks every second. Re-enable the button automatically when the counter reaches 0.
  - On successful verification, redirect to `/dashboard`.
- **Language switcher**: A standalone language toggle at the top-right of the page (since there is no navbar on auth pages). Clicking it switches between `'pt-BR'` and `'en'` and saves the preference to the language cookie. All page text re-renders immediately. The form sends the current language value alongside the email in the `POST /api/auth/send-code` request.
- The page defaults to `'pt-BR'` if no language cookie is set.
- Handle error states: invalid email, wrong code, too many attempts, rate limit (countdown), network errors.

---

## Phase 4 — Layout & UI Foundation

### 4.1 Internationalization infrastructure (`src/lib/i18n/`)
Set up i18n early so all subsequent phases use translation keys from the start, avoiding a costly retrofit later:
- Create `src/lib/i18n/pt-BR.ts` and `src/lib/i18n/en.ts` — each exports an object with all UI strings, keyed by a consistent identifier (e.g., `dashboard.createSection`, `uploading.startPlanning`). Start with a small set of keys and expand as each phase adds new UI.
- Create a `useTranslation()` hook that reads the language cookie (default: `pt-BR`) and returns the correct strings object.
- Create a helper to get/set the language cookie.
- All UI text from Phase 4 onward must use translation keys, not hardcoded strings.

### 4.2 Generic UI components (`src/components/ui/`)
Build the reusable components that will be used across the app. Each component follows the design spec (dark mode, custom colors, slightly rounded corners, no animations):

- **Button** — variants: primary (accent blue), danger (red), ghost/secondary. Disabled state. Loading state (with spinner).
- **Input** — text input with border, focus ring using accent blue. Placeholder uses muted text color.
- **Modal** — surface-colored panel, centered, with dimmed backdrop. Close button. Accepts children for content.
- **Spinner** — simple CSS spinner using accent blue. Used for all loading states.
- **Card** — surface background, border, hover effect (slightly lighter border). Clickable variant.
- **Badge** — small colored label for status display (e.g., "Uploading", "Planning", "Studying").
- **Checkbox** — styled checkbox consistent with the design.
- **ConfirmDialog** — a modal with a message, Cancel button, and Confirm button. Used for delete confirmations.
- **ProgressBar** — a horizontal bar with `success-green` fill. Accepts a percentage value.

### 4.3 Navbar (`src/components/Navbar.tsx`)
- Slim, fixed at the top of the page.
- **Left side**: Text "Ditchy" as the logo (clicking it navigates to `/dashboard`).
- **Right side** (left to right):
  - **Language switcher**: A standalone toggle showing the current language ("PT" / "EN"). Clicking it switches between `'pt-BR'` and `'en'` and saves the preference in a cookie. Positioned to the left of the profile avatar.
  - **Profile avatar**: A generic person/avatar icon (SVG symbol — no letter, no photo). Clicking it opens a dropdown menu:
    - **Sair** (Logout) — calls `POST /api/auth/logout` and redirects to `/`.

### 4.4 Breadcrumb bar (`src/components/Breadcrumb.tsx`)
- Positioned below the navbar.
- Shows the current location path: `Painel` (Dashboard) > `[Nome da Seção ▾]` > `[Nome do Tópico ▾]`.
- Clicking `▾` next to a section name opens a dropdown listing all the user's sections.
- Clicking `▾` next to a topic name opens a dropdown listing all topics in that section.
- Dropdowns are simple text lists. Clicking an item navigates to that section/topic.
- The breadcrumb must dynamically reflect the current route.

### 4.5 Main layout (`src/app/(main)/layout.tsx`)
- Wraps all authenticated pages.
- Includes the Navbar at the top and the Breadcrumb below it.
- Content area is centered with a max width that uses most of the viewport but not 100%.
- The layout fetches the data needed for breadcrumb dropdowns (list of sections, and topics if inside a section).

---

## Phase 5 — Dashboard & Sections

### 5.1 Database queries

#### `src/lib/db/queries/sections.ts`
- `verifySectionOwnership(sectionId, userId)` — returns `true` if the section belongs to the user. Used by all API routes that operate on a specific section.
- `listSections(userId)` — returns all sections for a user, ordered by `created_at` descending. Include a count of completed topics and total topics for each section (for the progress indicator).
- `createSection(userId, name, description)` — inserts a new section. Before inserting, count existing sections for the user and reject if already at 10.
- `getSection(sectionId)` — returns a single section by ID.
- `deleteSection(sectionId)` — deletes the section (cascade handles related data).

#### `src/lib/db/queries/files.ts`
- `listFiles(sectionId)` — returns all files in a section, ordered by `created_at`. Used by `DELETE /api/sections/:id` to clean up Vercel Blob, and later by `GET /api/sections/:id/files`.

### 5.2 API routes

#### `GET /api/sections`
- Returns all sections for the authenticated user.
- Each section includes: id, name, description, status, created_at, and (if status is `studying`) the progress count (completed/total topics).

#### `POST /api/sections`
- Receives `{ name, description }`.
- Validates that the user has fewer than 10 sections.
- Creates the section with status `uploading`.
- Returns the created section.

#### `GET /api/sections/:id`
- Calls `verifySectionOwnership(id, userId)` — returns 404 if not owned.
- Returns the section details via `getSection(id)`.

#### `DELETE /api/sections/:id`
- Calls `verifySectionOwnership(id, userId)` — returns 404 if not owned.
- Calls `listFiles(sectionId)` (from `files.ts`) to get all files, extracts blob URLs, deletes them from Vercel Blob.
- Deletes the section from the database via `deleteSection(id)` (cascade handles the rest).

### 5.3 Dashboard page (`src/app/(main)/dashboard/page.tsx`)
- **Top area**: Search input (left) and "Criar nova Seção" (Create new Section) button (right).
- **Section grid**: 3-column grid (responsive — fewer columns on smaller screens).
- **Each section card** displays:
  - Section name and description.
  - Creation date (formatted).
  - Status badge: `Enviando` (Uploading), `Planejando` (Planning), or `Estudando` (Studying).
  - Progress indicator (e.g., "3/8 tópicos completos") — only shown when status is `studying`.
  - Delete button (trash icon) — opens a ConfirmDialog before deleting.
- **Empty state**: "Nenhuma seção criada ainda. Clique em Criar nova Seção para começar."
- **Search**: Filters the displayed sections by name (client-side filtering is fine).
- **Create section**: Opens a modal with name and description fields. On submit, calls `POST /api/sections` and adds the new section to the grid.
- Clicking a card navigates to `/sections/[id]`.
- Fetch sections on page load using `GET /api/sections`.

### 5.4 Section page shell (`src/app/(main)/sections/[id]/page.tsx`)
- Fetches the section details using `GET /api/sections/:id`.
- Based on the section's `status`, renders the appropriate interface:
  - `uploading` → Uploading component (Phase 6)
  - `planning` → Planning component (Phase 7)
  - `studying` → Studying component (Phase 8)
- For now, create placeholder components for each status that just show the status name. They will be implemented in their respective phases.

---

## Phase 6 — File Upload & Processing

### 6.1 Database queries

#### `src/lib/db/queries/files.ts` — additions
- `verifyFileOwnership(fileId, userId)` — joins `files → sections` and returns `true` if the file's section belongs to the user.
- `listFileStatuses(sectionId)` — returns `id`, `original_name`, and `status` for all files in a section. Used by `GET /api/sections/:id/files/status` for polling.
- Note: `listFiles(sectionId)` already exists from Phase 5.1.
- `createFile(sectionId, blobUrl, originalName, fileType, sizeBytes)` — inserts a file row with status `uploading`.
- `updateFileStatus(fileId, status)` — updates the file status.
- `updateFileExtractedText(fileId, extractedText)` — saves the extracted text and sets status to `processed`.
- `deleteFile(fileId)` — deletes the file row.
- `getFile(fileId)` — returns a single file.
- `getTotalSizeForSection(sectionId)` — returns the sum of `size_bytes` for all files in the section.

### 6.2 API routes

#### `GET /api/sections/:id/files`
- Calls `verifySectionOwnership(id, userId)` — returns 404 if not owned.
- Returns all files in the section via `listFiles(sectionId)`.

#### `POST /api/files`
- Receives multipart form data: the file itself + `sectionId` field.
- Validates:
  - Calls `verifySectionOwnership(sectionId, userId)` — returns 404 (`SECTION_NOT_FOUND`) if not owned.
  - Calls `getSection(sectionId)` — returns 400 (`INVALID_SECTION_STATUS`) if section is not in `uploading` status.
  - File MIME type is allowed — returns 400 (`INVALID_FILE_TYPE`) if not. Accepted MIME types (matching Gemini's native support): `application/pdf`, `text/plain`, `image/jpeg`, `image/png`, `image/webp`, `image/heif`.
  - File size does not exceed **4 MB** — returns 400 (`FILE_TOO_LARGE`) if exceeded.
  - Adding this file would not exceed the **10 MB section limit** (check `getTotalSizeForSection` + file size) — returns 409 (`SIZE_LIMIT_EXCEEDED`) if exceeded.
- Uploads the file to Vercel Blob using `put()` from `@vercel/blob` (server-side upload — the file passes through the serverless function).
- Creates the file row in the database with status `uploading`.
- Returns the created file (no call to `process` — the client is responsible for calling it).

#### `POST /api/files/:id/process`
- File ID is taken from the URL path parameter.
- Calls `verifyFileOwnership(fileId, userId)` — returns 404 (`FILE_NOT_FOUND`) if not owned.
- Calls `getFile(fileId)` to validate that the file status is `uploading`, `processing`, or `error` (to allow retries). Returns 409 (`ALREADY_PROCESSED`) if status is `processed`.
- Processes exactly one file and returns:
  1. Update status to `processing`.
  2. Download the raw file bytes from Vercel Blob.
  3. Send the file directly to Gemini as a multimodal prompt (no image conversion — Gemini natively handles PDF, JPEG, PNG, TXT). See 6.3 for the extraction prompt.
  4. Save the extracted text to the file row and set status to `processed`. If the call fails, set status to `error`.
- The client calls this endpoint once per file immediately after `POST /api/files`. Multiple concurrent calls for different files are fine.
- For retries: the UI shows a "Retry" button for files with `error` status, which calls this endpoint again.

#### `DELETE /api/files/:id`
- Calls `verifyFileOwnership(fileId, userId)` — returns 404 if not owned.
- Calls `getFile(fileId)` to get the `blob_url`, then deletes it from Vercel Blob.
- Deletes the file row from the database via `deleteFile(fileId)`. (Embeddings are deleted automatically via CASCADE.)

#### `GET /api/sections/:id/files/status`
- Calls `verifySectionOwnership(id, userId)` — returns 404 if not owned.
- Returns the status of all files in the section via `listFileStatuses(sectionId)` (for polling).

### 6.3 AI text extraction setup
- **All prompts in `src/prompts/index.ts` must use XML-style formatting** — use XML tags (e.g., `<instructions>`, `<context>`, `<rules>`, `<output_format>`) to structure prompt sections. This applies to every prompt defined in this file across all phases (text extraction, plan generation, plan regeneration, chat system prompts, and summarization).
- Write the text extraction prompt in `src/prompts/index.ts`. The prompt instructs the AI to extract:
  - All readable text (in Markdown).
  - Math formulas converted to LaTeX.
  - Detailed descriptions of any images, diagrams, or non-text content.
- Use the `gemini-3-flash-preview` model (configured in `src/config/ai.ts`).
- Supported file types sent directly to Gemini: PDF, TXT, JPEG, PNG, WEBP, HEIF. No conversion step needed.

### 6.4 `src/config/ai.ts` (initial version)
Create the config file with the initial parameters needed for this phase:
- `TEXT_EXTRACTION_MODEL: 'gemini-3-flash-preview'`
- Other parameters will be added in later phases as needed.

### 6.5 AI wrapper (`src/lib/ai.ts`) — initial version
- `extractTextFromFile(fileBuffer: Buffer, mimeType: string): Promise<string>` — uses `generateText` from the `ai` package with the `google()` provider from `@ai-sdk/google` to send the raw file bytes to Gemini as a multimodal prompt (file content part + extraction instructions from `src/prompts/index.ts`). Returns the extracted text. No image conversion needed — Gemini natively handles all accepted file types (PDF, TXT, JPEG, PNG, WEBP, HEIF).

### 6.6 Uploading UI (`src/components/UploadingView.tsx`)
- **i18n**: Add all necessary translation keys to `src/lib/i18n/pt-BR.ts` and `src/lib/i18n/en.ts` for the uploading UI (upload zone text, file status labels, button labels, error messages, etc.).
- **Component location**: Create `src/components/UploadingView.tsx` and replace the `UploadingPlaceholder` in `src/app/(main)/sections/[id]/page.tsx` with it.
- **Upload flow (per file)**: `POST /api/files` (sends the file + sectionId) → immediately call `POST /api/files/:id/process`. Multiple files upload and process concurrently.
- **File upload zone**: Dashed border area. Clicking it opens the system file picker. Also supports drag-and-drop.
- **File list**: Below the upload zone, shows all uploaded files with:
  - File name.
  - Status label: `Enviando` → `Processando` → `Processado`. If extraction fails: `Erro`.
  - Click on the file name to preview (opens a modal showing the original file — PDF rendered in an iframe, images displayed directly). For file types that cannot be previewed in the browser (TXT), show a "no preview available" message.
  - Remove button (trash icon) to delete the file.
  - If a file has `error` status, show a "Tentar novamente" (Retry) button that re-triggers processing by calling `POST /api/files/:id/process`.
- **Polling**: Use `setInterval` to poll `GET /api/sections/:id/files/status` every 3 seconds to update file statuses.
- **"Iniciar Planejamento" (Start Planning) button**: Only enabled when all uploaded files have status `processed` (no files with `uploading`, `processing`, or `error` status) and there is at least one file. Clicking it is a no-op for now — the behavior will be implemented in Phase 7.

---

## Phase 7 — Study Plan Generation

### 7.1 Plan JSON schema (`src/lib/ai.ts` — type export)

Both AI-generated and user-edited plans use the same structure. Define and export the `PlanJSON` type in `src/lib/ai.ts` alongside `generatePlan`/`regeneratePlan`:

```typescript
export type PlanJSON = {
  topics: {
    title: string;
    subtopics: string[];
    isKnown?: boolean; // only set by user edits, never by AI
  }[];
};
```

The AI generates plans without `isKnown`. The field is added by the UI when the user marks a topic as "Already Known". `createTopicsFromPlan` maps `isKnown: true` to `is_completed = true` in the `topics` table.

### 7.2 Prompts (`src/prompts/index.ts` — additions)
Add two separate prompts:
- **Plan generation prompt**: Instructs the AI to create a structured study plan from the provided text. The plan must follow the `PlanJSON` schema — a JSON object with an array of topics, each containing a `title` and an array of `subtopics` strings. The order matters — topics should be in the recommended study order.
- **Plan regeneration prompt**: Same structure as above, but also receives the user's guidance text and instructs the AI to take it into account when producing the new plan.

### 7.3 AI config additions (`src/config/ai.ts`)
Add:
- `PLAN_GENERATION_MODEL: 'gemini-3-flash-preview'`

### 7.4 AI wrapper additions (`src/lib/ai.ts`)
- `generatePlan(allText): PlanJSON` — sends all extracted text to the LLM using the generation prompt, returns the full plan as structured JSON.
- `regeneratePlan(allText, guidance): PlanJSON` — sends all extracted text and the user's guidance to the LLM using the regeneration prompt, returns the updated plan as structured JSON.

### 7.5 Database queries

#### `src/lib/db/queries/sections.ts` (additions)
- `updateSectionStatus(sectionId, status)` — updates the section's status. Used by `start-planning` and `start-studying` routes.

#### `src/lib/db/queries/files.ts` (additions)
- `getExtractedTexts(sectionId)` — returns the `extracted_text` of all processed files in a section, as an array. Used by plan generation and regeneration.

#### `src/lib/db/queries/plans.ts`
- `createPlanDraft(sectionId, planJson)` — inserts a new plan draft row.
- `getCurrentPlanDraft(sectionId)` — returns the draft with the highest `created_at`.
- `getDraftCount(sectionId)` — returns the number of drafts for a section.
- `deleteNewestPlanDraft(sectionId)` — deletes the most recent draft (undo).
- `deleteAllPlanDrafts(sectionId)` — removes all drafts for a section (cleanup after "Start Studying").

#### `src/lib/db/queries/topics.ts`
- `createTopicsFromPlan(sectionId, planJson)` — takes the final plan JSON and inserts rows into `topics` and `subtopics` tables with the correct order values. Topics marked as "known" in the plan get `is_completed = true`.
- `listTopics(sectionId)` — returns all topics with their subtopics, ordered by `order`.

### 7.6 API routes

#### `POST /api/sections/:id/start-planning`
- **Update the Uploading UI (Phase 6.6)**: Wire up the "Iniciar Planejamento" button to call this endpoint. `UploadingView` takes an `onStatusChange` callback prop. After a successful response, it calls `onStatusChange('planning')`. The section page updates its local `section.status`, which triggers rendering `PlanningView` instead of `UploadingView`.
- Calls `verifySectionOwnership(id, userId)` — returns 404 if not owned.
- Calls `getSection(id)` to validate that the section is in `uploading` status — returns 400 (`INVALID_SECTION_STATUS`) if not.
- Calls `listFiles(sectionId)` to verify that at least one file exists and that every file has `processed` status — returns 400 (`FILES_NOT_READY`) if not.
- Changes section status to `planning` via `updateSectionStatus(id, 'planning')`.
- Calls `getExtractedTexts(sectionId)` to gather all extracted text from the section's files.
- Calls `generatePlan(allText)` — waits for the result.
- Validates the AI response against the `PlanJSON` schema (must have a non-empty `topics` array, each topic must have a non-empty `title` and a non-empty `subtopics` array of non-empty strings). If validation fails, treats it as a generation failure.
- On success: stores the result via `createPlanDraft(sectionId, planJson)` and returns 200.
- On failure: reverts section status to `uploading` and returns 500.

#### `GET /api/sections/:id/plan`
- Calls `verifySectionOwnership(id, userId)` — returns 404 if not owned.
- Returns the current plan draft's `plan_json`, or `null` if no draft exists.

#### `PUT /api/sections/:id/plan`
- Calls `verifySectionOwnership(id, userId)` — returns 404 if not owned. Calls `getSection(id)` to validate that the section is in `planning` status — returns 400 (`INVALID_SECTION_STATUS`) if not.
- Receives the updated `plan_json` from the client (after user edits).
- Validates the received JSON against the `PlanJSON` schema (must have a `topics` array, each topic must have a non-empty `title` and a `subtopics` array of strings; `isKnown` is optional boolean). Returns 400 (`INVALID_PLAN_JSON`) if validation fails — the existing draft is not changed.
- Creates a new plan draft row with the updated JSON.

#### `POST /api/sections/:id/plan/undo`
- Calls `verifySectionOwnership(id, userId)` — returns 404 if not owned. Calls `getSection(id)` to validate that the section is in `planning` status — returns 400 (`INVALID_SECTION_STATUS`) if not.
- Calls `getDraftCount(sectionId)` — returns 400 (`NOTHING_TO_UNDO`) if fewer than 2 drafts exist.
- Deletes the newest plan draft for the section.
- Returns the new current draft (the previous one).

#### `POST /api/sections/:id/plan/regenerate`
- Calls `verifySectionOwnership(id, userId)` — returns 404 if not owned. Calls `getSection(id)` to validate that the section is in `planning` status — returns 400 (`INVALID_SECTION_STATUS`) if not.
- Calls `getCurrentPlanDraft(sectionId)` to verify a draft exists — returns 400 (`NO_PLAN_DRAFT`) if not.
- Receives `{ guidance }` (required). Returns 400 if `guidance` is missing or blank.
- Does NOT delete existing drafts — old drafts are kept so the user can undo back to the pre-regeneration plan.
- Calls `getExtractedTexts(sectionId)` to re-gather all extracted text.
- Calls `regeneratePlan(allText, guidance)` — waits for the result.
- Validates the AI response against the `PlanJSON` schema (same validation as `start-planning`). If validation fails, treats it as a regeneration failure.
- On success: creates a new draft via `createPlanDraft(sectionId, planJson)` and returns 200. The regenerated plan is one new draft on top of the existing stack. Undo walks back to the previous plan.
- On failure: returns 500 (existing drafts are untouched).

#### `POST /api/sections/:id/start-studying`
- Calls `verifySectionOwnership(id, userId)` — returns 404 if not owned.
- Calls `getSection(id)` to validate that the section is in `planning` status — returns 400 (`INVALID_SECTION_STATUS`) if not.
- Gets the current plan draft via `getCurrentPlanDraft()` — returns 400 if none exists.
- Validates that the plan has at least one topic with at least one subtopic — returns 400 (`EMPTY_PLAN`) if the plan has no topics.
- Calls `createTopicsFromPlan()` to write topics and subtopics to their tables.
- Chunks and embeds all extracted texts, storing vectors in the `embeddings` table (added in Phase 8).
- Creates all chats (one per topic + one revision chat) via `createChatsForSection()` (added in Phase 9).
- Deletes all plan drafts for the section via `deleteAllPlanDrafts()`.
- Changes section status to `studying` via `updateSectionStatus(id, 'studying')`.

### 7.7 Planning UI (`src/components/PlanningView.tsx`)

**Prerequisites**: Install `@dnd-kit/core` and `@dnd-kit/sortable` (`npm install @dnd-kit/core @dnd-kit/sortable`).

**i18n**: Add a `planning` section to the `Translations` interface and both language files with all keys needed for the Planning UI (loading message, error message, retry, undo, regenerate, guidance placeholder, start studying, already known, add topic/subtopic labels, etc.) — same pattern as Phase 6.6's `uploading` section.

#### Loading state
While `POST /api/sections/:id/start-planning` (or `POST /api/sections/:id/plan/regenerate`) is in flight:
- Show a spinner with the message "Criando seu plano de estudos..." (Creating your study plan...).
- No progress bar.

#### Error state
If `start-planning` or `regenerate` returns an error (network error, AI failure):
- Show an error message with a "Tentar novamente" (Try again) button that re-calls the same endpoint.
- Also shown on page load if the section is in `planning` status but `GET /api/sections/:id/plan` returns `null` — indicates the previous generation was interrupted (e.g., page refresh mid-generation).

#### Plan editor (shown after successful generation or on page load when a draft exists)
- Display the plan as a vertical list of topic cards.
- **Each topic card**:
  - Drag handle on the left side (for reordering topics via drag-and-drop).
  - Topic title — click to edit (inline editing). The editable state appears on hover.
  - "Já domino" (Already Known) checkbox in the top-right corner. Marking it dims the card.
  - Trash button — appears on hover. Clicking it removes the topic and all its subtopics from the plan.
  - List of subtopics inside the card:
    - Each subtopic text is click-to-edit (inline). Editable on hover.
    - Trash button on each subtopic — appears on hover.
    - Subtopics are reorderable via drag-and-drop within the topic.
    - "+" button below the last subtopic — appears on hover. Creates a new empty subtopic.
- **"+" button** below all topic cards: creates a new empty topic at the end.
- **Undo button** ("Desfazer"): Top-right, above the plan. Every edit saves a new draft via `PUT /api/sections/:id/plan`. Clicking undo calls `POST /api/sections/:id/plan/undo` and loads the previous draft. The button is disabled when there is only 1 draft (nothing to undo back to). **What counts as one edit**: structural changes (delete, reorder, create, mark as known) save a draft immediately. Text edits (topic title or subtopic text) save a draft on blur — clicking into a text field starts an edit session, and clicking outside ends it and saves one draft, regardless of how many characters were changed.
- **"Regenerar Plano" (Regenerate Plan) button**: Below the plan. Clicking it reveals an inline text box for required guidance (e.g., "Focar mais em cálculo"). The confirm button is disabled until the user types something. Confirming calls `POST /api/sections/:id/plan/regenerate` and returns to the loading state.
- **"Começar a Estudar" (Start Studying) button**: At the bottom. Calls `POST /api/sections/:id/start-studying`. Disabled immediately after click to prevent double-submission.

#### Drag-and-drop
- Use `@dnd-kit/core` and `@dnd-kit/sortable` for reordering topics and subtopics within the same topic only (no cross-topic subtopic movement).
- After each reorder, save the updated plan as a new draft.

#### Edit behavior (pessimistic updates)
- All edit operations (save draft, undo, delete, reorder, mark as known, start studying) use **pessimistic updates**: the UI waits for the server response before reflecting the change.
- While a `PUT /plan`, `POST /plan/undo`, or `POST /start-studying` request is in flight, disable all plan editing controls (drag handles, text fields, buttons) to prevent concurrent edits. Show a subtle loading indicator (e.g., a small spinner near the undo button).
- If a save or undo request fails, show a brief inline error toast and restore the plan to its last known server state.

---

## Phase 8 — Embeddings (RAG Pipeline)

### 8.1 AI functions (`src/lib/ai.ts` — additions)
- `chunkText(text, chunkSize?, overlap?): string[]` — splits text into chunks. `chunkSize` and `overlap` default to `CHUNK_SIZE` and `CHUNK_OVERLAP` from `src/config/ai.ts`.
- `embedText(text, taskType): number[]` — calls Gemini embedding API (`gemini-embedding-2-preview`) with `outputDimensionality: 1536` and the specified `taskType` (`RETRIEVAL_DOCUMENT` or `RETRIEVAL_QUERY`). Returns the vector.
- `embedTexts(texts, taskType): number[][]` — embeds multiple texts with the given `taskType` (can batch API calls for efficiency).

### 8.2 AI config additions (`src/config/ai.ts`)
Add embedding-related parameters:
- `EMBEDDING_MODEL: 'gemini-embedding-2-preview'`
- `CHUNK_SIZE: 512` (tokens)
- `CHUNK_OVERLAP: 100` (tokens)
- `TOP_N_CHUNKS: 4`

### 8.3 Database queries (`src/lib/db/queries/embeddings.ts`)
- `createEmbeddings(sectionId, fileId, chunks, embeddings)` — bulk inserts chunk text and embedding vectors into the `embeddings` table.
- `searchChunks(sectionId, queryEmbedding, topN)` — performs a vector similarity search (`<=>` cosine distance) on the `embeddings` table, filtered by `section_id`, returning the top N chunks.

### 8.4 `searchStudentMaterials` tool implementation
- Define the tool schema for the Vercel AI SDK:
  - Name: `searchStudentMaterials`
  - Description: "Search the student's uploaded study materials for relevant content."
  - Parameters: `{ query: string }`
- When the LLM calls this tool:
  1. Embed the `query` using `embedText(query, 'RETRIEVAL_QUERY')`.
  2. Call `searchChunks(sectionId, queryEmbedding, TOP_N_CHUNKS)`.
  3. Return the chunk texts to the LLM as the tool result.

### 8.5 Update `POST /api/sections/:id/start-studying`
Add an embedding step to the existing `start-studying` endpoint. After creating topics from the plan:
1. Call `listFiles(sectionId)` to get all files (each row includes `id` and `extracted_text`).
2. For each file with `extracted_text`, chunk it using `chunkText()`.
3. Embed all chunks using `embedTexts(chunks, 'RETRIEVAL_DOCUMENT')`.
4. Store the embeddings via `createEmbeddings(sectionId, fileId, chunks, embeddings)` — the `fileId` comes from the file row.

The updated endpoint flow becomes:
1. Verify ownership and validate section is in `planning` status.
2. Get the current plan draft — return 400 if none exists.
3. Validate the plan has at least one topic with at least one subtopic.
4. Create topics and subtopics from the plan via `createTopicsFromPlan()`.
5. **[New]** Chunk and embed all extracted texts, storing vectors in the `embeddings` table.
6. Delete all plan drafts via `deleteAllPlanDrafts()`.
7. Change section status to `studying` via `updateSectionStatus(id, 'studying')`.

---

## Phase 9 — Studying Section Page

### 9.1 Database queries

#### `src/lib/db/queries/topics.ts` (additions)
- `verifyTopicOwnership(topicId, userId)` — joins `topics → sections` and returns `true` if the topic's section belongs to the user.
- `getTopic(topicId)` — returns a single topic with its subtopics.
- `toggleTopicCompletion(topicId)` — flips `is_completed`.
- `getTopicProgress(sectionId)` — returns `{ completed: number, total: number }`.
- `listTopicsWithChatInfo(sectionId)` — returns all topics with subtopics, ordered by `order`, each including the associated `chatId` and the count of user messages in its chat (LEFT JOIN through `chats` → `messages` where `role = 'user'`). Since chats are pre-created during `start-studying`, every topic already has a chat. Used by the Studying UI and `GET /api/sections/:id/topics`.

#### `src/lib/db/queries/chats.ts`
- `createChatsForSection(sectionId, topicIds)` — bulk-creates one chat per topic (with `type: 'topic'` and `topic_id` set) plus one revision chat (with `type: 'revision'` and `topic_id: null`). Used by `start-studying`.
- `getRevisionChat(sectionId)` — returns the revision chat for the section (the chat with `type = 'revision'`).

### 9.2 Update `POST /api/sections/:id/start-studying`
Add chat creation to the existing `start-studying` endpoint. After creating embeddings (Phase 8.5):
1. Call `listTopics(sectionId)` to get all topics (already exists from Phase 7) and extract their IDs.
2. Call `createChatsForSection(sectionId, topicIds)` to create one chat per topic + one revision chat.

The final endpoint flow becomes:
1. Verify ownership and validate section is in `planning` status.
2. Get the current plan draft — return 400 if none exists.
3. Validate the plan has at least one topic with at least one subtopic.
4. Create topics and subtopics from the plan via `createTopicsFromPlan()`.
5. Chunk and embed all extracted texts (Phase 8.5).
6. **[New]** Create all chats via `createChatsForSection()`.
7. Delete all plan drafts via `deleteAllPlanDrafts()`.
8. Change section status to `studying` via `updateSectionStatus(id, 'studying')`.

### 9.3 API routes

#### `GET /api/sections/:id/topics`
- Calls `verifySectionOwnership(id, userId)` — returns 404 if not owned.
- Returns all topics via `listTopicsWithChatInfo(sectionId)` — includes subtopics, completion status, `chatId`, and message count for each topic's chat.
- Also returns the revision chat ID via `getRevisionChat(sectionId)`.

#### `PATCH /api/topics/:id`
- Calls `verifyTopicOwnership(topicId, userId)` — returns 404 if not owned.
- Toggles `is_completed` for the topic.

### 9.4 Studying UI (`src/components/StudyingView.tsx`)

- **i18n**: Add a `studying` section to the `Translations` interface and both language files with all keys needed for the Studying UI (progress text, card labels, revision label, etc.).
- **Top area**: Progress bar showing overall completion (e.g., "3/8 tópicos completos") with the green progress bar.
- **Topic card list**: Vertical list of cards, each showing:
  - Topic title.
  - Completion checkbox (top-right) — clicking it calls `PATCH /api/topics/:id`.
  - Number of interactions (message count from the chat).
  - Completed topics appear dimmed.
- Clicking a topic card navigates directly to `/sections/[id]/chat/[chatId]` using the `chatId` from the topic data. No lazy chat creation needed — chats already exist.
- **Revision chat card**: A special card at the bottom of the list labeled "Revisão" (Revision). Clicking it navigates directly to `/sections/[id]/chat/[chatId]` using the revision chat ID returned by the topics endpoint.

---

## Phase 10 — Chat

### 10.1 Prerequisites and AI config

**AI config additions** (`src/config/ai.ts`) — add chat-related parameters:
- `TEACHING_CHAT_MODEL: 'gemini-3-flash-preview'`
- `SUMMARIZATION_MODEL: 'gemini-3-flash-preview'`
- `SUMMARIZATION_TOKEN_THRESHOLD: 30000` — the approximate token count (measured as `chars / 4`) that triggers summarization.
- `MIN_UNSUMMARIZED_MESSAGES: 2`
- `RATE_LIMIT_MESSAGES_PER_MINUTE: 10` — max messages per minute per user (global across all chats).

### 10.2 Prompts (`src/prompts/index.ts` — additions)
Add all remaining prompts:

- **Topic chat system prompt**: Includes the full study plan with completion status, the current topic and subtopics, pedagogical instructions (introduce → explain → solve problem → student practice → next subtopic → topic complete), language rules. Topic completion is manual — the AI does NOT mark topics as complete. When the AI judges the student has covered all subtopics and seems confident, it should suggest they mark the topic as complete on the studying page and move on.
- **Revision chat system prompt**: Similar to topic chat but framed for general revision across all topics. No specific topic/subtopics — the student asks about anything.
- **Chat summarization prompt**: Instructs the AI to create a concise cumulative summary of the conversation, preserving key context.
- **Initial user messages** (4 variants) — fake user-role messages used to seed the first AI response in a chat (see 10.6). These are NOT persisted; only the LLM's reply is saved. They exist so the system prompt's "match the language of the last user message" rule naturally produces a response in the correct language. Stored as constants in `src/prompts/index.ts`:
  - `TOPIC_CHAT_INITIAL_USER_MESSAGE_PT` — Portuguese. Asks the AI to introduce the topic and get started.
  - `TOPIC_CHAT_INITIAL_USER_MESSAGE_EN` — English equivalent.
  - `REVISION_CHAT_INITIAL_USER_MESSAGE_PT` — Portuguese. Asks the AI to introduce the revision chat.
  - `REVISION_CHAT_INITIAL_USER_MESSAGE_EN` — English equivalent.

### 10.3 Database queries

#### `src/lib/db/queries/chats.ts` (additions)
- `verifyChatOwnership(chatId, userId)` — joins `chats → sections` and returns `true` if the chat's section belongs to the user.
- `getChat(chatId)` — returns the chat with section and topic details via JOINs. Returns:
  - Chat fields: `id`, `section_id`, `topic_id`, `type`
  - Section name: `section_name` (from `sections.name`)
  - Topic title: `topic_title` (from `topics.title`, NULL for revision chats)
  - Subtopics: fetched separately or via a second query — array of `{ text, order }` for the chat's topic (empty for revision chats)
  - All topics summary: for the system prompt, a list of `{ title, is_completed }` for all topics in the section (fetched via existing `listTopics`)

#### `src/lib/db/queries/messages.ts`
- `getMessage(messageId)` — returns a single message by ID. Used by undo to retrieve the message content before deletion.
- `getMessages(chatId)` — returns all messages for a chat, ordered by `id`.
- `getMessagesAfterSummary(chatId)` — returns messages with `id > summarized_up_to_message_id` (the unsummarized messages).
- `createMessage(chatId, role, content)` — inserts a message.
- `deleteMessagesFrom(chatId, messageId)` — deletes the message with the given ID and all messages after it (for undo).
- `getMessageCountLastMinute(userId)` — counts messages sent by the user in the last 60 seconds (for rate limiting).

#### `src/lib/db/queries/summaries.ts`
- `getSummary(chatId)` — returns the current summary for the chat (if any).
- `upsertSummary(chatId, summaryText, summarizedUpToMessageId)` — creates or updates the summary row.

### 10.4 API routes

#### `GET /api/chats/:id/messages`
- Calls `verifyChatOwnership(chatId, userId)` — returns 404 if not owned.
- Calls `getMessages(chatId)` — returns ALL messages ordered by `id`.
- If no messages exist (first load), generate the initial AI introductory message (see 10.6), save it, and include it in the response.
- Returns `{ messages }` — the full message history. The summary is NOT included here — it is LLM-only context.

#### `POST /api/chats/:id/messages`
- Calls `verifyChatOwnership(chatId, userId)` — returns 404 if not owned.
- Receives the user's message via the `useChat` request format (Vercel AI SDK data stream protocol).
- **Rate limiting**: Check `getMessageCountLastMinute(userId)`. If over the limit, return 429.
- Save the user's message to the database via `createMessage(chatId, 'user', content)`.
- Build the LLM context (server-side only — not sent to the client):
  1. System prompt (topic or revision, from `getChat` data).
  2. Summary text (from `getSummary(chatId)`), if any — injected as a system message.
  3. Unsummarized messages (from `getMessagesAfterSummary(chatId)`).
  4. The new user message (already included in the unsummarized messages after saving).
- Call `streamText` from the `ai` package with:
  - `model: google(TEACHING_CHAT_MODEL)`
  - `maxSteps: 3` — allows the LLM to call `searchStudentMaterials` and continue generating (one extra step as safety margin).
  - `tools: { searchStudentMaterials }` — the RAG tool from Phase 8.4.
  - `messages` — the built context above.
- Return `toDataStreamResponse()` — streams the response to `useChat` on the client.
- **After stream completes**: Extract the final assistant text content and save it via `createMessage(chatId, 'assistant', finalText)`. Only the final text is stored — tool call/result steps are NOT saved.
- **After saving**: Check if summarization is needed (see 10.7).
- **On stream failure**: Delete the user message that was saved at the start of this request via `deleteMessagesFrom(chatId, userMessageId)`. Return an error response. The client handles this via `useChat`'s `onError` — it restores the message text to the input field (see 10.8).

#### `POST /api/chats/:id/undo/:messageId`
- Calls `verifyChatOwnership(chatId, userId)` — returns 404 if not owned.
- Calls `getSummary(chatId)` — if a summary exists, validate that `messageId > summarized_up_to_message_id`. Return 400 (`CANNOT_UNDO_SUMMARIZED`) if the message has been summarized.
- Calls `getMessage(messageId)` to get the content of the message being undone. Validates that the message's `role` is `'user'` — return 400 if not.
- Calls `deleteMessagesFrom(chatId, messageId)` to delete the user message and all subsequent messages (including the assistant response that followed).
- Returns `{ content }` — the text of the undone user message (to restore in the input field).

### 10.5 AI wrapper additions (`src/lib/ai.ts`)
- `summarizeChat(summary, messages): string` — sends the previous summary (if any) and messages to the summarization model, returns the new cumulative summary.

> Token counting throughout this phase uses a `chars / 4` approximation — no tokenizer dependency needed. This is rough but sufficient for threshold-based decisions like summarization triggers.

### 10.6 Initial chat message
- When a chat has no messages (first load in `GET /api/chats/:id/messages`):
  1. Read the user's language from the `ditchy_language` cookie (default: `pt-BR`).
  2. Select the appropriate initial user message prompt based on chat type and language:
     - Topic chat + pt-BR → `TOPIC_CHAT_INITIAL_USER_MESSAGE_PT`
     - Topic chat + en → `TOPIC_CHAT_INITIAL_USER_MESSAGE_EN`
     - Revision chat + pt-BR → `REVISION_CHAT_INITIAL_USER_MESSAGE_PT`
     - Revision chat + en → `REVISION_CHAT_INITIAL_USER_MESSAGE_EN`
  3. Call the LLM with the system prompt (topic or revision) and the selected initial user message as a `user`-role message.
  4. Save **only** the LLM's response as the first assistant message via `createMessage(chatId, 'assistant', response)`. The fake user message is NOT persisted.
  5. Return the saved assistant message in the response.
- This approach leverages the system prompt's language rule ("always match the language of the last user message") — the fake user message sets the language naturally without any special language-handling logic in the generation code.

### 10.7 Chat summarization
- Token counting uses `Math.ceil(text.length / 4)` as a rough approximation. Apply it to the summary text + all unsummarized message contents.
- After saving an assistant message, count the tokens in the summary + all unsummarized messages.
- If the total exceeds `SUMMARIZATION_TOKEN_THRESHOLD`:
  1. Identify which messages to summarize: all unsummarized messages except the last `MIN_UNSUMMARIZED_MESSAGES` (at least 2).
  2. Build the summarization input: previous summary (if any) + messages to summarize.
  3. Call the summarization model with the summarization prompt.
  4. Save the new cumulative summary via `upsertSummary()`.

### 10.8 Chat UI (`src/app/(main)/sections/[id]/chat/[chatId]/page.tsx`)

- **i18n**: Add a `chat` section to the `Translations` interface and both language files with all keys needed for the Chat UI (error messages, retry button, rate limit message, input placeholder, undo tooltip, etc.).

#### Data loading and `useChat` integration
- On mount, fetch `GET /api/chats/:id/messages` to get all existing messages.
- Initialize `useChat` from `@ai-sdk/react` with:
  - `api: '/api/chats/${chatId}/messages'` — the POST endpoint.
  - `initialMessages` — seeded from the GET response (convert DB messages to the format `useChat` expects: `{ id, role, content }`).
- `useChat` manages message state from this point forward — new messages and streaming are handled by the hook.
- Undo uses `setMessages()` from `useChat` to remove messages from client state after the API call succeeds.

#### Message rendering
- When rendering each message from `useChat`, filter `message.parts` to only display parts where `part.type === 'text'`. This hides tool call/result steps — students only see the final text output.
- **User messages**: Inside a bubble, aligned to the right.
- **AI messages**: No bubble, aligned to the left, different styling.
- **Rich content**: Render message text using `react-markdown` with plugins:
  - `remark-math` — parses `$...$` (inline) and `$$...$$` (block) LaTeX.
  - `rehype-katex` — renders parsed LaTeX (requires `katex` CSS imported in `globals.css` or the layout).
  - `react-syntax-highlighter` — code block syntax highlighting via a custom `code` component in `react-markdown`'s `components` prop.

#### Undo
- An undo button (↩) appears on hover next to each **user** message (not assistant messages).
- Undo is NOT available for messages that have been summarized (i.e., messages with `id <= summarized_up_to_message_id`). Since the summary boundary is not sent to the client, either: (a) the undo API returns 400 and the client shows an error, or (b) the GET endpoint includes the `summarizedUpToMessageId` so the client can hide undo buttons for old messages. Approach (b) is preferred.
- Clicking undo:
  1. Calls `POST /api/chats/:id/undo/:messageId`.
  2. On success: calls `setMessages()` to remove the undone message and all messages after it from `useChat` state.
  3. Places the returned `content` text back in the input field via `setInput()` from `useChat`.

#### Stream error handling (auto-undo)
- Use `useChat`'s `onError` callback.
- When a stream fails, the server has already deleted the user message from the DB (see 10.4).
- The client should: remove the failed user message from `useChat` state and restore the message text to the input field.
- Show a brief error toast (e.g., "Falha ao enviar mensagem. Tente novamente.").

#### Input area
- A `<textarea>` that starts as a single line and grows as the user types, up to a max height, then scrolls.
- **Enter** sends the message. **Shift+Enter** inserts a newline.
- **Send button** (icon) next to the input.
- Disabled while the AI is responding (`isLoading` from `useChat`).

#### Rate limiting
- If the POST returns 429, show a message: "Aguarde um momento antes de enviar outra mensagem." / "Wait a moment before sending another message."

#### Initial load
- Fetch messages from `GET /api/chats/:id/messages`.
- If the chat has no messages, the GET endpoint generates and returns the initial AI message (see 10.6).
- Show a loading spinner while the GET request is in flight.

---

## Phase 11 — Internationalization Review

The i18n infrastructure (`src/i18n/`, `useTranslation()` hook, language cookie) was set up in Phase 4.1, and all UI built in Phases 4–10 already uses translation keys. This phase is about completing and verifying full coverage.

### 11.1 Translation coverage audit
- Review every component and page to confirm all user-facing strings use translation keys (no hardcoded text).
- Ensure both `pt-BR.ts` and `en.ts` have complete translations for every key. Fill in any missing translations.
- Check all the following areas:
  - Landing/auth page: headings, descriptions, button labels, error messages.
  - Navbar: menu items ("Idioma"/"Language", "Sair"/"Logout").
  - Breadcrumb: "Painel"/"Dashboard".
  - Dashboard: "Criar nova Seção"/"Create new Section", empty state text, card labels, confirmation dialogs.
  - Section — Uploading: file status labels (including `error`), button labels, error messages.
  - Section — Planning: loading message, button labels ("Desfazer"/"Undo", "Regenerar Plano"/"Regenerate Plan", "Começar a Estudar"/"Start Studying"), checkbox label ("Já conheço"/"Already Known").
  - Section — Studying: progress text, card labels, "Revisão"/"Revision".
  - Chat: error messages, retry button, rate limit message, input placeholder.
  - All modals and confirmation dialogs.

### 11.2 Language switcher verification
- Verify the navbar language switcher correctly updates the cookie and re-renders the page.
- Test switching between "Português" and "English" on every page.
- Default language is `pt-BR`.

### 11.3 LLM language
- Verify the system prompts include language rules:
  1. Match the language of the user's last message.
  2. If unclear, match the language of the uploaded materials.
  3. If still unclear, fall back to the user's selected language (from the cookie, passed to the API).

---

## Phase 12 — Polish & Deploy

### 12.1 Error handling
- Review all API calls in the frontend and ensure every one has proper error handling.
- Show user-friendly error messages in Portuguese (or English, depending on the selected language).
- AI calls (chat, extraction, plan generation) show an error message with a "Tentar novamente" (Retry) button. No silent auto-retry.

### 12.2 Empty states
- Review all lists and ensure they have appropriate empty state messages:
  - Dashboard with no sections.
  - Section with no files uploaded.
  - Chat with no messages (handled by initial message generation).

### 12.3 Responsive design
- Test and adjust the layout for different screen sizes.
- Dashboard grid: 3 columns on desktop, 2 on medium screens, 1 on small screens.
- Topic/plan lists: full width on all sizes.
- Chat: full width, input area fixed at the bottom.
- Navbar: ensure it works on mobile (may need a compact version).

### 12.4 Loading states
- Ensure all data fetching shows a spinner while loading.
- Buttons show a loading spinner when an action is in progress.

### 12.5 Final review
- Test the complete user flow end-to-end: register → create section → upload files → wait for processing → plan generation → edit plan → start studying → chat with AI → complete topics.
- Test edge cases: rate limiting, max sections, max file size, undo at boundaries, summarization.
- Test language switching.
- Check for any inconsistencies between the UI and the spec documents.

### 12.6 Vercel deployment
- Push the code to the Git repository.
- Vercel auto-deploys from the connected branch.
- Verify all environment variables are set in Vercel project settings.
- Run database migrations against the production database.
- Test the deployed application end-to-end.
- Set up a custom domain if desired.

---

## Future TODOs

- **Send current plan in regenerate request**: Include the current plan JSON in the `POST /api/sections/:id/plan/regenerate` payload and pass it to the regeneration prompt, so the AI can see what the user already has and make targeted adjustments instead of generating from scratch.
- **Improve embedding chunking**: Ensure the text chunking algorithm never splits a word into two separate chunks — always break at word boundaries.
- **Smarter problem-aware retrieval**: Make the embedding and retrieval process more efficient by ensuring each problem is always placed in its own chunk(s). When a chunk belonging to a problem is retrieved via similarity search, return the entire problem (and its solution, if available) rather than just the matched chunk.
- **LLM API call observability**: Add token usage tracking and logging for every LLM API call. Two approaches under consideration: (1) Vercel AI SDK `wrapLanguageModel` middleware — centralized interception of all model calls, with `experimental_telemetry` metadata to identify the caller; (2) thin wrapper functions in `src/lib/ai.ts` that accept a label, call the SDK, and log the label, model, token usage (promptTokens/completionTokens), latency, and optionally the full request/response body. Goal: identify which steps consume the most tokens and where cheaper/weaker models could be used.
- **Improve the made-up user message for "sent" state**: Make the synthetic first user message more natural so the LLM response feels organic — ideally the AI starts by briefly summarizing what the student will learn in the session before diving in.