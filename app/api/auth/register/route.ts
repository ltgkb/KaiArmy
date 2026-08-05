import { countUsers, createUser } from "../../../../db/auth";
import { consumeRateLimit, createWorkspaceState, readLatestWorkspaceState } from "../../../../db/workspace";
import { createLoginSession, hashPassword, sessionCookie, sha256Hex } from "../../../../lib/auth";
import { apiJson, isSameOriginRequest, readJsonBody, requestClientAddress, RequestBodyError } from "../../../../lib/api-security";

const MAX_BODY_BYTES = 8_000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return apiJson({ error: "请求来源无效" }, { status: 403 });
  try {
    const addressKey = await sha256Hex(requestClientAddress(request));
    const rate = await consumeRateLimit(`auth-register:${addressKey}`, 8, 60 * 60);
    if (!rate.allowed) return apiJson({ error: "注册次数过多，请稍后再试" }, {
      status: 429,
      headers: { "Retry-After": String(Math.max(1, rate.resetAt - Math.floor(Date.now() / 1000))) },
    });
    const payload = await readJsonBody<{ email?: unknown; password?: unknown; displayName?: unknown }>(request, MAX_BODY_BYTES);
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    const password = typeof payload.password === "string" ? payload.password : "";
    const displayName = typeof payload.displayName === "string" ? payload.displayName.trim() : "";
    if (!EMAIL_PATTERN.test(email) || email.length > 320) return apiJson({ error: "请输入有效邮箱" }, { status: 400 });
    if (displayName.length < 2 || displayName.length > 80) return apiJson({ error: "名称需要 2–80 个字符" }, { status: 400 });
    if (password.length < 10 || password.length > 128 || new TextEncoder().encode(password).byteLength > 256) {
      return apiJson({ error: "密码需要 10–128 个字符" }, { status: 400 });
    }

    const firstUser = await countUsers() === 0;
    const id = crypto.randomUUID();
    const created = await createUser({ id, email, displayName, passwordHash: await hashPassword(password) });
    if (!created) return apiJson({ error: "该邮箱已注册" }, { status: 409 });

    if (firstUser) {
      const existing = await readLatestWorkspaceState();
      if (existing) await createWorkspaceState(id, existing.payload);
    }

    const session = await createLoginSession(id);
    return apiJson({ user: { id, email, displayName } }, {
      status: 201,
      headers: { "Set-Cookie": sessionCookie(session.token, request) },
    });
  } catch (error) {
    if (error instanceof RequestBodyError) return apiJson({ error: error.message }, { status: error.status });
    return apiJson({ error: "注册失败，请稍后重试" }, { status: 500 });
  }
}
