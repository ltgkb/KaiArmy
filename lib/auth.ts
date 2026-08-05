import { createSession, deleteExpiredSessions, deleteSession, findSessionUser } from "../db/auth";

export const SESSION_COOKIE = "kaiarmy_session";
export const WORKSPACE_COOKIE = "kaiarmy_workspace";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const PASSWORD_ITERATIONS = 210_000;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function derivePassword(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePassword(password, salt, PASSWORD_ITERATIONS);
  return `pbkdf2-sha256$${PASSWORD_ITERATIONS}$${bytesToBase64Url(salt)}$${bytesToBase64Url(hash)}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, iterationsValue, saltValue, hashValue] = encoded.split("$");
  const iterations = Number(iterationsValue);
  if (algorithm !== "pbkdf2-sha256" || !Number.isInteger(iterations) || iterations < 100_000 || iterations > 1_000_000 || !saltValue || !hashValue) return false;
  try {
    const expected = base64UrlToBytes(hashValue);
    const actual = await derivePassword(password, base64UrlToBytes(saltValue), iterations);
    if (actual.length !== expected.length) return false;
    let difference = 0;
    for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
    return difference === 0;
  } catch {
    return false;
  }
}

export function readCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  for (const part of cookie.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return null;
}

export async function createLoginSession(userId: string): Promise<{ token: string; expiresAt: number }> {
  const token = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256Hex(token);
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  await createSession(tokenHash, userId, expiresAt);
  return { token, expiresAt };
}

export function sessionCookie(value: string, request: Request, maxAge = SESSION_TTL_SECONDS): string {
  const secure = !new Set(["localhost", "127.0.0.1", "::1"]).has(new URL(request.url).hostname);
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

export function workspaceCookie(value: string, request: Request, maxAge = SESSION_TTL_SECONDS): string {
  const secure = !new Set(["localhost", "127.0.0.1", "::1"]).has(new URL(request.url).hostname);
  return `${WORKSPACE_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

export async function readSessionIdentity(request: Request): Promise<{ id: string; email: string; displayName: string } | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token || token.length > 128) return null;
  const now = Math.floor(Date.now() / 1000);
  const tokenHash = await sha256Hex(token);
  const user = await findSessionUser(tokenHash, now);
  if (!user) {
    await deleteSession(tokenHash).catch(() => undefined);
    return null;
  }
  if (Math.random() < 0.01) await deleteExpiredSessions(now).catch(() => undefined);
  return user;
}

export async function revokeRequestSession(request: Request): Promise<void> {
  const token = readCookie(request, SESSION_COOKIE);
  if (token) await deleteSession(await sha256Hex(token));
}
