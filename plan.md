# Ditchy — Implementation Plan

This document describes every phase needed to build Ditchy from scratch, in order. Each phase must be fully completed before moving to the next one, as later phases depend on earlier ones.

The default language of the platform is **Brazilian Portuguese**. English is the secondary language, available via the language switcher.

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
- File conversion libraries for text extraction (e.g., `pdf-img-convert` or `pdfjs-dist` for PDF-to-image, and a DOCX/PPTX conversion solution — see Phase 6.5 note on Vercel constraints)
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
3. **`sections`** — `id` (UUID PK), `user_id` (UUID FK → users, ON DELETE CASCADE), `name` (TEXT), `description` (TEXT, nullable), `status` (TEXT, default `'uploading'`), `plan_total_batches` (INTEGER, nullable), `plan_processed_batches` (INTEGER, nullable), `created_at` (TIMESTAMP).
4. **`files`** — `id` (UUID PK), `section_id` (UUID FK → sections, ON DELETE CASCADE), `blob_url` (TEXT), `original_name` (TEXT), `file_type` (TEXT), `size_bytes` (INTEGER), `status` (TEXT, default `'uploading'`), `extracted_text` (TEXT, nullable), `created_at` (TIMESTAMP).
5. **`plan_drafts`** — `id` (UUID PK), `section_id` (UUID FK → sections, ON DELETE CASCADE), `plan_json` (JSONB), `created_at` (TIMESTAMP).
6. **`plan_batches`** — `id` (UUID PK), `section_id` (UUID FK → sections, ON DELETE CASCADE), `batch_index` (INTEGER), `content` (TEXT). Stores the pre-split text batches during plan generation so each chained function call can retrieve the next batch by index. Deleted after generation completes.
7. **`topics`** — `id` (UUID PK), `section_id` (UUID FK → sections, ON DELETE CASCADE), `title` (TEXT), `order` (INTEGER), `is_completed` (BOOLEAN, default false), `created_at` (TIMESTAMP).
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
- **Right side**: Profile avatar (placeholder — could be a circle with the first letter of the email).
  - Clicking the avatar opens a dropdown menu:
    - **Idioma** (Language) — clicking it reveals language options inline: "Português" and "English". Selecting one saves the preference in a cookie.
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

### 5.1 Database queries (`src/lib/db/queries/sections.ts`)
- `listSections(userId)` — returns all sections for a user, ordered by `created_at` descending. Include a count of completed topics and total topics for each section (for the progress indicator).
- `createSection(userId, name, description)` — inserts a new section. Before inserting, count existing sections for the user and reject if already at 10.
- `getSection(sectionId, userId)` — returns a single section, only if it belongs to the user.
- `deleteSection(sectionId, userId)` — deletes the section (cascade handles related data). Must also delete associated files from Vercel Blob.

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
- Returns the section details if it belongs to the authenticated user.
- Returns 404 if not found or not owned.

#### `DELETE /api/sections/:id`
- Validates ownership.
- Lists all files in the section, deletes each from Vercel Blob.
- Deletes the section from the database (cascade handles the rest).

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

### 6.1 Database queries (`src/lib/db/queries/files.ts`)
- `listFiles(sectionId)` — returns all files in a section, ordered by `created_at`.
- `createFile(sectionId, blobUrl, originalName, fileType, sizeBytes)` — inserts a file row with status `uploading`.
- `updateFileStatus(fileId, status)` — updates the file status.
- `updateFileExtractedText(fileId, extractedText)` — saves the extracted text and sets status to `processed`.
- `deleteFile(fileId)` — deletes the file row.
- `getFile(fileId)` — returns a single file.
- `getTotalSizeForSection(sectionId)` — returns the sum of `size_bytes` for all files in the section.
- `getNextUnprocessedFile(sectionId)` — returns the next file with status `uploading` or `processing` (for the background job chain).

### 6.2 API routes

#### `GET /api/sections/:id/files`
- Validates section ownership.
- Returns all files in the section.

#### `POST /api/files/upload-url`
- Receives `{ sectionId, fileName, fileType, fileSize }`.
- Validates:
  - User is authenticated and owns the section.
  - Section is in `uploading` status.
  - File type is allowed (PDF, JPEG, PNG, TXT, DOCX, PPTX, etc.).
  - Adding this file would not exceed the 100 MB section limit (check `getTotalSizeForSection` + new file size).
