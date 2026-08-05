import { env } from "cloudflare:workers";

const CREATE_USER_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS workspace_user_states (
    workspace_key TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

const CREATE_RATE_LIMIT_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS api_rate_limits (
    rate_key TEXT PRIMARY KEY,
    window_start INTEGER NOT NULL,
    count INTEGER NOT NULL
  )
`;

let tablesReady: Promise<void> | null = null;

async function ensureTables(): Promise<void> {
  tablesReady ??= env.DB.batch([
    env.DB.prepare(CREATE_USER_TABLE_SQL),
    env.DB.prepare(CREATE_RATE_LIMIT_TABLE_SQL),
  ]).then(() => undefined).catch((error) => {
    tablesReady = null;
    throw error;
  });
  await tablesReady;
}

export type StoredWorkspace = { payload: string; version: number };

export async function readWorkspaceState(workspaceKey: string): Promise<StoredWorkspace | null> {
  await ensureTables();
  const row = await env.DB.prepare(
    "SELECT payload, version FROM workspace_user_states WHERE workspace_key = ?1"
  ).bind(workspaceKey).first<StoredWorkspace>();
  return row ?? null;
}

export async function readLegacyWorkspaceState(): Promise<StoredWorkspace | null> {
  try {
    const row = await env.DB.prepare(
      "SELECT payload, version FROM workspace_states WHERE id = 1"
    ).first<StoredWorkspace>();
    return row ?? null;
  } catch {
    return null;
  }
}

export async function readLatestWorkspaceState(): Promise<StoredWorkspace | null> {
  await ensureTables();
  const row = await env.DB.prepare(`
    SELECT payload, version FROM workspace_user_states
    ORDER BY updated_at DESC LIMIT 1
  `).first<StoredWorkspace>();
  return row ?? readLegacyWorkspaceState();
}

export async function createWorkspaceState(workspaceKey: string, payload: string): Promise<boolean> {
  await ensureTables();
  const result = await env.DB.prepare(`
    INSERT OR IGNORE INTO workspace_user_states (workspace_key, payload, version, updated_at)
    VALUES (?1, ?2, 1, CURRENT_TIMESTAMP)
  `).bind(workspaceKey, payload).run();
  return result.meta.changes === 1;
}

export async function writeWorkspaceState(workspaceKey: string, payload: string, expectedVersion: number): Promise<number | null> {
  await ensureTables();
  const result = await env.DB.prepare(`
    UPDATE workspace_user_states
    SET payload = ?2, version = version + 1, updated_at = CURRENT_TIMESTAMP
    WHERE workspace_key = ?1 AND version = ?3
  `).bind(workspaceKey, payload, expectedVersion).run();
  return result.meta.changes === 1 ? expectedVersion + 1 : null;
}

export async function consumeRateLimit(rateKey: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  await ensureTables();
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
  const row = await env.DB.prepare(`
    INSERT INTO api_rate_limits (rate_key, window_start, count)
    VALUES (?1, ?2, 1)
    ON CONFLICT(rate_key) DO UPDATE SET
      window_start = CASE WHEN api_rate_limits.window_start < ?2 THEN ?2 ELSE api_rate_limits.window_start END,
      count = CASE WHEN api_rate_limits.window_start < ?2 THEN 1 ELSE api_rate_limits.count + 1 END
    RETURNING count
  `).bind(rateKey, windowStart).first<{ count: number }>();
  const count = row?.count ?? limit + 1;
  return { allowed: count <= limit, remaining: Math.max(0, limit - count), resetAt: windowStart + windowSeconds };
}
