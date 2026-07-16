const MAX_SAFE_REQUEST_ATTEMPTS = 3;

function requestMethod(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.method) return init.method.toUpperCase();
  return input instanceof Request ? input.method.toUpperCase() : "GET";
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Retries only safe reads. Retrying a failed mutation can duplicate a write
 * when the upstream service receives the original request after the client times out.
 */
export async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit) {
  const method = requestMethod(input, init);
  const isSafeRequest = method === "GET" || method === "HEAD" || method === "OPTIONS";
  const attempts = isSafeRequest ? MAX_SAFE_REQUEST_ATTEMPTS : 1;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(input, init);
    } catch (error) {
      if (attempt === attempts) throw error;
      await wait(150 * attempt);
    }
  }

  throw new Error("Unreachable retry state");
}
