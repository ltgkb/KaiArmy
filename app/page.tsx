"use client";

import { FormEvent, useMemo, useState } from "react";

type View = "dashboard" | "contracts" | "lifecycle" | "risk" | "assistant";
type Status = "草拟" | "审核" | "谈判" | "批准" | "签署" | "监控" | "续约";

type Contract = {
  id: string;
  name: string;
  counterparty: string;
  owner: string;
  amount: number;
  status: Status;
  risk: "低" | "中" | "高";
  due: string;
  progress: number;
};

const seedContracts: Contract[] = [
  { id: "KA-2026-084", name: "华东云服务框架协议", counterparty: "星瀚云计算", owner: "林晓", amount: 1280000, status: "审核", risk: "中", due: "2026-08-12", progress: 32 },
  { id: "KA-2026-077", name: "亚太渠道合作协议", counterparty: "Nexa Pacific", owner: "陈律", amount: 860000, status: "谈判", risk: "高", due: "2026-08-05", progress: 48 },
  { id: "KA-2026-065", name: "数据处理补充协议", counterparty: "极光数据", owner: "王钰", amount: 320000, status: "批准", risk: "低", due: "2026-08-19", progress: 66 },
  { id: "KA-2026-052", name: "年度软件采购合同", counterparty: "恒启科技", owner: "林晓", amount: 560000, status: "签署", risk: "低", due: "2026-09-01", progress: 82 },
  { id: "KA-2026-041", name: "跨境技术许可协议", counterparty: "Atlas Systems", owner: "赵言", amount: 2150000, status: "监控", risk: "中", due: "2026-10-18", progress: 91 },
  { id: "KA-2026-033", name: "办公场地续租协议", counterparty: "创智资产", owner: "陈律", amount: 980000, status: "续约", risk: "中", due: "2026-08-28", progress: 95 },
  { id: "KA-2026-091", name: "品牌联合推广协议", counterparty: "青鸟传媒", owner: "王钰", amount: 240000, status: "草拟", risk: "低", due: "2026-09-15", progress: 12 },
];

const navItems: { id: View; label: string; symbol: string }[] = [
  { id: "dashboard", label: "总览", symbol: "⌂" },
  { id: "contracts", label: "合同库", symbol: "▤" },
  { id: "lifecycle", label: "生命周期", symbol: "↝" },
  { id: "risk", label: "风险中心", symbol: "◈" },
  { id: "assistant", label: "Kai 智审", symbol: "✦" },
];

const lifecycle: Status[] = ["草拟", "审核", "谈判", "批准", "签署", "监控", "续约"];

const money = (value: number) =>
  new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(value);

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

function RiskPill({ level }: { level: Contract["risk"] }) {
  const tone = level === "高" ? "danger" : level === "中" ? "warning" : "success";
  return <Pill tone={tone}><span className="status-dot" />{level}风险</Pill>;
}

