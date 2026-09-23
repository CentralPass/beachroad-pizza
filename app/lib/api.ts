/**
 * The storefront's only connection to CentralPass: HTTP to one venue backend.
 *
 * NEXT_PUBLIC_CENTRALPASS_API_URL is compiled into the bundle, so changing it
 * needs a rebuild. Nothing secret belongs in a NEXT_PUBLIC_ value.
 */

export const API_URL = (process.env.NEXT_PUBLIC_CENTRALPASS_API_URL || "").replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  code: string | null;
  data: Record<string, unknown>;

  constructor(message: string, status: number, data: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.code = typeof data.code === "string" ? data.code : null;
  }
}

function messageFrom(data: Record<string, unknown>, status: number) {
  // Never show a customer a raw server or database error.
  if (status >= 500) return "Something went wrong on our side. Please try again, or call the shop.";
  if (typeof data.error === "string") return data.error;
  if (typeof data.message === "string") return data.message;
  // express-validator shape: { errors: [{ msg }] }
  const errors = data.errors;
  if (Array.isArray(errors) && errors[0] && typeof errors[0].msg === "string") return errors[0].msg as string;
  return status ? `Request failed (${status})` : "We couldn't reach the shop's ordering system.";
}

export async function apiRequest<T>(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  if (!API_URL) {
    throw new ApiError("Online ordering isn't connected yet. Please call the shop.", 0, { code: "NOT_CONFIGURED" });
  }
  const { timeoutMs = 15000, headers, signal, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  signal?.addEventListener("abort", () => controller.abort(), { once: true });

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...rest,
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...headers },
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    if ((error as Error).name === "AbortError" && signal?.aborted) throw error;
    throw new ApiError("We couldn't reach the shop's ordering system. Check your connection and try again.", 0, { code: "NETWORK" });
  }
  clearTimeout(timer);

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new ApiError(messageFrom(data, response.status), response.status, data);
  return data as T;
}

export const api = {
  get: <T>(path: string, init?: RequestInit & { timeoutMs?: number }) => apiRequest<T>(path, init),
  post: <T>(path: string, body: unknown, init?: RequestInit & { timeoutMs?: number }) =>
    apiRequest<T>(path, { ...init, method: "POST", body: JSON.stringify(body) }),
};

export function newRequestId() {
  const cryptoApi = globalThis.crypto as Crypto & { randomUUID?: () => string };
  if (typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID();
  // RFC 4122 v4 fallback for older in-app browsers.
  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
