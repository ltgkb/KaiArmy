"use client";

import { useMemo, useState } from "react";

type Status = "review" | "design" | "develop";
type Priority = "high" | "medium" | "low";
type Task = {
  id: string;
  title: string;
  status: Status;
  priority: Priority;
  due: string;
  assignee: string;
  description: string;
  tags: string[];
  done?: boolean;
};

const seedTasks: Task[] = [
  { id: "WXB-2025-001", title: "需求评审会", status: "review", priority: "high", due: "今天 10:00", assignee: "BR", description: "与业务团队对齐需求范围，明确核心目标与验收标准，输出需求评审结论。", tags: ["关键路径", "需求", "评审"] },
  { id: "WXB-2025-002", title: "用户访谈纪要整理", status: "review", priority: "medium", due: "今天 16:30", assignee: "YL", description: "汇总访谈发现，提炼高频需求与关键阻塞点。", tags: ["用户研究"] },
  { id: "WXB-2025-003", title: "竞品分析报告", status: "review", priority: "low", due: "明天 12:00", assignee: "BR", description: "完成核心竞品能力矩阵与差异化机会分析。", tags: ["研究"] },
  { id: "WXB-2025-004", title: "工作台信息架构", status: "design", priority: "high", due: "今天 18:00", assignee: "MN", description: "梳理工作台导航与信息层级。", tags: ["设计"] },
  { id: "WXB-2025-005", title: "移动端交互流程", status: "design", priority: "medium", due: "5月26日", assignee: "YL", description: "输出移动端核心任务闭环交互。", tags: ["交互"] },
  { id: "WXB-2025-006", title: "视觉规范 V2", status: "design", priority: "low", due: "5月27日", assignee: "MN", description: "统一组件状态与动效规范。", tags: ["视觉"] },
  { id: "WXB-2025-007", title: "权限中心接口", status: "develop", priority: "high", due: "今天 20:00", assignee: "ZW", description: "实现角色与资源的权限校验接口。", tags: ["后端"] },
  { id: "WXB-2025-008", title: "任务看板拖拽", status: "develop", priority: "medium", due: "5月29日", assignee: "LX", description: "完成看板列间拖拽及状态同步。", tags: ["前端"] },
  { id: "WXB-2025-009", title: "通知服务联调", status: "develop", priority: "low", due: "5月30日", assignee: "ZW", description: "验证站内信与邮件通知链路。", tags: ["联调"] },
];

const navItems = [
  ["▦", "任务管理"], ["◈", "项目总览"], ["▱", "文件归档"], ["◷", "日程管理"],
  ["♧", "团队协作"], ["⌁", "智能分析"], ["◇", "知识库"], ["⚙", "设置中心"],
];

const docs = [
  ["需求评审报告", "REVIEW", "v2.4"], ["交互流程图", "DESIGN", "v1.8"],
  ["产品原型", "PROTO", "v3.2"], ["WenXiBuddy PRD", "PRD", "v5.0"],
];

const statusMeta: Record<Status, { label: string; number: string }> = {
  review: { label: "需求评审", number: "01" },
  design: { label: "产品设计", number: "02" },
  develop: { label: "开发实现", number: "03" },
};

function TaskCard({ task, onClick, onMove }: { task: Task; onClick: () => void; onMove: (s: Status) => void }) {
  return (
    <article className={`task-card ${task.done ? "is-done" : ""}`} onClick={onClick} data-testid={`task-${task.id}`}>
      <div className="task-top"><span>{task.id}</span><button aria-label="任务操作" onClick={(e) => e.stopPropagation()}>•••</button></div>
      <h3>{task.title}</h3>
      <div className="task-meta"><span className={`priority ${task.priority}`}></span><span>{task.due}</span><span className="avatar small">{task.assignee}</span></div>
      <div className="quick-move" onClick={(e) => e.stopPropagation()}>
        {(Object.keys(statusMeta) as Status[]).filter((s) => s !== task.status).map((s) => (
          <button key={s} onClick={() => onMove(s)} aria-label={`移至${statusMeta[s].label}`}>→ {statusMeta[s].number}</button>
        ))}
      </div>
    </article>
  );
}

