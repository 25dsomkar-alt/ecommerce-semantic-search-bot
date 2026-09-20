import knowledgeBase from "@/data/knowledge-base.json";
import { TOP_K } from "@/lib/config";
import { cosineSimilarity, embedTexts, roundScore, type Vector } from "@/lib/embeddings";
import { tokenize } from "@/lib/textProcessing";
import type { KnowledgeDocument, SearchHit } from "@/lib/types";

const documents = knowledgeBase as KnowledgeDocument[];

interface IndexedDocument {
  document: KnowledgeDocument;
  vector: Vector;
  /** Used only for the keyword-overlap comparison shown in the UI. */
  tokens: Set<string>;
}

/** The text that represents a document when it is embedded. */
function toEmbeddingText(document: KnowledgeDocument): string {
  return `${document.title}. ${document.content} Keywords: ${document.keywords.join(", ")}.`;
}

/** Embeds every document once (one batched API request). */
async function buildDocumentIndex(): Promise<IndexedDocument[]> {
  const vectors = await embedTexts(documents.map(toEmbeddingText), "RETRIEVAL_DOCUMENT");
  return documents.map((document, position) => ({
    document,
    vector: vectors[position],
    tokens: new Set(tokenize(toEmbeddingText(document))),
  }));
}

/**
 * In-memory cache. The index is built on the first request handled by a server
 * instance and reused while that instance stays warm, so documents are not
 * re-embedded for every query. A failed build is not cached, so the next request retries.
 */
let indexPromise: Promise<IndexedDocument[]> | null = null;

function getDocumentIndex(): Promise<IndexedDocument[]> {
  if (!indexPromise) {
    indexPromise = buildDocumentIndex().catch((error) => {
      indexPromise = null;
      throw error;
    });
  }
  return indexPromise;
}

/** Share of the query's distinct key words that literally appear in the document (lexical baseline). */
function keywordOverlap(queryTokens: string[], documentTokens: Set<string>): number {
  const uniqueTokens = Array.from(new Set(queryTokens));
  if (uniqueTokens.length === 0) {
    return 0;
  }
  const matched = uniqueTokens.filter((token) => documentTokens.has(token)).length;
  return matched / uniqueTokens.length;
}

/**
 * Semantic search: ranks every document by cosine similarity to the query
 * embedding and returns the top-k. The keyword overlap is reported alongside
 * so the difference between meaning-based and word-based matching is visible.
 */
export async function searchDocuments(
  queryVector: Vector,
  queryText: string,
  minSimilarity: number,
  topK: number = TOP_K,
): Promise<SearchHit[]> {
  const index = await getDocumentIndex();
  const queryTokens = tokenize(queryText);

  return index
    .map((entry) => ({ entry, similarity: cosineSimilarity(queryVector, entry.vector) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
    .map(({ entry, similarity }, position) => ({
      ...entry.document,
      similarity: roundScore(similarity),
      keywordOverlap: roundScore(keywordOverlap(queryTokens, entry.tokens)),
      rank: position + 1,
      usedForAnswer: similarity >= minSimilarity,
    }));
}
