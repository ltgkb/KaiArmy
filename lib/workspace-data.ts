export type TaskStatus = "todo" | "review" | "design" | "develop" | "test" | "done";
export type Priority = "high" | "medium" | "low";

export type Task = {
  id: string;
  title: string;
  description: string;
  projectId: string;
  assigneeId: string;
  participantIds: string[];
  status: TaskStatus;
  priority: Priority;
  dueAt: string;
  tags: string[];
  docIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  health: "good" | "warn" | "risk";
  ownerId: string;
  dueAt: string;
  archived: boolean;
  milestones: Array<{ id: string; name: string; dueAt: string; done: boolean }>;
};

export type Doc = {
  id: string;
  name: string;
  type: "prd" | "design" | "review" | "report" | "spec";
  version: number;
  taskIds: string[];
  content: string;
  updatedAt: string;
  favorite: boolean;
};

export type Member = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  online: boolean;
};

export type CalendarEvent = {
  id: string;
  title: string;
  type: "meeting" | "review" | "deadline";
  date: string;
  time: string;
  taskId?: string;
};

export type Comment = {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
};

export type WorkspaceState = {
  tasks: Task[];
  projects: Project[];
  docs: Doc[];
  members: Member[];
  events: CalendarEvent[];
  comments: Comment[];
  settings: {
    workspaceName: string;
    displayName: string;
    emailNotifications: boolean;
    inAppNotifications: boolean;
    compactMode: boolean;
  };
};

const now = "2026-07-29T08:00:00.000Z";