function Sparkline({ values, color = "green" }: { values: number[]; color?: "green" | "blue" | "orange" }) {
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${34 - v}`).join(" ");
  return (
    <svg className={`sparkline ${color}`} viewBox="0 0 100 36" role="img" aria-label="趋势图">
      <polyline points={points} />
    </svg>
  );
}

function StatCard({
  eyebrow, value, note, values, color = "green", symbol,
}: {
  eyebrow: string; value: string; note: string; values: number[]; color?: "green" | "blue" | "orange"; symbol: string;
}) {
  return (
    <article className="glass-card stat-card">
      <div className="stat-top"><span>{eyebrow}</span><span className="soft-icon">{symbol}</span></div>
      <div className="stat-value">{value}</div>
      <div className="stat-bottom"><span className="positive">{note}</span><Sparkline values={values} color={color} /></div>
    </article>
  );
}

function Header({
  title, subtitle, theme, onToggleTheme, onNew,
}: {
  title: string; subtitle: string; theme: string; onToggleTheme: () => void; onNew: () => void;
}) {
  return (
    <header className="topbar">
      <div>
        <p className="breadcrumb">KaiArmy / 工作台</p>
        <h1>{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      <div className="top-actions">
        <button className="icon-button" onClick={onToggleTheme} aria-label="切换明暗主题">
          {theme === "dark" ? "☼" : "◐"}
        </button>
        <button className="icon-button notification-button" aria-label="查看通知">♢<span /></button>
        <button className="primary-button" onClick={onNew}><span>＋</span> 新建合同</button>
      </div>
    </header>
  );
}

function Dashboard({ contracts, onSelect }: { contracts: Contract[]; onSelect: (c: Contract) => void }) {
  const total = contracts.reduce((sum, c) => sum + c.amount, 0);
  return (
    <div className="view-stack">
      <section className="stat-grid">
        <StatCard eyebrow="在管合同" value={`${contracts.length + 121}`} note="↑ 12 本月新增" values={[12, 17, 15, 22, 20, 27, 30]} symbol="▤" />
        <StatCard eyebrow="合同总金额" value={money(total + 42600000)} note="↑ 8.4% 较上月" values={[9, 14, 13, 18, 16, 23, 27]} color="blue" symbol="¥" />
        <StatCard eyebrow="待办事项" value="24" note="6 项今日到期" values={[24, 18, 25, 15, 21, 12, 16]} color="orange" symbol="◷" />
        <StatCard eyebrow="合规健康度" value="94.8%" note="↑ 2.1% 持续改善" values={[20, 18, 16, 13, 12, 8, 6]} symbol="✓" />
      </section>

      <section className="dashboard-grid">
        <article className="glass-card portfolio-card">
          <div className="section-heading">
            <div><p className="eyebrow">PORTFOLIO OVERVIEW</p><h2>合同组合态势</h2></div>
            <button className="text-button">查看报告 ↗</button>
          </div>
          <div className="portfolio-content">
            <div className="donut-wrap">
              <div className="donut"><div><strong>128</strong><span>份合同</span></div></div>
              <div className="legend">
                <span><i className="legend-green" /> 正常履约 <b>82</b></span>
                <span><i className="legend-blue" /> 审批流转 <b>27</b></span>
                <span><i className="legend-orange" /> 临近到期 <b>13</b></span>
                <span><i className="legend-red" /> 高风险 <b>6</b></span>
              </div>
            </div>
            <div className="stack-scene" aria-label="合同层级卡片">
              <div className="stack-layer stack-back" />
              <div className="stack-layer stack-middle" />
              <button className="stack-contract" onClick={() => onSelect(contracts[1])}>
                <div className="stack-head"><Pill tone="warning">需关注</Pill><span>•••</span></div>
                <p>亚太渠道合作协议</p>
                <strong>{money(860000)}</strong>
                <div className="stack-meta"><span>Nexa Pacific</span><span>截止 08.05</span></div>
                <div className="progress"><i style={{ width: "48%" }} /></div>
              </button>
            </div>
          </div>
        </article>

        <article className="glass-card activity-card">
          <div className="section-heading"><div><p className="eyebrow">LIVE ACTIVITY</p><h2>实时动态</h2></div><button className="menu-button">•••</button></div>
          <div className="activity-list">
            {[
              ["✓", "年度软件采购合同", "赵言完成电子签署", "2分钟前", "green"],
              ["↻", "华东云服务框架协议", "AI 审核发现 3 处条款偏差", "18分钟前", "blue"],
              ["!", "亚太渠道合作协议", "责任上限条款升级为高风险", "42分钟前", "red"],
              ["＋", "数据处理补充协议", "王钰提交至批准节点", "1小时前", "orange"],
            ].map(([icon, name, desc, time, tone]) => (
              <div className="activity-item" key={name}>
                <span className={`activity-icon ${tone}`}>{icon}</span>
                <div><strong>{name}</strong><p>{desc}</p></div><time>{time}</time>
              </div>
            ))}
          </div>
          <button className="wide-secondary">查看全部动态</button>
        </article>
      </section>

      <section className="glass-card recent-card">
        <div className="section-heading">
          <div><p className="eyebrow">RECENT CONTRACTS</p><h2>近期合同</h2></div>
          <div className="inline-actions"><button className="secondary-button">筛选</button><button className="text-button">全部合同 →</button></div>
        </div>
        <ContractTable contracts={contracts.slice(0, 5)} onSelect={onSelect} />
      </section>
    </div>
  );
}

function ContractTable({ contracts, onSelect }: { contracts: Contract[]; onSelect: (c: Contract) => void }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>合同</th><th>对方主体</th><th>金额</th><th>阶段</th><th>风险</th><th>截止日期</th><th aria-label="操作" /></tr></thead>
        <tbody>
          {contracts.map((contract) => (
            <tr key={contract.id} onClick={() => onSelect(contract)} tabIndex={0}>
              <td><div className="contract-cell"><span className="file-symbol">▤</span><div><strong>{contract.name}</strong><small>{contract.id} · {contract.owner}</small></div></div></td>
              <td>{contract.counterparty}</td><td className="amount">{money(contract.amount)}</td>
              <td><Pill tone="info">{contract.status}</Pill></td><td><RiskPill level={contract.risk} /></td>
              <td>{contract.due}</td><td><button className="row-action" aria-label={`打开${contract.name}`}>›</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContractsView({
  contracts, onSelect, onNew,
}: { contracts: Contract[]; onSelect: (c: Contract) => void; onNew: () => void }) {
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState("全部");
  const filtered = contracts.filter((c) =>
    (c.name.includes(query) || c.counterparty.toLowerCase().includes(query.toLowerCase()) || c.id.includes(query))
    && (risk === "全部" || c.risk === risk));
  return (
    <div className="view-stack">
      <section className="glass-card contracts-panel">
        <div className="filters">
          <label className="search-field"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索合同、主体或编号" /></label>
          <select value={risk} onChange={(e) => setRisk(e.target.value)} aria-label="按风险筛选">
            <option>全部</option><option>低</option><option>中</option><option>高</option>
          </select>
          <select aria-label="按阶段筛选"><option>全部阶段</option>{lifecycle.map((s) => <option key={s}>{s}</option>)}</select>
          <button className="secondary-button">导出</button>
          <button className="primary-button compact" onClick={onNew}>＋ 新建</button>
        </div>
        <div className="list-summary"><span>共 {filtered.length} 份合同</span><span>最近同步：刚刚</span></div>
        <ContractTable contracts={filtered} onSelect={onSelect} />
      </section>
    </div>
  );
}

function LifecycleView({
  contracts, onMove, onSelect,
}: { contracts: Contract[]; onMove: (id: string, status: Status) => void; onSelect: (c: Contract) => void }) {
  const [dragged, setDragged] = useState<string | null>(null);
  return (
    <div className="kanban" aria-label="合同全生命周期看板">
      {lifecycle.map((status, index) => {
        const items = contracts.filter((c) => c.status === status);
        return (
          <section
            className="kanban-column"
            key={status}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragged) onMove(dragged, status); setDragged(null); }}
          >
            <div className="kanban-head"><span><i style={{ opacity: 1 - index * 0.08 }} />{status}</span><b>{items.length}</b></div>
            <div className="kanban-list">
              {items.map((c) => (
                <button draggable onDragStart={() => setDragged(c.id)} onClick={() => onSelect(c)} className="kanban-card" key={c.id}>
                  <span className="kanban-id">{c.id}</span><strong>{c.name}</strong><p>{c.counterparty}</p>
                  <div className="kanban-card-row"><span>{money(c.amount)}</span><RiskPill level={c.risk} /></div>
                  <div className="progress"><i style={{ width: `${c.progress}%` }} /></div>
                  <small><span>{c.owner}</span><time>{c.due.slice(5)}</time></small>
                </button>
              ))}
              <button className="add-kanban">＋ 添加合同</button>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function RiskView({ contracts, onSelect }: { contracts: Contract[]; onSelect: (c: Contract) => void }) {
  const risky = contracts.filter((c) => c.risk !== "低");
  return (
    <div className="view-stack">
      <section className="risk-hero">
        <article className="glass-card risk-score">
          <div><p className="eyebrow">COMPLIANCE SCORE</p><h2>组织合规指数</h2><p>基于 128 份在管合同的 31 项风险因子实时计算</p></div>
          <div className="score-ring"><strong>94.8</strong><span>健康</span></div>
        </article>
        <article className="glass-card heat-card">
          <div className="section-heading"><div><p className="eyebrow">RISK MATRIX</p><h2>风险热力</h2></div><Pill tone="success">实时</Pill></div>
          <div className="heatmap" aria-label="风险热力矩阵">
            {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].map((n) => <i key={n} className={`heat-${(n * 7) % 5}`} />)}
          </div>
          <div className="heat-labels"><span>低影响</span><span>高影响</span></div>
        </article>
      </section>
      <section className="glass-card alert-panel">
        <div className="section-heading"><div><p className="eyebrow">PRIORITY QUEUE</p><h2>风险处置队列</h2></div><span className="count-badge">{risky.length} 项</span></div>
        {risky.map((c, i) => (
          <button className="risk-row" key={c.id} onClick={() => onSelect(c)}>
            <span className={`risk-number ${c.risk === "高" ? "critical" : ""}`}>{String(i + 1).padStart(2, "0")}</span>
            <div><strong>{c.name}</strong><p>{c.risk === "高" ? "责任上限偏离模板 180%，建议法务负责人复核" : "关键义务节点临近，建议确认履约证据"}</p></div>
            <RiskPill level={c.risk} /><span className="risk-arrow">›</span>
          </button>
        ))}
      </section>
    </div>
  );
}

function AssistantView() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([
    { role: "ai", text: "你好，我是 Kai 智审。我已连接组织条款库、风险规则与 128 份在管合同。你可以让我审查条款、总结义务或生成谈判建议。" },
  ]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    const question = prompt.trim();
    setMessages((m) => [...m, { role: "user", text: question }, { role: "ai", text: "已完成初步分析：该条款的责任上限为合同总额的 200%，高于组织标准模板的 100%。建议改为“过去 12 个月已支付费用”，并为数据泄露与知识产权侵权设置单独上限。" }]);
    setPrompt("");
  };
  return (
    <div className="assistant-layout">
      <aside className="glass-card ai-context">
        <p className="eyebrow">ACTIVE CONTEXT</p><h2>审查上下文</h2>
        <div className="context-card"><span className="file-symbol">▤</span><div><strong>亚太渠道合作协议</strong><p>KA-2026-077 · V8</p></div></div>
        <div className="context-stat"><span>识别条款</span><b>42</b></div>
        <div className="context-stat"><span>偏离模板</span><b className="warning-text">6</b></div>
        <div className="context-stat"><span>高风险项</span><b className="danger-text">2</b></div>
        <button className="wide-secondary">更换合同</button>
      </aside>
      <section className="glass-card chat-panel">
        <div className="chat-head"><div className="ai-mark">✦</div><div><h2>Kai 智审</h2><p><i /> 分析引擎在线 · 组织知识库已同步</p></div></div>
        <div className="messages">
          {messages.map((m, i) => <div className={`message ${m.role}`} key={i}>{m.role === "ai" && <span>✦</span>}<p>{m.text}</p></div>)}
        </div>
        <div className="suggestions">
          {["总结核心义务", "找出异常条款", "生成谈判建议"].map((s) => <button key={s} onClick={() => setPrompt(s)}>{s}</button>)}
        </div>
        <form className="chat-input" onSubmit={submit}><input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="询问合同、条款或合规风险…" /><button aria-label="发送">↑</button></form>
        <small className="ai-note">Kai 可能会出错，请在正式决策前核验关键法律信息。</small>
      </section>
    </div>
  );
}

function DetailDrawer({ contract, onClose }: { contract: Contract; onClose: () => void }) {
  return (
    <>
      <button className="drawer-overlay" onClick={onClose} aria-label="关闭详情" />
      <aside className="detail-drawer" aria-label="合同详情">
        <div className="drawer-head"><Pill tone="info">{contract.status}</Pill><button onClick={onClose} aria-label="关闭">×</button></div>
        <p className="eyebrow">{contract.id}</p><h2>{contract.name}</h2><p className="drawer-copy">合同正在 {contract.status} 阶段，整体流程已完成 {contract.progress}%。</p>
        <div className="detail-amount"><span>合同金额</span><strong>{money(contract.amount)}</strong></div>
        <dl>
          <div><dt>对方主体</dt><dd>{contract.counterparty}</dd></div><div><dt>负责人</dt><dd>{contract.owner}</dd></div>
          <div><dt>截止日期</dt><dd>{contract.due}</dd></div><div><dt>风险等级</dt><dd><RiskPill level={contract.risk} /></dd></div>
        </dl>
        <div className="drawer-section"><div className="section-heading"><h3>流程进度</h3><strong>{contract.progress}%</strong></div><div className="progress large"><i style={{ width: `${contract.progress}%` }} /></div></div>
        <div className="drawer-section"><h3>最近记录</h3><div className="mini-timeline"><p><i />Kai 智审完成条款扫描<small>今天 14:30</small></p><p><i />{contract.owner} 更新合同版本<small>昨天 18:12</small></p><p><i />提交至 {contract.status} 节点<small>07.27 10:08</small></p></div></div>
        <div className="drawer-actions"><button className="secondary-button">查看全文</button><button className="primary-button">进入处理</button></div>
      </aside>
    </>
  );
}

function NewContractModal({ onClose, onCreate }: { onClose: () => void; onCreate: (contract: Contract) => void }) {
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    onCreate({
      id: `KA-2026-${Math.floor(100 + Math.random() * 800)}`,
      name: String(data.get("name")),
      counterparty: String(data.get("counterparty")),
      owner: String(data.get("owner")),
      amount: Number(data.get("amount")),
      status: "草拟", risk: "低", due: String(data.get("due")), progress: 8,
    });
  };
  return (
    <div className="modal-overlay" role="presentation" onMouseDown={(e) => { if (e.currentTarget === e.target) onClose(); }}>
      <form className="modal" onSubmit={submit}>
        <div className="modal-head"><div><p className="eyebrow">NEW CONTRACT</p><h2>创建合同工作区</h2></div><button type="button" onClick={onClose} aria-label="关闭">×</button></div>
        <p className="modal-copy">创建后将自动进入草拟阶段，并启用 Kai 风险扫描。</p>
        <label>合同名称<input name="name" required placeholder="例如：年度云服务采购协议" /></label>
        <div className="form-row"><label>对方主体<input name="counterparty" required placeholder="公司名称" /></label><label>负责人<select name="owner"><option>林晓</option><option>陈律</option><option>王钰</option><option>赵言</option></select></label></div>
        <div className="form-row"><label>合同金额<input name="amount" type="number" min="0" required placeholder="0" /></label><label>截止日期<input name="due" type="date" required defaultValue="2026-09-30" /></label></div>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" type="submit">创建并开始草拟</button></div>
      </form>
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [theme, setTheme] = useState("dark");
  const [contracts, setContracts] = useState(seedContracts);
  const [selected, setSelected] = useState<Contract | null>(null);
  const [showNew, setShowNew] = useState(false);
  const meta = useMemo(() => ({
    dashboard: ["控制中心", "全局掌握合同、义务与合规风险"],
    contracts: ["合同库", "统一管理组织内全部合同资产"],
    lifecycle: ["合同生命周期", "拖动卡片即可推进合同流程"],
    risk: ["风险中心", "优先处理可能影响业务的合规事项"],
    assistant: ["Kai 智审", "用组织知识与合规规则辅助法律决策"],
  }[view]), [view]);

  const moveContract = (id: string, status: Status) =>
    setContracts((list) => list.map((c) => c.id === id ? { ...c, status, progress: Math.max(c.progress, (lifecycle.indexOf(status) + 1) * 13) } : c));

  return (
    <main className={`app-shell ${theme}`}>
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><span>K</span></div><div><strong>KaiArmy</strong><small>LEGAL OPERATIONS</small></div></div>
        <div className="workspace-switcher"><span className="workspace-avatar">澜</span><div><small>当前组织</small><strong>澜峰科技集团</strong></div><span>⌄</span></div>
        <nav aria-label="主导航">
          <p className="nav-label">工作空间</p>
          {navItems.map((item) => (
            <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}>
              <span className="nav-symbol">{item.symbol}</span><span>{item.label}</span>{item.id === "risk" && <b>6</b>}
            </button>
          ))}
          <p className="nav-label second">管理</p>
          <button><span className="nav-symbol">◎</span><span>团队与权限</span></button>
          <button><span className="nav-symbol">⚙</span><span>系统设置</span></button>
        </nav>
        <div className="sidebar-footer">
          <div className="usage"><div><span>本月 AI 审查</span><strong>72%</strong></div><div className="progress"><i style={{ width: "72%" }} /></div><small>已用 1,442 / 2,000 页</small></div>
          <button className="user-card"><span className="user-avatar">LX</span><span><strong>林晓</strong><small>法务运营负责人</small></span><span>•••</span></button>
        </div>
      </aside>

      <section className="main-area">
        <Header title={meta[0]} subtitle={meta[1]} theme={theme} onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")} onNew={() => setShowNew(true)} />
        <div className={`content ${view === "lifecycle" ? "content-wide" : ""}`}>
          {view === "dashboard" && <Dashboard contracts={contracts} onSelect={setSelected} />}
          {view === "contracts" && <ContractsView contracts={contracts} onSelect={setSelected} onNew={() => setShowNew(true)} />}
          {view === "lifecycle" && <LifecycleView contracts={contracts} onMove={moveContract} onSelect={setSelected} />}
          {view === "risk" && <RiskView contracts={contracts} onSelect={setSelected} />}
          {view === "assistant" && <AssistantView />}
        </div>
      </section>

      <nav className="mobile-tabs" aria-label="移动端导航">
        {navItems.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}><span>{item.symbol}</span><small>{item.label}</small></button>)}
      </nav>
      {selected && <DetailDrawer contract={selected} onClose={() => setSelected(null)} />}
      {showNew && <NewContractModal onClose={() => setShowNew(false)} onCreate={(c) => { setContracts((v) => [c, ...v]); setShowNew(false); setView("contracts"); }} />}
    </main>
  );
}
