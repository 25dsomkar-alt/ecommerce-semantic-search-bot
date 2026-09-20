export type ErrorCode =
  | "INVALID_REQUEST"
  | "EMPTY_MESSAGE"
  | "MESSAGE_TOO_LONG"
  | "MISSING_API_KEY"
  | "AUTH_ERROR"
  | "RATE_LIMITED"
  | "TOO_MANY_REQUESTS"
  | "EMBEDDING_FAILED"
  | "LLM_FAILED"
  | "INTERNAL_ERROR";

/** An error whose message is safe to show to the end user. */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly userMessage: string,
    public readonly status: number,
  ) {
    super(userMessage);
    this.name = "AppError";
  }
}
