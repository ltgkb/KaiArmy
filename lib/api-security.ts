import { readSessionIdentity } from "./auth";

export type RequestIdentity = {
  id: string;
  email: string;
  displayName: string;
};

export async function getRequestIdentity(request: Request): Promise<RequestIdentity | null> {
  return readSessionIdentity(request);
}

export function isSameOriginMutation(request: Request, identity: RequestIdentity): boolean {
  void identity;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const fetchSite = request.headers.get("sec-fetch-site");
    return (!fetchSite || fetchSite === "same-origin") && new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const fetchSite = request.headers.get("sec-fetch-site");
    return (!fetchSite || fetchSite === "same-origin") && new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export function requestClientAddress(request: Request): string {
  return request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",", 1)[0].trim()
    ?? "unknown";
}

export async function stableIdentityKey(identity: RequestIdentity): Promise<string> {
  return identity.id;
}

export async function readJsonBody<T>(request: Request, maxBytes: number): Promise<T> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") throw new RequestBodyError("仅支持 JSON 请求", 415);
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > maxBytes) throw new RequestBodyError("请求内容过大", 413);
  if (!request.body) throw new RequestBodyError("请求内容为空", 400);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new RequestBodyError("请求内容过大", 413);
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(merged)) as T;
  } catch {
    throw new RequestBodyError("请求格式无效", 400);
  }
}

export class RequestBodyError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function apiJson(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", headers.get("Cache-Control") ?? "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return Response.json(data, { ...init, headers });
}