export const defaultWorkspace: WorkspaceState = {
  members: [
    { id: "m1", name: "Brandon", role: "产品经理", avatar: "BR", online: true },
    { id: "m2", name: "Mina", role: "产品设计师", avatar: "MN", online: true },
    { id: "m3", name: "Yulin", role: "用户研究", avatar: "YL", online: false },
    { id: "m4", name: "Zhiwei", role: "后端工程师", avatar: "ZW", online: true },
    { id: "m5", name: "Linxi", role: "前端工程师", avatar: "LX", online: true },
  ],
  projects: [
    {
      id: "p1",
      name: "KaiArmy 2.0",
      description: "面向产品研发团队的智能协同工作台",
      health: "good",
      ownerId: "m1",
      dueAt: "2026-08-20T18:00:00.000Z",
      archived: false,
      milestones: [
        { id: "ms1", name: "需求冻结", dueAt: "2026-07-30", done: true },
        { id: "ms2", name: "Beta 发布", dueAt: "2026-08-08", done: false },
        { id: "ms3", name: "正式上线", dueAt: "2026-08-20", done: false },
      ],
    },
    {
      id: "p2",
      name: "增长实验中心",
      description: "统一管理增长实验、指标与复盘",
      health: "warn",
      ownerId: "m3",
      dueAt: "2026-09-05T18:00:00.000Z",
      archived: false,
      milestones: [{ id: "ms4", name: "指标口径确认", dueAt: "2026-08-03", done: false }],
    },
    {
      id: "p3",
      name: "设计系统升级",
      description: "重构基础组件和多端设计语言",
      health: "risk",
      ownerId: "m2",
      dueAt: "2026-08-12T18:00:00.000Z",
      archived: false,
      milestones: [{ id: "ms5", name: "核心组件迁移", dueAt: "2026-08-01", done: false }],
    },
  ],
  tasks: [
    { id: "KAI-001", title: "需求评审会", description: "与业务团队对齐需求范围，明确核心目标与验收标准。", projectId: "p1", assigneeId: "m1", participantIds: ["m2","m3"], status: "review", priority: "high", dueAt: "2026-07-29T18:00:00.000Z", tags: ["关键路径","评审"], docIds: ["d1"], createdAt: now, updatedAt: now },
    { id: "KAI-002", title: "工作台信息架构", description: "梳理导航、任务和项目之间的信息层级。", projectId: "p1", assigneeId: "m2", participantIds: ["m1"], status: "design", priority: "high", dueAt: "2026-07-31T18:00:00.000Z", tags: ["设计"], docIds: ["d2"], createdAt: now, updatedAt: now },
    { id: "KAI-003", title: "用户访谈结论", description: "整理 12 位种子用户访谈，输出机会点。", projectId: "p1", assigneeId: "m3", participantIds: ["m1"], status: "review", priority: "medium", dueAt: "2026-07-30T15:00:00.000Z", tags: ["研究"], docIds: ["d3"], createdAt: now, updatedAt: now },
    { id: "KAI-004", title: "任务看板交互", description: "实现拖拽、快捷流转、筛选和批量操作。", projectId: "p1", assigneeId: "m5", participantIds: ["m2"], status: "develop", priority: "high", dueAt: "2026-08-03T18:00:00.000Z", tags: ["前端","关键路径"], docIds: ["d2"], createdAt: now, updatedAt: now },
    { id: "KAI-005", title: "权限模型接口", description: "实现管理员、成员和只读角色权限。", projectId: "p1", assigneeId: "m4", participantIds: ["m5"], status: "develop", priority: "medium", dueAt: "2026-08-04T18:00:00.000Z", tags: ["后端"], docIds: ["d4"], createdAt: now, updatedAt: now },
    { id: "KAI-006", title: "通知策略测试", description: "验证站内信和邮件通知的触发及去重。", projectId: "p1", assigneeId: "m5", participantIds: ["m4"], status: "test", priority: "medium", dueAt: "2026-08-07T18:00:00.000Z", tags: ["测试"], docIds: [], createdAt: now, updatedAt: now },
    { id: "KAI-007", title: "竞品能力矩阵", description: "整理协作工具的任务与知识库能力。", projectId: "p2", assigneeId: "m3", participantIds: ["m1"], status: "done", priority: "low", dueAt: "2026-07-28T18:00:00.000Z", tags: ["研究"], docIds: ["d3"], createdAt: now, updatedAt: now },
    { id: "KAI-008", title: "组件状态盘点", description: "盘点现有组件的交互状态和缺口。", projectId: "p3", assigneeId: "m2", participantIds: ["m5"], status: "todo", priority: "high", dueAt: "2026-07-28T18:00:00.000Z", tags: ["设计系统"], docIds: ["d5"], createdAt: now, updatedAt: now },
    { id: "KAI-009", title: "Beta 数据埋点", description: "定义核心任务闭环的行为事件。", projectId: "p1", assigneeId: "m4", participantIds: ["m1"], status: "todo", priority: "medium", dueAt: "2026-08-02T18:00:00.000Z", tags: ["数据"], docIds: [], createdAt: now, updatedAt: now },
  ],
  docs: [
    { id: "d1", name: "KaiArmy 2.0 PRD", type: "prd", version: 5, taskIds: ["KAI-001"], content: "产品目标：让研发团队在一个工作台完成规划、协作与复盘。核心范围包括任务、项目、文件、日程、团队和智能建议。", updatedAt: now, favorite: true },
    { id: "d2", name: "核心交互规范", type: "design", version: 3, taskIds: ["KAI-002","KAI-004"], content: "看板支持快捷流转；详情编辑与列表实时同步；所有危险操作需要二次确认。", updatedAt: now, favorite: true },
    { id: "d3", name: "用户研究报告", type: "report", version: 2, taskIds: ["KAI-003","KAI-007"], content: "高频痛点：信息分散、状态不透明、会议结论难追踪。用户希望在任务上下文中直接访问文档。", updatedAt: now, favorite: false },
    { id: "d4", name: "权限模型说明", type: "spec", version: 1, taskIds: ["KAI-005"], content: "管理员可管理成员与工作区；成员可创建和编辑任务；只读成员仅可查看和评论。", updatedAt: now, favorite: false },
    { id: "d5", name: "设计系统审计", type: "review", version: 4, taskIds: ["KAI-008"], content: "需要统一表单、弹层、焦点态、空态与错误反馈，并降低非必要玻璃效果。", updatedAt: now, favorite: false },
  ],
  events: [
    { id: "e1", title: "需求范围确认会", type: "review", date: "2026-07-29", time: "10:00", taskId: "KAI-001" },
    { id: "e2", title: "设计周评审", type: "meeting", date: "2026-07-31", time: "15:30", taskId: "KAI-002" },
    { id: "e3", title: "Beta 发布", type: "deadline", date: "2026-08-08", time: "18:00" },
  ],
  comments: [
    { id: "c1", taskId: "KAI-001", authorId: "m2", content: "@Brandon 交互边界已补充到评审文档。", createdAt: now },
    { id: "c2", taskId: "KAI-001", authorId: "m1", content: "收到，今天评审后冻结范围。", createdAt: now },
  ],
  settings: {
    workspaceName: "产品研发中心",
    displayName: "Brandon",
    emailNotifications: true,
    inAppNotifications: true,
    compactMode: false,
  },
};
