import { env } from "cloudflare:workers";
import type { RequestIdentity } from "../lib/api-security";

const CREATE_WORKSPACES_SQL = `
  CREATE TABLE IF NOT EXISTS product_workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`;

const CREATE_MEMBERSHIPS_SQL = `
  CREATE TABLE IF NOT EXISTS workspace_memberships (
    workspace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'editor',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (workspace_id, user_id),
    FOREIGN KEY (workspace_id) REFERENCES product_workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`;

let tablesReady: Promise<void> | null = null;

async function ensureTables(): Promise<void> {
  tablesReady ??= env.DB.batch([
    env.DB.prepare(CREATE_WORKSPACES_SQL),
    env.DB.prepare(CREATE_MEMBERSHIPS_SQL),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS workspace_memberships_user_idx ON workspace_memberships(user_id)"),
  ]).then(() => undefined).catch((error) => {
    tablesReady = null;
    throw error;
  });
  await tablesReady;
}

export type WorkspaceRole = "owner" | "editor" | "viewer";
export type WorkspaceSummary = { id: string; name: string; role: WorkspaceRole; memberCount: number };
export type WorkspaceMember = { id: string; email: string; displayName: string; role: WorkspaceRole };

export async function ensurePersonalWorkspace(identity: RequestIdentity): Promise<void> {
  await ensureTables();
  const membership = await env.DB.prepare("SELECT 1 FROM workspace_memberships WHERE workspace_id = ?1 AND user_id = ?1 LIMIT 1").bind(identity.id).first();
  if (membership) return;
  await env.DB.batch([
    env.DB.prepare(`INSERT OR IGNORE INTO product_workspaces (id, name, owner_user_id) VALUES (?1, ?2, ?1)`).bind(identity.id, `${identity.displayName} 的工作区`),
    env.DB.prepare(`INSERT OR IGNORE INTO workspace_memberships (workspace_id, user_id, role) VALUES (?1, ?1, 'owner')`).bind(identity.id),
  ]);
}

export async function renameProductWorkspace(workspaceId: string, name: string): Promise<void> {
  await ensureTables();
  await env.DB.prepare("UPDATE product_workspaces SET name = ?2 WHERE id = ?1").bind(workspaceId, name).run();
}

export async function listUserWorkspaces(identity: RequestIdentity): Promise<WorkspaceSummary[]> {
  await ensurePersonalWorkspace(identity);
  const result = await env.DB.prepare(`
    SELECT product_workspaces.id, product_workspaces.name, workspace_memberships.role,
      (SELECT COUNT(*) FROM workspace_memberships members WHERE members.workspace_id = product_workspaces.id) AS memberCount
    FROM workspace_memberships
    INNER JOIN product_workspaces ON product_workspaces.id = workspace_memberships.workspace_id
    WHERE workspace_memberships.user_id = ?1
    ORDER BY CASE workspace_memberships.role WHEN 'owner' THEN 0 ELSE 1 END, product_workspaces.created_at
  `).bind(identity.id).all<WorkspaceSummary>();
  return result.results ?? [];
}

export async function resolveWorkspace(identity: RequestIdentity, requestedId?: string | null): Promise<WorkspaceSummary> {
  const workspaces = await listUserWorkspaces(identity);
  const selected = requestedId ? workspaces.find((workspace) => workspace.id === requestedId) : null;
  const workspace = selected ?? workspaces[0];
  if (!workspace) throw new Error("Workspace unavailable");
  return workspace;
}

export async function createProductWorkspace(identity: RequestIdentity, name: string, initialPayload: string): Promise<WorkspaceSummary> {
  await ensureTables();
  const id = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO product_workspaces (id, name, owner_user_id) VALUES (?1, ?2, ?3)").bind(id, name, identity.id),
    env.DB.prepare("INSERT INTO workspace_memberships (workspace_id, user_id, role) VALUES (?1, ?2, 'owner')").bind(id, identity.id),
    env.DB.prepare("INSERT INTO workspace_user_states (workspace_key, payload, version, updated_at) VALUES (?1, ?2, 1, CURRENT_TIMESTAMP)").bind(id, initialPayload),
  ]);
  return { id, name, role: "owner", memberCount: 1 };
}

