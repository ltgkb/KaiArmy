import { apiJson, getRequestIdentity } from "../../../../lib/api-security";

export async function GET(request: Request) {
  const identity = await getRequestIdentity(request);
  if (!identity) return apiJson({ error: "请先登录" }, { status: 401 });
  return apiJson({ user: identity });
}
