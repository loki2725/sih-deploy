import { apiModel } from "@/models/apiModel.js";
import { storageModel } from "@/models/storageModel.js";

export async function apiClient(pathOrUrl, options = {}) {
  const url = pathOrUrl.startsWith("http")
    ? pathOrUrl
    : apiModel.url(pathOrUrl);

  const headers = new Headers(options.headers || {});
  const token = storageModel.getToken();

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, { ...options, headers });
}
