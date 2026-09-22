import { apiModel } from "@/models/apiModel.js";
import { storageModel } from "@/models/storageModel.js";

// 30s rather than a shorter window, since Render's free tier can take
// 30-60s+ to wake a spun-down instance on its first request after
// inactivity - a short timeout would wrongly report "timed out" on a
// request that was actually still going to succeed.
const DEFAULT_TIMEOUT_MS = 30000;

export async function apiClient(pathOrUrl, options = {}) {
  const url = pathOrUrl.startsWith("http")
    ? pathOrUrl
    : apiModel.url(pathOrUrl);

  const headers = new Headers(options.headers || {});
  const token = storageModel.getToken();

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timeoutMs = Number(options.timeoutMs || DEFAULT_TIMEOUT_MS);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  if (options.signal?.aborted) {
    controller.abort(options.signal.reason);
  } else if (options.signal) {
    options.signal.addEventListener("abort", () => controller.abort(options.signal.reason), { once: true });
  }

  const { timeoutMs: _timeoutMs, signal: _signal, ...fetchOptions } = options;

  try {
    return await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("We're really sorry this is taking a while. Our free hosting plan means the server sometimes needs a little extra time to wake up if it's been resting. Please give it a few more moments and try again - it should be right with you soon.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
