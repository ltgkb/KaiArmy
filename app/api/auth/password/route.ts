import { readUserPasswordHash, updateUserPassword } from "../../../../db/auth";
import { hashPassword, sessionCookie, verifyPassword } from "../../../../lib/auth";
import { apiJson, getRequestIdentity, isSameOriginMutation, readJsonBody, RequestBodyError } from "../../../../lib/api-security";

export async function PUT(request: Request) {
  const identity = await getRequestIdentity(request);
  if (!identity) return apiJson({ error: "请先登录" }, { status: 401 });
  if (!isSameOriginMutation(request, identity)) return apiJson({ error: "请求来源无效" }, { status: 403 });
  try {
    const payload = await readJsonBody<{ currentPassword?: unknown; newPassword?: unknown }>(request, 8_000);
    const currentPassword = typeof payload.currentPassword === "string" ? payload.currentPassword : "";
    const newPassword = typeof payload.newPassword === "string" ? payload.newPassword : "";
    if (newPassword.length < 10 || newPassword.length > 128) return apiJson({ error: "新密码需要 10–128 个字符" }, { status: 400 });
    const existingHash = await readUserPasswordHash(identity.id);
    if (!existingHash || !await verifyPassword(currentPassword, existingHash)) return apiJson({ error: "当前密码错误" }, { status: 401 });
    await updateUserPassword(identity.id, await hashPassword(newPassword));
    return apiJson({ ok: true, reauthenticate: true }, { headers: { "Set-Cookie": sessionCookie("", request, 0) } });
  } catch (error) {
    if (error instanceof RequestBodyError) return apiJson({ error: error.message }, { status: error.status });
    return apiJson({ error: "修改密码失败" }, { status: 500 });
  }
}
