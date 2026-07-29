"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  defaultWorkspace,
  type CalendarEvent,
  type Doc,
  type Priority,
  type Project,
  type Task,
  type TaskStatus,
  type WorkspaceState,
} from "../lib/workspace-data";

const navItems = [
  ["⌘", "项目任务管理"],
  ["◫", "项目总览"],
  ["▱", "文件归档"],
  ["▣", "日程管理"],
  ["♧", "团队协作"],
  ["⌁", "智能分析"],
  ["◇", "知识库"],
  ["⚙", "设置中心"],
] as const;

const statusInfo: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: "待办", color: "#8f9792" },
  review: { label: "需求评审", color: "#4ba6ff" },
  design: { label: "产品设计", color: "#a96ef2" },
  develop: { label: "开发实现", color: "#28d979" },
  test: { label: "测试验证", color: "#f2a83b" },
  done: { label: "已完成", color: "#4eae7b" },
};

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
  | { kind: "task"; task?: Task }
  | { kind: "project" }
  | { kind: "doc" }
  | { kind: "event" }
  | null;

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function isOverdue(task: Task) {
  return task.status !== "done" && new Date(task.dueAt).getTime() < Date.now();
}

export default function Home() {
  const [workspace, setWorkspace] = useState<WorkspaceState>(defaultWorkspace);
  const [activeModule, setActiveModule] = useState("项目任务管理");
  const [selectedTaskId, setSelectedTaskId] = useState(defaultWorkspace.tasks[0].id);
  const [selectedDocId, setSelectedDocId] = useState(defaultWorkspace.docs[0].id);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [syncState, setSyncState] = useState<"loading" | "saved" | "saving" | "error">("loading");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/workspace")
      .then(async (response) => {
        if (!response.ok) throw new Error("读取失败");
        return response.json() as Promise<{ workspace: WorkspaceState }>;
      })
      .then(({ workspace: saved }) => {
        setWorkspace(saved);
        setSelectedTaskId(saved.tasks[0]?.id ?? "");
        setSelectedDocId(saved.docs[0]?.id ?? "");
        setSyncState("saved");
      })
      .catch(() => setSyncState("error"))
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSyncState("saving");
    saveTimer.current = setTimeout(() => {
      fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace }),
      })
        .then((response) => {
          if (!response.ok) throw new Error("保存失败");
          setSyncState("saved");
        })
        .catch(() => setSyncState("error"));
    }, 700);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [workspace, hydrated]);

  const selectedTask = workspace.tasks.find((task) => task.id === selectedTaskId);
  const announce = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };
  const patchWorkspace = (patch: Partial<WorkspaceState>) => setWorkspace((current) => ({ ...current, ...patch }));
  const updateTask = (id: string, patch: Partial<Task>) => {
    patchWorkspace({ tasks: workspace.tasks.map((task) => task.id === id ? { ...task, ...patch, updatedAt: new Date().toISOString() } : task) });
  };
  const deleteTask = (id: string) => {
    if (!window.confirm("确定删除这个任务？相关评论会一并删除。")) return;
    patchWorkspace({
      tasks: workspace.tasks.filter((task) => task.id !== id),
      comments: workspace.comments.filter((comment) => comment.taskId !== id),
      docs: workspace.docs.map((doc) => ({ ...doc, taskIds: doc.taskIds.filter((taskId) => taskId !== id) })),
    });
    setSelectedTaskId(workspace.tasks.find((task) => task.id !== id)?.id ?? "");
    announce("任务已删除");
  };

  const contextualAction = () => {
    const kind = activeModule === "项目总览" ? "project" : activeModule === "文件归档" || activeModule === "知识库" ? "doc" : activeModule === "日程管理" ? "event" : "task";
    setModal({ kind });
  };
  const actionLabel = activeModule === "项目总览" ? "新建项目" : activeModule === "文件归档" || activeModule === "知识库" ? "新建文档" : activeModule === "日程管理" ? "新建日程" : "新建任务";

  return (
    <div className={`app ${workspace.settings.compactMode ? "compact" : ""}`}>
      <Sidebar active={activeModule} onChange={(module) => { setActiveModule(module); setSearch(""); }} workspace={workspace} />
      <main className="main">
        <Header activeModule={activeModule} search={search} setSearch={setSearch} syncState={syncState} actionLabel={actionLabel} onAction={contextualAction} />
        <div className="page">
          {activeModule === "项目任务管理" && (
            <TaskManagement
              workspace={workspace}
              search={search}
              selectedTaskId={selectedTaskId}
              onSelect={setSelectedTaskId}
              onUpdate={updateTask}
              onDelete={deleteTask}
              onEdit={(task) => setModal({ kind: "task", task })}
              onCreate={() => setModal({ kind: "task" })}
              onComment={(content) => {
                if (!selectedTask) return;
                patchWorkspace({ comments: [...workspace.comments, { id: uid("c"), taskId: selectedTask.id, authorId: "m1", content, createdAt: new Date().toISOString() }] });
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
            />
          )}
          {activeModule === "项目总览" && <ProjectOverview workspace={workspace} search={search} onChange={patchWorkspace} onCreate={() => setModal({ kind: "project" })} announce={announce} />}
          {activeModule === "文件归档" && <FileArchive workspace={workspace} search={search} selectedDocId={selectedDocId} onSelect={setSelectedDocId} onChange={patchWorkspace} onCreate={() => setModal({ kind: "doc" })} announce={announce} />}
          {activeModule === "日程管理" && <CalendarView workspace={workspace} search={search} onChange={patchWorkspace} onCreate={() => setModal({ kind: "event" })} />}
          {activeModule === "团队协作" && <TeamView workspace={workspace} search={search} onUpdateTask={updateTask} />}
          {activeModule === "智能分析" && <AnalyticsView workspace={workspace} />}
          {activeModule === "知识库" && <KnowledgeBase workspace={workspace} search={search} selectedDocId={selectedDocId} selectedTaskId={selectedTaskId} onSelect={setSelectedDocId} onChange={patchWorkspace} onCreate={() => setModal({ kind: "doc" })} announce={announce} />}
          {activeModule === "设置中心" && <SettingsView workspace={workspace} onChange={patchWorkspace} announce={announce} />}
        </div>
      </main>
      {modal?.kind === "task" && <TaskFormModal workspace={workspace} task={modal.task} onClose={() => setModal(null)} onSave={(task) => {
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
      {modal?.kind === "event" && <EventFormModal workspace={workspace} onClose={() => setModal(null)} onSave={(event) => { patchWorkspace({ events: [...workspace.events, event] }); setModal(null); announce("日程已创建"); }} />}
      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  );
}

function Sidebar({ active, onChange, workspace }: { active: string; onChange: (module: string) => void; workspace: WorkspaceState }) {
  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => onChange("项目任务管理")}><span>K</span><div><strong>KaiArmy</strong><small>PROJECT OS</small></div></button>
      <nav>
        <span className="nav-label">工作台</span>
        {navItems.slice(0, 6).map(([icon, label]) => <button key={label} className={active === label ? "active" : ""} onClick={() => onChange(label)}><i>{icon}</i><span>{label}</span>{label === "项目任务管理" && <b>{workspace.tasks.filter((task) => task.status !== "done").length}</b>}</button>)}
        <span className="nav-label secondary">资源与配置</span>
        {navItems.slice(6).map(([icon, label]) => <button key={label} className={active === label ? "active" : ""} onClick={() => onChange(label)}><i>{icon}</i><span>{label}</span></button>)}
      </nav>
      <div className="workspace-card"><span>当前工作区</span><strong>{workspace.settings.workspaceName}</strong><small>{workspace.members.filter((member) => member.online).length} 位成员在线</small></div>
      <div className="user-card"><Avatar label="BR" /><div><strong>{workspace.settings.displayName}</strong><small>产品经理</small></div><i></i></div>
    </aside>
  );
}

function Header({ activeModule, search, setSearch, syncState, actionLabel, onAction }: { activeModule: string; search: string; setSearch: (value: string) => void; syncState: "loading" | "saved" | "saving" | "error"; actionLabel: string; onAction: () => void }) {
  const syncText = { loading: "加载中", saved: "已自动保存", saving: "正在保存", error: "保存失败" }[syncState];
  return (
    <header className="header">
      <div className="heading"><h1>{activeModule}</h1><p>{moduleDescriptions[activeModule]}</p></div>
      <label className="search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`搜索${activeModule}…`} /><kbd>⌘ K</kbd></label>
      <div className="header-actions"><span className={`sync ${syncState}`}><i></i>{syncText}</span><button className="icon-button" aria-label="通知">♢<b></b></button><button className="primary" onClick={onAction}>＋ {actionLabel}</button></div>
    </header>
  );
}

function TaskManagement({ workspace, search, selectedTaskId, onSelect, onUpdate, onDelete, onEdit, onCreate, onComment, onLinkDocs }: {
  workspace: WorkspaceState; search: string; selectedTaskId: string; onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Task>) => void; onDelete: (id: string) => void;
  onEdit: (task: Task) => void; onCreate: () => void; onComment: (content: string) => void;
  onLinkDocs: (taskId: string, docIds: string[]) => void;
}) {
  const [projectFilter, setProjectFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [view, setView] = useState<"board" | "list">("board");
  const [comment, setComment] = useState("");
  const [showDocPicker, setShowDocPicker] = useState(false);
  const selected = workspace.tasks.find((task) => task.id === selectedTaskId);
  const filtered = workspace.tasks.filter((task) => {
    const query = `${task.id}${task.title}${task.tags.join("")}`.toLowerCase();
    return query.includes(search.toLowerCase()) && (projectFilter === "all" || task.projectId === projectFilter) && (priorityFilter === "all" || task.priority === priorityFilter);
  });
  const overdue = workspace.tasks.filter(isOverdue).length;
  const today = new Date().toISOString().slice(0, 10);
  const dueToday = workspace.tasks.filter((task) => task.dueAt.startsWith(today) && task.status !== "done").length;

  return (
    <div className="task-layout">
      <section className="task-content">
        <div className="metric-grid">
          <Metric label="今日待办" value={dueToday} detail="需要关注" tone="blue" />
          <Metric label="进行中" value={workspace.tasks.filter((task) => !["todo","done"].includes(task.status)).length} detail="跨 3 个项目" tone="green" />
          <Metric label="已完成" value={workspace.tasks.filter((task) => task.status === "done").length} detail="本周期累计" tone="neutral" />
          <Metric label="逾期任务" value={overdue} detail={overdue ? "建议立即处理" : "状态良好"} tone={overdue ? "red" : "green"} />
        </div>
        <div className="toolbar panel">
          <div><select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}><option value="all">全部项目</option>{workspace.projects.filter((project) => !project.archived).map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select><select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="all">全部优先级</option><option value="high">高优先级</option><option value="medium">中优先级</option><option value="low">低优先级</option></select><span>{filtered.length} 个任务</span></div>
          <div className="segmented"><button className={view === "board" ? "active" : ""} onClick={() => setView("board")}>看板</button><button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>列表</button></div>
        </div>
        {view === "board" ? (
          <div className="kanban">
            {statusOrder.map((status) => {
              const tasks = filtered.filter((task) => task.status === status);
              return (
                <section className="kanban-column panel" key={status} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const id = event.dataTransfer.getData("text/plain"); if (id) onUpdate(id, { status }); }}>
                  <header><span style={{ background: statusInfo[status].color }}></span><strong>{statusInfo[status].label}</strong><b>{tasks.length}</b><button onClick={onCreate}>＋</button></header>
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
      {selected ? (
        <aside className="task-drawer panel">
          <header><div><span>{selected.id}</span><StatusBadge status={selected.status} /></div><button aria-label="更多操作">•••</button></header>
          <h2>{selected.title}</h2>
          <p>{selected.description}</p>
          <div className="field-grid">
            <label>所属项目<select value={selected.projectId} onChange={(event) => onUpdate(selected.id, { projectId: event.target.value })}>{workspace.projects.filter((project) => !project.archived).map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label>
            <label>当前状态<select value={selected.status} onChange={(event) => onUpdate(selected.id, { status: event.target.value as TaskStatus })}>{statusOrder.map((status) => <option value={status} key={status}>{statusInfo[status].label}</option>)}</select></label>
            <label>负责人<select value={selected.assigneeId} onChange={(event) => onUpdate(selected.id, { assigneeId: event.target.value })}>{workspace.members.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select></label>
            <label>优先级<select value={selected.priority} onChange={(event) => onUpdate(selected.id, { priority: event.target.value as Priority })}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label>
            <label className="full">截止时间<input type="datetime-local" value={selected.dueAt.slice(0, 16)} onChange={(event) => onUpdate(selected.id, { dueAt: new Date(event.target.value).toISOString() })} /></label>
          </div>
          <section className="linked-docs"><h3>关联文件 <span>{selected.docIds.length}</span><button onClick={() => setShowDocPicker(true)}>管理文件 →</button></h3>{workspace.docs.filter((doc) => selected.docIds.includes(doc.id)).map((doc) => <article key={doc.id}><i>▤</i><div><strong>{doc.name}</strong><small>{doc.type.toUpperCase()} · v{doc.version}</small></div><button aria-label={`取消关联 ${doc.name}`} onClick={() => onLinkDocs(selected.id, selected.docIds.filter((id) => id !== doc.id))}>×</button></article>)}{!selected.docIds.length && <button className="inline-empty file-empty" onClick={() => setShowDocPicker(true)}>＋ 从文件归档中选取</button>}</section>
          <section className="ai-note"><span>✦ 智能建议</span><strong>{isOverdue(selected) ? "任务已经逾期，建议重新排期或转交。" : selected.priority === "high" ? "这是高优先级任务，建议拆分验收节点。" : "当前任务状态正常。"}</strong></section>
          <section className="comments"><h3>协作评论 <span>{workspace.comments.filter((item) => item.taskId === selected.id).length}</span></h3><div className="comment-list">{workspace.comments.filter((item) => item.taskId === selected.id).map((item) => { const author = workspace.members.find((member) => member.id === item.authorId); return <article key={item.id}><Avatar label={author?.avatar ?? "?"} /><div><strong>{author?.name}</strong><p>{item.content}</p><small>{formatDateTime(item.createdAt)}</small></div></article>; })}</div><form onSubmit={(event) => { event.preventDefault(); if (!comment.trim()) return; onComment(comment.trim()); setComment(""); }}><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="写下评论，支持 @成员…" /><button disabled={!comment.trim()}>发送</button></form></section>
          <footer><button className="danger-button" onClick={() => onDelete(selected.id)}>删除</button><button onClick={() => onEdit(selected)}>编辑详情</button><button className="primary" onClick={() => onUpdate(selected.id, { status: selected.status === "done" ? "develop" : "done" })}>{selected.status === "done" ? "重新打开" : "✓ 完成任务"}</button></footer>
          {showDocPicker && <SpatialFilePicker docs={workspace.docs} selectedIds={selected.docIds} taskTitle={selected.title} onClose={() => setShowDocPicker(false)} onSave={(docIds) => { onLinkDocs(selected.id, docIds); setShowDocPicker(false); }} />}
        </aside>
      ) : <aside className="task-drawer panel empty-state"><span>◇</span><h3>选择一个任务</h3><p>查看详情、评论和关联文档</p></aside>}
    </div>
  );
}

function SpatialFilePicker({ docs, selectedIds, taskTitle, onClose, onSave }: { docs: Doc[]; selectedIds: string[]; taskTitle: string; onClose: () => void; onSave: (ids: string[]) => void }) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>(selectedIds);
  const [focusId, setFocusId] = useState(selectedIds[0] ?? docs[0]?.id ?? "");
  const pointerStart = useRef<number | null>(null);
  const wheelLocked = useRef(false);
  const visible = docs.filter((doc) => `${doc.name}${doc.content}${doc.type}`.toLowerCase().includes(query.toLowerCase()));
  const focusIndex = Math.max(0, visible.findIndex((doc) => doc.id === focusId));
  const activeDoc = visible[focusIndex];
  const toggle = (id: string) => setPicked((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const move = (direction: number) => {
    if (!visible.length) return;
    setFocusId((current) => {
      const currentIndex = visible.findIndex((doc) => doc.id === current);
      const nextIndex = ((currentIndex < 0 ? 0 : currentIndex) + direction + visible.length) % visible.length;
      return visible[nextIndex].id;
    });
  };

  useEffect(() => {
    if (visible.length && !visible.some((doc) => doc.id === focusId)) setFocusId(visible[0].id);
  }, [focusId, visible]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
      if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
      if (event.key === " " && activeDoc && event.target === document.body) { event.preventDefault(); toggle(activeDoc.id); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeDoc, onClose, visible]);

  return (
    <div className="file-picker-backdrop" onMouseDown={onClose}>
      <section className="spatial-picker" onMouseDown={(event) => event.stopPropagation()} aria-label="空间文件选择器">
        <header className="spatial-picker-header">
          <div><span>SPATIAL FILES</span><h2>选取关联文件</h2><p>关联到「{taskTitle}」· 左右滑动抽取文件</p></div>
          <label className="file-search"><span>⌕</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索文件…" /></label>
          <button aria-label="关闭文件选择器" onClick={onClose}>×</button>
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
        <footer className="spatial-picker-footer"><div><span>已选择 <strong>{picked.length}</strong> 个文件</span>{picked.length > 0 && <button onClick={() => setPicked([])}>清空选择</button>}</div><button onClick={onClose}>取消</button><button className="primary" onClick={() => onSave(picked)}>确认关联 · {picked.length}</button></footer>
      </section>
    </div>
  );
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

function ProjectOverview({ workspace, search, onChange, onCreate, announce }: { workspace: WorkspaceState; search: string; onChange: (patch: Partial<WorkspaceState>) => void; onCreate: () => void; announce: (message: string) => void }) {
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
          </article>;
        })}
      </div>
    </div>
  );
}

function FileArchive({ workspace, search, selectedDocId, onSelect, onChange, onCreate, announce }: { workspace: WorkspaceState; search: string; selectedDocId: string; onSelect: (id: string) => void; onChange: (patch: Partial<WorkspaceState>) => void; onCreate: () => void; announce: (message: string) => void }) {
  const docs = workspace.docs.filter((doc) => `${doc.name}${doc.content}`.toLowerCase().includes(search.toLowerCase()));
  const selected = workspace.docs.find((doc) => doc.id === selectedDocId) ?? docs[0];
  const updateDoc = (id: string, patch: Partial<Doc>) => onChange({ docs: workspace.docs.map((doc) => doc.id === id ? { ...doc, ...patch, updatedAt: new Date().toISOString() } : doc) });
  return (
    <div className="split-module">
      <section className="panel data-panel">
        <div className="section-title compact"><div><h2>项目文档</h2><p>{docs.length} 份文档 · 支持版本回滚</p></div><button className="primary" onClick={onCreate}>＋ 新建文档</button></div>
        <div className="doc-table"><header><span>名称</span><span>类型</span><span>版本</span><span>关联任务</span><span>更新时间</span><span></span></header>{docs.map((doc) => <button className={selected?.id === doc.id ? "selected" : ""} key={doc.id} onClick={() => onSelect(doc.id)}><span><i>▤</i><strong>{doc.name}</strong></span><span>{doc.type.toUpperCase()}</span><span>v{doc.version}</span><span>{doc.taskIds.length}</span><span>{formatDate(doc.updatedAt)}</span><span onClick={(event) => { event.stopPropagation(); updateDoc(doc.id, { favorite: !doc.favorite }); }}>{doc.favorite ? "★" : "☆"}</span></button>)}</div>
      </section>
      {selected && <aside className="panel preview-panel"><header><span>{selected.type.toUpperCase()} · v{selected.version}</span><button onClick={() => updateDoc(selected.id, { favorite: !selected.favorite })}>{selected.favorite ? "★ 已收藏" : "☆ 收藏"}</button></header><h2>{selected.name}</h2><p>{selected.content}</p><section><h3>关联任务</h3>{workspace.tasks.filter((task) => selected.taskIds.includes(task.id)).map((task) => <article key={task.id}><StatusBadge status={task.status} /><span>{task.title}</span></article>)}{!selected.taskIds.length && <p className="inline-empty">暂无关联任务</p>}</section><footer><button disabled={selected.version <= 1} onClick={() => { updateDoc(selected.id, { version: Math.max(1, selected.version - 1) }); announce("已回滚到上一版本"); }}>↶ 回滚版本</button><button onClick={() => { updateDoc(selected.id, { version: selected.version + 1 }); announce("已创建新版本"); }}>＋ 新建版本</button></footer></aside>}
    </div>
  );
}

function CalendarView({ workspace, search, onChange, onCreate }: { workspace: WorkspaceState; search: string; onChange: (patch: Partial<WorkspaceState>) => void; onCreate: () => void }) {
  const days = Array.from({ length: 35 }, (_, index) => {
    const date = new Date(2026, 6, 27 + index);
    return { date: date.toISOString().slice(0, 10), day: date.getDate(), current: date.getMonth() === 7 };
  });
  const events = workspace.events.filter((event) => event.title.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="calendar-layout">
      <section className="calendar panel">
        <header><div><button>‹</button><h2>2026 年 8 月</h2><button>›</button></div><button className="primary" onClick={onCreate}>＋ 新建日程</button></header>
        <div className="weekdays">{["一","二","三","四","五","六","日"].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="month-grid">{days.map((day) => {
          const dayEvents = events.filter((event) => event.date === day.date);
          const taskDeadlines = workspace.tasks.filter((task) => task.dueAt.startsWith(day.date));
          return <article className={`${day.current ? "" : "muted"} ${day.date === "2026-08-01" ? "today" : ""}`} key={day.date}><strong>{day.day}</strong>{dayEvents.slice(0, 2).map((event) => <span className={event.type} key={event.id}>{event.time} {event.title}</span>)}{taskDeadlines.slice(0, 1).map((task) => <span className="deadline" key={task.id}>截止 · {task.title}</span>)}</article>;
        })}</div>
      </section>
      <aside className="agenda panel"><header><h2>近期日程</h2><span>{events.length}</span></header>{events.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).map((event) => <article key={event.id}><div><span>{formatDate(event.date)}</span><strong>{event.time}</strong></div><section><i className={event.type}></i><strong>{event.title}</strong><small>{event.taskId ? `关联 ${event.taskId}` : "工作区日程"}</small></section><button onClick={() => onChange({ events: workspace.events.filter((item) => item.id !== event.id) })}>×</button></article>)}</aside>
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
        return <article className="member-card panel" key={member.id}><header><Avatar label={member.avatar} /><div><h3>{member.name}</h3><p>{member.role}</p></div><span className={member.online ? "online" : ""}>{member.online ? "在线" : "离线"}</span></header><div className="load"><span>当前负载</span><strong>{tasks.length} / 5</strong><div><i style={{ width: `${load}%` }}></i></div></div><section>{tasks.slice(0, 3).map((task) => <article key={task.id}><StatusBadge status={task.status} /><span>{task.title}</span><select value={task.assigneeId} onChange={(event) => onUpdateTask(task.id, { assigneeId: event.target.value })}>{workspace.members.map((candidate) => <option value={candidate.id} key={candidate.id}>转交给 {candidate.name}</option>)}</select></article>)}{!tasks.length && <p className="inline-empty">暂无进行中任务</p>}</section></article>;
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
  return (
    <div className="analytics">
      <div className="metric-grid"><Metric label="任务完成率" value={`${Math.round(done / Math.max(total, 1) * 100)}%`} detail={`${done}/${total} 已完成`} tone="green" /><Metric label="逾期率" value={`${Math.round(overdue / Math.max(total, 1) * 100)}%`} detail={`${overdue} 个任务`} tone="red" /><Metric label="平均项目进度" value={`${Math.round(projectRows.reduce((sum, row) => sum + row.tasks.filter((task) => task.status === "done").length / Math.max(row.tasks.length, 1) * 100, 0) / Math.max(projectRows.length, 1))}%`} detail="实时计算" tone="blue" /><Metric label="阶段瓶颈" value={statusInfo[bottleneck.status].label} detail={`${bottleneck.count} 个任务`} tone="neutral" /></div>
      <div className="analytics-grid">
        <section className="panel chart-card"><header><div><h2>近 7 日任务趋势</h2><p>新增与完成任务</p></div><span>实时数据</span></header><div className="trend-chart">{[["周三",3,1],["周四",5,2],["周五",4,4],["周六",8,3],["周日",7,5],["周一",11,6],["今天",10,8]].map(([day, created, completed]) => <div key={String(day)}><section><i style={{ height: `${Number(created) * 7}%` }}></i><b style={{ height: `${Number(completed) * 7}%` }}></b></section><span>{day}</span></div>)}</div></section>
        <section className="panel risk-list"><header><h2>智能风险预警</h2><span>{overdue + workspace.projects.filter((project) => project.health === "risk").length}</span></header>{workspace.tasks.filter(isOverdue).map((task) => <article key={task.id}><i>!</i><div><strong>{task.title}</strong><p>已逾期，建议重新排期或转交</p></div><PriorityBadge priority={task.priority} /></article>)}{workspace.projects.filter((project) => project.health === "risk").map((project) => <article key={project.id}><i>!</i><div><strong>{project.name}</strong><p>项目健康度为风险，需要干预</p></div><span className="badge danger">项目</span></article>)}</section>
        <section className="panel stage-chart"><header><h2>阶段任务分布</h2><p>识别流程瓶颈</p></header>{statusOrder.map((status) => { const count = workspace.tasks.filter((task) => task.status === status).length; return <div key={status}><span>{statusInfo[status].label}</span><div><i style={{ width: `${count / Math.max(total, 1) * 100}%`, background: statusInfo[status].color }}></i></div><strong>{count}</strong></div>; })}</section>
      </div>
    </div>
  );
}

function KnowledgeBase({ workspace, search, selectedDocId, selectedTaskId, onSelect, onChange, onCreate, announce }: { workspace: WorkspaceState; search: string; selectedDocId: string; selectedTaskId: string; onSelect: (id: string) => void; onChange: (patch: Partial<WorkspaceState>) => void; onCreate: () => void; announce: (message: string) => void }) {
  const docs = workspace.docs.filter((doc) => `${doc.name}${doc.content}`.toLowerCase().includes(search.toLowerCase()));
  const selected = workspace.docs.find((doc) => doc.id === selectedDocId) ?? docs[0];
  const linkToTask = () => {
    if (!selected || !selectedTaskId || selected.taskIds.includes(selectedTaskId)) return;
    onChange({ docs: workspace.docs.map((doc) => doc.id === selected.id ? { ...doc, taskIds: [...doc.taskIds, selectedTaskId] } : doc), tasks: workspace.tasks.map((task) => task.id === selectedTaskId ? { ...task, docIds: [...task.docIds, selected.id] } : task) });
    announce("文档已关联到当前任务");
  };
  return (
    <div className="knowledge-layout">
      <section className="knowledge-sidebar panel"><div className="section-title compact"><div><h2>知识文档</h2><p>{docs.length} 篇</p></div><button onClick={onCreate}>＋</button></div>{docs.map((doc) => <button className={selected?.id === doc.id ? "active" : ""} key={doc.id} onClick={() => onSelect(doc.id)}><i>▤</i><div><strong>{doc.name}</strong><small>{doc.type.toUpperCase()} · v{doc.version}</small></div>{doc.favorite && <span>★</span>}</button>)}</section>
      {selected && <article className="knowledge-article panel"><header><div><span>{selected.type.toUpperCase()}</span><small>更新于 {formatDateTime(selected.updatedAt)}</small></div><button onClick={linkToTask} disabled={!selectedTaskId || selected.taskIds.includes(selectedTaskId)}>＋ 关联当前任务</button></header><h1>{selected.name}</h1><p>{selected.content}</p><div className="article-block"><h3>AI 关联推荐</h3><p>根据文档内容，推荐关联到包含「{selected.name.includes("设计") ? "设计" : "项目"}」标签的任务。当前已关联 {selected.taskIds.length} 个任务。</p></div><section><h3>已关联任务</h3>{workspace.tasks.filter((task) => selected.taskIds.includes(task.id)).map((task) => <article key={task.id}><StatusBadge status={task.status} /><strong>{task.title}</strong><span>{task.id}</span></article>)}</section></article>}
    </div>
  );
}

function SettingsView({ workspace, onChange, announce }: { workspace: WorkspaceState; onChange: (patch: Partial<WorkspaceState>) => void; announce: (message: string) => void }) {
  const settings = workspace.settings;
  const update = (patch: Partial<WorkspaceState["settings"]>) => onChange({ settings: { ...settings, ...patch } });
  const exportData = () => {
    const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "kaiarmy-workspace.json"; anchor.click();
    URL.revokeObjectURL(url);
    announce("工作区数据已导出");
  };
  return (
    <div className="settings-layout">
      <section className="panel settings-section"><header><div><h2>个人资料</h2><p>用于任务负责人和评论署名</p></div><Avatar label="BR" /></header><label>显示名称<input value={settings.displayName} onChange={(event) => update({ displayName: event.target.value })} /></label><label>工作区名称<input value={settings.workspaceName} onChange={(event) => update({ workspaceName: event.target.value })} /></label></section>
      <section className="panel settings-section"><header><div><h2>通知偏好</h2><p>选择需要接收的任务提醒</p></div></header><Toggle label="站内通知" detail="任务指派、评论与截止时间" checked={settings.inAppNotifications} onChange={(checked) => update({ inAppNotifications: checked })} /><Toggle label="邮件通知" detail="每日摘要和高风险提醒" checked={settings.emailNotifications} onChange={(checked) => update({ emailNotifications: checked })} /></section>
      <section className="panel settings-section"><header><div><h2>界面偏好</h2><p>调整信息密度</p></div></header><Toggle label="紧凑模式" detail="减少卡片间距，展示更多内容" checked={settings.compactMode} onChange={(checked) => update({ compactMode: checked })} /></section>
      <section className="panel settings-section danger-zone"><header><div><h2>数据管理</h2><p>导出或重置当前工作区</p></div></header><div><button onClick={exportData}>↓ 导出 JSON</button><button className="danger-button" onClick={() => { if (!window.confirm("确定恢复演示数据？当前修改将被覆盖。")) return; onChange(defaultWorkspace); announce("已恢复演示数据"); }}>恢复演示数据</button></div></section>
    </div>
  );
}

function TaskFormModal({ workspace, task, onClose, onSave }: { workspace: WorkspaceState; task?: Task; onClose: () => void; onSave: (task: Task) => void }) {
  const [draft, setDraft] = useState<Task>(task ?? {
    id: `KAI-${String(workspace.tasks.length + 1).padStart(3, "0")}`,
    title: "", description: "", projectId: workspace.projects.find((project) => !project.archived)?.id ?? "",
    assigneeId: workspace.members[0]?.id ?? "", participantIds: [], status: "todo", priority: "medium",
    dueAt: new Date(Date.now() + 86400000).toISOString(), tags: [], docIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
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

function EventFormModal({ workspace, onClose, onSave }: { workspace: WorkspaceState; onClose: () => void; onSave: (event: CalendarEvent) => void }) {
  const [title, setTitle] = useState(""); const [type, setType] = useState<CalendarEvent["type"]>("meeting"); const [date, setDate] = useState("2026-08-01"); const [time, setTime] = useState("10:00"); const [taskId, setTaskId] = useState("");
  return <Modal title="新建日程" subtitle="日程可与任务截止时间双向关联" onClose={onClose} onSubmit={() => onSave({ id: uid("e"), title, type, date, time, taskId: taskId || undefined })} disabled={!title.trim()}><label className="full">日程标题 *<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>类型<select value={type} onChange={(event) => setType(event.target.value as CalendarEvent["type"])}><option value="meeting">会议</option><option value="review">评审</option><option value="deadline">截止</option></select></label><label>关联任务<select value={taskId} onChange={(event) => setTaskId(event.target.value)}><option value="">暂不关联</option>{workspace.tasks.map((task) => <option value={task.id} key={task.id}>{task.title}</option>)}</select></label><label>日期<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>时间<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label></Modal>;
}

function Modal({ title, subtitle, onClose, onSubmit, disabled, children }: { title: string; subtitle: string; onClose: () => void; onSubmit: () => void; disabled?: boolean; children: React.ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal panel" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); onSubmit(); }}><header><div><h2>{title}</h2><p>{subtitle}</p></div><button type="button" onClick={onClose}>×</button></header><div className="modal-grid">{children}</div><footer><button type="button" onClick={onClose}>取消</button><button className="primary" disabled={disabled}>保存</button></footer></form></div>;
}

function Metric({ label, value, detail, tone }: { label: string; value: string | number; detail: string; tone: "green" | "blue" | "red" | "neutral" }) {
  return <article className={`metric panel ${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small><i></i></article>;
}
function Avatar({ label }: { label: string }) { return <span className="avatar">{label}</span>; }
function PriorityBadge({ priority }: { priority: Priority }) { return <span className={`badge priority ${priority}`}>{priorityLabel[priority]}</span>; }
function StatusBadge({ status }: { status: TaskStatus }) { return <span className="badge status" style={{ color: statusInfo[status].color, background: `${statusInfo[status].color}18` }}>{statusInfo[status].label}</span>; }
function Toggle({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="toggle-row"><div><strong>{label}</strong><small>{detail}</small></div><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span></span></label>; }
