import { defaultWorkspace, type WorkspaceState } from "../../../lib/workspace-data";
import { readWorkspaceState, writeWorkspaceState } from "../../../db/workspace";

export async function GET() {
  try {
    const saved = await readWorkspaceState();
    if (!saved) {
      await writeWorkspaceState(JSON.stringify(defaultWorkspace));
      return Response.json({ workspace: defaultWorkspace });
    }
    return Response.json({ workspace: JSON.parse(saved) as WorkspaceState });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "读取工作区失败" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await request.json() as { workspace?: WorkspaceState };
    if (!payload.workspace || !Array.isArray(payload.workspace.tasks)) {
      return Response.json({ error: "工作区数据格式无效" }, { status: 400 });
    }
    const serialized = JSON.stringify(payload.workspace);
    if (serialized.length > 750_000) {
      return Response.json({ error: "工作区数据超过存储限制" }, { status: 413 });
    }
    await writeWorkspaceState(serialized);
    return Response.json({ ok: true, savedAt: new Date().toISOString() });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "保存工作区失败" },
      { status: 500 },
    );
  }
}
