"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  createEmptyWorkspace,
  defaultWorkspace,
  type CalendarEvent,
  type Doc,
  type DocFile,
  type DocFileKind,
  type Priority,
  type Project,
  type Task,
  type TaskStatus,
  type WorkspaceState,
} from "../lib/workspace-data";
import { validateWorkspace } from "../lib/workspace-validation";

const navItems = [
  ["tasks", "项目任务管理"],
  ["grid", "项目总览"],
  ["folder", "文件归档"],
  ["calendar", "日程管理"],
  ["users", "团队协作"],
  ["chart", "智能分析"],
  ["book", "知识库"],
  ["settings", "设置中心"],
] as const;

const statusInfo: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: "待办", color: "#8C9490" },
  review: { label: "需求评审", color: "#62AFFF" },
  design: { label: "产品设计", color: "#C8CFCC" },
  develop: { label: "开发实现", color: "#A8B0AC" },
  test: { label: "测试验证", color: "#F2A72D" },
  done: { label: "已完成", color: "#17D97A" },
};

type IconName = "tasks" | "grid" | "folder" | "calendar" | "users" | "chart" | "book" | "settings" | "search" | "bell" | "plus" | "check" | "close" | "more" | "edit" | "trash" | "arrow-right" | "sparkles";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    tasks: <><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M9 4.5h6M8.5 9h7M8.5 13h5M8.5 17h6" /></>,
    grid: <><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" /></>,
    folder: <path d="M3.5 7.5h6l1.8-2h9.2v12.8a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7V7.5Z" />,
    calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M8 3.5v3M16 3.5v3M3.5 9h17M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" /></>,
    users: <><path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20" /><circle cx="9.5" cy="7.5" r="3.5" /><path d="M16 5.2a3.4 3.4 0 0 1 0 6.6M21 20v-1.5a4 4 0 0 0-3-3.8" /></>,
    chart: <><path d="M4 19.5V13h4v6.5M10 19.5V8h4v11.5M16 19.5V4h4v15.5M3 20h18" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z" /><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22V5.5Z" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="m5 12 4.2 4.2L19 6.5" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>,
    edit: <><path d="m14 5 5 5L9 20H4v-5L14 5Z" /><path d="m12 7 5 5" /></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></>,
    "arrow-right": <><path d="M5 12h14M14 7l5 5-5 5" /></>,
    sparkles: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" /><path d="m18 14 .7 2.3L21 17l-2.3.7L18 20l-.7-2.3L15 17l2.3-.7L18 14Z" /></>,
  };
  return <svg className="ui-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

const statusOrder = Object.keys(statusInfo) as TaskStatus[];
const priorityLabel: Record<Priority, string> = { high: "高", medium: "中", low: "低" };
const moduleDescriptions: Record<string, string> = {
  项目任务管理: "规划任务、推进状态、协同交付",
  项目总览: "掌握项目健康度、里程碑与交付风险",
  文件归档: "统一管理项目文档、版本和关联任务",
  日程管理: "联动会议、评审与任务截止时间",
  团队协作: "平衡工作负载，快速转交与协同",
  智能分析: "从实时数据中发现瓶颈与风险",
  知识库: "沉淀项目知识，并与任务双向关联",
  设置中心: "管理个人偏好、工作区和通知",
};

type ModalState =
  | { kind: "task"; task?: Task; preset?: Partial<Task> }
  | { kind: "project" }
  | { kind: "doc" }
  | { kind: "event"; date?: string }
  | { kind: "events-batch" }
  | null;

type Notification = {
  id: string;
  tone: "red" | "amber" | "blue";
  icon: string;
  title: string;
  detail: string;
  module: string;
  taskId?: string;
};

type WikiChatResult = {
  answer: string;
  conversationId: string | null;
  executionId: string | null;
  createdAt: string;
  source: string;
};

type WikiCatalog = {
  knowledgeBases: Array<{
    id: string;
    name: string;
    description: string;
    embeddingModel: string;
    documentCount: number;
    status: string;
  }>;
  flows: Array<{
    id: string;
    name: string;
    description: string;
    nodeCount: number;
    status: string;
  }>;
};

type AuthUser = {
  id: string;
  email: string;
  displayName: string;
};

type ProductWorkspace = {
  id: string;
  name: string;
  role: "owner" | "editor" | "viewer";
  memberCount: number;
};

type ProductMember = AuthUser & { role: ProductWorkspace["role"] };

