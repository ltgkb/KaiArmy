import { updateUserProfile } from "../../../../db/auth";
import { apiJson, getRequestIdentity, isSameOriginMutation, readJsonBody, RequestBodyError } from "../../../../lib/api-security";

export async function PUT(request: Request) {
  const identity = await getRequestIdentity(request);
  if (!identity) return apiJson({ error: "请先登录" }, { status: 401 });
  if (!isSameOriginMutation(request, identity)) return apiJson({ error: "请求来源无效" }, { status: 403 });
  try {
    const payload = await readJsonBody<{ displayName?: unknown }>(request, 4_000);
    const displayName = typeof payload.displayName === "string" ? payload.displayName.trim() : "";
    if (displayName.length < 2 || displayName.length > 80) return apiJson({ error: "名称需要 2–80 个字符" }, { status: 400 });
    await updateUserProfile(identity.id, displayName);
    return apiJson({ user: { ...identity, displayName } });
  } catch (error) {
    if (error instanceof RequestBodyError) return apiJson({ error: error.message }, { status: error.status });
    return apiJson({ error: "更新资料失败" }, { status: 500 });
  }
}