export default function Home() {
  const [activeNav, setActiveNav] = useState("任务管理");
  const [tasks, setTasks] = useState(seedTasks);
  const [selectedId, setSelectedId] = useState(seedTasks[0].id);
  const [filter, setFilter] = useState<"all" | Status | "overdue">("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newStatus, setNewStatus] = useState<Status>("review");
  const selected = tasks.find((t) => t.id === selectedId) || tasks[0];

  const visibleTasks = useMemo(() => tasks.filter((t) => {
    const statusOk = filter === "all" || filter === "overdue" || t.status === filter;
    const queryOk = `${t.id}${t.title}${t.tags.join("")}`.toLowerCase().includes(search.toLowerCase());
    return statusOk && queryOk && !t.done;
  }), [tasks, filter, search]);

  const announce = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const moveTask = (id: string, status: Status) => {
    setTasks((all) => all.map((t) => t.id === id ? { ...t, status } : t));
    announce(`任务已移至「${statusMeta[status].label}」`);
  };

  const addTask = () => {
    if (!newTitle.trim()) return;
    const next = `WXB-2025-${String(tasks.length + 1).padStart(3, "0")}`;
    const task: Task = { id: next, title: newTitle.trim(), status: newStatus, priority: "medium", due: "明天 18:00", assignee: "BR", description: "新建任务，等待补充详细说明。", tags: ["新任务"] };
    setTasks((all) => [...all, task]);
    setSelectedId(next);
    setNewTitle("");
    setShowModal(false);
    announce("任务创建成功");
  };

  if (activeNav !== "任务管理") {
    return (
      <main className="app-shell">
        <Sidebar active={activeNav} onChange={setActiveNav} />
        <section className="module-page">
          <Header title={activeNav} search={search} setSearch={setSearch} onAdd={() => setShowModal(true)} />
          <div className="module-hero glass">
            <span className="eyebrow">WENXIBUDDY / {activeNav}</span>
            <h1>{activeNav}</h1>
            <p>该模块已接入统一工作台，数据将与任务、项目和团队视图实时联动。</p>
            <div className="module-grid">
              {["实时概览", "智能洞察", "团队动态"].map((x, i) => <div className="module-card" key={x}><small>0{i + 1}</small><strong>{x}</strong><span>{i === 0 ? "12 项更新" : i === 1 ? "3 条建议" : "8 位成员在线"}</span></div>)}
            </div>
            <button className="primary" onClick={() => setActiveNav("任务管理")}>返回任务工作台</button>
          </div>
        </section>
        {showModal && <TaskModal title={newTitle} setTitle={setNewTitle} status={newStatus} setStatus={setNewStatus} onClose={() => setShowModal(false)} onSave={addTask} />}
      </main>
    );
  }

  return (
    <main className="app-shell">
      <Sidebar active={activeNav} onChange={setActiveNav} />
      <section className="workspace">
        <Header title="任务管理" search={search} setSearch={setSearch} onAdd={() => setShowModal(true)} />
        <div className="dashboard">
          <aside className="metrics">
            <div className="section-kicker">今日概览 <span>5月24日 周六</span></div>
            {[
              ["今日待办", "12", "↑ 20%", "◷", "review"],
              ["进行中", String(tasks.filter(t => !t.done).length), "↑ 8%", "↗", "develop"],
              ["已完成", String(56 + tasks.filter(t => t.done).length), "↑ 15%", "✓", "all"],
              ["逾期任务", "3", "↓ 40%", "!", "overdue"],
            ].map(([label, value, trend, icon, key]) => (
              <button className={`metric-card glass ${filter === key ? "active" : ""}`} key={label} onClick={() => setFilter(key as typeof filter)}>
                <span className="metric-icon">{icon}</span><span className="metric-label">{label}</span>
                <strong>{value}</strong><small>{trend} <em>较昨日</em></small>
              </button>
            ))}
            <button className="focus-card glass" onClick={() => announce("已开启专注模式")}>
              <span>FOCUS</span><strong>开启专注模式</strong><small>屏蔽干扰，完成关键任务 →</small>
            </button>
          </aside>

          <section className="center-stage">
            <div className="project-head">
              <div><span className="eyebrow">ACTIVE PROJECT</span><h2>WenXiBuddy 2.0</h2><p>智能任务管理平台 · 产品研发中心</p></div>
              <div className="progress-ring"><b>87%</b><span>整体进度</span></div>
            </div>
            <div className="doc-stage glass">
              <div className="doc-copy"><span className="eyebrow">PROJECT ARCHIVE</span><strong>项目文档</strong><p>2025 · Q2</p><div><b>87%</b><small>归档完成度</small></div></div>
              <div className="doc-stack">
                {docs.map(([name, type, version], i) => (
                  <button className={`doc-card d${i}`} key={name} onClick={() => announce(`已打开「${name}」`)}>
                    <span>{type}</span><i>▤</i><strong>{name}</strong><small>{version} · 刚刚更新</small>
                  </button>
                ))}
              </div>
              <div className="stage-pager"><b>01</b> — 04</div>
            </div>
            <div className="board-tabs">
              <div><button className="selected">全部任务</button><button>我负责的</button><button>我参与的</button></div>
              <div><button onClick={() => setFilter("all")}>筛选</button><button onClick={() => setTasks((all) => [...all].reverse())}>↕ 排序</button></div>
            </div>
            <div className="kanban">
              {(Object.keys(statusMeta) as Status[]).map((status) => {
                const list = visibleTasks.filter((t) => t.status === status);
                return <section className="kanban-column" key={status}>
                  <header><span>{statusMeta[status].number}</span><strong>{statusMeta[status].label}</strong><b>{list.length}</b><button onClick={() => { setNewStatus(status); setShowModal(true); }}>＋</button></header>
                  <div className="task-list">
                    {list.map((task) => <TaskCard key={task.id} task={task} onClick={() => setSelectedId(task.id)} onMove={(s) => moveTask(task.id, s)} />)}
                    {!list.length && <div className="empty">暂无匹配任务</div>}
                  </div>
                </section>;
              })}
            </div>
          </section>

          <aside className="detail-column">
            <div className="smart-detail glass">
              <header><div><span className="spark">✦</span><b>智能详情</b></div><button aria-label="关闭详情">×</button></header>
              <div className="detail-id"><span>{selected.id}</span><span className={`badge ${selected.priority}`}>{selected.priority === "high" ? "高优先级" : selected.priority === "medium" ? "中优先级" : "低优先级"}</span></div>
              <h2>{selected.title}</h2>
              <p className="description">{selected.description}</p>
              <dl>
                <div><dt>负责人</dt><dd><span className="avatar small">{selected.assignee}</span> Brandon</dd></div>
                <div><dt>所属项目</dt><dd>WenXiBuddy 2.0</dd></div>
                <div><dt>截止时间</dt><dd>{selected.due}</dd></div>
                <div><dt>当前状态</dt><dd><i className="green-dot"></i>{statusMeta[selected.status].label}</dd></div>
              </dl>
              <div className="tags">{selected.tags.map((tag) => <span key={tag}>+ {tag}</span>)}</div>
              <div className="ai-card">
                <span className="eyebrow">✦ AI 助手建议</span>
                <strong>发现 3 份相似评审文档</strong>
                <p>检测到潜在风险：需求范围可能变更，建议在评审前确认边界。</p>
                <button onClick={() => setActiveNav("知识库")}>查看建议详情 →</button>
              </div>
              <div className="detail-actions">
                <button className="primary" onClick={() => { setTasks((all) => all.map((t) => t.id === selected.id ? { ...t, done: true } : t)); announce("任务已完成"); }}>✓ 完成任务</button>
                <button onClick={() => announce("编辑模式已开启")}>编辑任务</button>
              </div>
            </div>
            <Timeline />
          </aside>
        </div>
      </section>
      {showModal && <TaskModal title={newTitle} setTitle={setNewTitle} status={newStatus} setStatus={setNewStatus} onClose={() => setShowModal(false)} onSave={addTask} />}
      {toast && <div className="toast">✓ {toast}</div>}
    </main>
  );
}

function Sidebar({ active, onChange }: { active: string; onChange: (x: string) => void }) {
  return <aside className="sidebar">
    <div className="brand"><span>WB</span><div><strong>WenXiBuddy</strong><small>智能协同工作台</small></div></div>
    <nav><small>工作台</small>{navItems.slice(0, 6).map(([icon, label]) => <button className={active === label ? "active" : ""} key={label} onClick={() => onChange(label)}><i>{icon}</i>{label}{label === "任务管理" && <b>12</b>}</button>)}
    <small>资源</small>{navItems.slice(6).map(([icon, label]) => <button className={active === label ? "active" : ""} key={label} onClick={() => onChange(label)}><i>{icon}</i>{label}</button>)}</nav>
    <div className="workspace-switch"><small>我的工作区</small><button><span className="workspace-logo">产</span><span><strong>产品研发中心</strong><small>8 位成员</small></span><b>⌄</b></button></div>
    <div className="profile"><span className="avatar">BR</span><span><strong>Brandon</strong><small>产品经理</small></span><i></i><button>•••</button></div>
  </aside>;
}

function Header({ title, search, setSearch, onAdd }: { title: string; search: string; setSearch: (x: string) => void; onAdd: () => void }) {
  return <header className="topbar"><div><h1>{title}</h1><p>高效规划 · 智能协同 · 结果驱动</p></div><div className="top-actions"><label className="search"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索任务、项目或文件…" /><kbd>⌘ K</kbd></label><button className="bell" aria-label="通知">♢<i></i></button><button className="primary add" onClick={onAdd}>＋ 新增任务</button></div></header>;
}

function Timeline() {
  return <div className="timeline glass">
    <header><div><span className="eyebrow">PROJECT TIMELINE</span><h3>项目时间线</h3></div><div><button>日</button><button className="active">周</button><button>月</button></div></header>
    <div className="date-axis"><span>18</span><span>21</span><span className="today">24</span><span>27</span><span>30</span></div>
    <div className="gantt"><i className="today-line"></i>
      <div><span>需求评审</span><b className="bar b1">需求评审</b></div>
      <div><span>产品设计</span><b className="bar b2">交互流程设计</b></div>
      <div><span>开发实现</span><b className="bar b3">核心功能开发</b></div>
      <div><span>测试验证</span><b className="bar b4">测试验证</b></div>
    </div>
  </div>;
}

function TaskModal({ title, setTitle, status, setStatus, onClose, onSave }: { title: string; setTitle: (x: string) => void; status: Status; setStatus: (x: Status) => void; onClose: () => void; onSave: () => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal glass" onMouseDown={(e) => e.stopPropagation()}>
    <header><div><span className="eyebrow">CREATE TASK</span><h2>新增任务</h2></div><button onClick={onClose}>×</button></header>
    <label>任务标题 *<input autoFocus maxLength={50} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="输入清晰、可执行的任务标题" /></label>
    <label>工作阶段<select value={status} onChange={(e) => setStatus(e.target.value as Status)}><option value="review">需求评审</option><option value="design">产品设计</option><option value="develop">开发实现</option></select></label>
    <div className="modal-row"><label>负责人<input value="Brandon" readOnly /></label><label>优先级<select defaultValue="medium"><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label></div>
    <label>任务描述<textarea placeholder="补充目标、范围和验收标准…" /></label>
    <footer><button onClick={onClose}>取消</button><button className="primary" disabled={!title.trim()} onClick={onSave}>创建任务</button></footer>
  </div></div>;
}