const GUEST_WORKSPACE_KEY = "kaiarmy_guest_workspace_v1";

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", timeZone: "Asia/Shanghai" }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Shanghai" }).format(new Date(value));
}
// 本地时区 YYYY-MM-DD，避免 toISOString 的 UTC 偏移导致日期错位
function ymd(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shanghaiDayStart(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return new Date(`${part("year")}-${part("month")}-${part("day")}T00:00:00+08:00`);
}

function isOverdue(task: Task) {
  return task.status !== "done" && new Date(task.dueAt).getTime() < Date.now();
}

const MAX_FILE_BYTES = 400_000; // 单文件上限，为 750KB 总存储留余量
const EDITABLE_KINDS: DocFileKind[] = ["md", "csv", "txt"];
const fileKindByExt: Record<string, DocFileKind> = { md: "md", markdown: "md", csv: "csv", txt: "txt", text: "txt", pdf: "pdf", docx: "docx", doc: "docx" };

function kindFromName(name: string): DocFileKind {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return fileKindByExt[ext] ?? "txt";
}

function formatBytes(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function parseCsv(text: string): string[][] {
  return text.replace(/\r\n?/g, "\n").split("\n").filter((line) => line.length > 0).map((line) => line.split(","));
}

function serializeCsv(rows: string[][]) {
  return rows.map((row) => row.join(",")).join("\n");
}

// 极简 Markdown 渲染：标题 / 列表 / 粗体，不引三方库
function renderMarkdown(text: string) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flushList = (key: number) => {
    if (!list.length) return;
    blocks.push(<ul key={`ul-${key}`}>{list.map((item, index) => <li key={index}>{renderInline(item)}</li>)}</ul>);
    list = [];
  };
  lines.forEach((line, index) => {
    if (/^\s*[-*]\s+/.test(line)) { list.push(line.replace(/^\s*[-*]\s+/, "")); return; }
    flushList(index);
    if (/^#{1,6}\s+/.test(line)) {
      const level = line.match(/^#+/)![0].length;
      const content = line.replace(/^#+\s+/, "");
      const Tag = (`h${Math.min(level + 2, 6)}`) as keyof React.JSX.IntrinsicElements;
      blocks.push(<Tag key={index}>{renderInline(content)}</Tag>);
    } else if (line.trim()) {
      blocks.push(<p key={index}>{renderInline(line)}</p>);
    }
  });
  flushList(lines.length);
  return blocks;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => /^\*\*[^*]+\*\*$/.test(part) ? <strong key={index}>{part.slice(2, -2)}</strong> : <span key={index}>{part}</span>);
}

function taskKnowledgeContext(task: Task, workspace: WorkspaceState) {
  const project = workspace.projects.find((item) => item.id === task.projectId);
  const member = workspace.members.find((item) => item.id === task.assigneeId);
  const docs = workspace.docs.filter((doc) => task.docIds.includes(doc.id));
  return [
    `任务：${task.id} ${task.title}`,
    `描述：${task.description || "未填写"}`,
    `项目：${project?.name ?? "未关联"}`,
    `负责人：${member?.name ?? "未指派"}`,
    `状态：${statusInfo[task.status].label}`,
    `优先级：${priorityLabel[task.priority]}`,
    `截止时间：${formatDateTime(task.dueAt)}`,
    `标签：${task.tags.join("、") || "无"}`,
    `关联文档：${docs.map((doc) => `${doc.name}（${doc.type.toUpperCase()} v${doc.version}）`).join("、") || "无"}`,
  ].join("\n");
}

export default function Home() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authState, setAuthState] = useState<"loading" | "guest" | "authenticated">("loading");
  const [authOpen, setAuthOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<ProductWorkspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<ProductWorkspace | null>(null);
  const [syncConflict, setSyncConflict] = useState<{ workspace: WorkspaceState; currentVersion: number } | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceState>(defaultWorkspace);
  const [activeModule, setActiveModule] = useState("项目任务管理");
  const [selectedTaskId, setSelectedTaskId] = useState(defaultWorkspace.tasks[0].id);
  const [selectedDocId, setSelectedDocId] = useState(defaultWorkspace.docs[0].id);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [fileModal, setFileModal] = useState<{ docId: string; fileId: string } | null>(null);
  const [toast, setToast] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [syncState, setSyncState] = useState<"loading" | "saved" | "saving" | "error" | "guest">("loading");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workspaceVersion = useRef(1);
  const saveInFlight = useRef(false);
  const pendingWorkspace = useRef<WorkspaceState | null>(null);
  const hydratedWorkspace = useRef<WorkspaceState | null>(null);

  const announce = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }, []);

  const persistWorkspace = useCallback(async () => {
    if (saveInFlight.current) return;
    saveInFlight.current = true;
    try {
      while (pendingWorkspace.current) {
        const snapshot = pendingWorkspace.current;
        pendingWorkspace.current = null;
        setSyncState("saving");
        const response = await fetch("/api/workspace", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspace: snapshot, version: workspaceVersion.current }),
        });
        const result = await response.json() as { version?: number; currentVersion?: number; workspaceName?: string; error?: string };
        if (response.status === 401) {
          setAuthUser(null);
          setAuthState("guest");
          setSyncState("guest");
          pendingWorkspace.current = null;
          break;
        }
        if (response.status === 409) {
          pendingWorkspace.current = null;
          setSyncState("error");
          if (Number.isInteger(result.currentVersion)) setSyncConflict({ workspace: snapshot, currentVersion: result.currentVersion! });
          announce("检测到其他成员更新，请选择保留版本");
          break;
        }
        if (!response.ok || !Number.isInteger(result.version)) throw new Error(result.error || "保存失败");
        workspaceVersion.current = result.version!;
        if (result.workspaceName) {
          setActiveWorkspace((current) => current ? { ...current, name: result.workspaceName! } : current);
          setWorkspaces((current) => current.map((item) => item.id === activeWorkspace?.id ? { ...item, name: result.workspaceName! } : item));
        }
        setSyncState("saved");
      }
    } catch {
      setSyncState("error");
    } finally {
      saveInFlight.current = false;
    }
  }, [activeWorkspace?.id, announce]);

  useEffect(() => {
    fetch("/api/workspace")
      .then(async (response) => {
        if (response.status === 401) {
          try {
            const local = window.localStorage.getItem(GUEST_WORKSPACE_KEY);
            if (local) {
              const parsed = JSON.parse(local) as unknown;
              if (validateWorkspace(parsed)) setWorkspace(parsed);
            }
          } catch {
            window.localStorage.removeItem(GUEST_WORKSPACE_KEY);
          }
          setAuthState("guest");
          setSyncState("guest");
          return null;
        }
        if (!response.ok) throw new Error("读取失败");
        return response.json() as Promise<{ workspace: WorkspaceState; version: number; user: AuthUser; activeWorkspace: ProductWorkspace }>;
      })
      .then((result) => {
        if (!result) return;
        const { workspace: saved, version, user, activeWorkspace: selectedWorkspace } = result;
        setAuthUser(user);
        setAuthState("authenticated");
        setActiveWorkspace(selectedWorkspace);
        hydratedWorkspace.current = saved;
        setWorkspace(saved);
        workspaceVersion.current = version;
        setSelectedTaskId(saved.tasks[0]?.id ?? "");
        setSelectedDocId(saved.docs[0]?.id ?? "");
        setSyncState("saved");
        void fetch("/api/workspaces").then((response) => response.json()).then((data: { workspaces?: ProductWorkspace[] }) => setWorkspaces(data.workspaces ?? []));
      })
      .catch(() => {
        setAuthState("guest");
        setSyncState("guest");
      })
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated || authState !== "guest") return;
    try {
      window.localStorage.setItem(GUEST_WORKSPACE_KEY, JSON.stringify(workspace));
    } catch {}
  }, [workspace, hydrated, authState]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (authState === "authenticated" && (syncState === "saving" || pendingWorkspace.current)) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [authState, syncState]);

  useEffect(() => {
    if (!hydrated || authState !== "authenticated") return;
    if (hydratedWorkspace.current === workspace) {
      hydratedWorkspace.current = null;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    pendingWorkspace.current = workspace;
    saveTimer.current = setTimeout(() => {
      void persistWorkspace();
    }, 700);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [workspace, hydrated, authState, persistWorkspace]);

  // 应用主题到 <html data-theme>，供 CSS 变量切换
  useEffect(() => {
    const theme = workspace.settings.theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
  }, [workspace.settings.theme]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeModule]);

  const selectedTask = workspace.tasks.find((task) => task.id === selectedTaskId);
  const readOnly = activeWorkspace?.role === "viewer";
  const currentMemberId = authUser && workspace.members.some((member) => member.id === authUser.id)
    ? authUser.id
    : workspace.members[0]?.id ?? "guest";
  const patchWorkspace = (patch: Partial<WorkspaceState>) => {
    if (activeWorkspace?.role === "viewer") {
      announce("当前工作区为只读权限");
      return;
    }
    setWorkspace((current) => ({ ...current, ...patch }));
  };
  const updateTask = (id: string, patch: Partial<Task>) => {
    patchWorkspace({ tasks: workspace.tasks.map((task) => task.id === id ? { ...task, ...patch, updatedAt: new Date().toISOString() } : task) });
  };
  const deleteTask = (id: string) => {
    if (readOnly) { announce("当前工作区为只读权限"); return; }
    if (!window.confirm("确定删除这个任务？相关评论会一并删除。")) return;
    patchWorkspace({
      tasks: workspace.tasks.filter((task) => task.id !== id),
      comments: workspace.comments.filter((comment) => comment.taskId !== id),
      docs: workspace.docs.map((doc) => ({ ...doc, taskIds: doc.taskIds.filter((taskId) => taskId !== id) })),
    });
    setSelectedTaskId(workspace.tasks.find((task) => task.id !== id)?.id ?? "");
    announce("任务已删除");
  };

  const updateDocFile = (docId: string, fileId: string, patch: Partial<DocFile>) => {
    patchWorkspace({
      docs: workspace.docs.map((doc) => doc.id === docId ? {
        ...doc,
        updatedAt: new Date().toISOString(),
        files: (doc.files ?? []).map((file) => file.id === fileId ? { ...file, ...patch, updatedAt: new Date().toISOString() } : file),
      } : doc),
    });
  };
  const addDocFile = (docId: string, file: DocFile) => {
    if (readOnly) { announce("当前工作区为只读权限"); return; }
    patchWorkspace({
      docs: workspace.docs.map((doc) => doc.id === docId ? { ...doc, updatedAt: new Date().toISOString(), files: [...(doc.files ?? []), file] } : doc),
    });
    announce("文件已上传");
  };
  const deleteDocFile = (docId: string, fileId: string) => {
    if (readOnly) { announce("当前工作区为只读权限"); return; }
    patchWorkspace({
      docs: workspace.docs.map((doc) => doc.id === docId ? { ...doc, updatedAt: new Date().toISOString(), files: (doc.files ?? []).filter((file) => file.id !== fileId) } : doc),
    });
    announce("文件已删除");
  };
  const fileModalDoc = fileModal ? workspace.docs.find((doc) => doc.id === fileModal.docId) : undefined;
  const fileModalFile = fileModalDoc?.files?.find((file) => file.id === fileModal?.fileId);

  const contextualAction = () => {
    if (activeWorkspace?.role === "viewer") { announce("当前工作区为只读权限"); return; }
    const kind = activeModule === "项目总览" ? "project" : activeModule === "文件归档" || activeModule === "知识库" ? "doc" : activeModule === "日程管理" ? "event" : "task";
    setModal({ kind });
  };
  const actionLabel = activeModule === "项目总览" ? "新建项目" : activeModule === "文件归档" || activeModule === "知识库" ? "新建文档" : activeModule === "日程管理" ? "新建日程" : "新建任务";

  const todayKey = new Date().toISOString().slice(0, 10);
  const notifications = useMemo<Notification[]>(() => {
    const list: Notification[] = [];
    workspace.tasks.filter(isOverdue).forEach((task) => list.push({ id: `n-over-${task.id}`, tone: "red", icon: "!", title: `任务逾期：${task.title}`, detail: `已过截止 ${formatDate(task.dueAt)}`, module: "项目任务管理", taskId: task.id }));
    workspace.tasks.filter((task) => task.status !== "done" && task.dueAt.startsWith(todayKey)).forEach((task) => list.push({ id: `n-today-${task.id}`, tone: "amber", icon: "◷", title: `今日截止：${task.title}`, detail: formatDateTime(task.dueAt), module: "项目任务管理", taskId: task.id }));
    workspace.projects.filter((project) => !project.archived && project.health === "risk").forEach((project) => list.push({ id: `n-risk-${project.id}`, tone: "red", icon: "▲", title: `项目风险：${project.name}`, detail: "健康度为风险，建议干预", module: "项目总览" }));
    workspace.events.filter((event) => event.date >= todayKey).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0, 3).forEach((event) => list.push({ id: `n-event-${event.id}`, tone: "blue", icon: "▣", title: event.title, detail: `${formatDate(event.date)} ${event.time}`, module: "日程管理" }));
    return list;
  }, [workspace, todayKey]);
  const unreadCount = notifications.filter((item) => item.tone === "red" || item.tone === "amber").length;
  const openNotification = (item: Notification) => {
    setActiveModule(item.module);
    if (item.taskId) setSelectedTaskId(item.taskId);
  };

  const handleAuthenticated = (user: AuthUser) => {
    setAuthUser(user);
    setAuthState("authenticated");
    setAuthOpen(false);
    setHydrated(false);
    setSyncState("loading");
    fetch("/api/workspace")
      .then(async (response) => {
        if (!response.ok) throw new Error("读取失败");
        return response.json() as Promise<{ workspace: WorkspaceState; version: number; activeWorkspace: ProductWorkspace }>;
      })
      .then(({ workspace: saved, version, activeWorkspace: selectedWorkspace }) => {
        setActiveWorkspace(selectedWorkspace);
        hydratedWorkspace.current = saved;
        setWorkspace(saved);
        workspaceVersion.current = version;
        setSelectedTaskId(saved.tasks[0]?.id ?? "");
        setSelectedDocId(saved.docs[0]?.id ?? "");
        setSyncState("saved");
        setHydrated(true);
        void fetch("/api/workspaces").then((response) => response.json()).then((data: { workspaces?: ProductWorkspace[] }) => setWorkspaces(data.workspaces ?? []));
      })
      .catch(() => setSyncState("error"));
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    pendingWorkspace.current = null;
    setAuthUser(null);
    setAuthState("guest");
    setActiveWorkspace(null);
    setWorkspaces([]);
    let guestWorkspace = defaultWorkspace;
    try {
      const local = window.localStorage.getItem(GUEST_WORKSPACE_KEY);
      const parsed = local ? JSON.parse(local) as unknown : null;
      if (validateWorkspace(parsed)) guestWorkspace = parsed;
    } catch {}
    setWorkspace(guestWorkspace);
    setSelectedTaskId(guestWorkspace.tasks[0]?.id ?? "");
    setSelectedDocId(guestWorkspace.docs[0]?.id ?? "");
    setSyncState("guest");
    setHydrated(true);
  };

  const switchWorkspace = async (workspaceId: string) => {
    if (!workspaceId || workspaceId === activeWorkspace?.id) return;
    if (syncState === "saving" || pendingWorkspace.current) await persistWorkspace();
    setSyncState("loading");
    const response = await fetch("/api/workspaces/select", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId }) });
    if (!response.ok) { setSyncState("error"); announce("切换工作区失败"); return; }
    const workspaceResponse = await fetch("/api/workspace");
    const result = await workspaceResponse.json() as { workspace?: WorkspaceState; version?: number; activeWorkspace?: ProductWorkspace; error?: string };
    if (!workspaceResponse.ok || !result.workspace || !result.activeWorkspace || !Number.isInteger(result.version)) { setSyncState("error"); announce(result.error || "读取工作区失败"); return; }
    hydratedWorkspace.current = result.workspace;
    setWorkspace(result.workspace);
    workspaceVersion.current = result.version!;
    setActiveWorkspace(result.activeWorkspace);
    setSelectedTaskId(result.workspace.tasks[0]?.id ?? "");
    setSelectedDocId(result.workspace.docs[0]?.id ?? "");
    setSyncState("saved");
  };

  const reloadCloudWorkspace = async () => {
    const response = await fetch("/api/workspace");
    const result = await response.json() as { workspace?: WorkspaceState; version?: number };
    if (response.ok && result.workspace && Number.isInteger(result.version)) {
      hydratedWorkspace.current = result.workspace;
      setWorkspace(result.workspace);
      workspaceVersion.current = result.version!;
      setSyncState("saved");
      setSyncConflict(null);
    }
  };

  const overwriteCloudWorkspace = () => {
    if (!syncConflict) return;
    workspaceVersion.current = syncConflict.currentVersion;
    pendingWorkspace.current = syncConflict.workspace;
    setWorkspace(syncConflict.workspace);
    setSyncConflict(null);
    void persistWorkspace();
  };

  if (authState === "loading") return <AuthLoading />;

  return (
    <div className={`app ${workspace.settings.compactMode ? "compact" : ""}`}>
      <Sidebar active={activeModule} onChange={(module) => { setActiveModule(module); setSearch(""); }} workspace={workspace} user={authUser} workspaces={workspaces} activeWorkspace={activeWorkspace} onSwitchWorkspace={switchWorkspace} onLogin={() => setAuthOpen(true)} onLogout={logout} />
      <main className="main">
        <Header activeModule={activeModule} search={search} setSearch={setSearch} syncState={syncState} actionLabel={actionLabel} onAction={contextualAction} actionDisabled={readOnly} notifications={notifications} unreadCount={unreadCount} onOpenNotification={openNotification} />
        <div className="page">
          {activeModule === "项目任务管理" && (
            <TaskManagement
              workspace={workspace}
              search={search}
              selectedTaskId={selectedTaskId}
              wikiEnabled={Boolean(authUser)}
              canEdit={!readOnly}
              currentMemberId={currentMemberId}
              onSelect={setSelectedTaskId}
              onUpdate={updateTask}
              onDelete={deleteTask}
              onEdit={(task) => readOnly ? announce("当前工作区为只读权限") : setModal({ kind: "task", task })}
              onCreate={() => readOnly ? announce("当前工作区为只读权限") : setModal({ kind: "task" })}
              onCreateKnowledgeTask={(sourceTask, answer) => readOnly ? announce("当前工作区为只读权限") : setModal({
                kind: "task",
                preset: {
                  title: `${sourceTask.title} · 知识跟进`,
                  description: `基于 KAI 知识助手建议：\n${answer.slice(0, 1200)}`,
                  projectId: sourceTask.projectId,
                  assigneeId: sourceTask.assigneeId,
                  participantIds: sourceTask.participantIds,
                  priority: sourceTask.priority,
                  tags: Array.from(new Set([...sourceTask.tags, "KAI知识"])),
                  docIds: sourceTask.docIds,
                },
              })}
              onComment={(content) => {
                if (!selectedTask) return;
                patchWorkspace({ comments: [...workspace.comments, { id: uid("c"), taskId: selectedTask.id, authorId: currentMemberId, content, createdAt: new Date().toISOString() }] });
                announce("评论已发布");
              }}
              onLinkDocs={(taskId, docIds) => {
                patchWorkspace({
                  tasks: workspace.tasks.map((task) => task.id === taskId ? { ...task, docIds, updatedAt: new Date().toISOString() } : task),
                  docs: workspace.docs.map((doc) => ({
                    ...doc,
                    taskIds: docIds.includes(doc.id)
                      ? Array.from(new Set([...doc.taskIds, taskId]))
                      : doc.taskIds.filter((id) => id !== taskId),
                  })),
                });
                announce(`已更新 ${docIds.length} 个关联文件`);
              }}
              announce={announce}
            />
          )}
          {activeModule === "项目总览" && <ProjectOverview workspace={workspace} search={search} onChange={patchWorkspace} onCreate={() => readOnly ? announce("当前工作区为只读权限") : setModal({ kind: "project" })} announce={announce} onOpenFile={(docId, fileId) => setFileModal({ docId, fileId })} onUploadFile={addDocFile} />}
          {activeModule === "文件归档" && <FileArchive workspace={workspace} search={search} selectedDocId={selectedDocId} onSelect={setSelectedDocId} onChange={patchWorkspace} onCreate={() => readOnly ? announce("当前工作区为只读权限") : setModal({ kind: "doc" })} announce={announce} onOpenFile={(docId, fileId) => setFileModal({ docId, fileId })} onUploadFile={addDocFile} onDeleteFile={deleteDocFile} />}
          {activeModule === "日程管理" && <CalendarView workspace={workspace} search={search} onChange={patchWorkspace} onCreate={(date) => readOnly ? announce("当前工作区为只读权限") : setModal({ kind: "event", date })} onBatchCreate={() => readOnly ? announce("当前工作区为只读权限") : setModal({ kind: "events-batch" })} announce={announce} />}
          {activeModule === "团队协作" && <TeamView workspace={workspace} search={search} onUpdateTask={updateTask} />}
          {activeModule === "智能分析" && <AnalyticsView workspace={workspace} />}
          {activeModule === "知识库" && <KnowledgeBase workspace={workspace} search={search} selectedDocId={selectedDocId} selectedTaskId={selectedTaskId} wikiEnabled={Boolean(authUser)} canEdit={!readOnly} onSelect={setSelectedDocId} onChange={patchWorkspace} onCreate={() => readOnly ? announce("当前工作区为只读权限") : setModal({ kind: "doc" })} onAddComment={(taskId, content) => patchWorkspace({ comments: [...workspace.comments, { id: uid("c"), taskId, authorId: currentMemberId, content, createdAt: new Date().toISOString() }] })} onCreateKnowledgeTask={(sourceTask, answer) => readOnly ? announce("当前工作区为只读权限") : setModal({ kind: "task", preset: { title: `${sourceTask.title} · 知识跟进`, description: `基于 KAI 知识助手建议：\n${answer.slice(0, 1200)}`, projectId: sourceTask.projectId, assigneeId: sourceTask.assigneeId, participantIds: sourceTask.participantIds, priority: sourceTask.priority, tags: Array.from(new Set([...sourceTask.tags, "KAI知识"])), docIds: sourceTask.docIds } })} announce={announce} />}
          {activeModule === "设置中心" && <SettingsView key={`${authUser?.id ?? "guest"}-${activeWorkspace?.id ?? "local"}`} workspace={workspace} onChange={patchWorkspace} announce={announce} user={authUser} activeWorkspace={activeWorkspace} workspaces={workspaces} onWorkspacesChange={setWorkspaces} onSwitchWorkspace={switchWorkspace} onReloadWorkspace={reloadCloudWorkspace} onUserChange={setAuthUser} />}
        </div>
      </main>
      {modal?.kind === "task" && <TaskFormModal workspace={workspace} task={modal.task} preset={modal.preset} onClose={() => setModal(null)} onSave={(task) => {
        if (modal.task) {
          patchWorkspace({ tasks: workspace.tasks.map((item) => item.id === task.id ? task : item) });
          announce("任务已更新");
        } else {
          patchWorkspace({ tasks: [...workspace.tasks, task] });
          setSelectedTaskId(task.id);
          announce("任务已创建");
        }
        setModal(null);
      }} />}
      {modal?.kind === "project" && <ProjectFormModal workspace={workspace} onClose={() => setModal(null)} onSave={(project) => { patchWorkspace({ projects: [...workspace.projects, project] }); setModal(null); announce("项目已创建"); }} />}
      {modal?.kind === "doc" && <DocFormModal workspace={workspace} onClose={() => setModal(null)} onSave={(doc) => { patchWorkspace({ docs: [...workspace.docs, doc] }); setSelectedDocId(doc.id); setModal(null); announce("文档已创建"); }} />}
      {modal?.kind === "event" && <EventFormModal workspace={workspace} presetDate={modal.date} onClose={() => setModal(null)} onSave={(event) => { patchWorkspace({ events: [...workspace.events, event] }); setModal(null); announce("日程已创建"); }} />}
      {modal?.kind === "events-batch" && <BatchEventModal workspace={workspace} onClose={() => setModal(null)} onSave={(events) => { patchWorkspace({ events: [...workspace.events, ...events] }); setModal(null); announce(`已批量添加 ${events.length} 条日程`); }} />}
      {fileModal && fileModalDoc && fileModalFile && <FileViewerModal docName={fileModalDoc.name} file={fileModalFile} readOnly={readOnly} onClose={() => setFileModal(null)} onSave={(patch) => { updateDocFile(fileModal.docId, fileModal.fileId, patch); announce("文件已保存"); }} onReplace={(patch) => updateDocFile(fileModal.docId, fileModal.fileId, patch)} onOversize={() => announce(`文件超过 ${Math.round(MAX_FILE_BYTES / 1000)}KB 上限`)} />}
      {authOpen && <AuthScreen onAuthenticated={handleAuthenticated} onClose={() => setAuthOpen(false)} />}
      {syncConflict && <div className="modal-backdrop"><section className="sync-conflict panel"><header><div><h2>工作区发生冲突</h2><p>其他成员已经保存了更新。请选择要保留的数据版本。</p></div></header><div><button onClick={() => void reloadCloudWorkspace()}>使用云端最新版本</button><button className="primary" onClick={overwriteCloudWorkspace}>用我的版本覆盖</button></div></section></div>}
      {toast && <div className="toast"><Icon name="check" size={16} />{toast}</div>}
    </div>
  );
}

