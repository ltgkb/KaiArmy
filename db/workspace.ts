import { env } from "cloudflare:workers";

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS workspace_states (
    id INTEGER PRIMARY KEY,
    payload TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

export async function readWorkspaceState(): Promise<string | null> {
  await env.DB.prepare(CREATE_TABLE_SQL).run();
  const row = await env.DB.prepare(
    "SELECT payload FROM workspace_states WHERE id = ?1"
  ).bind(1).first<{ payload: string }>();
  return row?.payload ?? null;
}

export async function writeWorkspaceState(payload: string): Promise<void> {
  await env.DB.prepare(CREATE_TABLE_SQL).run();
  await env.DB.prepare(`
    INSERT INTO workspace_states (id, payload, version, updated_at)
    VALUES (?1, ?2, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      payload = excluded.payload,
      version = workspace_states.version + 1,
      updated_at = CURRENT_TIMESTAMP
  `).bind(1, payload).run();
}