- Generates a signed upload URL from Vercel Blob (short expiry, ~5 minutes).
- Returns the signed URL and a temporary token/identifier for the confirm step.

#### `POST /api/files/confirm`
- Receives `{ sectionId, blobUrl, originalName, fileType, sizeBytes }`.
- Validates section ownership and status.
- Creates the file row in the database with status `uploading`.
- Triggers the file processing background job: makes a non-awaited `fetch()` call to `POST /api/files/process` with the file ID.
- Returns the created file.

#### `POST /api/files/process` (internal — background job)
- Receives `{ fileId }`.
- This is an internal endpoint. Before processing, verify the file exists and its status is `uploading`, `processing`, or `error` (to allow retries) to prevent external abuse.
- This is a self-chaining background job:
  1. Get the file from the database.
  2. Update status to `processing`.
  3. Download the file content from Vercel Blob.
  4. **Convert the file to images** before sending to Gemini (see 6.5). Every file type is converted to a sequence of images:
     - **PDF**: Convert each page to an image (use a library like `pdf-img-convert` or `pdfjs-dist` with canvas rendering).
     - **DOCX/PPTX**: Convert to PDF first (use `libreoffice-convert` or a similar library), then convert each page/slide to an image.
     - **Images (JPEG, PNG, etc.)**: Already images — use as-is.
     - **TXT**: Wrap the text content into a simple layout and render to an image, or send as plain text directly to Gemini (no conversion needed for plain text).
  5. Send the images to Gemini for AI text extraction (see 6.3). Each image is sent as part of a multimodal prompt. If there are too many images for a single API call, split into batches and concatenate results.
  6. Save the extracted text to the file row and set status to `processed`. If extraction fails, set status to `error`.
  7. Check if there are more unprocessed files in the same section (`getNextUnprocessedFile`).
  8. If yes, make a non-awaited `fetch()` to this same endpoint with the next file's ID, then return.
  9. If no, return (all files processed).

#### `DELETE /api/files/:id`
- Validates that the file belongs to a section owned by the user.
- Deletes the file from Vercel Blob.
- Deletes the file row from the database.
- Also deletes any embeddings associated with this file.

#### `GET /api/files/:id/preview`
- Returns the Blob URL for the original file so the client can display it in the preview modal.

#### `GET /api/sections/:id/files/status`
- Returns the status of all files in the section (for polling).

### 6.3 AI text extraction setup
- Write the text extraction prompt in `src/prompts/index.ts`. The prompt instructs the AI to extract:
  - All readable text.
  - Math formulas converted to LaTeX.
  - Descriptions of embedded images.
- Use the `gemini-2.5-flash-lite` model (configured in `src/config/ai.ts`).

### 6.4 `src/config/ai.ts` (initial version)
Create the config file with the initial parameters needed for this phase:
- `TEXT_EXTRACTION_MODEL: 'gemini-2.5-flash-lite'`
- Other parameters will be added in later phases as needed.

### 6.5 File-to-image conversion (`src/lib/file-conversion.ts`)
- `convertToImages(fileBuffer, fileType): Buffer[]` — converts any supported file into a sequence of image buffers:
  - PDF → one image per page (use `pdf-img-convert` or `pdfjs-dist` with canvas).
  - DOCX/PPTX → convert to PDF first (use `libreoffice-convert` or similar), then one image per page/slide.
  - Images (JPEG, PNG) → return as-is.
  - TXT → return the raw text (no image conversion needed; sent as text directly to Gemini).
- Install the necessary conversion libraries in Phase 1.2 (add `pdf-img-convert` or equivalent, and `libreoffice-convert` or equivalent for Office formats).
- **Note**: `libreoffice-convert` requires LibreOffice installed on the server. On Vercel serverless functions, this is not available. Alternative: use a cloud-based document conversion API, or restrict supported file types to PDF, images, and TXT only (dropping DOCX/PPTX support). Decide based on deployment constraints.

### 6.6 AI wrapper (`src/lib/ai.ts`) — initial version
- `extractTextFromImages(images: Buffer[]): string` — sends the images to Gemini as a multimodal prompt with the extraction instructions. Returns the extracted text. If there are too many images for a single call, split into batches and concatenate results.
- `extractTextFromPlainText(text: string): string` — sends plain text to Gemini for structured extraction (LaTeX conversion, formatting). Simpler than the image path.

