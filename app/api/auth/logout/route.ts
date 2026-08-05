import { revokeRequestSession, sessionCookie } from "../../../../lib/auth";
import { apiJson, isSameOriginRequest } from "../../../../lib/api-security";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return apiJson({ error: "请求来源无效" }, { status: 403 });
  await revokeRequestSession(request);
  return apiJson({ ok: true }, { headers: { "Set-Cookie": sessionCookie("", request, 0) } });
}
