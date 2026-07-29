"use client";

import { useMemo, useState } from "react";

type Status = "review" | "design" | "develop";
type Priority = "high" | "medium" | "low";
type Task = {
  id: string; title: string; status: Status; priority: Priority; due: string;
  assignee: string; description: string; tags: string[]; done?: boolean;
};

const seedTasks: Task[] = [
  { id: "KAI-2025-001", title: "需求评审会", status: "review", priority: "high", due: "今天 10:00", assignee: "BR", description: "与业务团队对齐需求范围，明确核心目标与验收标准，输出需求评审结论。", tags: ["评审", "需求", "关键路径"] },
  { id: "KAI-2025-002", title: "用户调研分析", status: "review", priority: "medium", due: "今天 14:00", assignee: "YL", description: "汇总用户访谈发现，提炼高频需求与核心阻塞点。", tags: ["用户研究"] },
  { id: "KAI-2025-003", title: "竞品功能梳理", status: "review", priority: "medium", due: "明天 09:30", assignee: "BR", description: "完成核心竞品能力矩阵与差异化机会分析。", tags: ["研究"] },
  { id: "KAI-2025-004", title: "交互流程设计", status: "design", priority: "high", due: "进行中", assignee: "MN", description: "完成工作台核心任务闭环的交互流程设计。", tags: ["设计", "交互"] },
  { id: "KAI-2025-005", title: "原型评审", status: "design", priority: "medium", due: "进行中", assignee: "YL", description: "组织高保真原型评审并收敛修改意见。", tags: ["原型"] },
  { id: "KAI-2025-006", title: "视觉规范 V2", status: "design", priority: "low", due: "5月27日", assignee: "MN", description: "统一组件状态、玻璃层级与动效规范。", tags: ["视觉"] },
  { id: "KAI-2025-007", title: "核心功能开发", status: "develop", priority: "high", due: "6月15日", assignee: "ZW", description: "实现任务看板、文件归档与智能详情核心能力。", tags: ["开发", "关键路径"] },
  { id: "KAI-2025-008", title: "权限中心接口", status: "develop", priority: "medium", due: "5月29日", assignee: "LX", description: "实现角色与资源的权限校验接口。", tags: ["后端"] },
  { id: "KAI-2025-009", title: "通知服务联调", status: "develop", priority: "low", due: "5月30日", assignee: "ZW", description: "验证站内信与邮件通知链路。", tags: ["联调"] },
];

const statusMeta: Record<Status, { label: string; count: number; color: string }> = {
  review: { label: "需求评审", count: 3, color: "green" },
  design: { label: "产品设计", count: 4, color: "blue" },
  develop: { label: "开发实现", count: 5, color: "purple" },
};

const navItems = [
  ["◉", "任务管理"], ["▤", "项目总览"], ["▱", "文件归档"], ["▣", "日程管理"],
  ["♧", "团队协作"], ["◫", "智能分析"], ["▦", "知识库"], ["⚙", "设置中心"],
];

