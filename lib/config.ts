/** Central configuration. Server-side only (reads environment variables). */

/**
 * Text embedding model of the Gemini API. This code uses its "task type" option
 * (RETRIEVAL_QUERY / RETRIEVAL_DOCUMENT), so it is written for this model.
 */
export const EMBEDDING_MODEL = "gemini-embedding-001";

/** Vectors are truncated to 768 numbers: smaller and faster, with little quality loss. */
export const EMBEDDING_DIMENSIONS = 768;

/** Default chat model (free tier). Can be replaced with the GEMINI_CHAT_MODEL variable. */
export const DEFAULT_CHAT_MODEL = "gemini-3.1-flash-lite";

/** Number of documents retrieved for every query. */
export const TOP_K = 3;

/**
 * Minimum cosine similarity for a document to be treated as relevant.
 * HEURISTIC starting value, not tuned on data. Change it without editing code
 * by setting the MIN_SIMILARITY environment variable.
 */
export const DEFAULT_MIN_SIMILARITY = 0.45;

/**
 * If the best intent score is below this, the message is labelled OUT_OF_SCOPE.
 * HEURISTIC starting value. Change it with the INTENT_MIN_SCORE environment variable.
 */
export const DEFAULT_INTENT_MIN_SCORE = 0.5;

/** Intent score = average similarity of the query to its N closest example sentences. */
export const INTENT_TOP_EXAMPLES = 2;

/** Basic abuse protection (per server instance, best effort). */
export const RATE_LIMIT_MAX_REQUESTS = 20;
export const RATE_LIMIT_WINDOW_MS = 60_000;

export function getChatModel(): string {
  return process.env.GEMINI_CHAT_MODEL || DEFAULT_CHAT_MODEL;
}

/** Reads a number strictly between 0 and 1 from an environment variable. */
function readThreshold(name: string, fallback: number): number {
  const configured = Number(process.env[name]);
  return Number.isFinite(configured) && configured > 0 && configured < 1 ? configured : fallback;
}

export function getMinSimilarity(): number {
  return readThreshold("MIN_SIMILARITY", DEFAULT_MIN_SIMILARITY);
}

export function getIntentMinScore(): number {
  return readThreshold("INTENT_MIN_SCORE", DEFAULT_INTENT_MIN_SCORE);
}
