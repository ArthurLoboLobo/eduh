export const TEXT_EXTRACTION_MODEL = 'gemini-3.1-flash-lite-preview';
export const PLAN_GENERATION_MODEL = 'gemini-3-flash-preview';
export const EMBEDDING_MODEL = 'gemini-embedding-2-preview';
export const CHUNK_SIZE = 512;       // approximate tokens
export const CHUNK_OVERLAP = 100;    // approximate tokens
export const TOP_N_CHUNKS = 4;
export const TEACHING_CHAT_MODEL = 'gemini-3.1-pro-preview';
// Degraded model (used after best-model threshold for both plans)
export const DEGRADED_CHAT_MODEL = 'gemini-3-flash-preview';
export const SUMMARIZATION_MODEL = 'gemini-3.1-pro-preview';
export const SUMMARIZATION_TOKEN_THRESHOLD = 30000;
export const MIN_UNSUMMARIZED_MESSAGES = 5;
export const RATE_LIMIT_MESSAGES_PER_MINUTE = 10;

// Usage limits (weighted tokens per day)
export const DAILY_TOKEN_LIMIT_FREE_BEST = 100_000;    // ~2.5 topics (best model)
export const DAILY_TOKEN_LIMIT_FREE_CUTOFF = 200_000;   // ~5 topics (hard cutoff)
export const DAILY_TOKEN_LIMIT_PRO = 400_000;            // ~10 topics (best model)
export const TOKEN_WEIGHT_OUTPUT_MULTIPLIER = 6;         // output tokens cost 6x input

// Usage warning thresholds (percentage of current phase's limit)
export const USAGE_WARNING_THRESHOLDS = [75, 90];

