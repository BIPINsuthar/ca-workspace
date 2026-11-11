import type { Prisma, TaskStatus } from "@prisma/client";
import { addDays, PRIORITIES, STATUSES, toDbDate } from "./format";

export type SearchParams = Record<string, string | undefined>;

/** Builds the task filter from URL params. Employees only ever see their own tasks. */
export function taskWhere(sp: SearchParams, me: { id: string; role: string }, today: string): Prisma.TaskWhereInput {
  const and: Prisma.TaskWhereInput[] = [];
  if (me.role !== "ADMIN") and.push({ assigneeId: me.id });
  else if (sp.assignee === "none") and.push({ assigneeId: null });
  else if (sp.assignee) and.push({ assigneeId: sp.assignee });
  if (sp.client) and.push({ clientId: sp.client });
  if (sp.priority && sp.priority in PRIORITIES) and.push({ priority: sp.priority as keyof typeof PRIORITIES });
  if (sp.category) and.push({ category: sp.category });
  if (sp.status && sp.status in STATUSES) and.push({ status: sp.status as TaskStatus });
  if (sp.q) {
    and.push({
      OR: [
        { title: { contains: sp.q, mode: "insensitive" } },
        { description: { contains: sp.q, mode: "insensitive" } },
        { client: { name: { contains: sp.q, mode: "insensitive" } } },
      ],
    });
  }
  if (sp.due === "overdue") and.push({ dueDate: { lt: toDbDate(today)! }, status: { not: "COMPLETED" } });
  if (sp.due === "today") and.push({ dueDate: toDbDate(today)!, status: { not: "COMPLETED" } });
  if (sp.due === "week") and.push({ dueDate: { gte: toDbDate(today)!, lte: toDbDate(addDays(today, 7))! }, status: { not: "COMPLETED" } });
  // Keep the board light: completed work older than 30 days only shows when asked for.
  if (sp.status !== "COMPLETED") {
    and.push({ OR: [{ status: { not: "COMPLETED" } }, { completedAt: { gte: new Date(Date.now() - 30 * 86400000) } }] });
  }
  return { AND: and };
}