export async function listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  await ensureTables();
  const result = await env.DB.prepare(`
    SELECT users.id, users.email, users.display_name AS displayName, workspace_memberships.role
    FROM workspace_memberships
    INNER JOIN users ON users.id = workspace_memberships.user_id
    WHERE workspace_memberships.workspace_id = ?1
    ORDER BY CASE workspace_memberships.role WHEN 'owner' THEN 0 WHEN 'editor' THEN 1 ELSE 2 END, users.display_name
  `).bind(workspaceId).all<WorkspaceMember>();
  return result.results ?? [];
}

export async function addWorkspaceMember(workspaceId: string, email: string, role: Exclude<WorkspaceRole, "owner">): Promise<{ status: "added"; member: WorkspaceMember; version: number } | { status: "missing" | "exists" | "conflict" }> {
  await ensureTables();
  const user = await env.DB.prepare("SELECT id, email, display_name AS displayName FROM users WHERE email = ?1").bind(email).first<{ id: string; email: string; displayName: string }>();
  if (!user) return { status: "missing" };
  const existing = await env.DB.prepare("SELECT 1 FROM workspace_memberships WHERE workspace_id = ?1 AND user_id = ?2").bind(workspaceId, user.id).first();
  if (existing) return { status: "exists" };
  const stored = await env.DB.prepare("SELECT payload, version FROM workspace_user_states WHERE workspace_key = ?1").bind(workspaceId).first<{ payload: string; version: number }>();
  if (!stored) return { status: "conflict" };
  const workspace = JSON.parse(stored.payload) as { members?: Array<Record<string, unknown>> };
  workspace.members ??= [];
  if (!workspace.members.some((member) => member.id === user.id)) {
    workspace.members.push({
      id: user.id,
      name: user.displayName,
      role: role === "viewer" ? "只读成员" : "协作成员",
      avatar: user.displayName.trim().slice(0, 2).toUpperCase() || "KA",
      online: true,
    });
  }
  const results = await env.DB.batch([
    env.DB.prepare("INSERT INTO workspace_memberships (workspace_id, user_id, role) VALUES (?1, ?2, ?3)").bind(workspaceId, user.id, role),
    env.DB.prepare(`UPDATE workspace_user_states SET payload = ?2, version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE workspace_key = ?1 AND version = ?3`).bind(workspaceId, JSON.stringify(workspace), stored.version),
  ]);
  if (results[1].meta.changes !== 1) {
    await env.DB.prepare("DELETE FROM workspace_memberships WHERE workspace_id = ?1 AND user_id = ?2").bind(workspaceId, user.id).run();
    return { status: "conflict" };
  }
  return { status: "added", member: { ...user, role }, version: stored.version + 1 };
}

export async function removeWorkspaceMember(workspaceId: string, userId: string): Promise<{ status: "removed"; version: number } | { status: "assigned" | "invalid" | "conflict" }> {
  await ensureTables();
  const membership = await env.DB.prepare("SELECT role FROM workspace_memberships WHERE workspace_id = ?1 AND user_id = ?2").bind(workspaceId, userId).first<{ role: WorkspaceRole }>();
  if (!membership || membership.role === "owner") return { status: "invalid" };
  const stored = await env.DB.prepare("SELECT payload, version FROM workspace_user_states WHERE workspace_key = ?1").bind(workspaceId).first<{ payload: string; version: number }>();
  if (!stored) return { status: "conflict" };
  const workspace = JSON.parse(stored.payload) as { members?: Array<{ id: string }>; tasks?: Array<{ assigneeId: string; participantIds: string[] }>; projects?: Array<{ ownerId: string }> };
  if (workspace.tasks?.some((task) => task.assigneeId === userId || task.participantIds.includes(userId)) || workspace.projects?.some((project) => project.ownerId === userId)) return { status: "assigned" };
  workspace.members = workspace.members?.filter((member) => member.id !== userId) ?? [];
  const results = await env.DB.batch([
    env.DB.prepare("DELETE FROM workspace_memberships WHERE workspace_id = ?1 AND user_id = ?2 AND role <> 'owner'").bind(workspaceId, userId),
    env.DB.prepare(`UPDATE workspace_user_states SET payload = ?2, version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE workspace_key = ?1 AND version = ?3`).bind(workspaceId, JSON.stringify(workspace), stored.version),
  ]);
  if (results[0].meta.changes !== 1) return { status: "invalid" };
  if (results[1].meta.changes !== 1) {
    await env.DB.prepare("INSERT OR IGNORE INTO workspace_memberships (workspace_id, user_id, role) VALUES (?1, ?2, ?3)").bind(workspaceId, userId, membership.role).run();
    return { status: "conflict" };
  }
  return { status: "removed", version: stored.version + 1 };
}