### 6.7 Uploading UI (`src/app/(main)/sections/[id]/` — Uploading component)
- **File upload zone**: Dashed border area. Clicking it opens the system file picker. Also supports drag-and-drop.
- **File list**: Below the upload zone, shows all uploaded files with:
  - File name.
  - Status label: `Enviando` → `Processando` → `Processado`. If extraction fails: `Erro`.
  - Click on the file name to preview (opens a modal showing the original file — PDF rendered in an iframe, images displayed directly).
  - Remove button (X icon) to delete the file.
  - If a file has `error` status, show a "Tentar novamente" (Retry) button that re-triggers processing by calling `POST /api/files/process` with the file ID.
- **Polling**: Use `setInterval` to poll `GET /api/sections/:id/files/status` every few seconds to update file statuses.
- **"Iniciar Planejamento" (Start Planning) button**: Only enabled when all uploaded files have status `processed` (no files with `uploading`, `processing`, or `error` status) and there is at least one file. Clicking it calls `POST /api/sections/:id/start-planning` (Phase 7) and transitions the section.

---

## Phase 7 — Study Plan Generation

### 7.1 Prompts (`src/prompts/index.ts` — additions)
Add the study plan generation prompt:
- Instructs the AI to create a structured study plan from the provided text.
- The plan must be a JSON object with an array of topics, each containing a title and an array of subtopic strings.
- The order matters — topics should be in the recommended study order.
- The AI receives the current plan (if any) and a new batch of text, and outputs an updated plan incorporating the new material.
- Include a field for optional user guidance (used during regeneration).

### 7.2 AI config additions (`src/config/ai.ts`)
Add:
- `PLAN_GENERATION_MODEL: 'gemini-2.5-flash-lite'`
- `PLAN_BATCH_SIZE` — max token/character limit per batch.

### 7.3 AI wrapper additions (`src/lib/ai.ts`)
- `generatePlanBatch(currentPlan, textBatch, guidance?): PlanJSON` — sends the current plan and a batch of text to the LLM, returns the updated plan as structured JSON.

### 7.4 Database queries (`src/lib/db/queries/plans.ts`)
- `createPlanDraft(sectionId, planJson)` — inserts a new plan draft row.
- `upsertGeneratingDraft(sectionId, planJson)` — during generation, updates the in-progress draft instead of creating a new one. If no draft exists yet for this generation cycle, creates one. This ensures each generation cycle (initial or regeneration) produces only one draft row, keeping the undo stack clean.
- `getCurrentPlanDraft(sectionId)` — returns the draft with the highest `created_at`.
- `deleteNewestPlanDraft(sectionId)` — deletes the most recent draft (undo).
- `deleteAllPlanDrafts(sectionId)` — removes all drafts for a section (cleanup after "Start Studying").
- `updateSectionPlanProgress(sectionId, totalBatches, processedBatches)` — updates the batch progress fields.
- `storePlanBatches(sectionId, batches)` — inserts the text batches into the `plan_batches` table with sequential `batch_index` values.
- `getPlanBatch(sectionId, batchIndex)` — returns the text content of a specific batch by index.
- `deletePlanBatches(sectionId)` — deletes all stored batches for a section (cleanup after generation completes).

### 7.5 Database queries (`src/lib/db/queries/topics.ts`)
- `createTopicsFromPlan(sectionId, planJson)` — takes the final plan JSON and inserts rows into `topics` and `subtopics` tables with the correct order values. Topics marked as "known" in the plan get `is_completed = true`.
- `listTopics(sectionId)` — returns all topics with their subtopics, ordered by `order`.

### 7.6 API routes

#### `POST /api/sections/:id/start-planning`
- Validates ownership and that the section is in `uploading` status.
- Changes section status to `planning`.
- Gathers all extracted text from the section's files.
- Splits the text into batches based on `PLAN_BATCH_SIZE`.
- Stores the batches in the `plan_batches` table via `storePlanBatches()`.
- Sets `plan_total_batches` and `plan_processed_batches = 0` on the section.
- Triggers the first batch by making a non-awaited `fetch()` to `POST /api/sections/:id/plan/generate-batch`.
- Returns success.

