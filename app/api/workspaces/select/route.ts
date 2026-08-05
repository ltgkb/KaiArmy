import { resolveWorkspace } from "../../../../db/workspaces";
import { workspaceCookie } from "../../../../lib/auth";
import { apiJson, getRequestIdentity, isSameOriginMutation, readJsonBody, RequestBodyError } from "../../../../lib/api-security";

export async function POST(request: Request) {
  const identity = await getRequestIdentity(request);
  if (!identity) return apiJson({ error: "请先登录" }, { status: 401 });
  if (!isSameOriginMutation(request, identity)) return apiJson({ error: "请求来源无效" }, { status: 403 });
  try {
    const payload = await readJsonBody<{ workspaceId?: unknown }>(request, 2_000);
    const workspaceId = typeof payload.workspaceId === "string" ? payload.workspaceId : "";
    const workspace = await resolveWorkspace(identity, workspaceId);
    if (workspace.id !== workspaceId) return apiJson({ error: "无权访问该工作区" }, { status: 403 });
    return apiJson({ workspace }, { headers: { "Set-Cookie": workspaceCookie(workspace.id, request) } });
  } catch (error) {
    if (error instanceof RequestBodyError) return apiJson({ error: error.message }, { status: error.status });
    return apiJson({ error: "切换工作区失败" }, { status: 500 });
  }
}
