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
  assert.match(page, /SpatialFilePicker/);
  assert.match(page, /空间文件工作区/);
  assert.match(page, /项目文件流/);
  assert.match(page, /CompactTaskPanel/);
  assert.match(page, /CommandFileDeck/);
  assert.match(page, /CommandInspector/);
  assert.match(page, /ProjectTimeline/);
  assert.match(page, /驾驶舱/);
  assert.match(page, /onWheel=/);
  assert.match(page, /onPointerDown=/);
  assert.match(page, /ArrowRight/);
  assert.match(page, /确认关联/);
  assert.match(page, /协作评论/);
  assert.match(page, /恢复演示数据/);
});

test("persists one shared workspace through D1", async () => {
  const [route, helper, schema, migration, hosting, data] = await Promise.all([
    read("../app/api/workspace/route.ts"),
    read("../db/workspace.ts"),
    read("../db/schema.ts"),
    read("../drizzle/0000_remarkable_clint_barton.sql"),
    read("../.openai/hosting.json"),
    read("../lib/workspace-data.ts"),
  ]);

  assert.match(hosting, /"d1":\s*"DB"/);
  assert.match(schema, /workspaceStates/);
  assert.match(migration, /CREATE TABLE `workspace_states`/);
  assert.match(helper, /CREATE TABLE IF NOT EXISTS workspace_states/);
  assert.match(helper, /ON CONFLICT\(id\) DO UPDATE/);
  assert.match(route, /export async function GET/);
  assert.match(route, /export async function PUT/);
  assert.match(route, /writeWorkspaceState/);

  for (const entity of ["tasks", "projects", "docs", "members", "events", "comments", "settings"]) {
    assert.match(data, new RegExp(`${entity}:`));
  }
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
