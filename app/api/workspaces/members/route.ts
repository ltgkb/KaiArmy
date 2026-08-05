import { addWorkspaceMember, listWorkspaceMembers, removeWorkspaceMember, resolveWorkspace } from "../../../../db/workspaces";
import { readCookie, WORKSPACE_COOKIE } from "../../../../lib/auth";
import { apiJson, getRequestIdentity, isSameOriginMutation, readJsonBody, RequestBodyError } from "../../../../lib/api-security";

async function activeWorkspace(request: Request) {
  const identity = await getRequestIdentity(request);
  if (!identity) return null;
  return { identity, workspace: await resolveWorkspace(identity, readCookie(request, WORKSPACE_COOKIE)) };
}

export async function GET(request: Request) {
  const active = await activeWorkspace(request);
  if (!active) return apiJson({ error: "请先登录" }, { status: 401 });
  return apiJson({ workspace: active.workspace, members: await listWorkspaceMembers(active.workspace.id) });
}

export async function POST(request: Request) {
  const active = await activeWorkspace(request);
  if (!active) return apiJson({ error: "请先登录" }, { status: 401 });
  if (active.workspace.role !== "owner") return apiJson({ error: "仅工作区所有者可以邀请成员" }, { status: 403 });
  if (!isSameOriginMutation(request, active.identity)) return apiJson({ error: "请求来源无效" }, { status: 403 });
  try {
    const payload = await readJsonBody<{ email?: unknown; role?: unknown }>(request, 4_000);
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    const role = payload.role === "viewer" ? "viewer" : "editor";
    if (!email || email.length > 320 || !email.includes("@")) return apiJson({ error: "请输入有效邮箱" }, { status: 400 });
    const result = await addWorkspaceMember(active.workspace.id, email, role);
    if (result.status === "missing") return apiJson({ error: "该邮箱尚未注册 KaiArmy" }, { status: 404 });
    if (result.status === "exists") return apiJson({ error: "该成员已在工作区中" }, { status: 409 });
    if (result.status === "conflict") return apiJson({ error: "工作区刚刚发生更新，请重试" }, { status: 409 });
    return apiJson({ ok: true, member: result.member, version: result.version }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestBodyError) return apiJson({ error: error.message }, { status: error.status });
    return apiJson({ error: "邀请成员失败" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const active = await activeWorkspace(request);
  if (!active) return apiJson({ error: "请先登录" }, { status: 401 });
  if (active.workspace.role !== "owner") return apiJson({ error: "仅工作区所有者可以移除成员" }, { status: 403 });
  if (!isSameOriginMutation(request, active.identity)) return apiJson({ error: "请求来源无效" }, { status: 403 });
  try {
    const payload = await readJsonBody<{ userId?: unknown }>(request, 2_000);
    const userId = typeof payload.userId === "string" ? payload.userId : "";
    const result = userId ? await removeWorkspaceMember(active.workspace.id, userId) : { status: "invalid" as const };
    if (result.status === "assigned") return apiJson({ error: "请先转交该成员负责或参与的任务与项目" }, { status: 409 });
    if (result.status === "conflict") return apiJson({ error: "工作区刚刚发生更新，请重试" }, { status: 409 });
    if (result.status !== "removed") return apiJson({ error: "无法移除该成员" }, { status: 400 });
    return apiJson({ ok: true, version: result.version });
  } catch (error) {
    if (error instanceof RequestBodyError) return apiJson({ error: error.message }, { status: error.status });
    return apiJson({ error: "移除成员失败" }, { status: 500 });
  }
}
