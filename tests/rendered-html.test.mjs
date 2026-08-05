import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("ships the complete KaiArmy module surface", async () => {
  const page = await read("../app/page.tsx");
  for (const moduleName of [
    "项目任务管理",
    "项目总览",
    "文件归档",
    "日程管理",
    "团队协作",
    "智能分析",
    "知识库",
    "设置中心",
  ]) {
    assert.match(page, new RegExp(moduleName));
  }
  assert.match(page, /draggable/);
  assert.match(page, /onDrop=/);
  assert.match(page, /TaskFormModal/);
  assert.match(page, /ProjectFormModal/);
  assert.match(page, /DocFormModal/);
  assert.match(page, /EventFormModal/);
  assert.match(page, /BatchEventModal/);
  assert.match(page, /批量添加日程/);
  assert.match(page, /选择日期区间与重复规则/);
  assert.match(page, /仅工作日/);
  assert.match(page, /每周（按开始日）/);
  assert.match(page, /批量管理/);
  assert.match(page, /deleteSelected/);
  assert.match(page, /SpatialFilePicker/);
  assert.match(page, /空间文件工作区/);
  assert.match(page, /项目文件流/);
  assert.match(page, /CompactTaskPanel/);
  assert.match(page, /CommandFileDeck/);
  assert.match(page, /CommandInspector/);
  assert.match(page, /ProjectTimeline/);
  assert.match(page, /WikiKnowledgeAssistant/);
  assert.match(page, /WikiCatalogPanel/);
  assert.match(page, /引用到评论/);
  assert.match(page, /生成跟进任务/);
  assert.match(page, /驾驶舱/);
  assert.match(page, /onWheel=/);
  assert.match(page, /onPointerDown=/);
  assert.match(page, /ArrowRight/);
  assert.match(page, /确认关联/);
  assert.match(page, /协作评论/);
  assert.match(page, /清空工作区/);
});

test("proxies Wiki chat and catalog server-side", async () => {
  const [chatRoute, catalogRoute] = await Promise.all([
    read("../app/api/wiki/chat/route.ts"),
    read("../app/api/wiki/catalog/route.ts"),
  ]);

  assert.match(chatRoute, /https:\/\/wiki\.kai\.com\/api\/v1\/public-chat/);
  assert.match(chatRoute, /MAX_MESSAGE_LENGTH = 8_000/);
  assert.match(chatRoute, /conversation_id/);
  assert.match(chatRoute, /45_000/);
  assert.match(chatRoute, /consumeRateLimit/);
  assert.match(chatRoute, /MAX_UPSTREAM_BYTES/);
  assert.match(chatRoute, /isSameOriginMutation/);
  assert.match(catalogRoute, /public-chat\/catalog/);
  assert.match(catalogRoute, /knowledgeBases/);
  assert.match(catalogRoute, /ALLOWED_KNOWLEDGE_BASE_NAMES/);
  assert.match(catalogRoute, /private, max-age=60/);
});

test("persists isolated versioned workspaces through D1", async () => {
  const [route, helper, schema, migration, hosting, data, validation] = await Promise.all([
    read("../app/api/workspace/route.ts"),
    read("../db/workspace.ts"),
    read("../db/schema.ts"),
    read("../drizzle/0001_secure_workspace_state.sql"),
    read("../.openai/hosting.json"),
    read("../lib/workspace-data.ts"),
    read("../lib/workspace-validation.ts"),
  ]);

  assert.match(hosting, /"d1":\s*"DB"/);
  assert.match(schema, /workspaceUserStates/);
  assert.match(schema, /apiRateLimits/);
  assert.match(migration, /CREATE TABLE `workspace_user_states`/);
  assert.match(helper, /CREATE TABLE IF NOT EXISTS workspace_user_states/);
  assert.match(helper, /WHERE workspace_key = \?1 AND version = \?3/);
  assert.match(route, /export async function GET/);
  assert.match(route, /export async function PUT/);
  assert.match(route, /resolveWorkspace/);
  assert.match(route, /activeWorkspace\.id/);
  assert.match(route, /status: 409/);
  assert.match(route, /new TextEncoder/);
  assert.match(route, /writeWorkspaceState/);
  assert.match(validation, /validateWorkspace/);

  for (const entity of ["tasks", "projects", "docs", "members", "events", "comments", "settings"]) {
    assert.match(data, new RegExp(`${entity}:`));
  }
});

