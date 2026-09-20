import { NextResponse } from "next/server";
import { getMinSimilarity } from "@/lib/config";
import { embedTexts } from "@/lib/embeddings";
import { extractEntities } from "@/lib/entities";
import { AppError } from "@/lib/errors";
import { classifyIntent } from "@/lib/intent";
import { NO_MATCH_REPLY, generateAnswer } from "@/lib/llm";
import { isRateLimited } from "@/lib/rateLimit";
import { searchDocuments } from "@/lib/semanticSearch";
import { normalizeMessage } from "@/lib/textProcessing";
import {
  MAX_MESSAGE_LENGTH,
  type AnalysisResult,
  type ChatApiError,
  type ChatApiSuccess,
  type ResponseMode,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/chat
 *
 * Pipeline: validate -> normalise -> entities -> query embedding ->
 * (intent classification + semantic search) -> RAG answer.
 */
export async function POST(request: Request) {
  try {
    if (isRateLimited(getClientKey(request))) {
      throw new AppError(
        "TOO_MANY_REQUESTS",
        "You are sending messages too quickly. Please wait a moment and try again.",
        429,
      );
    }

    const message = await readMessage(request);

    // Step 1: rule-based entity extraction (no network needed).
    const entities = extractEntities(message);

    // Step 2: embed the query once and reuse the vector for intent + search.
    const [queryVector] = await embedTexts([message], "RETRIEVAL_QUERY");
    const minSimilarity = getMinSimilarity();

    // Step 3: intent classification and semantic search run concurrently.
    const [intent, hits] = await Promise.all([
      classifyIntent(queryVector),
      searchDocuments(queryVector, message, minSimilarity),
    ]);

    // Step 4: only documents above the similarity threshold may ground the answer.
    const relevantDocuments = hits.filter((hit) => hit.usedForAnswer);

    let reply: string;
    let responseMode: ResponseMode;

    if (relevantDocuments.length === 0) {
      reply = NO_MATCH_REPLY;
      responseMode = "no_match";
    } else {
      reply = await generateAnswer({
        message,
        intent: intent.intent,
        entities,
        documents: relevantDocuments,
      });
      responseMode = "rag";
    }

    const analysis: AnalysisResult = { intent, entities, hits, responseMode, minSimilarity };
    return NextResponse.json<ChatApiSuccess>({ reply, analysis });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Reads and validates the JSON body, returning the cleaned customer message. */
async function readMessage(request: Request): Promise<string> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AppError("INVALID_REQUEST", "The request could not be read. Please try again.", 400);
  }

  const rawMessage = (body as { message?: unknown } | null)?.message;
  if (typeof rawMessage !== "string") {
    throw new AppError("INVALID_REQUEST", "Please send a text message.", 400);
  }
  if (rawMessage.length > MAX_MESSAGE_LENGTH * 4) {
    throw new AppError("MESSAGE_TOO_LONG", `Please keep your message under ${MAX_MESSAGE_LENGTH} characters.`, 400);
  }

  const message = normalizeMessage(rawMessage);
  if (message.length === 0) {
    throw new AppError("EMPTY_MESSAGE", "Please type a message before sending.", 400);
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new AppError("MESSAGE_TOO_LONG", `Please keep your message under ${MAX_MESSAGE_LENGTH} characters.`, 400);
  }
  return message;
}

/** Best-effort client identifier used only for basic rate limiting. */
function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

/** Converts any error into a safe JSON response (never leaks stack traces). */
function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json<ChatApiError>(
      { error: { code: error.code, message: error.userMessage } },
      { status: error.status },
    );
  }
  console.error("Unexpected error in /api/chat:", error);
  return NextResponse.json<ChatApiError>(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong on our side. Please try again." } },
    { status: 500 },
  );
}
