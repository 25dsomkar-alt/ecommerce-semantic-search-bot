/** Basic text pre-processing used by the API route and the keyword-overlap baseline. */

const STOP_WORDS = new Set([
  "the", "and", "for", "are", "was", "were", "has", "have", "had", "not", "but", "you", "your",
  "yours", "our", "its", "can", "could", "would", "should", "will", "shall", "may", "might",
  "this", "that", "these", "those", "with", "from", "into", "about", "when", "what", "where",
  "which", "who", "how", "why", "does", "did", "done", "been", "being", "any", "all", "get",
  "got", "just", "there", "then", "than", "them", "they", "their", "she", "him", "her", "his",
  "out", "off", "too", "very", "also", "still", "yet", "again", "please", "hello", "thanks",
  "thank", "want", "need", "like",
]);

/**
 * Cleans a raw customer message:
 * - converts curly quotes (common on phone keyboards) to plain quotes
 * - removes control characters and angle brackets (prevents prompt-delimiter tricks)
 * - collapses whitespace
 */
export function normalizeMessage(raw: string): string {
  return raw
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Lower-cases, removes punctuation and stop words, and strips simple plurals. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
    .map(stripPlural);
}

function stripPlural(token: string): string {
  return token.length > 3 && token.endsWith("s") && !token.endsWith("ss") ? token.slice(0, -1) : token;
}
