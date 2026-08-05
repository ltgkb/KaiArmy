import { createProductWorkspace, listUserWorkspaces } from "../../../db/workspaces";
import { createEmptyWorkspace } from "../../../lib/workspace-data";
import { apiJson, getRequestIdentity, isSameOriginMutation, readJsonBody, RequestBodyError } from "../../../lib/api-security";

export async function GET(request: Request) {
  const identity = await getRequestIdentity(request);
  if (!identity) return apiJson({ error: "请先登录" }, { status: 401 });
  return apiJson({ workspaces: await listUserWorkspaces(identity) });
}

export async function POST(request: Request) {
  const identity = await getRequestIdentity(request);
  if (!identity) return apiJson({ error: "请先登录" }, { status: 401 });
  if (!isSameOriginMutation(request, identity)) return apiJson({ error: "请求来源无效" }, { status: 403 });
  try {
    const payload = await readJsonBody<{ name?: unknown }>(request, 4_000);
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    if (name.length < 2 || name.length > 80) return apiJson({ error: "工作区名称需要 2–80 个字符" }, { status: 400 });
    const initial = createEmptyWorkspace(name, identity.displayName, identity.id);
    const workspace = await createProductWorkspace(identity, name, JSON.stringify(initial));
    return apiJson({ workspace }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestBodyError) return apiJson({ error: error.message }, { status: error.status });
    return apiJson({ error: "创建工作区失败" }, { status: 500 });
  }
}