#### `POST /api/sections/:id/plan/generate-batch` (internal — background job)
- This is an internal endpoint. Before processing, verify the section is in `planning` status and `plan_processed_batches < plan_total_batches` to prevent external abuse.
- Self-chaining job:
  1. Get the current in-progress plan (via `getCurrentPlanDraft`) and retrieve the next batch from `plan_batches` using `getPlanBatch(sectionId, plan_processed_batches)`.
  2. Call `generatePlanBatch()` with the current plan and text batch.
  3. Update the same draft row with the result using `upsertGeneratingDraft()` (do NOT create a new draft per batch — this keeps the undo stack clean so intermediate batch results don't pollute it).
  4. Increment `plan_processed_batches` on the section.
  5. If more batches remain, make a non-awaited `fetch()` to this same endpoint, then return.
  6. If this was the last batch, delete the stored batches via `deletePlanBatches()` and the plan is ready.

#### `GET /api/sections/:id/plan`
- Returns the current plan draft's `plan_json`.

#### `PUT /api/sections/:id/plan`
- Receives the updated `plan_json` from the client (after user edits).
- Creates a new plan draft row with the updated JSON.

#### `POST /api/sections/:id/plan/undo`
- Deletes the newest plan draft for the section.
- Returns the new current draft (the previous one).
- If no drafts remain, returns an error.

#### `POST /api/sections/:id/plan/regenerate`
- Receives `{ guidance }` (optional text).
- Does NOT delete existing drafts — old drafts are kept so the user can undo back to the pre-regeneration plan.
- Deletes any leftover `plan_batches` for the section, then re-gathers all extracted text, re-splits into batches, and stores them via `storePlanBatches()`.
- Resets `plan_processed_batches` to 0 and recalculates `plan_total_batches`.
- Creates a new empty draft via `createPlanDraft(sectionId, null)` — this becomes the new "top" of the undo stack while preserving old drafts below it. Then starts the batch chain. Each batch updates this newest draft via `upsertGeneratingDraft()`. The guidance text is passed to the prompt.
- When complete, the regenerated plan is one new draft on top of the existing stack. Undo walks back to the previous plan.

#### `GET /api/sections/:id/plan/status`
- Returns the current generation status:
  - `generating` if `plan_processed_batches < plan_total_batches`.
  - `ready` if all batches are processed.
- Returns the progress as a percentage: `(plan_processed_batches / plan_total_batches) * 100`.

#### `POST /api/sections/:id/start-studying`
- Validates that the section is in `planning` status and the plan is ready.
- Gets the current plan draft.
- Calls `createTopicsFromPlan()` to write topics and subtopics to their tables.
- Deletes all plan drafts for the section.
- Changes section status to `studying`.

### 7.7 Planning UI (`src/app/(main)/sections/[id]/` — Planning component)

#### Loading state
- While `status` from `GET /api/sections/:id/plan/status` is `generating`:
  - Show a spinner with the message "Criando seu plano de estudos..." (Creating your study plan...).
  - Show a progress bar with the percentage (e.g., "43%").
  - Poll the status endpoint every few seconds using `setInterval`.

#### Plan editor (shown when status is `ready`)
- Display the plan as a vertical list of topic cards.
- **Each topic card**:
  - Drag handle on the left side (for reordering topics via drag-and-drop).
  - Topic title — click to edit (inline editing). The editable state appears on hover.
  - "Já conheço" (Already Known) checkbox in the top-left corner. Marking it dims the card.
  - Trash button — appears on hover. Clicking it removes the topic and all its subtopics from the plan.
  - List of subtopics inside the card:
    - Each subtopic text is click-to-edit (inline). Editable on hover.
    - Trash button on each subtopic — appears on hover.
    - Subtopics are reorderable via drag-and-drop within the topic.
    - "+" button below the last subtopic — appears on hover. Creates a new empty subtopic.
- **"+" button** below all topic cards: creates a new empty topic at the end.
- **Undo button** ("Desfazer"): Top-right, above the plan. Every edit (delete, edit text, reorder, create, mark as known) saves a new draft via `PUT /api/sections/:id/plan`. Clicking undo calls `POST /api/sections/:id/plan/undo` and loads the previous draft.
- **"Regenerar Plano" (Regenerate Plan) button**: Below the plan. Clicking it reveals an inline text box for optional guidance (e.g., "Focar mais em cálculo"). Confirming calls `POST /api/sections/:id/plan/regenerate` and returns to the loading state.
- **"Começar a Estudar" (Start Studying) button**: At the bottom. Calls `POST /api/sections/:id/start-studying`.

#### Drag-and-drop
- Use a drag-and-drop library (e.g., `@dnd-kit/core` and `@dnd-kit/sortable`) for reordering topics and subtopics.
- After each reorder, save the updated plan as a new draft.

---

## Phase 8 — Studying & Chat

### 8.1 RAG setup

#### Chunking and embedding (`src/lib/ai.ts` — additions)
- `chunkText(text, chunkSize, overlap): string[]` — splits text into chunks of ~1000 tokens with ~100 token overlap.
- `embedText(text): number[]` — calls Gemini embedding API (`gemini-embedding-001`) with `outputDimensionality: 1536` and returns the vector.
- `embedChunks(chunks): number[][]` — embeds multiple chunks (can batch API calls for efficiency).

#### Database queries (`src/lib/db/queries/embeddings.ts`)
- `createEmbeddings(sectionId, fileId, chunks, embeddings)` — bulk inserts chunk text and embedding vectors into the `embeddings` table.
- `searchChunks(sectionId, queryEmbedding, topN)` — performs a vector similarity search (`<=>` cosine distance) on the `embeddings` table, filtered by `section_id`, returning the top N chunks.
- `deleteEmbeddingsByFile(fileId)` — deletes all embeddings for a file.

#### Embedding pipeline
- After file processing is complete (Phase 6), add a step that chunks the extracted text and creates embeddings.
- This should happen during the file processing background job: after extracting text, chunk it, embed the chunks, and store them.
- Update the file processing flow in `POST /api/files/process` to include this step.

### 8.2 AI config additions (`src/config/ai.ts`)
Add all remaining parameters:
- `TEACHING_CHAT_MODEL: 'gemini-3.1-flash-lite-preview'`
- `SUMMARIZATION_MODEL: 'gemini-2.5-flash-lite'`
- `EMBEDDING_MODEL: 'gemini-embedding-001'`
- `CHUNK_SIZE: 1000` (tokens)
- `CHUNK_OVERLAP: 100` (tokens)
- `TOP_N_CHUNKS: 4`
- `SUMMARIZATION_TOKEN_THRESHOLD` — the token count that triggers summarization.
- `MIN_UNSUMMARIZED_MESSAGES: 2`
- `RATE_LIMIT_MESSAGES_PER_MINUTE` — max messages per minute per user.

### 8.3 Prompts (`src/prompts/index.ts` — additions)
Add all remaining prompts:

- **Topic chat system prompt**: Includes the full study plan with completion status, the current topic and subtopics, pedagogical instructions (introduce → explain → solve problem → student practice → next subtopic → topic complete), language rules.
- **Revision chat system prompt**: Similar to topic chat but framed for general revision across all topics. No specific topic/subtopics — the student asks about anything.
- **Chat summarization prompt**: Instructs the AI to create a concise cumulative summary of the conversation up to a certain point, preserving key context.

### 8.4 Database queries

#### `src/lib/db/queries/topics.ts` (additions)
- `getTopic(topicId)` — returns a single topic with its subtopics.
- `toggleTopicCompletion(topicId)` — flips `is_completed`.
- `getTopicProgress(sectionId)` — returns `{ completed: number, total: number }`.
- `listTopicsWithMessageCount(sectionId)` — returns all topics with subtopics, ordered by `order`, each including the count of user messages in its chat (LEFT JOIN through `chats` → `messages` where `role = 'user'`). Used by the Studying UI and `GET /api/sections/:id/topics`.

#### `src/lib/db/queries/chats.ts`
- `findOrCreateChat(sectionId, topicId, type)` — finds an existing chat or creates one. For topic chats, `topicId` is set. For revision chats, `topicId` is null and `type` is `'revision'`.
- `getChat(chatId)` — returns the chat with its section and topic info.

#### `src/lib/db/queries/messages.ts`
- `getMessages(chatId)` — returns all messages for a chat, ordered by `id`.
- `getMessagesAfterSummary(chatId)` — returns messages with `id > summarized_up_to_message_id` (the unsummarized messages).
- `createMessage(chatId, role, content)` — inserts a message.
- `deleteMessagesFrom(chatId, messageId)` — deletes the message with the given ID and all messages after it (for undo).
- `getMessageCountLastMinute(userId)` — counts messages sent by the user in the last 60 seconds (for rate limiting).

#### `src/lib/db/queries/summaries.ts`
- `getSummary(chatId)` — returns the current summary for the chat (if any).
- `upsertSummary(chatId, summaryText, summarizedUpToMessageId)` — creates or updates the summary row.

### 8.5 API routes

#### `GET /api/sections/:id/topics`
- Returns all topics with subtopics, ordered by `order`.
- Includes completion status and message count for each topic's chat (via a LEFT JOIN through `chats` → `messages` counting `role = 'user'`).

#### `PATCH /api/topics/:id`
- Toggles `is_completed` for the topic.

#### `POST /api/sections/:id/chats`
- Receives either `{ topicId }` for topic chats, or `{ type: 'revision' }` for the revision chat.
- Validates section ownership.
- Calls `findOrCreateChat(sectionId, topicId, type)` — finds an existing chat or creates one.
- Returns the chat (including its `id`, which the client uses to navigate to `/sections/[id]/chat/[chatId]`).

#### `GET /api/chats/:id/messages`
- Validates that the chat belongs to a section owned by the user.
- Returns:
  - The summary text (if any).
  - All messages after the summary (unsummarized messages).
  - If no messages exist and this is the first load, generate the initial AI introductory message (see 8.7).

#### `POST /api/chats/:id/messages`
- Receives `{ content }` (the user's message).
- **Rate limiting**: Check `getMessageCountLastMinute(userId)`. If over the limit, return 429 with an error message.
- Save the user's message to the database.
- Build the context for the LLM:
  - System prompt (topic or revision).
  - Summary (if any).
  - Recent messages (unsummarized).
  - The new user message.
- Call the LLM with streaming enabled, including the `searchFiles` tool definition.
- Stream the response back to the client token-by-token.
- When the stream completes, save the full assistant message to the database.
- After saving, check if summarization is needed (see 8.8).

#### `POST /api/chats/:id/undo/:messageId`
- Validates ownership and that the message hasn't been summarized (`messageId > summarized_up_to_message_id`).
- Gets the content of the message being undone (to return it to the client for the input box).
- Deletes the message and all subsequent messages.
- Returns `{ content }` — the text of the undone message.

### 8.6 `searchFiles` tool implementation
- Define the tool schema for the Vercel AI SDK:
  - Name: `searchFiles`
  - Description: "Search the student's uploaded files for relevant content."
  - Parameters: `{ query: string }`
- When the LLM calls this tool:
  1. Embed the `query` using `embedText()`.
  2. Call `searchChunks(sectionId, queryEmbedding, TOP_N_CHUNKS)`.
  3. Return the chunk texts to the LLM as the tool result.

### 8.7 Initial chat message
- When a chat has no messages (first load):
  - For **topic chats**: Generate an AI message introducing the topic and its subtopics, and asking the student for confirmation to start. Save this as the first assistant message.
  - For the **revision chat**: Generate an AI message introducing the revision chat and what the student can do here. Save this as the first assistant message.

### 8.8 Chat summarization
- After saving an assistant message, count the tokens in the summary + all unsummarized messages.
- If the total exceeds `SUMMARIZATION_TOKEN_THRESHOLD`:
  1. Identify which messages to summarize: all unsummarized messages except the last `MIN_UNSUMMARIZED_MESSAGES` (at least 2).
  2. Build the summarization input: previous summary (if any) + messages to summarize.
  3. Call the summarization model with the summarization prompt.
  4. Save the new cumulative summary via `upsertSummary()`.

### 8.9 Studying UI (`src/app/(main)/sections/[id]/` — Studying component)

- **Top area**: Progress bar showing overall completion (e.g., "3/8 tópicos completos") with the green progress bar.
- **Topic card list**: Vertical list of cards, each showing:
  - Topic title.
  - Completion checkbox (top-right) — clicking it calls `PATCH /api/topics/:id`.
  - Number of interactions (message count from the chat).
  - Completed topics appear dimmed.
- Clicking a topic card navigates to `/sections/[id]/chat/[chatId]`.
  - Before navigating, call `POST /api/sections/:id/chats` with `{ topicId }` to ensure the chat exists. Use the returned chat ID for the URL.
- **Revision chat card**: A special card at the bottom of the list labeled "Revisão" (Revision). Clicking it calls `POST /api/sections/:id/chats` with `{ type: 'revision' }` (no `topicId`) to get/create the revision chat, then navigates to its chat page.

### 8.10 Chat UI (`src/app/(main)/sections/[id]/chat/[chatId]/page.tsx`)

- **Message display**:
  - User messages: inside a bubble, aligned to the right.
  - AI messages: no bubble, aligned to the left. Just text with different styling.
- **Rendering**: Support LaTeX (inline `$...$` and block `$$...$$`), Markdown, and syntax-highlighted code blocks. Use libraries like `react-markdown`, `remark-math`, `rehype-katex`, and a syntax highlighter.
- **Undo button (↩)**: Appears on hover next to each user message. Clicking it calls `POST /api/chats/:id/undo/:messageId`, removes the message and all subsequent messages from the display, and places the message text back in the input box.
- **Streaming**: When the AI responds, display the response token-by-token as it arrives. Use the Vercel AI SDK's `useChat` hook.
- **Input area**:
  - Single-line text field that grows as the user types, up to a max height, then scrolls.
  - **Enter** sends the message. **Shift+Enter** inserts a newline.
  - **Send button** (icon) next to the input.
  - Disabled while the AI is responding.
- **Error handling**: If the LLM call fails, show an error message with a "Tentar novamente" (Retry) button.
- **Rate limit**: If the user exceeds the rate limit, show a message: "Aguarde um momento antes de enviar outra mensagem." (Wait a moment before sending another message.)
- **Initial load**: Fetch messages from `GET /api/chats/:id/messages`. If no messages exist, the endpoint generates and returns the initial AI message.

---

## Phase 9 — Internationalization Review

The i18n infrastructure (`src/i18n/`, `useTranslation()` hook, language cookie) was set up in Phase 4.1, and all UI built in Phases 4–8 already uses translation keys. This phase is about completing and verifying full coverage.

### 9.1 Translation coverage audit
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

### 9.2 Language switcher verification
- Verify the navbar language switcher correctly updates the cookie and re-renders the page.
- Test switching between "Português" and "English" on every page.
- Default language is `pt-BR`.

### 9.3 LLM language
- Verify the system prompts include language rules:
  1. Match the language of the user's last message.
  2. If unclear, match the language of the uploaded materials.
  3. If still unclear, fall back to the user's selected language (from the cookie, passed to the API).

---

## Phase 10 — Polish & Deploy

### 10.1 Error handling
- Review all API calls in the frontend and ensure every one has proper error handling.
- Show user-friendly error messages in Portuguese (or English, depending on the selected language).
- AI calls (chat, extraction, plan generation) show an error message with a "Tentar novamente" (Retry) button. No silent auto-retry.

### 10.2 Empty states
- Review all lists and ensure they have appropriate empty state messages:
  - Dashboard with no sections.
  - Section with no files uploaded.
  - Chat with no messages (handled by initial message generation).

### 10.3 Responsive design
- Test and adjust the layout for different screen sizes.
- Dashboard grid: 3 columns on desktop, 2 on medium screens, 1 on small screens.
- Topic/plan lists: full width on all sizes.
- Chat: full width, input area fixed at the bottom.
- Navbar: ensure it works on mobile (may need a compact version).

### 10.4 Loading states
- Ensure all data fetching shows a spinner while loading.
- Buttons show a loading spinner when an action is in progress.

### 10.5 Final review
- Test the complete user flow end-to-end: register → create section → upload files → wait for processing → plan generation → edit plan → start studying → chat with AI → complete topics.
- Test edge cases: rate limiting, max sections, max file size, undo at boundaries, summarization.
- Test language switching.
- Check for any inconsistencies between the UI and the spec documents.

### 10.6 Vercel deployment
- Push the code to the Git repository.
- Vercel auto-deploys from the connected branch.
- Verify all environment variables are set in Vercel project settings.
- Run database migrations against the production database.
- Test the deployed application end-to-end.
- Set up a custom domain if desired.