function Sidebar({ active, onChange, workspace, user, workspaces, activeWorkspace, onSwitchWorkspace, onLogin, onLogout }: { active: string; onChange: (module: string) => void; workspace: WorkspaceState; user: AuthUser | null; workspaces: ProductWorkspace[]; activeWorkspace: ProductWorkspace | null; onSwitchWorkspace: (id: string) => void; onLogin: () => void; onLogout: () => void }) {
  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => onChange("项目任务管理")}><span>KA</span><div><strong>KaiArmy</strong><small>PROJECT INTELLIGENCE</small></div></button>
      <nav>
        <span className="nav-label">工作台</span>
        {navItems.slice(0, 6).map(([icon, label]) => <button key={label} className={active === label ? "active" : ""} onClick={() => onChange(label)}><i><Icon name={icon} /></i><span>{label}</span>{label === "项目任务管理" && <b>{workspace.tasks.filter((task) => task.status !== "done").length}</b>}</button>)}
        <span className="nav-label secondary">资源与配置</span>
        {navItems.slice(6).map(([icon, label]) => <button key={label} className={active === label ? "active" : ""} onClick={() => onChange(label)}><i><Icon name={icon} /></i><span>{label}</span></button>)}
      </nav>
      <div className="workspace-card"><span>当前工作区</span>{user && workspaces.length > 1 ? <select aria-label="切换工作区" value={activeWorkspace?.id ?? ""} onChange={(event) => void onSwitchWorkspace(event.target.value)}>{workspaces.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select> : <strong>{workspace.settings.workspaceName}</strong>}<small>{user ? `${activeWorkspace?.memberCount ?? 1} 位真实成员 · ${activeWorkspace?.role === "owner" ? "所有者" : activeWorkspace?.role === "editor" ? "可编辑" : "只读"}` : "本机数据 · 登录后云端同步"}</small></div>
      {user ? (
        <div className="user-card"><Avatar label={initials(user.displayName)} /><div><strong>{user.displayName}</strong><small>{user.email}</small></div><button aria-label="退出登录" title="退出登录" onClick={onLogout}>↗</button></div>
      ) : (
        <button className="user-card guest-user-card" onClick={onLogin}><Avatar label="访" /><div><strong>访客模式</strong><small>登录后云端同步</small></div><span>登录</span></button>
      )}
    </aside>
  );
}

