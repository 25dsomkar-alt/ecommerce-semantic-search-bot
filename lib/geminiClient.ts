import { AppError } from "@/lib/errors";

/**
 * Minimal helper for the Gemini REST API (plain fetch, no SDK, so nothing extra to install).
 * The API key is read from the server environment only and sent in a request header.
 */

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const REQUEST_TIMEOUT_MS = 15_000;
/** Waits before retry 1 and retry 2 when Gemini answers 429 (busy) or 5xx (temporary error). */
const RETRY_DELAYS_MS = [1_000, 3_000];

type FailureCode = "EMBEDDING_FAILED" | "LLM_FAILED";

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AppError(
      "MISSING_API_KEY",
      "The AI service is not configured yet. The site owner needs to add the GEMINI_API_KEY environment variable in Vercel and redeploy.",
      503,
    );
  }
  return apiKey;
}

function genericFailure(code: FailureCode): AppError {
  const userMessage =
    code === "EMBEDDING_FAILED"
      ? "I could not analyse your message right now. Please try again."
      : "I could not generate a reply right now. Please try again.";
  return new AppError(code, userMessage, 502);
}

/** Maps an HTTP error from Gemini to a friendly AppError. Details are logged server-side only. */
function toAppError(status: number, details: string, code: FailureCode): AppError {
  console.error(`[gemini] ${code}: HTTP ${status}`, details.slice(0, 300));

  const keyRejected = status === 401 || status === 403 || (status === 400 && /API[_ ]KEY/i.test(details));
  if (keyRejected) {
    return new AppError(
      "AUTH_ERROR",
      "The AI service rejected the API key. The site owner should check GEMINI_API_KEY.",
      502,
    );
  }
  if (status === 429) {
    return new AppError(
      "RATE_LIMITED",
      "The free AI quota is busy or used up for now. Please wait a minute and try again.",
      429,
    );
  }
  return genericFailure(code);
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/** POSTs a JSON body to a Gemini endpoint (for example "models/<model>:generateContent"). */
export async function postToGemini<T>(path: string, body: unknown, failureCode: FailureCode): Promise<T> {
  const apiKey = getApiKey();

  for (let attempt = 0; ; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(`${GEMINI_BASE_URL}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      console.error(`[gemini] ${failureCode}: network error`, error instanceof Error ? error.message : error);
      throw genericFailure(failureCode);
    }

    if (response.ok) {
      return (await response.json()) as T;
    }

    const canRetry = (response.status === 429 || response.status >= 500) && attempt < RETRY_DELAYS_MS.length;
    if (canRetry) {
      await sleep(RETRY_DELAYS_MS[attempt]);
      continue;
    }

    const details = await response.text().catch(() => "");
    throw toAppError(response.status, details, failureCode);
  }
}