test("applies API and worker security boundaries", async () => {
  const [security, auth, authDb, worker, page, packageJson] = await Promise.all([
    read("../lib/api-security.ts"),
    read("../lib/auth.ts"),
    read("../db/auth.ts"),
    read("../worker/index.ts"),
    read("../app/page.tsx"),
    read("../package.json"),
  ]);

  assert.match(security, /readSessionIdentity/);
  assert.match(security, /isSameOriginMutation/);
  assert.match(security, /sec-fetch-site/);
  assert.match(security, /Content-Length|content-length/);
  assert.match(security, /仅支持 JSON 请求/);
  assert.match(auth, /PBKDF2/);
  assert.match(auth, /HttpOnly/);
  assert.match(auth, /SameSite=Lax/);
  assert.match(auth, /sha256Hex/);
  assert.match(authDb, /auth_sessions/);
  assert.match(worker, /Content-Security-Policy/);
  assert.match(worker, /X-Frame-Options/);
  assert.match(worker, /X-Request-Id/);
  assert.match(page, /workspaceVersion/);
  assert.match(page, /response.status === 409/);
  assert.match(packageJson, /"next": "16\.3\.0"/);
});

test("provides email registration, login, logout and isolated sessions", async () => {
  const [page, register, login, logout, session, migration] = await Promise.all([
    read("../app/page.tsx"),
    read("../app/api/auth/register/route.ts"),
    read("../app/api/auth/login/route.ts"),
    read("../app/api/auth/logout/route.ts"),
    read("../app/api/auth/session/route.ts"),
    read("../drizzle/0002_email_auth.sql"),
  ]);

  assert.match(page, /登录 KaiArmy/);
  assert.match(page, /创建你的账号/);
  assert.match(page, /api\/auth\/logout/);
  assert.match(register, /hashPassword/);
  assert.match(register, /readLatestWorkspaceState/);
  assert.match(register, /consumeRateLimit/);
  assert.match(login, /verifyPassword/);
  assert.match(login, /consumeRateLimit/);
  assert.match(logout, /revokeRequestSession/);
  assert.match(session, /getRequestIdentity/);
  assert.match(migration, /CREATE TABLE `users`/);
  assert.match(migration, /CREATE TABLE `auth_sessions`/);
});

test("provides shared workspaces and product-grade recovery flows", async () => {
  const [page, workspaceRoute, workspacesRoute, membersRoute, workspaceDb, migration] = await Promise.all([
    read("../app/page.tsx"),
    read("../app/api/workspace/route.ts"),
    read("../app/api/workspaces/route.ts"),
    read("../app/api/workspaces/members/route.ts"),
    read("../db/workspaces.ts"),
    read("../drizzle/0003_shared_workspaces.sql"),
  ]);

  assert.match(page, /GUEST_WORKSPACE_KEY/);
  assert.match(page, /localStorage/);
  assert.match(page, /工作区发生冲突/);
  assert.match(page, /使用云端最新版本/);
  assert.match(page, /用我的版本覆盖/);
  assert.match(page, /真实成员/);
  assert.match(page, /导入 JSON/);
  assert.match(workspaceRoute, /activeWorkspace\.role === "viewer"/);
  assert.match(workspacesRoute, /createProductWorkspace/);
  assert.match(membersRoute, /仅工作区所有者/);
  assert.match(workspaceDb, /workspace_memberships/);
  assert.match(workspaceDb, /assigned/);
  assert.match(migration, /CREATE TABLE `product_workspaces`/);
  assert.match(migration, /CREATE TABLE `workspace_memberships`/);
});

test("removes the starter preview and uses product metadata", async () => {
  const [layout, page, packageJson] = await Promise.all([
    read("../app/layout.tsx"),
    read("../app/page.tsx"),
    read("../package.json"),
  ]);
  assert.match(layout, /KaiArmy/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview/);
  assert.doesNotMatch(page, /SkeletonPreview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});

test("uses the WenXiBuddy thin-glass visual system", async () => {
  const [page, styles] = await Promise.all([
    read("../app/page.tsx"),
    read("../app/globals.css"),
  ]);

  assert.match(styles, /WenXiBuddy ultra-thin white-light glass system/);
  assert.match(styles, /--bg: #020304/);
  assert.match(styles, /--green: #17d97a/);
  assert.match(styles, /backdrop-filter: blur\(22px\)/);
  assert.match(styles, /Taste audit refinement · focused enterprise workspace/);
  assert.match(styles, /:root\[data-theme="light"\][\s\S]*color-scheme: light/);
  assert.match(styles, /grid-template-columns: repeat\(var\(--tick-count\),minmax\(0,1fr\)\)/);
  assert.match(styles, /@media \(prefers-reduced-transparency: reduce\)/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(page, /function Icon/);
  assert.match(page, /strokeWidth="1\.65"/);
  assert.doesNotMatch(page, /🗑/);
});