function initials(value: string) {
  const compact = value.trim().replace(/\s+/g, " ");
  if (!compact) return "KA";
  const parts = compact.split(" ");
  return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}` : compact.slice(0, 2)).toUpperCase();
}

function AuthLoading() {
  return <main className="auth-shell"><div className="auth-loader"><span>KA</span><p>正在进入工作区…</p></div></main>;
}

function AuthScreen({ onAuthenticated, onClose }: { onAuthenticated: (user: AuthUser) => void; onClose: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });
      const result = await response.json() as { user?: AuthUser; error?: string };
      if (!response.ok || !result.user) throw new Error(result.error || "操作失败");
      onAuthenticated(result.user);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "操作失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-modal-backdrop" onMouseDown={onClose}>
      <form className="auth-card auth-dialog" onMouseDown={(event) => event.stopPropagation()} onSubmit={submit}>
          <header><div><small>{mode === "login" ? "WELCOME BACK" : "CREATE WORKSPACE"}</small><h2>{mode === "login" ? "登录 KaiArmy" : "创建你的账号"}</h2><p>{mode === "login" ? "登录后加载你的云端工作区。" : "注册后获得独立的云端工作区。"}</p></div><button type="button" className="auth-close" aria-label="关闭" onClick={onClose}><Icon name="close" size={18} /></button></header>
          <div className="auth-tabs"><button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>登录</button><button type="button" className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>注册</button></div>
          {mode === "register" && <label>显示名称<input autoFocus value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" minLength={2} maxLength={80} placeholder="你的姓名" required /></label>}
          <label>邮箱<input autoFocus={mode === "login"} type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={320} placeholder="name@company.com" required /></label>
          <label>密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "register" ? 10 : undefined} maxLength={128} placeholder={mode === "register" ? "至少 10 个字符" : "输入密码"} required /></label>
          {error && <p className="auth-error">{error}</p>}
          <button className="auth-submit" disabled={submitting}>{submitting ? "请稍候…" : mode === "login" ? "进入工作区" : "创建账号"}<span>→</span></button>
          <footer>当前访客修改仅保留在本次页面 · 登录后切换到云端数据</footer>
      </form>
    </div>
  );
}

function Header({ activeModule, search, setSearch, syncState, actionLabel, onAction, actionDisabled = false, notifications, unreadCount, onOpenNotification }: { activeModule: string; search: string; setSearch: (value: string) => void; syncState: "loading" | "saved" | "saving" | "error" | "guest"; actionLabel: string; onAction: () => void; actionDisabled?: boolean; notifications: Notification[]; unreadCount: number; onOpenNotification: (item: Notification) => void }) {
  const syncText = { loading: "加载中", saved: "已自动保存", saving: "正在保存", error: "保存失败", guest: "访客预览" }[syncState];
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!notifOpen) return;
    const handle = (event: MouseEvent) => { if (notifRef.current && !notifRef.current.contains(event.target as Node)) setNotifOpen(false); };
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") setNotifOpen(false); };
    window.addEventListener("mousedown", handle);
    window.addEventListener("keydown", handleKey);
    return () => { window.removeEventListener("mousedown", handle); window.removeEventListener("keydown", handleKey); };
  }, [notifOpen]);
  return (
    <header className="header">
      <div className="heading"><h1>{activeModule}</h1><p>{moduleDescriptions[activeModule]}</p></div>
      <label className="search"><span><Icon name="search" size={18} /></span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`搜索${activeModule}…`} /><kbd>⌘ K</kbd></label>
      <div className="header-actions"><span className={`sync ${syncState}`}><i></i>{syncText}</span>
        <div className="menu-anchor" ref={notifRef}>
          <button className={`icon-button notification-button ${notifOpen ? "open" : ""}`} aria-label="通知" aria-expanded={notifOpen} onClick={() => setNotifOpen((value) => !value)}><Icon name="bell" size={19} />{unreadCount > 0 && <span className="notification-count">{unreadCount > 9 ? "9+" : unreadCount}</span>}</button>
          {notifOpen && (
            <div className="notif-panel" role="menu">
              <header><strong>通知</strong><span>{notifications.length} 条</span></header>
              <div className="notif-list">
                {notifications.map((item) => (
                  <button key={item.id} role="menuitem" className={`notif-item ${item.tone}`} onClick={() => { onOpenNotification(item); setNotifOpen(false); }}>
                    <i>{item.icon}</i><div><strong>{item.title}</strong><small>{item.detail}</small></div><span>↗</span>
                  </button>
                ))}
                {!notifications.length && <p className="notif-empty">暂无通知，一切正常 ✓</p>}
              </div>
            </div>
          )}
        </div>
        <button className="primary" disabled={actionDisabled} title={actionDisabled ? "当前工作区为只读权限" : undefined} onClick={onAction}><Icon name="plus" size={16} />{actionLabel}</button>
      </div>
    </header>
  );
}

function TaskManagement({ workspace, search, selectedTaskId, wikiEnabled, canEdit, currentMemberId, onSelect, onUpdate, onDelete, onEdit, onCreate, onCreateKnowledgeTask, onComment, onLinkDocs, announce }: {
  workspace: WorkspaceState; search: string; selectedTaskId: string; onSelect: (id: string) => void;
  wikiEnabled: boolean; canEdit: boolean; currentMemberId: string;
  onUpdate: (id: string, patch: Partial<Task>) => void; onDelete: (id: string) => void;
  onEdit: (task: Task) => void; onCreate: () => void; onCreateKnowledgeTask: (sourceTask: Task, answer: string) => void; onComment: (content: string) => void;
  onLinkDocs: (taskId: string, docIds: string[]) => void; announce: (message: string) => void;
}) {
  const [projectFilter, setProjectFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [view, setView] = useState<"dashboard" | "board" | "list">("dashboard");
  const [scope, setScope] = useState<"all" | "mine" | "joined">("all");
  const [comment, setComment] = useState("");
  const [showDocPicker, setShowDocPicker] = useState(false);
  const selected = workspace.tasks.find((task) => task.id === selectedTaskId);
  const filtered = workspace.tasks.filter((task) => {
    const query = `${task.id}${task.title}${task.tags.join("")}`.toLowerCase();
    const matchesScope = scope === "all" || (scope === "mine" ? task.assigneeId === currentMemberId : task.participantIds.includes(currentMemberId));
    return query.includes(search.toLowerCase()) && matchesScope && (projectFilter === "all" || task.projectId === projectFilter) && (priorityFilter === "all" || task.priority === priorityFilter);
  });
  const overdue = workspace.tasks.filter(isOverdue).length;
  const today = new Date().toISOString().slice(0, 10);
  const dueToday = workspace.tasks.filter((task) => task.dueAt.startsWith(today) && task.status !== "done").length;
  const toggleLinkedDoc = (docId: string) => {
    if (!selected) return;
    onLinkDocs(selected.id, selected.docIds.includes(docId) ? selected.docIds.filter((id) => id !== docId) : [...selected.docIds, docId]);
  };

  return (
    <div className={`task-layout ${view === "dashboard" ? "dashboard-mode" : ""} ${canEdit ? "" : "read-only"}`}>
      <section className="task-content">
        <div className="metric-grid">
          <Metric label="今日待办" value={dueToday} detail="需要关注" tone="blue" />
          <Metric label="进行中" value={workspace.tasks.filter((task) => !["todo","done"].includes(task.status)).length} detail="跨 3 个项目" tone="green" />
          <Metric label="已完成" value={workspace.tasks.filter((task) => task.status === "done").length} detail="本周期累计" tone="neutral" />
          <Metric label="逾期任务" value={overdue} detail={overdue ? "建议立即处理" : "状态良好"} tone={overdue ? "red" : "green"} />
        </div>
        <div className="command-heading"><div><h2>任务看板</h2><p>任务、文件、进度与风险一屏联动</p></div><span>{filtered.length} 项任务</span></div>
        <div className="command-toolbar panel">
          <div className="scope-tabs"><button className={scope === "all" ? "active" : ""} onClick={() => setScope("all")}>全部任务</button><button className={scope === "mine" ? "active" : ""} onClick={() => setScope("mine")}>我负责的</button><button className={scope === "joined" ? "active" : ""} onClick={() => setScope("joined")}>我参与的</button></div>
          <div className="filter-controls"><select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}><option value="all">全部项目</option>{workspace.projects.filter((project) => !project.archived).map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select><select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="all">全部优先级</option><option value="high">高优先级</option><option value="medium">中优先级</option><option value="low">低优先级</option></select></div>
          <div className="segmented"><button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}>驾驶舱</button><button className={view === "board" ? "active" : ""} onClick={() => setView("board")}>看板</button><button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>列表</button></div>
        </div>
        {view === "dashboard" && selected ? (
          <div className="command-grid">
            <CompactTaskPanel tasks={filtered} selectedTaskId={selectedTaskId} onSelect={onSelect} onCreate={onCreate} canEdit={canEdit} />
            <CommandFileDeck
              docs={workspace.docs}
              selectedIds={selected.docIds}
              project={workspace.projects.find((project) => project.id === selected.projectId)}
              tasks={workspace.tasks}
              onToggle={canEdit ? toggleLinkedDoc : () => undefined}
              onManage={canEdit ? () => setShowDocPicker(true) : () => undefined}
              canEdit={canEdit}
            />
            <CommandInspector
              task={selected}
              workspace={workspace}
              onUpdate={onUpdate}
              onEdit={() => onEdit(selected)}
              onDelete={() => onDelete(selected.id)}
              onManageFiles={() => setShowDocPicker(true)}
              onAddComment={onComment}
              onCreateTask={(answer) => onCreateKnowledgeTask(selected, answer)}
              wikiEnabled={wikiEnabled}
              canEdit={canEdit}
              announce={announce}
            />
            <ProjectTimeline tasks={filtered} selectedTaskId={selectedTaskId} onSelect={onSelect} />
          </div>
        ) : view === "board" ? (
          <div className="kanban">
            {statusOrder.map((status) => {
              const tasks = filtered.filter((task) => task.status === status);
              return (
                <section className="kanban-column panel" key={status} onDragOver={(event) => { if (canEdit) event.preventDefault(); }} onDrop={(event) => { if (!canEdit) return; const id = event.dataTransfer.getData("text/plain"); if (id) onUpdate(id, { status }); }}>
                  <header><span style={{ background: statusInfo[status].color }}></span><strong>{statusInfo[status].label}</strong><b>{tasks.length}</b><button disabled={!canEdit} onClick={onCreate}>＋</button></header>
                  <div className="column-body">
                    {tasks.map((task) => <TaskCard key={task.id} task={task} workspace={workspace} selected={selectedTaskId === task.id} onClick={() => onSelect(task.id)} />)}
                    {!tasks.length && <div className="column-empty">拖动任务到这里</div>}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="task-table panel">
            <header><span>任务</span><span>项目</span><span>负责人</span><span>优先级</span><span>状态</span><span>截止时间</span></header>
            {filtered.map((task) => <button key={task.id} onClick={() => onSelect(task.id)}><span><small>{task.id}</small><strong>{task.title}</strong></span><span>{workspace.projects.find((project) => project.id === task.projectId)?.name}</span><span>{workspace.members.find((member) => member.id === task.assigneeId)?.name}</span><span><PriorityBadge priority={task.priority} /></span><span><StatusBadge status={task.status} /></span><span className={isOverdue(task) ? "overdue" : ""}>{formatDate(task.dueAt)}</span></button>)}
          </div>
        )}
      </section>
      {view !== "dashboard" && selected ? (
        <aside className="task-drawer panel">
          <header><div><span>{selected.id}</span><StatusBadge status={selected.status} /></div><TaskMenu task={selected} onUpdate={onUpdate} onEdit={() => onEdit(selected)} onDelete={() => onDelete(selected.id)} announce={announce} /></header>
          <h2>{selected.title}</h2>
          <p>{selected.description}</p>
          <div className="field-grid">
            <label>所属项目<select disabled={!canEdit} value={selected.projectId} onChange={(event) => onUpdate(selected.id, { projectId: event.target.value })}>{workspace.projects.filter((project) => !project.archived).map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label>
            <label>当前状态<select disabled={!canEdit} value={selected.status} onChange={(event) => onUpdate(selected.id, { status: event.target.value as TaskStatus })}>{statusOrder.map((status) => <option value={status} key={status}>{statusInfo[status].label}</option>)}</select></label>
            <label>负责人<select disabled={!canEdit} value={selected.assigneeId} onChange={(event) => onUpdate(selected.id, { assigneeId: event.target.value })}>{workspace.members.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select></label>
            <label>优先级<select disabled={!canEdit} value={selected.priority} onChange={(event) => onUpdate(selected.id, { priority: event.target.value as Priority })}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label>
            <label className="full">截止时间<input disabled={!canEdit} type="datetime-local" value={selected.dueAt.slice(0, 16)} onChange={(event) => onUpdate(selected.id, { dueAt: new Date(event.target.value).toISOString() })} /></label>
          </div>
          <section className="linked-docs"><h3>关联文件 <span>{selected.docIds.length}</span><button onClick={() => setShowDocPicker(true)}>管理文件 →</button></h3>{workspace.docs.filter((doc) => selected.docIds.includes(doc.id)).map((doc) => <article key={doc.id}><i>▤</i><div><strong>{doc.name}</strong><small>{doc.type.toUpperCase()} · v{doc.version}</small></div><button aria-label={`取消关联 ${doc.name}`} onClick={() => onLinkDocs(selected.id, selected.docIds.filter((id) => id !== doc.id))}>×</button></article>)}{!selected.docIds.length && <button className="inline-empty file-empty" onClick={() => setShowDocPicker(true)}>＋ 从文件归档中选取</button>}</section>
          <section className="ai-note"><span>✦ 智能建议</span><strong>{isOverdue(selected) ? "任务已经逾期，建议重新排期或转交。" : selected.priority === "high" ? "这是高优先级任务，建议拆分验收节点。" : "当前任务状态正常。"}</strong></section>
          <WikiKnowledgeAssistant
            key={`drawer-${selected.id}`}
            compact
            context={taskKnowledgeContext(selected, workspace)}
            suggestedQuestions={["这个任务需要遵循哪些规则？", "帮我检查验收条件是否完整", "有哪些相关风险和遗漏？"]}
            onAddComment={(answer) => { onComment(`KAI 知识助手：\n${answer}`); announce("知识回答已引用到评论"); }}
            onCreateTask={(answer) => onCreateKnowledgeTask(selected, answer)}
            enabled={wikiEnabled}
            canWrite={canEdit}
          />
          <section className="comments"><h3>协作评论 <span>{workspace.comments.filter((item) => item.taskId === selected.id).length}</span></h3><div className="comment-list">{workspace.comments.filter((item) => item.taskId === selected.id).map((item) => { const author = workspace.members.find((member) => member.id === item.authorId); return <article key={item.id}><Avatar label={author?.avatar ?? "?"} /><div><strong>{author?.name}</strong><p>{item.content}</p><small>{formatDateTime(item.createdAt)}</small></div></article>; })}</div>{canEdit && <form onSubmit={(event) => { event.preventDefault(); if (!comment.trim()) return; onComment(comment.trim()); setComment(""); }}><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="写下评论，支持 @成员…" /><button disabled={!comment.trim()}>发送</button></form>}</section>
          {canEdit && <footer><button className="danger-button" onClick={() => onDelete(selected.id)}>删除</button><button onClick={() => onEdit(selected)}>编辑详情</button><button className="primary" onClick={() => onUpdate(selected.id, { status: selected.status === "done" ? "develop" : "done" })}>{selected.status === "done" ? "重新打开" : "✓ 完成任务"}</button></footer>}
          {showDocPicker && <SpatialFilePicker docs={workspace.docs} selectedIds={selected.docIds} taskTitle={selected.title} onClose={() => setShowDocPicker(false)} onSave={(docIds) => { onLinkDocs(selected.id, docIds); setShowDocPicker(false); }} />}
        </aside>
      ) : view !== "dashboard" ? <aside className="task-drawer panel empty-state"><span>◇</span><h3>选择一个任务</h3><p>查看详情、评论和关联文档</p></aside> : null}
      {view === "dashboard" && selected && showDocPicker && <SpatialFilePicker docs={workspace.docs} selectedIds={selected.docIds} taskTitle={selected.title} onClose={() => setShowDocPicker(false)} onSave={(docIds) => { onLinkDocs(selected.id, docIds); setShowDocPicker(false); }} />}
    </div>
  );
}

function CompactTaskPanel({ tasks, selectedTaskId, onSelect, onCreate, canEdit }: { tasks: Task[]; selectedTaskId: string; onSelect: (id: string) => void; onCreate: () => void; canEdit: boolean }) {
  const groups = [
    { key: "review", label: "需求评审", statuses: ["review"] as TaskStatus[] },
    { key: "design", label: "产品设计", statuses: ["design"] as TaskStatus[] },
    { key: "build", label: "开发实现", statuses: ["todo","develop","test"] as TaskStatus[] },
    { key: "done", label: "已完成", statuses: ["done"] as TaskStatus[] },
  ];
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setCollapsed((current) => ({ ...current, [key]: !current[key] }));
  return (
    <section className="compact-task-panel panel">
      <header><div><span>任务队列</span><strong>按阶段推进</strong></div><button disabled={!canEdit} onClick={onCreate}>＋</button></header>
      <div className="compact-task-scroll">
        {groups.map((group) => {
          const groupTasks = tasks.filter((task) => group.statuses.includes(task.status));
          const isCollapsed = collapsed[group.key];
          return (
            <section className={`compact-task-group ${isCollapsed ? "collapsed" : ""}`} key={group.key}>
              <header onClick={() => toggle(group.key)} role="button" aria-expanded={!isCollapsed}><i></i><strong>{group.label}</strong><span>{groupTasks.length}</span><b className={isCollapsed ? "flip" : ""}>⌄</b></header>
              {!isCollapsed && groupTasks.slice(0, 4).map((task) => (
                <button key={task.id} className={task.id === selectedTaskId ? "active" : ""} onClick={() => onSelect(task.id)}>
                  <small>{task.id}</small><strong>{task.title}</strong><PriorityBadge priority={task.priority} /><span>{isOverdue(task) ? "已逾期" : formatDateTime(task.dueAt)}</span>
                </button>
              ))}
              {!isCollapsed && !groupTasks.length && <p>暂无任务</p>}
            </section>
          );
        })}
      </div>
    </section>
  );
}

function CommandFileDeck({ docs, selectedIds, project, tasks, onToggle, onManage, canEdit }: { docs: Doc[]; selectedIds: string[]; project?: Project; tasks: Task[]; onToggle: (id: string) => void; onManage: () => void; canEdit: boolean }) {
  const [focusId, setFocusId] = useState(selectedIds[0] ?? docs[0]?.id ?? "");
  const pointerStart = useRef<number | null>(null);
  const focusIndex = Math.max(0, docs.findIndex((doc) => doc.id === focusId));
  const activeDoc = docs[focusIndex];
  const projectTasks = tasks.filter((task) => task.projectId === project?.id);
  const completion = projectTasks.length ? Math.round(projectTasks.filter((task) => task.status === "done").length / projectTasks.length * 100) : 0;
  const move = (direction: number) => {
    if (!docs.length) return;
    setFocusId(docs[(focusIndex + direction + docs.length) % docs.length].id);
  };
  return (
    <section className="command-files panel" aria-label="项目空间文件">
      <header><div><span>项目文档</span><strong>{project?.name ?? "当前项目"}</strong></div><button disabled={!canEdit} onClick={onManage}>管理关联 ↗</button></header>
      <div className="command-file-stage" onPointerDown={(event) => { pointerStart.current = event.clientX; }} onPointerUp={(event) => { if (pointerStart.current === null) return; const distance = event.clientX - pointerStart.current; if (Math.abs(distance) > 32) move(distance > 0 ? -1 : 1); pointerStart.current = null; }}>
        {activeDoc && <aside><span>项目文档</span><h3>{activeDoc.name}</h3><small>v{activeDoc.version} · {project?.name}</small><strong>{completion}%</strong><p>项目完成度</p><button disabled={!canEdit} className={selectedIds.includes(activeDoc.id) ? "linked" : ""} onClick={() => onToggle(activeDoc.id)}><span>{selectedIds.includes(activeDoc.id) ? "已关联" : "未关联"}</span><b>{selectedIds.includes(activeDoc.id) ? "取消" : "添加"}</b></button></aside>}
        <div className="command-file-deck">
          {docs.map((doc, index) => {
            let offset = index - focusIndex;
            if (docs.length > 2 && offset > docs.length / 2) offset -= docs.length;
            if (docs.length > 2 && offset < -docs.length / 2) offset += docs.length;
            const distance = Math.abs(offset);
            const style = {
              "--mini-x": `${offset * 78}px`,
              "--mini-y": `${distance * 7}px`,
              "--mini-rotate": `${offset === 0 ? 0 : offset < 0 ? 54 : -54}deg`,
              "--mini-scale": `${Math.max(.72,1 - distance * .08)}`,
              zIndex: 20 - distance,
            } as CSSProperties;
            return <button key={doc.id} style={style} className={`command-file-card ${offset === 0 ? "active" : ""} ${selectedIds.includes(doc.id) ? "linked" : ""}`} onClick={() => setFocusId(doc.id)} aria-label={`聚焦文件 ${doc.name}`}><i></i><span className="doc-lines"></span><div><small>{doc.type.toUpperCase()} · v{doc.version}</small><strong>{doc.name}</strong><span>♟ {doc.taskIds.length}</span></div></button>;
          })}
        </div>
        <div className="command-file-controls"><button aria-label="上一个项目文件" onClick={() => move(-1)}>←</button><span>{focusIndex + 1} / {docs.length}</span><button aria-label="下一个项目文件" onClick={() => move(1)}>→</button></div>
      </div>
    </section>
  );
}

function CommandInspector({ task, workspace, onUpdate, onEdit, onDelete, onManageFiles, onAddComment, onCreateTask, wikiEnabled, canEdit, announce }: { task: Task; workspace: WorkspaceState; onUpdate: (id: string, patch: Partial<Task>) => void; onEdit: () => void; onDelete: () => void; onManageFiles: () => void; onAddComment: (content: string) => void; onCreateTask: (answer: string) => void; wikiEnabled: boolean; canEdit: boolean; announce: (message: string) => void }) {
  const member = workspace.members.find((item) => item.id === task.assigneeId);
  const project = workspace.projects.find((item) => item.id === task.projectId);
  const suggestion = isOverdue(task) ? "检测到任务已经逾期，建议调整截止时间并同步项目负责人。" : task.priority === "high" ? "建议关联相似历史文档，并为高优先级任务拆分验收节点。" : "当前任务风险可控，建议在截止日前完成一次状态复核。";
  return (
    <aside className="command-inspector panel">
      <header><div><span><Icon name="sparkles" size={16} /></span><strong>智能详情</strong></div>{canEdit && <TaskMenu task={task} onUpdate={onUpdate} onEdit={onEdit} onDelete={onDelete} announce={announce} />}</header>
      <section className="inspector-title"><small>{task.id}</small><div><h2>{task.title}</h2><PriorityBadge priority={task.priority} /></div><p>{task.description}</p></section>
      <dl>
        <div><dt>负责人</dt><dd><Avatar label={member?.avatar ?? "?"} />{member?.name}</dd></div>
        <div><dt>所属项目</dt><dd>▱ {project?.name}</dd></div>
        <div><dt>截止时间</dt><dd>▣ {formatDateTime(task.dueAt)}</dd></div>
        <div><dt>当前状态</dt><dd><StatusBadge status={task.status} /></dd></div>
        <div><dt>关联文件</dt><dd><button disabled={!canEdit} onClick={onManageFiles}>{task.docIds.length} 个 · 管理</button></dd></div>
      </dl>
      <section className="inspector-tags"><span>标签</span><div>{task.tags.map((tag) => <b key={tag}>{tag}</b>)}{canEdit && <button onClick={onEdit}>＋</button>}</div></section>
      <section className="inspector-ai"><span>AI 助手建议</span><p>• {suggestion}</p><p>• 当前项目共有 {workspace.tasks.filter((item) => item.projectId === task.projectId).length} 项任务，{workspace.tasks.filter((item) => item.projectId === task.projectId && item.status === "done").length} 项已完成。</p></section>
      <WikiKnowledgeAssistant
        key={task.id}
        compact
        context={taskKnowledgeContext(task, workspace)}
        suggestedQuestions={["这个任务需要遵循哪些规则？", "帮我检查验收条件是否完整", "有哪些相关风险和遗漏？"]}
        onAddComment={(answer) => { onAddComment(`KAI 知识助手：\n${answer}`); announce("知识回答已引用到评论"); }}
        onCreateTask={onCreateTask}
        enabled={wikiEnabled}
        canWrite={canEdit}
      />
      {canEdit && <footer><button onClick={onEdit}><Icon name="edit" size={15} />编辑任务</button><button className="primary" onClick={() => onUpdate(task.id, { status: task.status === "done" ? "develop" : "done" })}>{task.status === "done" ? "重新打开" : <><Icon name="check" size={15} />完成任务</>}</button><button className="danger-icon" aria-label="删除任务" onClick={onDelete}><Icon name="more" size={17} /></button></footer>}
    </aside>
  );
}

function ProjectTimeline({ tasks, selectedTaskId, onSelect }: { tasks: Task[]; selectedTaskId: string; onSelect: (id: string) => void }) {
  const [span, setSpan] = useState<14 | 30>(14);
  const [anchor, setAnchor] = useState(() => new Date(shanghaiDayStart().getTime() - 2 * 86400000));
  const rows = tasks.filter((task) => task.status !== "done").slice(0, 4);
  const windowStart = anchor.getTime();
  const windowEnd = windowStart + span * 86400000;
  const windowMs = windowEnd - windowStart;
  const tickCount = span === 14 ? 14 : 10;
  const ticks = Array.from({ length: tickCount }, (_, index) => {
    const dateOffset = Math.round((index / (tickCount - 1)) * (span - 1));
    const date = new Date(windowStart + dateOffset * 86400000);
    return new Intl.DateTimeFormat("zh-CN", { day: "numeric", timeZone: "Asia/Shanghai" }).format(date);
  });
  const todayLeft = Math.min(100, Math.max(0, (shanghaiDayStart().getTime() - windowStart) / windowMs * 100));
  const monthFormatter = new Intl.DateTimeFormat("zh-CN", { month: "numeric", timeZone: "Asia/Shanghai" });
  const monthLabel = `${monthFormatter.format(new Date(windowStart))}–${monthFormatter.format(new Date(windowEnd))}`;
  return (
    <section className="command-timeline panel">
      <header><div><span>〽</span><strong>项目时间线</strong><small>{monthLabel}</small></div><div><button onClick={() => setSpan((current) => current === 14 ? 30 : 14)}>{span === 14 ? "周⌄" : "月⌄"}</button><button onClick={() => setAnchor(new Date(shanghaiDayStart().getTime() - 2 * 86400000))}>今天</button></div></header>
      <div className="timeline-scale" style={{ "--tick-count": tickCount } as CSSProperties}>{ticks.map((date, index) => <span key={index}>{date}</span>)}</div>
      <div className="timeline-rows">
        {todayLeft >= 0 && todayLeft <= 100 && <div className="timeline-today" style={{ left: `${todayLeft}%` } as CSSProperties} aria-label="今天" />}
        {rows.map((task) => {
          const start = new Date(task.createdAt).getTime();
          const end = new Date(task.dueAt).getTime();
          const clampStart = Math.max(windowStart, Math.min(start, windowEnd));
          const clampEnd = Math.max(windowStart, Math.min(Math.max(end, start + 43200000), windowEnd));
          const left = (clampStart - windowStart) / windowMs * 100;
          const width = Math.max(6, (clampEnd - clampStart) / windowMs * 100);
          const style = { "--bar-left": `${left}%`, "--bar-width": `${width}%` } as CSSProperties;
          return <div key={task.id}><span>{statusInfo[task.status].label}</span><button style={style} className={`${task.id === selectedTaskId ? "active" : ""} ${isOverdue(task) ? "overdue-bar" : ""}`} onClick={() => onSelect(task.id)}><span>{task.title}</span><small>{formatDate(task.dueAt)}</small></button></div>;
        })}
        {!rows.length && <p className="inline-empty">暂无进行中任务</p>}
      </div>
    </section>
  );
}

function SpatialFilePicker({ docs, selectedIds, taskTitle, onClose, onSave, embedded = false }: { docs: Doc[]; selectedIds: string[]; taskTitle: string; onClose: () => void; onSave: (ids: string[]) => void; embedded?: boolean }) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>(selectedIds);
  const [focusId, setFocusId] = useState(selectedIds[0] ?? docs[0]?.id ?? "");
  const pointerStart = useRef<number | null>(null);
  const wheelLocked = useRef(false);
  const visible = useMemo(() => docs.filter((doc) => `${doc.name}${doc.content}${doc.type}`.toLowerCase().includes(query.toLowerCase())), [docs, query]);
  const matchingIndex = visible.findIndex((doc) => doc.id === focusId);
  const focusIndex = matchingIndex >= 0 ? matchingIndex : 0;
  const activeDoc = visible[focusIndex];
  const toggle = useCallback((id: string) => setPicked((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]), []);
  const move = useCallback((direction: number) => {
    if (!visible.length) return;
    setFocusId((current) => {
      const currentIndex = visible.findIndex((doc) => doc.id === current);
      const nextIndex = ((currentIndex < 0 ? 0 : currentIndex) + direction + visible.length) % visible.length;
      return visible[nextIndex].id;
    });
  }, [visible]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
      if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
      if (event.key === " " && activeDoc && event.target === document.body) { event.preventDefault(); toggle(activeDoc.id); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeDoc, move, onClose, toggle]);

  const picker = (
      <section className={`spatial-picker ${embedded ? "embedded" : ""}`} onMouseDown={(event) => event.stopPropagation()} aria-label={embedded ? "空间文件工作区" : "空间文件选择器"}>
        <header className="spatial-picker-header">
          <div><span>SPATIAL FILES</span><h2>{embedded ? "项目文件流" : "选取关联文件"}</h2><p>当前任务「{taskTitle}」· 左右滑动抽取文件</p></div>
          <label className="file-search"><span>⌕</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索文件…" /></label>
          {!embedded && <button aria-label="关闭文件选择器" onClick={onClose}>×</button>}
        </header>
        <div
          className="spatial-stage"
          onWheel={(event) => {
            if (wheelLocked.current || Math.abs(event.deltaY) + Math.abs(event.deltaX) < 12) return;
            wheelLocked.current = true;
            move(event.deltaY + event.deltaX > 0 ? 1 : -1);
            window.setTimeout(() => { wheelLocked.current = false; }, 260);
          }}
          onPointerDown={(event) => { pointerStart.current = event.clientX; }}
          onPointerUp={(event) => {
            if (pointerStart.current === null) return;
            const distance = event.clientX - pointerStart.current;
            if (Math.abs(distance) > 36) move(distance > 0 ? -1 : 1);
            pointerStart.current = null;
          }}
        >
          {activeDoc && (
            <aside className="spatial-file-summary">
              <span>{activeDoc.type.toUpperCase()} · v{activeDoc.version}</span>
              <h3>{activeDoc.name}</h3>
              <p>{activeDoc.content}</p>
              <div><strong>{activeDoc.taskIds.length}</strong><small>已关联任务</small></div>
              <button className={picked.includes(activeDoc.id) ? "selected" : ""} onClick={() => toggle(activeDoc.id)}>{picked.includes(activeDoc.id) ? "✓ 已选择，点击移除" : "＋ 选择当前文件"}</button>
            </aside>
          )}
          <div className="spatial-deck">
            {visible.map((doc, index) => {
              let offset = index - focusIndex;
              if (visible.length > 2 && offset > visible.length / 2) offset -= visible.length;
              if (visible.length > 2 && offset < -visible.length / 2) offset += visible.length;
              const distance = Math.abs(offset);
              const style = {
                "--card-x": `${offset * 112}px`,
                "--card-y": `${distance * 9}px`,
                "--card-rotate": `${offset === 0 ? 0 : offset < 0 ? 49 : -49}deg`,
                "--card-scale": `${Math.max(.72, 1 - distance * .07)}`,
                "--card-opacity": `${Math.max(.26, 1 - distance * .16)}`,
                zIndex: 20 - distance,
              } as CSSProperties;
              return (
                <button
                  key={doc.id}
                  style={style}
                  className={`spatial-file-card ${offset === 0 ? "active" : ""} ${picked.includes(doc.id) ? "picked" : ""}`}
                  onClick={() => setFocusId(doc.id)}
                  aria-label={`查看文件 ${doc.name}${picked.includes(doc.id) ? "，已选择" : ""}`}
                >
                  <i className="folder-tab"></i>
                  <span className="paper-lines"></span>
                  <span className="spatial-check">{picked.includes(doc.id) ? "✓" : ""}</span>
                  <div><small>{doc.type.toUpperCase()} · v{doc.version}</small><strong>{doc.name}</strong><span>♟ {doc.taskIds.length}</span></div>
                </button>
              );
            })}
          </div>
          {visible.length > 0 ? (
            <div className="spatial-controls">
              <button aria-label="上一个文件" onClick={() => move(-1)}>←</button>
              <span><strong>{focusIndex + 1}</strong> / {visible.length}</span>
              <button aria-label="下一个文件" onClick={() => move(1)}>→</button>
            </div>
          ) : (
            <div className="spatial-empty"><span>◇</span><strong>没有匹配的文件</strong><p>换一个关键词试试</p></div>
          )}
        </div>
        <footer className="spatial-picker-footer"><div><span>已选择 <strong>{picked.length}</strong> 个文件</span>{picked.length > 0 && <button onClick={() => setPicked([])}>清空选择</button>}</div><button onClick={embedded ? () => setPicked(selectedIds) : onClose}>{embedded ? "恢复当前关联" : "取消"}</button><button className="primary" onClick={() => onSave(picked)}>确认关联 · {picked.length}</button></footer>
      </section>
  );
  return embedded ? picker : <div className="file-picker-backdrop" onMouseDown={onClose}>{picker}</div>;
}

function TaskCard({ task, workspace, selected, onClick }: { task: Task; workspace: WorkspaceState; selected: boolean; onClick: () => void }) {
  const member = workspace.members.find((item) => item.id === task.assigneeId);
  const project = workspace.projects.find((item) => item.id === task.projectId);
  return (
    <button className={`task-card ${selected ? "selected" : ""}`} draggable onDragStart={(event) => { event.dataTransfer.setData("text/plain", task.id); event.dataTransfer.effectAllowed = "move"; }} onClick={onClick}>
      <div><span>{task.id}</span><PriorityBadge priority={task.priority} /></div>
      <h3>{task.title}</h3>
      <p>{project?.name}</p>
      <div className="task-card-bottom"><span className={isOverdue(task) ? "overdue" : ""}>◷ {formatDate(task.dueAt)}</span><Avatar label={member?.avatar ?? "?"} /></div>
    </button>
  );
}

function ProjectOverview({ workspace, search, onChange, onCreate, announce, onOpenFile, onUploadFile }: { workspace: WorkspaceState; search: string; onChange: (patch: Partial<WorkspaceState>) => void; onCreate: () => void; announce: (message: string) => void; onOpenFile: (docId: string, fileId: string) => void; onUploadFile: (docId: string, file: DocFile) => void }) {
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const projects = workspace.projects.filter((project) => project.name.toLowerCase().includes(search.toLowerCase()));
  const progress = (projectId: string) => {
    const tasks = workspace.tasks.filter((task) => task.projectId === projectId);
    return tasks.length ? Math.round(tasks.filter((task) => task.status === "done").length / tasks.length * 100) : 0;
  };
  const toggleMilestone = (projectId: string, milestoneId: string) => onChange({ projects: workspace.projects.map((project) => project.id === projectId ? { ...project, milestones: project.milestones.map((milestone) => milestone.id === milestoneId ? { ...milestone, done: !milestone.done } : milestone) } : project) });
  const archiveProject = (project: Project) => {
    onChange({ projects: workspace.projects.map((item) => item.id === project.id ? { ...item, archived: !item.archived } : item) });
    announce(project.archived ? "项目已恢复" : "项目已归档");
  };
  return (
    <div className="module-stack">
      <div className="summary-strip panel"><Metric label="进行中项目" value={workspace.projects.filter((project) => !project.archived).length} detail="当前工作区" tone="green" /><Metric label="平均完成度" value={`${Math.round(workspace.projects.reduce((sum, project) => sum + progress(project.id), 0) / Math.max(workspace.projects.length, 1))}%`} detail="按任务完成计算" tone="blue" /><Metric label="风险项目" value={workspace.projects.filter((project) => project.health === "risk").length} detail="需要干预" tone="red" /></div>
      <div className="section-title"><div><h2>项目组合</h2><p>进度由项目任务实时计算</p></div><button className="primary" onClick={onCreate}>＋ 新建项目</button></div>
      <div className="project-grid">
        {projects.map((project) => {
          const owner = workspace.members.find((member) => member.id === project.ownerId);
          const projectTasks = workspace.tasks.filter((task) => task.projectId === project.id);
          const pct = progress(project.id);
          return <article className={`project-card panel ${project.archived ? "archived" : ""}`} key={project.id}>
            <header><span className={`health ${project.health}`}></span><small>{project.health === "good" ? "健康" : project.health === "warn" ? "关注" : "风险"}</small><button onClick={() => archiveProject(project)}>{project.archived ? "恢复" : "归档"}</button></header>
            <h3>{project.name}</h3><p>{project.description}</p>
            <div className="progress-row"><div><i style={{ width: `${pct}%` }}></i></div><strong>{pct}%</strong></div>
            <div className="project-meta"><span><Avatar label={owner?.avatar ?? "?"} />{owner?.name}</span><span>{projectTasks.length} 个任务</span><span>截止 {formatDate(project.dueAt)}</span></div>
            <section><h4>里程碑</h4>{project.milestones.map((milestone) => <label key={milestone.id}><input type="checkbox" checked={milestone.done} onChange={() => toggleMilestone(project.id, milestone.id)} /><span>{milestone.name}</span><small>{milestone.dueAt}</small></label>)}</section>
            <section className="project-docs"><h4>项目文档 <span>{workspace.docs.filter((doc) => doc.projectId === project.id).length}</span></h4>{workspace.docs.filter((doc) => doc.projectId === project.id).map((doc) => <div className="project-doc" key={doc.id}><button className={`project-doc-head ${expandedDocId === doc.id ? "open" : ""}`} onClick={() => setExpandedDocId((current) => current === doc.id ? null : doc.id)}><i>▤</i><strong>{doc.name}</strong><small>{doc.files?.length ?? 0} 个文件</small><b>{expandedDocId === doc.id ? "⌃" : "⌄"}</b></button>{expandedDocId === doc.id && <DocFileList files={doc.files ?? []} onOpen={(fileId) => onOpenFile(doc.id, fileId)} onUpload={(file) => onUploadFile(doc.id, file)} onOversize={() => announce(`文件超过 ${Math.round(MAX_FILE_BYTES / 1000)}KB 上限`)} />}</div>)}{!workspace.docs.some((doc) => doc.projectId === project.id) && <p className="inline-empty">暂无项目文档</p>}</section>
          </article>;
        })}
      </div>
    </div>
  );
}

function FileArchive({ workspace, search, selectedDocId, onSelect, onChange, onCreate, announce, onOpenFile, onUploadFile, onDeleteFile }: { workspace: WorkspaceState; search: string; selectedDocId: string; onSelect: (id: string) => void; onChange: (patch: Partial<WorkspaceState>) => void; onCreate: () => void; announce: (message: string) => void; onOpenFile: (docId: string, fileId: string) => void; onUploadFile: (docId: string, file: DocFile) => void; onDeleteFile: (docId: string, fileId: string) => void }) {
  const docs = workspace.docs.filter((doc) => `${doc.name}${doc.content}`.toLowerCase().includes(search.toLowerCase()));
  const selected = workspace.docs.find((doc) => doc.id === selectedDocId) ?? docs[0];
  const updateDoc = (id: string, patch: Partial<Doc>) => onChange({ docs: workspace.docs.map((doc) => doc.id === id ? { ...doc, ...patch, updatedAt: new Date().toISOString() } : doc) });
  return (
    <div className="split-module">
      <section className="panel data-panel">
        <div className="section-title compact"><div><h2>项目文档</h2><p>{docs.length} 份文档 · 支持版本回滚</p></div><button className="primary" onClick={onCreate}>＋ 新建文档</button></div>
        <div className="doc-table"><header><span>名称</span><span>类型</span><span>版本</span><span>关联任务</span><span>更新时间</span><span></span></header>{docs.map((doc) => <button className={selected?.id === doc.id ? "selected" : ""} key={doc.id} onClick={() => onSelect(doc.id)}><span><i>▤</i><strong>{doc.name}</strong></span><span>{doc.type.toUpperCase()}</span><span>v{doc.version}</span><span>{doc.taskIds.length}</span><span>{formatDate(doc.updatedAt)}</span><span onClick={(event) => { event.stopPropagation(); updateDoc(doc.id, { favorite: !doc.favorite }); }}>{doc.favorite ? "★" : "☆"}</span></button>)}</div>
      </section>
      {selected && <aside className="panel preview-panel"><header><span>{selected.type.toUpperCase()} · v{selected.version}</span><button onClick={() => updateDoc(selected.id, { favorite: !selected.favorite })}>{selected.favorite ? "★ 已收藏" : "☆ 收藏"}</button></header><h2>{selected.name}</h2><p>{selected.content}</p><section className="file-section"><h3>文件 <span>{selected.files?.length ?? 0}</span></h3><DocFileList files={selected.files ?? []} onOpen={(fileId) => onOpenFile(selected.id, fileId)} onUpload={(file) => onUploadFile(selected.id, file)} onDelete={(fileId) => onDeleteFile(selected.id, fileId)} onOversize={() => announce(`文件超过 ${Math.round(MAX_FILE_BYTES / 1000)}KB 上限`)} /></section><section><h3>关联任务</h3>{workspace.tasks.filter((task) => selected.taskIds.includes(task.id)).map((task) => <article key={task.id}><StatusBadge status={task.status} /><span>{task.title}</span></article>)}{!selected.taskIds.length && <p className="inline-empty">暂无关联任务</p>}</section><footer><button disabled={selected.version <= 1} onClick={() => { updateDoc(selected.id, { version: Math.max(1, selected.version - 1) }); announce("已回滚到上一版本"); }}>↶ 回滚版本</button><button onClick={() => { updateDoc(selected.id, { version: selected.version + 1 }); announce("已创建新版本"); }}>＋ 新建版本</button></footer></aside>}
    </div>
  );
}

function CalendarView({ workspace, search, onChange, onCreate, onBatchCreate, announce }: { workspace: WorkspaceState; search: string; onChange: (patch: Partial<WorkspaceState>) => void; onCreate: (date?: string) => void; onBatchCreate: () => void; announce: (message: string) => void }) {
  const today = new Date();
  const todayKey = ymd(today);
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selecting, setSelecting] = useState(false);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const shiftMonth = (delta: number) => setCursor((current) => {
    const next = new Date(current.year, current.month + delta, 1);
    return { year: next.getFullYear(), month: next.getMonth() };
  });
  const goToday = () => setCursor({ year: today.getFullYear(), month: today.getMonth() });
  // 以周一为起点的 6 行网格
  const first = new Date(cursor.year, cursor.month, 1);
  const startOffset = (first.getDay() + 6) % 7; // 周一=0
  const gridStart = new Date(cursor.year, cursor.month, 1 - startOffset);
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    return { date: ymd(date), day: date.getDate(), current: date.getMonth() === cursor.month };
  });
  const events = workspace.events.filter((event) => event.title.toLowerCase().includes(search.toLowerCase()));
  const sortedEvents = [...events].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const toggleEvent = (id: string) => setSelectedEventIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const stopSelecting = () => { setSelecting(false); setSelectedEventIds([]); };
  const deleteSelected = () => {
    if (!selectedEventIds.length || !window.confirm(`确定删除选中的 ${selectedEventIds.length} 条日程？`)) return;
    onChange({ events: workspace.events.filter((event) => !selectedEventIds.includes(event.id)) });
    announce(`已删除 ${selectedEventIds.length} 条日程`);
    stopSelecting();
  };
  return (
    <div className="calendar-layout">
      <section className="calendar panel">
        <header><div><button aria-label="上一月" onClick={() => shiftMonth(-1)}>‹</button><h2>{cursor.year} 年 {cursor.month + 1} 月</h2><button aria-label="下一月" onClick={() => shiftMonth(1)}>›</button><button className="today-btn" onClick={goToday}>今天</button></div><div className="calendar-actions"><button onClick={onBatchCreate}>批量添加</button><button className="primary" onClick={() => onCreate()}>＋ 新建日程</button></div></header>
        <div className="weekdays">{["一","二","三","四","五","六","日"].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="month-grid">{days.map((day) => {
          const dayEvents = events.filter((event) => event.date === day.date);
          const taskDeadlines = workspace.tasks.filter((task) => task.dueAt.startsWith(day.date));
          return <article className={`${day.current ? "" : "muted"} ${day.date === todayKey ? "today" : ""}`} key={day.date} onClick={() => onCreate(day.date)} role="button" aria-label={`${day.date} 新建日程`}><strong>{day.day}</strong>{dayEvents.slice(0, 2).map((event) => <span className={event.type} key={event.id}>{event.time} {event.title}</span>)}{taskDeadlines.slice(0, 1).map((task) => <span className="deadline" key={task.id}>截止 · {task.title}</span>)}</article>;
        })}</div>
      </section>
      <aside className={`agenda panel ${selecting ? "selecting" : ""}`}><header><div><h2>近期日程</h2><span>{events.length}</span></div>{selecting ? <div className="agenda-bulk-actions"><button onClick={() => setSelectedEventIds(selectedEventIds.length === sortedEvents.length ? [] : sortedEvents.map((event) => event.id))}>{selectedEventIds.length === sortedEvents.length && sortedEvents.length ? "取消全选" : "全选"}</button><button className="danger" disabled={!selectedEventIds.length} onClick={deleteSelected}>删除 {selectedEventIds.length || ""}</button><button onClick={stopSelecting}>取消</button></div> : <button disabled={!events.length} onClick={() => setSelecting(true)}>批量管理</button>}</header>{sortedEvents.map((event) => <article className={selectedEventIds.includes(event.id) ? "selected" : ""} key={event.id}>{selecting && <label className="agenda-check" aria-label={`选择日程 ${event.title}`}><input type="checkbox" checked={selectedEventIds.includes(event.id)} onChange={() => toggleEvent(event.id)} /><span></span></label>}<div><span>{formatDate(event.date)}</span><strong>{event.time}</strong></div><section><i className={event.type}></i><strong>{event.title}</strong><small>{event.taskId ? `关联 ${event.taskId}` : "工作区日程"}</small></section>{!selecting && <button aria-label={`删除日程 ${event.title}`} onClick={() => onChange({ events: workspace.events.filter((item) => item.id !== event.id) })}>×</button>}</article>)}{!events.length && <p className="inline-empty">暂无日程</p>}</aside>
    </div>
  );
}

function TeamView({ workspace, search, onUpdateTask }: { workspace: WorkspaceState; search: string; onUpdateTask: (id: string, patch: Partial<Task>) => void }) {
  const members = workspace.members.filter((member) => `${member.name}${member.role}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="module-stack">
      <div className="summary-strip panel"><Metric label="团队成员" value={workspace.members.length} detail={`${workspace.members.filter((member) => member.online).length} 人在线`} tone="green" /><Metric label="进行中任务" value={workspace.tasks.filter((task) => !["todo","done"].includes(task.status)).length} detail="全团队" tone="blue" /><Metric label="高负载成员" value={workspace.members.filter((member) => workspace.tasks.filter((task) => task.assigneeId === member.id && task.status !== "done").length >= 3).length} detail="建议调配" tone="red" /></div>
      <div className="section-title"><div><h2>团队工作负载</h2><p>任务转交后，负载会实时重算</p></div></div>
      <div className="team-grid">{members.map((member) => {
        const tasks = workspace.tasks.filter((task) => task.assigneeId === member.id && task.status !== "done");
        const load = Math.min(100, tasks.length / 5 * 100);
        return <article className="member-card panel" key={member.id}><header><Avatar label={member.avatar} /><div><h3>{member.name}</h3><p>{member.role}</p></div><span className={member.online ? "online" : ""}>{member.online ? "在线" : "离线"}</span></header><div className="load"><span>当前负载</span><strong>{tasks.length} / 5</strong><div><i style={{ width: `${load}%` }}></i></div></div><section>{tasks.slice(0, 3).map((task) => <article key={task.id}><StatusBadge status={task.status} /><span>{task.title}</span><select value={task.assigneeId} onChange={(event) => onUpdateTask(task.id, { assigneeId: event.target.value })}><option value={task.assigneeId} disabled>负责人：{member.name}</option>{workspace.members.filter((candidate) => candidate.id !== task.assigneeId).map((candidate) => <option value={candidate.id} key={candidate.id}>转交给 {candidate.name}</option>)}</select></article>)}{!tasks.length && <p className="inline-empty">暂无进行中任务</p>}</section></article>;
      })}</div>
    </div>
  );
}

