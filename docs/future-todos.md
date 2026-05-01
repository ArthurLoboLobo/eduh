# Future TODOs


## Actual TODOs

### UX / Aesthetics
- **Improve warnings**: Review and improve the warning messages shown to users (e.g. usage limits, validation errors, subscription alerts) to be clearer, more actionable, and consistent in tone.
- **Add title to "How it works" section**: The "How it works" section on the landing page is missing a visible title/heading. Add one to make the section clearer and easier to scan.
- **Remove dashboard search bar**: The search bar on the dashboard is unnecessary since users have very few sections. Remove it to simplify the UI.
- **Remove section descriptions**: Section descriptions serve no real purpose and add visual noise. Remove them from the UI and all related forms. _Note: requires a database migration to drop the `description` column from the sections table._
- **Fix breadcrumb flash**: Breadcrumbs briefly show the raw ID instead of the section/chat name on initial load. Fix by either passing the name through the route state or showing a skeleton placeholder until the name is available. 


### Mobile


### Chat / AI
- **Image uploads in chat**: Allow users to attach and send images in a chat message, so the AI can reason about visual content (e.g. problem screenshots, diagrams, handwritten notes).
- **System prompt update**: Include in the system prompt: "Do not use emojis".
- **Fix $$ formatting problem**: Stop dealing with the `$$` formatting problem by changing the LLM output. Instead, include how it should be done directly in the system prompt. The LLM needs to know that to correctly use `$$` it has to format it like:
  $$
  x
  $$
  instead of `$$ x $$`
- **Fix duplicated AI message on first load refresh**: If the chat page is reloaded when it's first loading, the first AI message gets duplicated because it calls the GET endpoint where it generates the first AI message again.
- **Concurrent messaging**: Let the user write messages while the AI is generating a response.
- **Page refresh resilience**: Make it possible to refresh the page without interfering with the response.
- **Improve embedding chunking**: Ensure the text chunking algorithm never splits a word into two separate chunks — always break at word boundaries.
- **Smarter problem-aware retrieval**: Make the embedding and retrieval process more efficient by ensuring each problem is always placed in its own chunk(s). When a chunk belonging to a problem is retrieved via similarity search, return the entire problem (and its solution, if available) rather than just the matched chunk.
- **Topic completion flow in chat**: When a topic is finished in a chat, make it easier for the user to mark the topic as completed and navigate to the next topic — e.g. a contextual prompt or inline action at the end of the conversation. Exact UX TBD.

### Subscription / Payments
- **Pix payment loading state**: When the user clicks to pay with Pix in the payment modal, show a spinning/loading icon while the QR code is being generated, so the UI doesn't feel frozen.
- **AbacatePay minimum PIX amount**: AbacatePay rejects PIX QR codes with `amount < 100` (R$1.00). If a user's balance leaves a PIX remainder below R$1.00 (e.g. balance = R$19.99), the subscribe endpoint returns `PAYMENT_CREATION_FAILED`. Needs to be handled gracefully.
- **Auto-renewal**: Add an auto-renew toggle to the subscription page. When enabled, if the user has enough balance at expiration, debit and extend automatically. If not, downgrade and notify. Requires a cron job (e.g. Vercel Cron) to check expirations periodically. (Automatic Pix)
- **Cron-based expiration handling**: Currently, plan expiration is checked on every API request. Add a cron job to proactively handle expirations (needed for auto-renewal and email notifications).
- **Email notifications for subscription events**: Notify users when their Pro subscription expires, when auto-renewal succeeds or fails due to insufficient balance.
- **More promotions**: Add new hardcoded promotions beyond the initial "university email" promotion (e.g. "Refer X friends → gain Y credits").

### Features
- **Share study plans**: Implement the ability to share study plans with others. Consider how both logged-in and non-logged-in users will view a shared plan, and how the sharing mechanism works (e.g., shareable link, copy-to-clipboard, etc.).

