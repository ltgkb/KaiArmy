import type { WorkspaceState } from "./workspace-data";

const LIMITS = {
  tasks: 5_000,
  projects: 500,
  docs: 1_000,
  members: 500,
  events: 10_000,
  comments: 20_000,
  filesPerDoc: 100,
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isString = (value: unknown, max = 20_000) => typeof value === "string" && value.length <= max;
const isStringArray = (value: unknown, maxItems = 500) => Array.isArray(value) && value.length <= maxItems && value.every((item) => isString(item, 500));
const isIsoDate = (value: unknown) => isString(value, 64) && !Number.isNaN(Date.parse(value));

export function validateWorkspace(value: unknown): value is WorkspaceState {
  if (!isRecord(value)) return false;
  const { tasks, projects, docs, members, events, comments, settings } = value;
  if (!Array.isArray(tasks) || tasks.length > LIMITS.tasks) return false;
  if (!Array.isArray(projects) || projects.length > LIMITS.projects) return false;
  if (!Array.isArray(docs) || docs.length > LIMITS.docs) return false;
  if (!Array.isArray(members) || members.length > LIMITS.members) return false;
  if (!Array.isArray(events) || events.length > LIMITS.events) return false;
  if (!Array.isArray(comments) || comments.length > LIMITS.comments) return false;
  if (!isRecord(settings)) return false;

  if (!tasks.every((task) => isRecord(task)
    && isString(task.id, 120) && isString(task.title, 500) && isString(task.description, 20_000)
    && isString(task.projectId, 120) && isString(task.assigneeId, 120)
    && isStringArray(task.participantIds) && ["todo", "review", "design", "develop", "test", "done"].includes(String(task.status))
    && ["high", "medium", "low"].includes(String(task.priority)) && isIsoDate(task.dueAt)
    && isStringArray(task.tags) && isStringArray(task.docIds) && isIsoDate(task.createdAt) && isIsoDate(task.updatedAt))) return false;

  if (!projects.every((project) => isRecord(project)
    && isString(project.id, 120) && isString(project.name, 500) && isString(project.description, 20_000)
    && ["good", "warn", "risk"].includes(String(project.health)) && isString(project.ownerId, 120)
    && isIsoDate(project.dueAt) && typeof project.archived === "boolean" && Array.isArray(project.milestones)
    && project.milestones.length <= 500 && project.milestones.every((milestone) => isRecord(milestone)
      && isString(milestone.id, 120) && isString(milestone.name, 500) && isIsoDate(milestone.dueAt) && typeof milestone.done === "boolean"))) return false;

  if (!docs.every((doc) => isRecord(doc)
    && isString(doc.id, 120) && isString(doc.name, 500) && ["prd", "design", "review", "report", "spec"].includes(String(doc.type))
    && Number.isInteger(doc.version) && Number(doc.version) > 0 && isStringArray(doc.taskIds) && isString(doc.content, 100_000)
    && (doc.projectId === undefined || isString(doc.projectId, 120)) && isIsoDate(doc.updatedAt) && typeof doc.favorite === "boolean"
    && (doc.files === undefined || (Array.isArray(doc.files) && doc.files.length <= LIMITS.filesPerDoc && doc.files.every((file) => isRecord(file)
      && isString(file.id, 120) && isString(file.name, 500) && ["md", "csv", "txt", "pdf", "docx"].includes(String(file.kind))
      && Number.isInteger(file.size) && Number(file.size) >= 0 && Number(file.size) <= 500_000
      && (file.text === undefined || isString(file.text, 500_000)) && (file.dataUrl === undefined || isString(file.dataUrl, 700_000)) && isIsoDate(file.updatedAt)))))) return false;

  if (!members.every((member) => isRecord(member) && isString(member.id, 120) && isString(member.name, 500)
    && isString(member.role, 500) && isString(member.avatar, 100) && typeof member.online === "boolean")) return false;
  if (!events.every((event) => isRecord(event) && isString(event.id, 120) && isString(event.title, 500)
    && ["meeting", "review", "deadline"].includes(String(event.type)) && /^\d{4}-\d{2}-\d{2}$/.test(String(event.date))
    && /^\d{2}:\d{2}$/.test(String(event.time)) && (event.taskId === undefined || isString(event.taskId, 120)))) return false;
  if (!comments.every((comment) => isRecord(comment) && isString(comment.id, 120) && isString(comment.taskId, 120)
    && isString(comment.authorId, 120) && isString(comment.content, 20_000) && isIsoDate(comment.createdAt))) return false;

  return isString(settings.workspaceName, 500) && isString(settings.displayName, 500)
    && typeof settings.emailNotifications === "boolean" && typeof settings.inAppNotifications === "boolean"
    && typeof settings.compactMode === "boolean" && ["dark", "light"].includes(String(settings.theme));
}