const archiveCards = [
  ["需求评审", "4"], ["产品调研", "4"], ["开发文档", "4"], ["项目归档", "4"],
  ["会议纪要", "3"], ["交互规范", "5"], ["测试报告", "2"], ["上线清单", "4"],
];

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
  const [activeDoc, setActiveDoc] = useState(3);
  const selected = tasks.find((task) => task.id === selectedId) || tasks[0];

  const visibleTasks = useMemo(() => tasks.filter((task) => {
    const matchesStatus = filter === "all" || filter === "overdue" || task.status === filter;
    const matchesQuery = `${task.id}${task.title}${task.tags.join("")}`.toLowerCase().includes(search.toLowerCase());
    return !task.done && matchesStatus && matchesQuery;
  }), [tasks, filter, search]);

  const announce = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const addTask = () => {
    if (!newTitle.trim()) return;
    const id = `KAI-2025-${String(tasks.length + 1).padStart(3, "0")}`;
    setTasks((all) => [...all, {
      id, title: newTitle.trim(), status: newStatus, priority: "medium", due: "明天 18:00",
      assignee: "BR", description: "新建任务，等待补充详细说明。", tags: ["新任务"],
    }]);
    setSelectedId(id);
    setNewTitle("");
    setShowModal(false);
    announce("任务创建成功");
  };

  const completeTask = () => {
    setTasks((all) => all.map((task) => task.id === selected.id ? { ...task, done: true } : task));
    announce("任务已完成");
  };

  if (activeNav !== "任务管理") {
    return (
      <main className="app-frame">
        <Sidebar active={activeNav} onChange={setActiveNav} />
        <section className="module-view glass-panel">
          <span className="micro-label">KAIBUDDY / WORKSPACE</span>
          <h1>{activeNav}</h1>
          <p>该模块已接入统一工作台，数据与任务、项目和团队视图实时联动。</p>
          <div className="module-cards">
            {["实时概览", "智能洞察", "团队动态"].map((label, index) => (
              <article key={label}><span>0{index + 1}</span><strong>{label}</strong><small>{index === 0 ? "12 项更新" : index === 1 ? "3 条建议" : "8 位成员在线"}</small></article>
            ))}
          </div>
          <button className="primary-button" onClick={() => setActiveNav("任务管理")}>返回任务工作台</button>
        </section>
      </main>
    );
  }

  return (
    <main className="app-frame">
      <Sidebar active={activeNav} onChange={setActiveNav} />

      <section className="content-shell">
        <Topbar search={search} setSearch={setSearch} onAdd={() => setShowModal(true)} />

        <div className="content-grid">
          <section className="main-stage">
            <MetricRow tasks={tasks} filter={filter} setFilter={setFilter} />

            <section className="board-section">
              <div className="board-heading">
                <div><h2>任务看板</h2><div className="tabs"><button className="active">全部任务</button><button>我负责的</button><button>我参与的</button></div></div>
                <div className="board-tools"><button onClick={() => setFilter("all")}>▾ 状态</button><button>≡ 筛选</button><button onClick={() => setTasks((all) => [...all].reverse())}>↕ 排序</button><button className="view-button">▤</button></div>
              </div>

              <div className="board-canvas">
                <div className="task-groups">
                  {(Object.keys(statusMeta) as Status[]).map((status) => {
                    const list = visibleTasks.filter((task) => task.status === status).slice(0, status === "develop" ? 1 : 3);
                    return (
                      <section className="task-group" key={status}>
                        <header><span className={`status-dot ${statusMeta[status].color}`}></span><strong>{statusMeta[status].label}</strong><b>{statusMeta[status].count}</b><span>⌄</span></header>
                        <div>
                          {list.map((task) => (
                            <button className={selected.id === task.id ? "selected" : ""} key={task.id} onClick={() => setSelectedId(task.id)}>
                              <span>{task.id}</span><strong>{task.title}</strong><i className={`priority-pill ${task.priority}`}>{task.priority === "high" ? "高" : task.priority === "medium" ? "中" : "低"}</i><small>{task.due}</small>
                            </button>
                          ))}
                          {!list.length && <div className="empty-row">暂无匹配任务</div>}
                        </div>
                      </section>
                    );
                  })}
                </div>

                <div className="archive-stage">
                  <button className="archive-summary glass-panel" onClick={() => setActiveNav("文件归档")}>
                    <span>项目文档</span><small>2025 · Q2</small><strong>87<sup>%</sup></strong><i>完成度</i><b>→</b>
                  </button>
                  <div className="archive-fan" aria-label="项目归档文档">
                    {archiveCards.map(([name, members], index) => (
                      <button
                        className={`archive-card card-${index} ${activeDoc === index ? "active" : ""}`}
                        key={name}
                        onClick={() => { setActiveDoc(index); announce(`已选择「${name}」`); }}
                      >
                        <span className="doc-lines"></span>
                        <small>♟ {members}</small>
                        <strong>{name}</strong>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <Timeline />
          </section>

          <DetailPanel selected={selected} onComplete={completeTask} onKnowledge={() => setActiveNav("知识库")} onEdit={() => announce("编辑模式已开启")} />
        </div>
      </section>

      {showModal && <TaskModal title={newTitle} setTitle={setNewTitle} status={newStatus} setStatus={setNewStatus} onClose={() => setShowModal(false)} onSave={addTask} />}
      {toast && <div className="toast">✓ {toast}</div>}
    </main>
  );
}

function Sidebar({ active, onChange }: { active: string; onChange: (label: string) => void }) {
  return (
    <aside className="sidebar glass-panel">
      <div className="brand"><span>KB</span><strong>KaiBuddy</strong></div>
      <nav>
        {navItems.map(([icon, label]) => <button className={active === label ? "active" : ""} key={label} onClick={() => onChange(label)}><i>{icon}</i><span>{label}</span><b>›</b></button>)}
      </nav>
      <div className="workspace-switcher">
        <header><span>我的工作区</span><button>＋</button></header>
        <button><i>产</i><strong>产品研发中心</strong><span>⌄</span></button>
      </div>
      <div className="profile">
        <span className="avatar">BR</span><div><strong>Brandon</strong><small><i></i> 产品经理</small></div><button>⌁</button>
      </div>
    </aside>
  );
}

function Topbar({ search, setSearch, onAdd }: { search: string; setSearch: (value: string) => void; onAdd: () => void }) {
  return (
    <header className="topbar">
      <div className="title-block"><h1>任务管理</h1><p>高效规划 · 智能协同 · 结果驱动</p></div>
      <label className="global-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索任务、项目或文件…" /><kbd>⌘K</kbd></label>
      <div className="header-actions"><button className="notify" aria-label="通知">♧<i></i></button><button aria-label="消息">□</button><button className="new-task" onClick={onAdd}>＋ <strong>新增任务</strong><span>⌄</span></button></div>
    </header>
  );
}

function MetricRow({ tasks, filter, setFilter }: { tasks: Task[]; filter: "all" | Status | "overdue"; setFilter: (filter: "all" | Status | "overdue") => void }) {
  const items: Array<[string, string, string, string, "all" | Status | "overdue"]> = [
    ["今日待办", "12", "↑ 20%", "▣", "review"],
    ["进行中", String(28 + tasks.length - seedTasks.length), "↑ 8%", "⌁", "develop"],
    ["已完成", String(56 + tasks.filter((task) => task.done).length), "↑ 15%", "✓", "all"],
    ["逾期任务", "3", "↓ 40%", "!", "overdue"],
  ];
  return (
    <div className="metric-row">
      {items.map(([label, value, trend, icon, key]) => (
        <button className={`metric-card glass-panel ${filter === key ? "active" : ""} ${key === "overdue" ? "danger" : ""}`} key={label} onClick={() => setFilter(key)}>
          <span className="metric-title">{label}</span><i>{icon}</i><strong>{value}<small>项任务</small></strong><span className="metric-trend">较昨日 <b>{trend}</b></span>
        </button>
      ))}
    </div>
  );
}

function DetailPanel({ selected, onComplete, onKnowledge, onEdit }: { selected: Task; onComplete: () => void; onKnowledge: () => void; onEdit: () => void }) {
  return (
    <aside className="detail-panel glass-panel">
      <header><div><span>✦</span><strong>智能详情</strong></div><button aria-label="搜索详情">⌕</button></header>
      <section className="detail-body">
        <span className="task-id">{selected.id}</span>
        <div className="detail-title"><h2>{selected.title}</h2><span className={`badge ${selected.priority}`}>{selected.priority === "high" ? "高优先级" : selected.priority === "medium" ? "中优先级" : "低优先级"}</span></div>
        <p>{selected.description}</p>
        <dl>
          <div><dt>负责人</dt><dd><span className="avatar tiny">{selected.assignee}</span> Brandon</dd></div>
          <div><dt>所属项目</dt><dd>▣ KaiBuddy 2.0</dd></div>
          <div><dt>截止时间</dt><dd>▣ 2025-05-24 18:00</dd></div>
          <div><dt>当前状态</dt><dd><i className="green-dot"></i> 进行中</dd></div>
          <div><dt>优先级</dt><dd><i className="red-dot"></i> 高</dd></div>
        </dl>
        <div className="tag-row"><span>标签</span><div>{selected.tags.map((tag) => <b key={tag}>{tag}</b>)}<button>＋</button></div></div>
        <div className="ai-suggestion glass-panel">
          <strong>AI 助手建议</strong>
          <ul><li>建议关联相似历史评审文档 3 份</li><li>检测到潜在风险：需求范围可能变更</li></ul>
          <button onClick={onKnowledge}>查看建议详情</button>
        </div>
      </section>
      <footer><button onClick={onEdit}>✎ 编辑任务</button><button className="complete" onClick={onComplete}>✓ 完成任务</button><button>•••</button></footer>
    </aside>
  );
}

function Timeline() {
  return (
    <section className="timeline glass-panel">
      <header><div><span></span><strong>项目时间线</strong><b>▣</b><small>2025年5月</small></div><div><button>周⌄</button><button>今天</button></div></header>
      <div className="timeline-axis"><span></span>{["18","19","20","21","22","23","24","25","26","27","28","29","30","31","1","2","3","4","5","6","7","8","9","10"].map((day) => <b className={day === "24" ? "today" : ""} key={day}>{day}</b>)}</div>
      <div className="timeline-grid">
        <i className="today-line"></i>
        <div><span>⌄ 需求评审</span><b className="gantt-bar review-bar">需求评审会　5.18 - 5.24</b></div>
        <div><span>⌄ 产品设计</span><b className="gantt-bar design-bar">交互流程设计　5.22 - 6.05</b></div>
        <div><span>⌄ 开发实现</span><b className="gantt-bar develop-bar">核心功能开发　5.25 - 6.15</b></div>
        <div><span>⌄ 测试验证</span><b className="gantt-bar test-bar">测试验证　6.10 - 6.20</b></div>
      </div>
    </section>
  );
}

function TaskModal({ title, setTitle, status, setStatus, onClose, onSave }: { title: string; setTitle: (value: string) => void; status: Status; setStatus: (status: Status) => void; onClose: () => void; onSave: () => void }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal glass-panel" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><span>CREATE TASK</span><h2>新增任务</h2></div><button onClick={onClose}>×</button></header>
        <label>任务标题 *<input autoFocus maxLength={50} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="输入清晰、可执行的任务标题" /></label>
        <label>工作阶段<select value={status} onChange={(event) => setStatus(event.target.value as Status)}><option value="review">需求评审</option><option value="design">产品设计</option><option value="develop">开发实现</option></select></label>
        <div className="form-row"><label>负责人<input value="Brandon" readOnly /></label><label>优先级<select defaultValue="medium"><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label></div>
        <label>任务描述<textarea placeholder="补充目标、范围和验收标准…" /></label>
        <footer><button onClick={onClose}>取消</button><button className="primary-button" disabled={!title.trim()} onClick={onSave}>创建任务</button></footer>
      </div>
    </div>
  );
}
