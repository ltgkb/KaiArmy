import { env } from "cloudflare:workers";

const CREATE_USERS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

const CREATE_SESSIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`;

let tablesReady: Promise<void> | null = null;

async function ensureTables(): Promise<void> {
  tablesReady ??= env.DB.batch([
    env.DB.prepare(CREATE_USERS_TABLE_SQL),
    env.DB.prepare(CREATE_SESSIONS_TABLE_SQL),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions(user_id)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON auth_sessions(expires_at)"),
  ]).then(() => undefined).catch((error) => {
    tablesReady = null;
    throw error;
  });
  await tablesReady;
}

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
};

export async function countUsers(): Promise<number> {
  await ensureTables();
  const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM users").first<{ count: number }>();
  return Number(row?.count ?? 0);
}

export async function createUser(user: AuthUser): Promise<boolean> {
  await ensureTables();
  try {
    const result = await env.DB.prepare(`
      INSERT INTO users (id, email, display_name, password_hash)
      VALUES (?1, ?2, ?3, ?4)
    `).bind(user.id, user.email, user.displayName, user.passwordHash).run();
    return result.meta.changes === 1;
  } catch (error) {
    if (error instanceof Error && /UNIQUE|constraint/i.test(error.message)) return false;
    throw error;
  }
}

export async function findUserByEmail(email: string): Promise<AuthUser | null> {
  await ensureTables();
  const row = await env.DB.prepare(`
    SELECT id, email, display_name AS displayName, password_hash AS passwordHash
    FROM users WHERE email = ?1
  `).bind(email).first<AuthUser>();
  return row ?? null;
}

export async function updateUserProfile(userId: string, displayName: string): Promise<void> {
  await ensureTables();
  await env.DB.prepare("UPDATE users SET display_name = ?2 WHERE id = ?1").bind(userId, displayName).run();
}

export async function readUserPasswordHash(userId: string): Promise<string | null> {
  await ensureTables();
  const row = await env.DB.prepare("SELECT password_hash AS passwordHash FROM users WHERE id = ?1").bind(userId).first<{ passwordHash: string }>();
  return row?.passwordHash ?? null;
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  await ensureTables();
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET password_hash = ?2 WHERE id = ?1").bind(userId, passwordHash),
    env.DB.prepare("DELETE FROM auth_sessions WHERE user_id = ?1").bind(userId),
  ]);
}

export async function createSession(tokenHash: string, userId: string, expiresAt: number): Promise<void> {
  await ensureTables();
  await env.DB.prepare(`
    INSERT INTO auth_sessions (token_hash, user_id, expires_at)
    VALUES (?1, ?2, ?3)
  `).bind(tokenHash, userId, expiresAt).run();
}

export async function findSessionUser(tokenHash: string, now: number): Promise<Omit<AuthUser, "passwordHash"> | null> {
  await ensureTables();
  const row = await env.DB.prepare(`
    SELECT users.id, users.email, users.display_name AS displayName
    FROM auth_sessions
    INNER JOIN users ON users.id = auth_sessions.user_id
    WHERE auth_sessions.token_hash = ?1 AND auth_sessions.expires_at > ?2
  `).bind(tokenHash, now).first<Omit<AuthUser, "passwordHash">>();
  return row ?? null;
}

export async function deleteSession(tokenHash: string): Promise<void> {
  await ensureTables();
  await env.DB.prepare("DELETE FROM auth_sessions WHERE token_hash = ?1").bind(tokenHash).run();
}

export async function deleteExpiredSessions(now: number): Promise<void> {
  await ensureTables();
  await env.DB.prepare("DELETE FROM auth_sessions WHERE expires_at <= ?1").bind(now).run();
}