function AnalyticsView({ workspace }: { workspace: WorkspaceState }) {
  const total = workspace.tasks.length;
  const done = workspace.tasks.filter((task) => task.status === "done").length;
  const overdue = workspace.tasks.filter(isOverdue).length;
  const projectRows = workspace.projects.filter((project) => !project.archived).map((project) => ({ project, tasks: workspace.tasks.filter((task) => task.projectId === project.id) }));
  const bottleneck = statusOrder.map((status) => ({ status, count: workspace.tasks.filter((task) => task.status === status).length })).sort((a, b) => b.count - a.count)[0];
  const weekdayLabel = ["日","一","二","三","四","五","六"];
  const trend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = ymd(date);
    const isToday = index === 6;
    return {
      label: isToday ? "今天" : `周${weekdayLabel[date.getDay()]}`,
      created: workspace.tasks.filter((task) => (task.createdAt ?? "").startsWith(key)).length,
      completed: workspace.tasks.filter((task) => task.status === "done" && (task.updatedAt ?? "").startsWith(key)).length,
    };
  });
  const trendMax = Math.max(1, ...trend.map((point) => Math.max(point.created, point.completed)));
  return (
    <div className="analytics">
      <div className="metric-grid"><Metric label="任务完成率" value={`${Math.round(done / Math.max(total, 1) * 100)}%`} detail={`${done}/${total} 已完成`} tone="green" /><Metric label="逾期率" value={`${Math.round(overdue / Math.max(total, 1) * 100)}%`} detail={`${overdue} 个任务`} tone="red" /><Metric label="平均项目进度" value={`${Math.round(projectRows.reduce((sum, row) => sum + row.tasks.filter((task) => task.status === "done").length / Math.max(row.tasks.length, 1) * 100, 0) / Math.max(projectRows.length, 1))}%`} detail="实时计算" tone="blue" /><Metric label="阶段瓶颈" value={statusInfo[bottleneck.status].label} detail={`${bottleneck.count} 个任务`} tone="neutral" /></div>
      <div className="analytics-grid">
        <section className="panel chart-card"><header><div><h2>近 7 日任务趋势</h2><p>新增与完成任务</p></div><span>实时数据</span></header><div className="trend-chart">{trend.map((point, index) => <div key={index}><section><i style={{ height: `${Math.round(point.created / trendMax * 100)}%` }} title={`新增 ${point.created}`}></i><b style={{ height: `${Math.round(point.completed / trendMax * 100)}%` }} title={`完成 ${point.completed}`}></b></section><span>{point.label}</span></div>)}</div><div className="trend-legend"><span><i></i>新增</span><span><b></b>完成</span></div></section>
        <section className="panel risk-list"><header><h2>智能风险预警</h2><span>{overdue + workspace.projects.filter((project) => project.health === "risk").length}</span></header>{workspace.tasks.filter(isOverdue).map((task) => <article key={task.id}><i>!</i><div><strong>{task.title}</strong><p>已逾期，建议重新排期或转交</p></div><PriorityBadge priority={task.priority} /></article>)}{workspace.projects.filter((project) => project.health === "risk").map((project) => <article key={project.id}><i>!</i><div><strong>{project.name}</strong><p>项目健康度为风险，需要干预</p></div><span className="badge danger">项目</span></article>)}{!overdue && !workspace.projects.some((project) => project.health === "risk") && <p className="inline-empty">暂无风险项</p>}</section>
        <section className="panel stage-chart"><header><h2>阶段任务分布</h2><p>识别流程瓶颈</p></header>{statusOrder.map((status) => { const count = workspace.tasks.filter((task) => task.status === status).length; return <div key={status}><span>{statusInfo[status].label}</span><div><i style={{ width: `${count / Math.max(total, 1) * 100}%`, background: statusInfo[status].color }}></i></div><strong>{count}</strong></div>; })}</section>
      </div>
    </div>
  );
}

