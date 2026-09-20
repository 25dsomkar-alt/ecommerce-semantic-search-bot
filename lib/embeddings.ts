import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { postToGemini } from "@/lib/geminiClient";

/** An embedding: a fixed-length list of numbers representing the meaning of a text. */
export type Vector = number[];

/**
 * Gemini task types. Search queries and the texts they are matched against are
 * embedded differently so that "question -> answer" similarity works well.
 */
export type EmbeddingTask = "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT";

/** Gemini accepts at most 100 texts per batch request. */
const MAX_BATCH_SIZE = 100;

interface BatchEmbedResponse {
  embeddings?: { values?: number[] }[];
}

async function embedBatch(texts: string[], task: EmbeddingTask): Promise<Vector[]> {
  const data = await postToGemini<BatchEmbedResponse>(
    `models/${EMBEDDING_MODEL}:batchEmbedContents`,
    {
      requests: texts.map((text) => ({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
        taskType: task,
        outputDimensionality: EMBEDDING_DIMENSIONS,
      })),
    },
    "EMBEDDING_FAILED",
  );

  const vectors = (data.embeddings ?? []).map((item) => item.values ?? []);
  if (vectors.length !== texts.length || vectors.some((vector) => vector.length === 0)) {
    console.error("[gemini] EMBEDDING_FAILED: unexpected embedding response shape");
    throw new AppError("EMBEDDING_FAILED", "I could not analyse your message right now. Please try again.", 502);
  }
  return vectors;
}

/** Converts texts into embeddings (one request per 100 texts). */
export async function embedTexts(texts: string[], task: EmbeddingTask): Promise<Vector[]> {
  const vectors: Vector[] = [];
  for (let start = 0; start < texts.length; start += MAX_BATCH_SIZE) {
    vectors.push(...(await embedBatch(texts.slice(start, start + MAX_BATCH_SIZE), task)));
  }
  return vectors;
}

/**
 * Cosine similarity = (a . b) / (|a| * |b|).
 * 1 means the vectors point the same way (very similar meaning), 0 means unrelated.
 * Dividing by the lengths also takes care of the normalisation that truncated
 * (768-number) Gemini embeddings need.
 */
export function cosineSimilarity(a: Vector, b: Vector): number {
  if (a.length === 0 || a.length !== b.length) {
    throw new Error("Vectors must have the same non-zero length.");
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Rounds a score to 3 decimals for display and transport. */
export function roundScore(value: number): number {
  return Math.round(value * 1000) / 1000;
}
