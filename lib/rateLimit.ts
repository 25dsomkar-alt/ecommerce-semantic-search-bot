import { RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS } from "@/lib/config";

/**
 * Very small in-memory rate limiter (sliding window per client key).
 * It works per warm serverless instance, so it is best-effort protection
 * for a demo, not a replacement for a production gateway.
 */
const requestLog = new Map<string, number[]>();

export function isRateLimited(key: string, now: number = Date.now()): boolean {
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const recent = (requestLog.get(key) ?? []).filter((timestamp) => timestamp > windowStart);

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestLog.set(key, recent);
    return true;
  }

  recent.push(now);
  requestLog.set(key, recent);

  // Keep memory bounded on long-lived instances.
  if (requestLog.size > 5000) {
    for (const [storedKey, timestamps] of requestLog) {
      if (timestamps.every((timestamp) => timestamp <= windowStart)) {
        requestLog.delete(storedKey);
      }
    }
  }
  return false;
}
