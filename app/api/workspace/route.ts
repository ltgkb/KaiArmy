import { createEmptyWorkspace, type WorkspaceState } from "../../../lib/workspace-data";
import { createWorkspaceState, readWorkspaceState, writeWorkspaceState } from "../../../db/workspace";
import { renameProductWorkspace, resolveWorkspace } from "../../../db/workspaces";
import { readCookie, WORKSPACE_COOKIE } from "../../../lib/auth";
import { apiJson, getRequestIdentity, isSameOriginMutation, readJsonBody, RequestBodyError } from "../../../lib/api-security";
import { validateWorkspace } from "../../../lib/workspace-validation";

const MAX_WORKSPACE_BYTES = 750_000;

export async function GET(request: Request) {
  const identity = await getRequestIdentity(request);
  if (!identity) return apiJson({ error: "请先登录" }, { status: 401 });
  try {
    const activeWorkspace = await resolveWorkspace(identity, readCookie(request, WORKSPACE_COOKIE));
    const workspaceKey = activeWorkspace.id;
    let saved = await readWorkspaceState(workspaceKey);
    if (!saved) {
      await createWorkspaceState(workspaceKey, JSON.stringify(createEmptyWorkspace(activeWorkspace.name, identity.displayName, identity.id)));
      saved = await readWorkspaceState(workspaceKey);
    }
    if (!saved) throw new Error("Workspace initialization failed");
    const workspace = JSON.parse(saved.payload) as WorkspaceState;
    if (!validateWorkspace(workspace)) throw new Error("Stored workspace is invalid");
    return apiJson({ workspace, version: saved.version, user: identity, activeWorkspace }, {
      headers: { ETag: `"${saved.version}"` },
    });
  } catch {
    return apiJson({ error: "读取工作区失败" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const identity = await getRequestIdentity(request);
  if (!identity) return apiJson({ error: "请先登录" }, { status: 401 });
  if (!isSameOriginMutation(request, identity)) return apiJson({ error: "请求来源无效" }, { status: 403 });
  try {
    const activeWorkspace = await resolveWorkspace(identity, readCookie(request, WORKSPACE_COOKIE));
    if (activeWorkspace.role === "viewer") return apiJson({ error: "当前工作区为只读权限" }, { status: 403 });
    const payload = await readJsonBody<{ workspace?: unknown; version?: unknown }>(request, MAX_WORKSPACE_BYTES + 50_000);
    if (!validateWorkspace(payload.workspace)) {
      return apiJson({ error: "工作区数据格式无效" }, { status: 400 });
    }
    const version = Number(payload.version);
    if (!Number.isInteger(version) || version < 1) return apiJson({ error: "缺少有效的数据版本" }, { status: 428 });
    if (activeWorkspace.role !== "owner" && payload.workspace.settings.workspaceName.trim() !== activeWorkspace.name) {
      return apiJson({ error: "仅工作区所有者可以修改工作区名称" }, { status: 403 });
    }
    const serialized = JSON.stringify(payload.workspace);
    if (new TextEncoder().encode(serialized).byteLength > MAX_WORKSPACE_BYTES) {
      return apiJson({ error: "工作区数据超过存储限制" }, { status: 413 });
    }
    const workspaceKey = activeWorkspace.id;
    const nextVersion = await writeWorkspaceState(workspaceKey, serialized, version);
    if (!nextVersion) {
      const current = await readWorkspaceState(workspaceKey);
      return apiJson({ error: "工作区已被其他会话更新", currentVersion: current?.version ?? null }, { status: 409 });
    }
    if (activeWorkspace.role === "owner" && workspace.settings.workspaceName.trim() && workspace.settings.workspaceName !== activeWorkspace.name) {
      await renameProductWorkspace(activeWorkspace.id, workspace.settings.workspaceName.trim().slice(0, 80));
    }
    const workspaceName = activeWorkspace.role === "owner"
      ? payload.workspace.settings.workspaceName.trim().slice(0, 80)
      : activeWorkspace.name;
    return apiJson({ ok: true, version: nextVersion, savedAt: new Date().toISOString(), workspaceName }, {
      headers: { ETag: `"${nextVersion}"` },
    });
  } catch (error) {
    if (error instanceof RequestBodyError) return apiJson({ error: error.message }, { status: error.status });
    return apiJson({ error: "保存工作区失败" }, { status: 500 });
  }
}