function WikiKnowledgeAssistant({ context, suggestedQuestions, compact = false, enabled = true, canWrite = true, onAddComment, onCreateTask }: { context?: string; suggestedQuestions?: string[]; compact?: boolean; enabled?: boolean; canWrite?: boolean; onAddComment?: (answer: string) => void; onCreateTask?: (answer: string) => void }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ask = async (value?: string) => {
    if (!enabled) { setError("登录后可使用 KAI 知识助手"); return; }
    const nextQuestion = (value ?? question).trim();
    if (!nextQuestion || loading) return;
    setQuestion(nextQuestion);
    setLoading(true);
    setError("");
    try {
      const prompt = context
        ? `请结合以下 KaiArmy 工作上下文回答。请优先给出可执行结论；如果知识库没有依据，请明确说明。\n\n【工作上下文】\n${context}\n\n【用户问题】\n${nextQuestion}`
        : nextQuestion;
      const response = await fetch("/api/wiki/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, conversationId, language: "zh-CN" }),
      });
      const result = await response.json() as Partial<WikiChatResult> & { error?: string };
      if (!response.ok || !result.answer) throw new Error(result.error || "问答失败");
      setAnswer(result.answer);
      setConversationId(result.conversationId ?? null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "KAI 知识服务暂时不可用");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={`wiki-assistant ${compact ? "compact" : ""}`}>
      <header><div><span>KAI / KNOWLEDGE</span><strong>KAI 知识助手</strong></div><a href="https://wiki.kai.com/" target="_blank" rel="noreferrer">打开 Wiki ↗</a></header>
      {!answer && <p className="wiki-assistant-intro">调用 wiki.kai.com 的知识库与快速问答工作流，为当前工作提供有依据的解释和建议。</p>}
      <form onSubmit={(event) => { event.preventDefault(); void ask(); }}>
        <textarea disabled={!enabled} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={!enabled ? "登录后可连接 wiki.kai.com 知识服务" : context ? "询问当前任务的规则、验收条件或风险…" : "询问 KAI 规则、流程、产品或知识库内容…"} rows={compact ? 2 : 3} />
        <button className="primary" disabled={!enabled || !question.trim() || loading}>{loading ? "检索中…" : "发送"}</button>
      </form>
      {!answer && suggestedQuestions?.length ? <div className="wiki-suggestions">{suggestedQuestions.map((item) => <button disabled={!enabled} key={item} onClick={() => void ask(item)}>{item}<span>↗</span></button>)}</div> : null}
      {!enabled && !error && <p className="wiki-error">当前为访客工作区，登录后即可检索 Wiki。</p>}
      {error && <p className="wiki-error">{error}</p>}
      {answer && <div className="wiki-answer"><div className="wiki-answer-meta"><span>来自 wiki.kai.com</span><button onClick={() => { setAnswer(""); setQuestion(""); setConversationId(null); }}>新对话</button></div><div className="wiki-answer-content">{renderMarkdown(answer)}</div>{canWrite && (onAddComment || onCreateTask) && <footer>{onAddComment && <button onClick={() => onAddComment(answer)}>引用到评论</button>}{onCreateTask && <button className="primary" onClick={() => onCreateTask(answer)}>生成跟进任务</button>}</footer>}</div>}
    </section>
  );
}

function WikiCatalogPanel({ enabled }: { enabled: boolean }) {
  const [catalog, setCatalog] = useState<WikiCatalog | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!enabled) return;
    fetch("/api/wiki/catalog")
      .then(async (response) => {
        const result = await response.json() as WikiCatalog & { error?: string };
        if (!response.ok) throw new Error(result.error || "读取失败");
        return result;
      })
      .then(setCatalog)
      .catch((error) => setError(error instanceof Error ? error.message : "读取失败"));
  }, [enabled]);
  const featured = catalog?.knowledgeBases.filter((item) => item.documentCount > 0 && (item.name.includes("KAI") || item.name.includes("期算") || item.name.includes("模型服务"))).slice(0, 6) ?? [];
  const activeFlow = catalog?.flows.find((item) => item.name.includes("快速问答API") && item.status === "active");
  return <section className="wiki-catalog"><header><div><span>WIKI SOURCES</span><strong>在线知识源</strong></div><a href="https://wiki.kai.com/kb" target="_blank" rel="noreferrer">管理 ↗</a></header>{featured.map((item) => <article key={item.id}><i></i><div><strong>{item.name}</strong><small>{item.documentCount} 个文档 · {item.embeddingModel}</small></div><span>{item.status}</span></article>)}{activeFlow && <div className="wiki-flow"><span>ACTIVE FLOW</span><strong>{activeFlow.name}</strong><small>{activeFlow.description}</small></div>}{enabled && !catalog && !error && <p>正在读取 Wiki 目录…</p>}{!enabled && <p>登录后显示在线知识源。</p>}{error && <p>{error}</p>}</section>;
}