### Files / Storage
- **File re-upload collision on Blob**: When a user uploads a file, deletes it, and then tries to upload it again, the upload fails because the file still exists in Vercel Blob (deletion didn't remove it or the key collides). Fix by either ensuring deletion fully removes the blob before the UI allows re-upload, or by generating a unique key (e.g. with a timestamp or UUID) for every upload so collisions are impossible.
- **Better file size limit handling**: Improve the upload experience when a file exceeds the size limit — instead of hard-rejecting it, consider compressing the file automatically (e.g. for PDFs or images) before uploading. Show a clear, actionable error if the file still exceeds the limit after compression.
- **Show storage usage to the user**: Display the total file size limit and how much of it the user has already consumed (e.g. a progress bar or "X MB of Y MB used") so they know at a glance how much space they have left.
- **Impose and display a token limit on files**: Define a maximum token budget for uploaded files and enforce it server-side. Show the user their current token usage vs. the limit (similar to the storage usage indicator) so they understand how much of their file quota is being used by the AI context.


### Security / Anti-abuse
- **Production deployment**:
  - Add safety measures against spam (e.g., rate limiting OTP requests, captcha, abuse detection).
  - Limit on:
    - Number of topics and subtopics (very high, just to prevent spam)
    - Size of a message (very high, since since we will have a usage limit)
    - Size and number of tokens in the uploaded files (not very high, think of something reasonable)
- **Email Alias Loophole**: Normalize emails by stripping "plus" aliases (e.g., `user+test@gmail.com` -> `user@gmail.com`). Currently, aliases create separate accounts, which allows users to bypass limits and claim promotions multiple times.




---

## Report that Claude gave me

Additional issues identified through a codebase analysis that should be addressed before (or shortly after) going live.

### Critical

- **Add security headers to `next.config.ts`**: The config is essentially empty. Add standard production headers: Content-Security-Policy (CSP), X-Frame-Options, Strict-Transport-Security (HSTS), X-Content-Type-Options, and Referrer-Policy.
  - _Why it matters:_ Security headers instruct browsers to enforce protections against common web attacks. CSP prevents Cross-Site Scripting (XSS) by restricting which scripts can run. X-Frame-Options prevents clickjacking by blocking your site from being embedded in iframes. HSTS forces HTTPS connections, preventing downgrade attacks. X-Content-Type-Options stops browsers from guessing (MIME-sniffing) a file's type, which can lead to executing malicious files. Referrer-Policy controls how much URL information is leaked when navigating away from your site.

- **Add error boundaries (`error.tsx`, `global-error.tsx`, `not-found.tsx`)**: Currently, if anything breaks in the UI, users see raw Next.js error pages with no way to recover.
  - _Why it matters:_ React error boundaries are components that catch JavaScript errors anywhere in their child component tree and display a fallback UI instead of crashing the whole page. Without them, a single error in one component can take down the entire app. `error.tsx` catches errors within a route segment, `global-error.tsx` catches errors in the root layout itself, and `not-found.tsx` provides a friendly page for invalid URLs.

- **Handle AI API errors and add retry logic in `src/lib/ai.ts`**: All Gemini calls (`generatePlan`, `regeneratePlan`, `extractTextFromFile`, `embedText`, `embedTexts`, `summarizeChat`) have no try-catch. If Google rate-limits you (HTTP 429), times out, or has an outage, the app throws unhandled exceptions.
  - _Why it matters:_ External APIs are inherently unreliable — they can be temporarily unavailable, throttle your requests, or time out. Without error handling, any API hiccup crashes the entire request. Retry logic with exponential backoff (waiting 1s, then 2s, then 4s before retrying) lets the app recover from transient failures automatically.

- **Fix stream failure orphaned messages**: In the chat message POST route, the user message is saved to the database before the AI stream starts. If the stream fails (network drop, Gemini timeout, Vercel 60s limit), the user message persists with no assistant response and no cleanup.
  - _Why it matters:_ This creates a broken conversation state — the user sees their message was "sent" but got no response. The orphaned message also affects summarization counts and could confuse the AI context on the next message. The fix is to either defer saving the user message until the stream succeeds, or add cleanup logic in the error path.

### High

- **Centralize environment variable validation**: Each file checks its own env vars at runtime independently. If `GOOGLE_GENERATIVE_AI_API_KEY` or `DATABASE_URL` is missing, the app starts successfully but crashes on first use. Create a `src/lib/env.ts` that validates all required vars at startup.
  - _Why it matters:_ Fail-fast validation catches misconfiguration immediately at deploy time rather than letting the app run in a broken state. This is especially important on Vercel where env vars are configured per-environment — a missing var in production that exists in development is a common mistake.

- **Add input length validation on all API routes**: Section names, descriptions, chat messages, and plan regeneration guidance accept arbitrarily large strings. No max-length checks exist.
  - _Why it matters:_ Unbounded input can cause multiple problems: database bloat (storing megabytes of text in a single field), excessive LLM costs (sending huge prompts to Gemini), and potential denial-of-service (a single request consuming disproportionate resources). Reasonable limits (e.g., 100 chars for names, 5000 for messages) prevent abuse while being invisible to normal users.

- **Add error tracking/monitoring (e.g., Sentry)**: The only logging is `console.error`, which goes to Vercel's ephemeral function logs. There's no alerting, no error grouping, and no way to proactively know when things break.
  - _Why it matters:_ In production, you can't watch logs in real time. Error tracking services capture errors with full context (stack trace, user info, request data), group duplicates, and alert you. Without this, you only learn about bugs when users complain — and most users don't complain, they just leave.

- **Create `vercel.json` with explicit function configuration**: No Vercel config exists. Function timeouts, regions, and memory are all at defaults. The plan generation could hit edge cases with the default 60s (Hobby) or 10s (if misconfigured) limits.
  - _Why it matters:_ `vercel.json` lets you explicitly set function timeouts (up to 60s on Pro), memory allocation, and deployment regions. Without it, you rely on defaults that may not match your needs — especially for AI-heavy routes that need the full 60s.

- **Add retry logic for Vercel Blob deletion**: When deleting sections or files, if the `del(blobUrls)` call fails (network error), the database records are still deleted but orphaned blobs remain in Vercel Blob storage, incurring ongoing costs.
  - _Why it matters:_ Vercel Blob charges for storage. Orphaned files accumulate silently over time. The fix is to either retry blob deletion with backoff, or run a periodic cleanup job that reconciles blob storage against the database.

### Moderate

- **Reduce JWT expiration and consider refresh tokens**: JWTs expire after 30 days with no refresh mechanism. If a token is compromised (e.g., stolen via browser extension or shared device), it remains valid for the full 30 days. Logout only clears the cookie — the token itself can still be used if extracted.
  - _Why it matters:_ JWTs are stateless — the server can't revoke them once issued. A shorter expiration (e.g., 15 min to 1 day) paired with refresh tokens limits the damage window if a token is leaked. Refresh tokens can be stored server-side and revoked immediately.

- **Fix race conditions in summarization, undo, and plan regeneration**: The summarization upsert (SELECT then INSERT/UPDATE) isn't atomic — concurrent messages can create duplicate summary rows. Message undo during active streaming is unsafe. Concurrent plan regenerations create multiple drafts.
  - _Why it matters:_ Race conditions are bugs that only appear under concurrent access — rare in development but common in production. They cause data corruption that's hard to diagnose. Fixes include database-level locking (`SELECT ... FOR UPDATE`), unique constraints, or optimistic concurrency control (version columns).

- **Add a caching strategy**: Every page load fetches fresh data from the database. No Cache-Control headers, no client-side caching (SWR/React Query), no server-side caching. This increases latency and database load.
  - _Why it matters:_ Most data in this app (section lists, topics, plan content) changes infrequently but is read on every page load. Caching stores recent responses and reuses them for a short time (e.g., 60s), dramatically reducing database queries and improving page load speed.

- **Improve SEO and metadata**: The root layout only has a basic title and description. Missing: Open Graph tags (for social sharing previews), favicon, `robots.txt`, `sitemap.xml`, and the `lang` attribute is hardcoded to `pt-BR` instead of being dynamic.
  - _Why it matters:_ Open Graph tags control how your link appears when shared on social media or messaging apps — without them, shares show a generic blank preview. `robots.txt` and `sitemap.xml` help search engines discover and index your pages. A dynamic `lang` attribute ensures screen readers and browsers use the correct language.

- **Automate database migrations on deploy**: Migrations require manually running `npm run migrate`. This is easy to forget, causing schema mismatches between the code and database.
  - _Why it matters:_ If a deploy expects a new column or table that doesn't exist yet, the app crashes. Automating migrations (e.g., via a Vercel build command or a pre-deploy script) ensures the database schema always matches the deployed code.

### Low

- **Validate file signatures (magic numbers), not just MIME types**: File uploads check the MIME type header but don't verify the actual file content. A file with a spoofed MIME header would pass validation.
  - _Why it matters:_ MIME types are set by the client and can be trivially faked. Magic numbers are the first few bytes of a file that identify its true format (e.g., PDFs always start with `%PDF`). Checking both prevents uploading disguised malicious files.

- **Add CSRF tokens for defense-in-depth**: Currently mitigated by `SameSite: lax` cookies, but no explicit CSRF protection exists.
  - _Why it matters:_ Cross-Site Request Forgery (CSRF) tricks a logged-in user's browser into making unwanted requests to your app. `SameSite` cookies block most CSRF attacks, but explicit tokens provide an additional layer — useful if you ever relax cookie settings or support cross-origin scenarios.

- **Paginate chat messages**: All messages are loaded at once. Long conversations will become slow.
  - _Why it matters:_ Loading hundreds of messages in a single query and sending them all to the client increases response time and memory usage on both sides. Pagination loads only the most recent messages and fetches older ones on demand (e.g., "scroll to load more").

