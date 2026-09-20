/**
 * Shared types and constants.
 * Safe to import from both server code and client components (no secrets, no Node APIs).
 */

export const MAX_MESSAGE_LENGTH = 500;

export const INTENT_CATEGORIES = [
  "ORDER_TRACKING",
  "RETURN_REQUEST",
  "PAYMENT_ISSUE",
  "REFUND_STATUS",
  "CANCELLATION",
  "DELIVERY_INFORMATION",
  "GENERAL_FAQ",
] as const;

export type IntentCategory = (typeof INTENT_CATEGORIES)[number];

/** OUT_OF_SCOPE is used when the message does not resemble any supported intent. */
export type DetectedIntent = IntentCategory | "OUT_OF_SCOPE";

export const INTENT_LABELS: Record<DetectedIntent, string> = {
  ORDER_TRACKING: "Order Tracking",
  RETURN_REQUEST: "Return Request",
  PAYMENT_ISSUE: "Payment Issue",
  REFUND_STATUS: "Refund Status",
  CANCELLATION: "Cancellation",
  DELIVERY_INFORMATION: "Delivery Information",
  GENERAL_FAQ: "General FAQ",
  OUT_OF_SCOPE: "Out of Scope",
};

/** One document in data/knowledge-base.json. */
export interface KnowledgeDocument {
  id: string;
  category: IntentCategory;
  title: string;
  content: string;
  keywords: string[];
}

/** A document returned by semantic search, with its scores. */
export interface SearchHit extends KnowledgeDocument {
  /** Cosine similarity between the query embedding and the document embedding. */
  similarity: number;
  /** Share (0-1) of the query's key words that literally appear in the document. */
  keywordOverlap: number;
  rank: number;
  /** True when similarity is above the threshold, so the document grounds the answer. */
  usedForAnswer: boolean;
}

export interface IntentScore {
  intent: IntentCategory;
  score: number;
}

export interface IntentResult {
  intent: DetectedIntent;
  score: number;
  runnerUp: IntentScore | null;
  ranking: IntentScore[];
}

export interface EntityItem {
  label: string;
  value: string;
}

export type ResponseMode = "rag" | "no_match";

export interface AnalysisResult {
  intent: IntentResult;
  entities: EntityItem[];
  hits: SearchHit[];
  responseMode: ResponseMode;
  minSimilarity: number;
}

export interface ChatApiSuccess {
  reply: string;
  analysis: AnalysisResult;
}

export interface ChatApiError {
  error: { code: string; message: string };
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  analysis?: AnalysisResult;
  isError?: boolean;
}
