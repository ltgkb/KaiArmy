import { findUserByEmail } from "../../../../db/auth";
import { consumeRateLimit } from "../../../../db/workspace";
import { createLoginSession, sessionCookie, sha256Hex, verifyPassword } from "../../../../lib/auth";
import { apiJson, isSameOriginRequest, readJsonBody, requestClientAddress, RequestBodyError } from "../../../../lib/api-security";

const MAX_BODY_BYTES = 8_000;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return apiJson({ error: "请求来源无效" }, { status: 403 });
  try {
    const payload = await readJsonBody<{ email?: unknown; password?: unknown }>(request, MAX_BODY_BYTES);
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    const password = typeof payload.password === "string" ? payload.password : "";
    if (!email || !password || email.length > 320 || password.length > 128) return apiJson({ error: "邮箱或密码错误" }, { status: 401 });

    const addressKey = await sha256Hex(requestClientAddress(request));
    const rate = await consumeRateLimit(`auth-login:${addressKey}`, 12, 15 * 60);
    if (!rate.allowed) return apiJson({ error: "尝试次数过多，请稍后再试" }, {
      status: 429,
      headers: { "Retry-After": String(Math.max(1, rate.resetAt - Math.floor(Date.now() / 1000))) },
    });

    const user = await findUserByEmail(email);
    if (!user || !await verifyPassword(password, user.passwordHash)) return apiJson({ error: "邮箱或密码错误" }, { status: 401 });
    const session = await createLoginSession(user.id);
    return apiJson({ user: { id: user.id, email: user.email, displayName: user.displayName } }, {
      headers: { "Set-Cookie": sessionCookie(session.token, request) },
    });
  } catch (error) {
    if (error instanceof RequestBodyError) return apiJson({ error: error.message }, { status: error.status });
    return apiJson({ error: "登录失败，请稍后重试" }, { status: 500 });
  }
}