function KnowledgeBase({ workspace, search, selectedDocId, selectedTaskId, wikiEnabled, canEdit, onSelect, onChange, onCreate, onAddComment, onCreateKnowledgeTask, announce }: { workspace: WorkspaceState; search: string; selectedDocId: string; selectedTaskId: string; wikiEnabled: boolean; canEdit: boolean; onSelect: (id: string) => void; onChange: (patch: Partial<WorkspaceState>) => void; onCreate: () => void; onAddComment: (taskId: string, content: string) => void; onCreateKnowledgeTask: (sourceTask: Task, answer: string) => void; announce: (message: string) => void }) {
  const docs = workspace.docs.filter((doc) => `${doc.name}${doc.content}`.toLowerCase().includes(search.toLowerCase()));
  const selected = workspace.docs.find((doc) => doc.id === selectedDocId) ?? docs[0];
  const selectedTask = workspace.tasks.find((task) => task.id === selectedTaskId);
  const linkToTask = () => {
    if (!selected || !selectedTaskId || selected.taskIds.includes(selectedTaskId)) return;
    onChange({ docs: workspace.docs.map((doc) => doc.id === selected.id ? { ...doc, taskIds: [...doc.taskIds, selectedTaskId] } : doc), tasks: workspace.tasks.map((task) => task.id === selectedTaskId ? { ...task, docIds: [...task.docIds, selected.id] } : task) });
    announce("文档已关联到当前任务");
  };
  return (
    <div className="knowledge-layout">
      <aside className="knowledge-sidebar panel"><div className="section-title compact"><div><h2>本地文档</h2><p>{docs.length} 篇 · KaiArmy</p></div><button disabled={!canEdit} onClick={onCreate}>＋</button></div>{docs.map((doc) => <button className={selected?.id === doc.id ? "active" : ""} key={doc.id} onClick={() => onSelect(doc.id)}><i>▤</i><div><strong>{doc.name}</strong><small>{doc.type.toUpperCase()} · v{doc.version}</small></div>{doc.favorite && <span>★</span>}</button>)}<WikiCatalogPanel enabled={wikiEnabled} /></aside>
      <div className="knowledge-main"><WikiKnowledgeAssistant enabled={wikiEnabled} canWrite={canEdit} context={selectedTask ? taskKnowledgeContext(selectedTask, workspace) : selected ? `当前文档：${selected.name}\n类型：${selected.type.toUpperCase()}\n摘要：${selected.content}` : undefined} suggestedQuestions={["期算平台的核心规则是什么？", "如何检查一个 PRD 是否完整？", "平台有哪些主要风险控制机制？"]} onAddComment={selectedTask ? (answer) => { onAddComment(selectedTask.id, `KAI 知识助手：\n${answer}`); announce("知识回答已引用到当前任务评论"); } : undefined} onCreateTask={selectedTask ? (answer) => onCreateKnowledgeTask(selectedTask, answer) : undefined} />{selected && <article className="knowledge-article panel"><header><div><span>{selected.type.toUpperCase()} · KAIARMY LOCAL</span><small>更新于 {formatDateTime(selected.updatedAt)}</small></div><button onClick={linkToTask} disabled={!canEdit || !selectedTaskId || selected.taskIds.includes(selectedTaskId)}>＋ 关联当前任务</button></header><h1>{selected.name}</h1><p>{selected.content}</p><div className="article-block"><h3>知识联动</h3><p>当前文档可作为提问上下文；第一阶段答案来自 wiki.kai.com，后续阶段将支持自动同步和索引状态。</p></div><section><h3>已关联任务</h3>{workspace.tasks.filter((task) => selected.taskIds.includes(task.id)).map((task) => <article key={task.id}><StatusBadge status={task.status} /><strong>{task.title}</strong><span>{task.id}</span></article>)}</section></article>}</div>
    </div>
  );
}

function SettingsView({ workspace, onChange, announce, user, activeWorkspace, workspaces, onWorkspacesChange, onSwitchWorkspace, onReloadWorkspace, onUserChange }: { workspace: WorkspaceState; onChange: (patch: Partial<WorkspaceState>) => void; announce: (message: string) => void; user: AuthUser | null; activeWorkspace: ProductWorkspace | null; workspaces: ProductWorkspace[]; onWorkspacesChange: (items: ProductWorkspace[]) => void; onSwitchWorkspace: (id: string) => void; onReloadWorkspace: () => Promise<void>; onUserChange: (user: AuthUser) => void }) {
  const settings = workspace.settings;
  const [members, setMembers] = useState<ProductMember[]>([]);
  const [workspaceName, setWorkspaceName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [accountName, setAccountName] = useState(user?.displayName ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const importRef = useRef<HTMLInputElement | null>(null);
  const canManage = activeWorkspace?.role === "owner";
  useEffect(() => {
    if (!user) return;
    fetch("/api/workspaces/members").then((response) => response.json()).then((data: { members?: ProductMember[] }) => setMembers(data.members ?? [])).catch(() => setMembers([]));
  }, [user, activeWorkspace?.id]);
  const update = (patch: Partial<WorkspaceState["settings"]>) => onChange({ settings: { ...settings, ...patch } });
  const exportData = () => {
    const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "kaiarmy-workspace.json"; anchor.click();
    URL.revokeObjectURL(url);
    announce("工作区数据已导出");
  };
  const importData = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || file.size > 1_000_000) { announce("导入文件无效或超过 1MB"); return; }
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      if (!validateWorkspace(parsed)) throw new Error("invalid");
      onChange(parsed);
      announce("工作区数据已导入，正在保存");
    } catch {
      announce("JSON 格式或工作区结构无效");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };
  const createWorkspace = async () => {
    const name = workspaceName.trim();
    if (!name) return;
    const response = await fetch("/api/workspaces", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const result = await response.json() as { workspace?: ProductWorkspace; error?: string };
    if (!response.ok || !result.workspace) { announce(result.error || "创建工作区失败"); return; }
    onWorkspacesChange([...workspaces, result.workspace]);
    setWorkspaceName("");
    await onSwitchWorkspace(result.workspace.id);
    announce("新工作区已创建");
  };
  const inviteMember = async () => {
    const response = await fetch("/api/workspaces/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: inviteEmail, role: inviteRole }) });
    const result = await response.json() as { member?: ProductMember; version?: number; error?: string };
    if (!response.ok || !result.member) { announce(result.error || "邀请成员失败"); return; }
    await onReloadWorkspace();
    setMembers((current) => [...current, result.member!]);
    setInviteEmail("");
    onWorkspacesChange(workspaces.map((item) => item.id === activeWorkspace?.id ? { ...item, memberCount: item.memberCount + 1 } : item));
    announce("成员已加入工作区");
  };
  const removeMember = async (member: ProductMember) => {
    if (!window.confirm(`确定移除 ${member.displayName}？`)) return;
    const response = await fetch("/api/workspaces/members", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: member.id }) });
    const result = await response.json() as { version?: number; error?: string };
    if (!response.ok) { announce(result.error || "移除成员失败"); return; }
    await onReloadWorkspace();
    setMembers((current) => current.filter((item) => item.id !== member.id));
    onWorkspacesChange(workspaces.map((item) => item.id === activeWorkspace?.id ? { ...item, memberCount: Math.max(1, item.memberCount - 1) } : item));
    announce("成员已移除");
  };
  const saveProfile = async () => {
    const response = await fetch("/api/auth/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: accountName }) });
    const result = await response.json() as { user?: AuthUser; error?: string };
    if (!response.ok || !result.user) { announce(result.error || "更新资料失败"); return; }
    onUserChange(result.user);
    announce("账号资料已更新");
  };
  const changePassword = async () => {
    const response = await fetch("/api/auth/password", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { announce(result.error || "修改密码失败"); return; }
    setCurrentPassword(""); setNewPassword("");
    announce("密码已修改，请重新登录");
    window.setTimeout(() => window.location.reload(), 800);
  };
  return (
    <div className="settings-layout">
      <section className="panel settings-section"><header><div><h2>工作区资料</h2><p>用于当前项目空间的名称和署名</p></div><Avatar label={user ? initials(user.displayName) : "访"} /></header><label>工作区内显示名称<input value={settings.displayName} onChange={(event) => update({ displayName: event.target.value })} disabled={activeWorkspace?.role === "viewer"} /></label><label>工作区名称<input value={settings.workspaceName} onChange={(event) => update({ workspaceName: event.target.value })} disabled={Boolean(activeWorkspace && activeWorkspace.role !== "owner")} /></label>{activeWorkspace?.role === "editor" && <p className="settings-empty">仅所有者可修改共享工作区名称。</p>}</section>
      <section className="panel settings-section"><header><div><h2>通知偏好</h2><p>选择需要接收的任务提醒</p></div></header><Toggle label="站内通知" detail="任务指派、评论与截止时间" checked={settings.inAppNotifications} onChange={(checked) => update({ inAppNotifications: checked })} /><Toggle label="邮件通知" detail="每日摘要和高风险提醒" checked={settings.emailNotifications} onChange={(checked) => update({ emailNotifications: checked })} /></section>
      <section className="panel settings-section"><header><div><h2>界面偏好</h2><p>主题外观与信息密度</p></div></header><div className="theme-row"><div><strong>主题外观</strong><small>暗色专业权威 / 亮色清爽明快</small></div><div className="theme-switch"><button className={(settings.theme ?? "dark") === "dark" ? "active" : ""} onClick={() => update({ theme: "dark" })}>◑ 暗色</button><button className={settings.theme === "light" ? "active" : ""} onClick={() => update({ theme: "light" })}>◐ 亮色</button></div></div><Toggle label="紧凑模式" detail="减少卡片间距，展示更多内容" checked={settings.compactMode} onChange={(checked) => update({ compactMode: checked })} /></section>
      <section className="panel settings-section"><header><div><h2>工作区管理</h2><p>{user ? "创建并切换独立工作区" : "登录后可使用多个云端工作区"}</p></div></header>{user ? <><label>当前工作区<select value={activeWorkspace?.id ?? ""} onChange={(event) => void onSwitchWorkspace(event.target.value)}>{workspaces.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.role === "owner" ? "所有者" : item.role === "editor" ? "可编辑" : "只读"}</option>)}</select></label><div className="settings-inline"><input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="新工作区名称" /><button className="primary" disabled={workspaceName.trim().length < 2} onClick={() => void createWorkspace()}>创建</button></div></> : <p className="settings-empty">当前为访客本地工作区，点击左下角登录即可创建云端空间。</p>}</section>
      {user && <section className="panel settings-section workspace-members"><header><div><h2>真实成员</h2><p>成员需先注册 KaiArmy，再通过邮箱加入</p></div><span>{members.length}</span></header>{canManage && <div className="member-invite"><input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="member@company.com" /><select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "editor" | "viewer")}><option value="editor">可编辑</option><option value="viewer">只读</option></select><button className="primary" disabled={!inviteEmail.includes("@")} onClick={() => void inviteMember()}>添加</button></div>}<div className="workspace-member-list">{members.map((member) => <article key={member.id}><Avatar label={initials(member.displayName)} /><div><strong>{member.displayName}</strong><small>{member.email}</small></div><span>{member.role === "owner" ? "所有者" : member.role === "editor" ? "可编辑" : "只读"}</span>{canManage && member.role !== "owner" && <button onClick={() => void removeMember(member)}>移除</button>}</article>)}</div></section>}
      {user && <section className="panel settings-section"><header><div><h2>账号安全</h2><p>修改账号名称和登录密码</p></div></header><label>账号显示名称<input value={accountName} onChange={(event) => setAccountName(event.target.value)} /></label><button className="settings-save" disabled={accountName.trim().length < 2} onClick={() => void saveProfile()}>保存账号资料</button><label>当前密码<input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" /></label><label>新密码<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={10} autoComplete="new-password" /></label><button className="settings-save" disabled={!currentPassword || newPassword.length < 10} onClick={() => void changePassword()}>修改密码</button></section>}
      <section className="panel settings-section danger-zone"><header><div><h2>数据管理</h2><p>备份、导入或重置当前工作区</p></div></header><div><button onClick={exportData}>↓ 导出 JSON</button><button onClick={() => importRef.current?.click()}>↑ 导入 JSON</button><input ref={importRef} type="file" accept="application/json,.json" hidden onChange={(event) => void importData(event.target.files)} /><button className="danger-button" disabled={activeWorkspace?.role === "viewer"} onClick={() => { if (!window.confirm("确定清空为全新工作区？当前修改将被覆盖。")) return; onChange(createEmptyWorkspace(settings.workspaceName, user?.displayName ?? settings.displayName, user?.id ?? "guest")); announce("已清空当前工作区"); }}>清空工作区</button></div></section>
    </div>
  );
}

function TaskFormModal({ workspace, task, preset, onClose, onSave }: { workspace: WorkspaceState; task?: Task; preset?: Partial<Task>; onClose: () => void; onSave: (task: Task) => void }) {
  const [draft, setDraft] = useState<Task>(() => {
    if (task) return task;
    const createdAt = new Date().toISOString();
    return {
      id: `KAI-${String(workspace.tasks.length + 1).padStart(3, "0")}`,
      title: preset?.title ?? "", description: preset?.description ?? "", projectId: preset?.projectId ?? workspace.projects.find((project) => !project.archived)?.id ?? "",
      assigneeId: preset?.assigneeId ?? workspace.members[0]?.id ?? "", participantIds: preset?.participantIds ?? [], status: preset?.status ?? "todo", priority: preset?.priority ?? "medium",
      dueAt: preset?.dueAt ?? new Date(new Date(createdAt).getTime() + 86400000).toISOString(), tags: preset?.tags ?? [], docIds: preset?.docIds ?? [], createdAt, updatedAt: createdAt,
    };
  });
  const [tags, setTags] = useState(draft.tags.join("，"));
  return <Modal title={task ? "编辑任务" : "新建任务"} subtitle="建立明确的负责人、状态和截止时间" onClose={onClose} onSubmit={() => onSave({ ...draft, tags: tags.split(/[，,]/).map((item) => item.trim()).filter(Boolean), updatedAt: new Date().toISOString() })} disabled={!draft.title.trim()}>
    <label className="full">任务标题 *<input autoFocus maxLength={50} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="例如：完成 Beta 版本验收" /></label>
    <label className="full">任务描述<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="说明目标、范围和验收标准" /></label>
    <label>所属项目<select value={draft.projectId} onChange={(event) => setDraft({ ...draft, projectId: event.target.value })}>{workspace.projects.filter((project) => !project.archived).map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label>
    <label>负责人<select value={draft.assigneeId} onChange={(event) => setDraft({ ...draft, assigneeId: event.target.value })}>{workspace.members.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select></label>
    <label>状态<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as TaskStatus })}>{statusOrder.map((status) => <option value={status} key={status}>{statusInfo[status].label}</option>)}</select></label>
    <label>优先级<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as Priority })}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label>
    <label>截止时间<input type="datetime-local" value={draft.dueAt.slice(0, 16)} onChange={(event) => setDraft({ ...draft, dueAt: new Date(event.target.value).toISOString() })} /></label>
    <label>标签<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="用逗号分隔" /></label>
  </Modal>;
}

