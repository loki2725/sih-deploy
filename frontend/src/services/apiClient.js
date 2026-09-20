import { apiModel } from "@/models/apiModel.js";
import { storageModel } from "@/models/storageModel.js";

const DEFAULT_TIMEOUT_MS = 15000;

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
      throw new Error("The request timed out. Please check the backend connection and try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
