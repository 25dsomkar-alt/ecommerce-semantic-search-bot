import intentExamples from "@/data/intent-examples.json";
import { INTENT_TOP_EXAMPLES, getIntentMinScore } from "@/lib/config";
import { cosineSimilarity, embedTexts, roundScore, type Vector } from "@/lib/embeddings";
import { INTENT_CATEGORIES, type IntentCategory, type IntentResult, type IntentScore } from "@/lib/types";

// The compiler checks that the JSON contains every intent category.
const examplesByIntent: Record<IntentCategory, string[]> = intentExamples;

interface IndexedExample {
  intent: IntentCategory;
  vector: Vector;
}

/** Embeds all labelled example sentences once (one batched API request). */
async function buildIntentIndex(): Promise<IndexedExample[]> {
  const labelled = INTENT_CATEGORIES.flatMap((intent) =>
    examplesByIntent[intent].map((text) => ({ intent, text })),
  );
  const vectors = await embedTexts(labelled.map((example) => example.text), "RETRIEVAL_DOCUMENT");
  return labelled.map((example, position) => ({ intent: example.intent, vector: vectors[position] }));
}

let indexPromise: Promise<IndexedExample[]> | null = null;

function getIntentIndex(): Promise<IndexedExample[]> {
  if (!indexPromise) {
    indexPromise = buildIntentIndex().catch((error) => {
      indexPromise = null;
      throw error;
    });
  }
  return indexPromise;
}

/**
 * Embedding-based intent classification (few-shot nearest neighbours).
 * For each intent, the score is the average cosine similarity between the query
 * and that intent's closest example sentences. The highest-scoring intent wins.
 * If even the best score is low, the message is labelled OUT_OF_SCOPE.
 */
export async function classifyIntent(queryVector: Vector): Promise<IntentResult> {
  const index = await getIntentIndex();

  const ranking: IntentScore[] = INTENT_CATEGORIES.map((intent) => {
    const closest = index
      .filter((example) => example.intent === intent)
      .map((example) => cosineSimilarity(queryVector, example.vector))
      .sort((a, b) => b - a)
      .slice(0, INTENT_TOP_EXAMPLES);
    const score = closest.length > 0 ? closest.reduce((sum, value) => sum + value, 0) / closest.length : 0;
    return { intent, score: roundScore(score) };
  }).sort((a, b) => b.score - a.score);

  const best = ranking[0];
  return {
    intent: best.score >= getIntentMinScore() ? best.intent : "OUT_OF_SCOPE",
    score: best.score,
    runnerUp: ranking[1] ?? null,
    ranking,
  };
}