function ProjectFormModal({ workspace, onClose, onSave }: { workspace: WorkspaceState; onClose: () => void; onSave: (project: Project) => void }) {
  const [name, setName] = useState(""); const [description, setDescription] = useState(""); const [ownerId, setOwnerId] = useState(workspace.members[0]?.id ?? ""); const [dueAt, setDueAt] = useState("2026-08-31");
  return <Modal title="新建项目" subtitle="项目创建后即可添加任务和里程碑" onClose={onClose} onSubmit={() => onSave({ id: uid("p"), name, description, ownerId, dueAt: new Date(`${dueAt}T18:00:00`).toISOString(), health: "good", archived: false, milestones: [] })} disabled={!name.trim()}><label className="full">项目名称 *<input autoFocus value={name} onChange={(event) => setName(event.target.value)} /></label><label className="full">项目说明<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label><label>负责人<select value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>{workspace.members.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select></label><label>计划截止<input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label></Modal>;
}

function DocFormModal({ workspace, onClose, onSave }: { workspace: WorkspaceState; onClose: () => void; onSave: (doc: Doc) => void }) {
  const [name, setName] = useState(""); const [type, setType] = useState<Doc["type"]>("prd"); const [content, setContent] = useState(""); const [taskId, setTaskId] = useState("");
  return <Modal title="新建文档" subtitle="文档可直接关联到项目任务" onClose={onClose} onSubmit={() => onSave({ id: uid("d"), name, type, content, version: 1, taskIds: taskId ? [taskId] : [], updatedAt: new Date().toISOString(), favorite: false })} disabled={!name.trim()}><label className="full">文档名称 *<input autoFocus value={name} onChange={(event) => setName(event.target.value)} /></label><label>文档类型<select value={type} onChange={(event) => setType(event.target.value as Doc["type"])}><option value="prd">PRD</option><option value="design">设计</option><option value="review">评审</option><option value="report">报告</option><option value="spec">规范</option></select></label><label>关联任务<select value={taskId} onChange={(event) => setTaskId(event.target.value)}><option value="">暂不关联</option>{workspace.tasks.map((task) => <option value={task.id} key={task.id}>{task.title}</option>)}</select></label><label className="full">文档内容<textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="输入摘要或正文…" /></label></Modal>;
}

function EventFormModal({ workspace, presetDate, onClose, onSave }: { workspace: WorkspaceState; presetDate?: string; onClose: () => void; onSave: (event: CalendarEvent) => void }) {
  const [title, setTitle] = useState(""); const [type, setType] = useState<CalendarEvent["type"]>("meeting"); const [date, setDate] = useState(presetDate ?? new Date().toISOString().slice(0, 10)); const [time, setTime] = useState("10:00"); const [taskId, setTaskId] = useState("");
  return <Modal title="新建日程" subtitle="日程可与任务截止时间双向关联" onClose={onClose} onSubmit={() => onSave({ id: uid("e"), title, type, date, time, taskId: taskId || undefined })} disabled={!title.trim()}><label className="full">日程标题 *<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>类型<select value={type} onChange={(event) => setType(event.target.value as CalendarEvent["type"])}><option value="meeting">会议</option><option value="review">评审</option><option value="deadline">截止</option></select></label><label>关联任务<select value={taskId} onChange={(event) => setTaskId(event.target.value)}><option value="">暂不关联</option>{workspace.tasks.map((task) => <option value={task.id} key={task.id}>{task.title}</option>)}</select></label><label>日期<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>时间<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label></Modal>;
}

function BatchEventModal({ workspace, onClose, onSave }: { workspace: WorkspaceState; onClose: () => void; onSave: (events: CalendarEvent[]) => void }) {
  const initialStart = ymd(shanghaiDayStart());
  const initialEndDate = new Date(`${initialStart}T00:00:00Z`);
  initialEndDate.setUTCDate(initialEndDate.getUTCDate() + 6);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CalendarEvent["type"]>("meeting");
  const [taskId, setTaskId] = useState("");
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEndDate.toISOString().slice(0, 10));
  const [time, setTime] = useState("10:00");
  const [repeat, setRepeat] = useState<"daily" | "weekdays" | "weekly">("daily");
  const timeOptions = useMemo(() => Array.from({ length: 48 }, (_, index) => `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`), []);
  const generatedDates = useMemo(() => {
    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T00:00:00Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];
    const dates: string[] = [];
    for (let cursor = new Date(start); cursor <= end && dates.length <= 366; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const day = cursor.getUTCDay();
      const offset = Math.round((cursor.getTime() - start.getTime()) / 86400000);
      if (repeat === "daily" || (repeat === "weekdays" && day !== 0 && day !== 6) || (repeat === "weekly" && offset % 7 === 0)) dates.push(cursor.toISOString().slice(0, 10));
    }
    return dates;
  }, [endDate, repeat, startDate]);
  const rangeInvalid = endDate < startDate;
  const tooMany = generatedDates.length > 365;
  const events = generatedDates.map((date) => ({ id: uid("e"), date, time, type, title: title.trim(), taskId: taskId || undefined }));
  const repeatLabel = { daily: "每天", weekdays: "仅工作日", weekly: "每周" }[repeat];
  return <Modal title="批量添加日程" subtitle="选择日期区间与重复规则，系统自动生成日程" submitLabel={`创建 ${events.length} 条`} onClose={onClose} onSubmit={() => onSave(events)} disabled={!title.trim() || !events.length || rangeInvalid || tooMany}>
    <label className="full">日程标题 *<input autoFocus maxLength={60} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：每日站会" /></label>
    <label>日程类型<select value={type} onChange={(event) => setType(event.target.value as CalendarEvent["type"])}><option value="meeting">会议</option><option value="review">评审</option><option value="deadline">截止</option></select></label>
    <label>关联任务<select value={taskId} onChange={(event) => setTaskId(event.target.value)}><option value="">暂不关联</option>{workspace.tasks.map((task) => <option value={task.id} key={task.id}>{task.id} · {task.title}</option>)}</select></label>
    <div className="full batch-event-range"><label>开始日期<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><span>至</span><label>结束日期<input type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div>
    <label>重复方式<select value={repeat} onChange={(event) => setRepeat(event.target.value as typeof repeat)}><option value="daily">每天</option><option value="weekdays">仅工作日</option><option value="weekly">每周（按开始日）</option></select></label>
    <label>开始时间<select value={time} onChange={(event) => setTime(event.target.value)}>{timeOptions.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>
    <div className={`full batch-event-summary ${rangeInvalid || tooMany ? "has-error" : ""}`}><div><strong>{events.length} 条日程</strong><small>{startDate} 至 {endDate} · {repeatLabel} · {time}</small></div>{rangeInvalid ? <span>结束日期不能早于开始日期</span> : tooMany ? <span>单次最多创建 365 条</span> : <span>确认后将一次性写入日历</span>}</div>
  </Modal>;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// 共享文件列表：文件归档与项目总览复用
function DocFileList({ files, onOpen, onUpload, onDelete, onOversize }: { files: DocFile[]; onOpen: (fileId: string) => void; onUpload?: (file: DocFile) => void; onDelete?: (fileId: string) => void; onOversize?: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const handlePick = async (fileList: FileList | null) => {
    const picked = fileList?.[0];
    if (!picked) return;
    if (picked.size > MAX_FILE_BYTES) { onOversize?.(); return; }
    const kind = kindFromName(picked.name);
    const base = { id: uid("f"), name: picked.name, kind, size: picked.size, updatedAt: new Date().toISOString() };
    const next: DocFile = EDITABLE_KINDS.includes(kind)
      ? { ...base, text: await readFileAsText(picked) }
      : { ...base, dataUrl: await readFileAsDataUrl(picked) };
    onUpload?.(next);
    if (inputRef.current) inputRef.current.value = "";
  };
  return (
    <div className="doc-file-list">
      {files.map((file) => (
        <div className="doc-file-row" key={file.id}>
          <button className="doc-file-open" onClick={() => onOpen(file.id)} aria-label={`打开文件 ${file.name}`}>
            <i className={`file-tag ${file.kind}`}>{file.kind.toUpperCase()}</i>
            <div><strong>{file.name}</strong><small>{formatBytes(file.size)} · {formatDate(file.updatedAt)}</small></div>
            <span>{EDITABLE_KINDS.includes(file.kind) ? "编辑 ↗" : "预览 ↗"}</span>
          </button>
          {onDelete && <button className="doc-file-remove" aria-label={`删除文件 ${file.name}`} onClick={() => onDelete(file.id)}>×</button>}
        </div>
      ))}
      {!files.length && <p className="inline-empty">暂无文件</p>}
      {onUpload && (
        <>
          <button className="doc-file-upload" onClick={() => inputRef.current?.click()}>＋ 上传文件</button>
          <input ref={inputRef} type="file" accept=".md,.markdown,.csv,.txt,.pdf,.docx,.doc" hidden onChange={(event) => handlePick(event.target.files)} />
        </>
      )}
    </div>
  );
}

function FileViewerModal({ docName, file, readOnly, onClose, onSave, onReplace, onOversize }: { docName: string; file: DocFile; readOnly: boolean; onClose: () => void; onSave: (patch: Partial<DocFile>) => void; onReplace: (patch: Partial<DocFile>) => void; onOversize: () => void }) {
  const editable = EDITABLE_KINDS.includes(file.kind);
  const [text, setText] = useState(file.text ?? "");
  const [mdPreview, setMdPreview] = useState(false);
  const [csvMode, setCsvMode] = useState<"table" | "raw">("table");
  const replaceRef = useRef<HTMLInputElement | null>(null);
  const dirty = editable && text !== (file.text ?? "");
  const rows = file.kind === "csv" ? parseCsv(text) : [];

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const setCell = (rowIndex: number, colIndex: number, value: string) => {
    const nextRows = rows.map((row) => [...row]);
    nextRows[rowIndex][colIndex] = value;
    setText(serializeCsv(nextRows));
  };
  const handleReplace = async (fileList: FileList | null) => {
    const picked = fileList?.[0];
    if (!picked) return;
    if (picked.size > MAX_FILE_BYTES) { onOversize(); return; }
    const kind = kindFromName(picked.name);
    if (EDITABLE_KINDS.includes(kind)) {
      const value = await readFileAsText(picked);
      setText(value);
      onReplace({ kind, size: picked.size, text: value, dataUrl: undefined });
    } else {
      onReplace({ kind, size: picked.size, dataUrl: await readFileAsDataUrl(picked), text: undefined });
    }
    if (replaceRef.current) replaceRef.current.value = "";
  };
  const download = () => {
    const href = file.dataUrl ?? `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
    const anchor = document.createElement("a");
    anchor.href = href; anchor.download = file.name; anchor.click();
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal panel file-viewer" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div><h2>{file.name}</h2><p>{docName} · <i className={`file-tag ${file.kind}`}>{file.kind.toUpperCase()}</i> · {formatBytes(file.size)}</p></div>
          <button type="button" onClick={onClose}>×</button>
        </header>
        <div className="file-viewer-body">
          {file.kind === "md" && (mdPreview
            ? <div className="md-preview">{renderMarkdown(text)}</div>
            : <textarea readOnly={readOnly} className="file-editor" value={text} onChange={(event) => setText(event.target.value)} spellCheck={false} />)}
          {file.kind === "txt" && <textarea readOnly={readOnly} className="file-editor" value={text} onChange={(event) => setText(event.target.value)} spellCheck={false} />}
          {file.kind === "csv" && (csvMode === "table"
            ? <div className="csv-scroll"><table className="csv-table"><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, colIndex) => <td key={colIndex}><input readOnly={readOnly} value={cell} onChange={(event) => setCell(rowIndex, colIndex, event.target.value)} className={rowIndex === 0 ? "csv-head" : ""} /></td>)}</tr>)}</tbody></table></div>
            : <textarea readOnly={readOnly} className="file-editor" value={text} onChange={(event) => setText(event.target.value)} spellCheck={false} />)}
          {file.kind === "pdf" && (file.dataUrl
            ? <iframe className="pdf-frame" src={file.dataUrl} title={file.name} />
            : <div className="file-placeholder"><span>▤</span><strong>暂无可预览的 PDF</strong><p>点击下方“替换文件”上传 PDF 后即可内嵌预览。</p></div>)}
          {file.kind === "docx" && <div className="file-placeholder"><span>▤</span><strong>DOCX 文件</strong><p>浏览器无法直接渲染 DOCX 正文，可下载后在本地打开，或替换文件。</p><small>{formatBytes(file.size)}</small></div>}
        </div>
        <footer className="file-viewer-footer">
          <div className="file-viewer-modes">
            {file.kind === "md" && <button onClick={() => setMdPreview((value) => !value)}>{mdPreview ? "✎ 编辑" : "◉ 预览"}</button>}
            {file.kind === "csv" && <button onClick={() => setCsvMode((value) => value === "table" ? "raw" : "table")}>{csvMode === "table" ? "≣ 原始文本" : "▦ 表格"}</button>}
            {!readOnly && <button onClick={() => replaceRef.current?.click()}>↑ 替换文件</button>}
            {!readOnly && <input ref={replaceRef} type="file" accept=".md,.markdown,.csv,.txt,.pdf,.docx,.doc" hidden onChange={(event) => handleReplace(event.target.files)} />}
          </div>
          <div className="file-viewer-actions">
            <button onClick={download}>↓ 下载</button>
            {editable && !readOnly && <button className="primary" disabled={!dirty} onClick={() => onSave({ text, size: new Blob([text]).size })}>保存</button>}
          </div>
        </footer>
      </div>
    </div>
  );
}

function Modal({ title, subtitle, onClose, onSubmit, disabled, submitLabel = "保存", children }: { title: string; subtitle: string; onClose: () => void; onSubmit: () => void; disabled?: boolean; submitLabel?: string; children: React.ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal panel" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); onSubmit(); }}><header><div><h2>{title}</h2><p>{subtitle}</p></div><button type="button" aria-label="关闭" onClick={onClose}><Icon name="close" size={18} /></button></header><div className="modal-grid">{children}</div><footer><button type="button" onClick={onClose}>取消</button><button className="primary" disabled={disabled}>{submitLabel}</button></footer></form></div>;
}

async function copyText(value: string, announce: (message: string) => void, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    announce(`已复制${label}`);
  } catch {
    announce("复制失败");
  }
}

function TaskMenu({ task, onUpdate, onEdit, onDelete, announce }: { task: Task; onUpdate: (id: string, patch: Partial<Task>) => void; onEdit: () => void; onDelete: () => void; announce: (message: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const handle = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); };
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("mousedown", handle);
    window.addEventListener("keydown", handleKey);
    return () => { window.removeEventListener("mousedown", handle); window.removeEventListener("keydown", handleKey); };
  }, [open]);
  const run = (fn: () => void) => { fn(); setOpen(false); };
  return (
    <div className="menu-anchor" ref={ref}>
      <button aria-label="更多操作" aria-expanded={open} onClick={() => setOpen((value) => !value)}><Icon name="more" size={18} /></button>
      {open && (
        <div className="menu-popover" role="menu">
          <button role="menuitem" onClick={() => run(() => onEdit())}><Icon name="edit" size={16} />编辑详情</button>
          <button role="menuitem" onClick={() => run(() => onUpdate(task.id, { status: task.status === "done" ? "develop" : "done" }))}><Icon name="check" size={16} />{task.status === "done" ? "重新打开" : "标记完成"}</button>
          <button role="menuitem" onClick={() => run(() => copyText(task.id, announce, "任务 ID"))}>⧉ 复制任务 ID</button>
          <button role="menuitem" onClick={() => run(() => copyText(task.title, announce, "标题"))}>⧉ 复制标题</button>
          <button role="menuitem" className="danger" onClick={() => run(() => onDelete())}><Icon name="trash" size={16} />删除任务</button>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, detail, tone }: { label: string; value: string | number; detail: string; tone: "green" | "blue" | "red" | "neutral" }) {
  return <article className={`metric panel ${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small><i></i></article>;
}
function Avatar({ label }: { label: string }) { return <span className="avatar">{label}</span>; }
function PriorityBadge({ priority }: { priority: Priority }) { return <span className={`badge priority ${priority}`}>{priorityLabel[priority]}</span>; }
function StatusBadge({ status }: { status: TaskStatus }) { return <span className="badge status" style={{ color: statusInfo[status].color, background: `${statusInfo[status].color}18` }}>{statusInfo[status].label}</span>; }
function Toggle({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="toggle-row"><div><strong>{label}</strong><small>{detail}</small></div><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span></span></label>; }
