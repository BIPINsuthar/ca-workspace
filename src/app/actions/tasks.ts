"use server";

import { revalidatePath } from "next/cache";
import type { Priority, Recurrence, TaskStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser, type SessionUser } from "@/lib/auth";
import { fail, ok, str, type ActionState } from "@/lib/action-state";
import { fmtDate, nextOccurrence, PRIORITIES, RECURRENCES, STATUSES, toDbDate, ymd } from "@/lib/format";
import { notify } from "@/lib/notify";

function revalidateTasks(id?: string) {
  revalidatePath("/tasks");
  revalidatePath("/");
  if (id) revalidatePath(`/tasks/${id}`);
}

/** Admins can touch any task; employees only tasks assigned to them. */
async function loadTaskFor(me: SessionUser, id: string) {
  const task = await db.task.findUnique({ where: { id } });
  if (!task) throw new Error("Task not found");
  if (me.role !== "ADMIN" && task.assigneeId !== me.id && task.createdById !== me.id) throw new Error("Not allowed");
  return task;
}

export async function saveTask(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser();
  const id = str(fd, "id");
  const title = str(fd, "title");
  if (!title) return fail("Title is required.");
  const priority = str(fd, "priority") ?? "MEDIUM";
  const recurrence = str(fd, "recurrence") ?? "NONE";
  const status = str(fd, "status") ?? "PENDING";
  if (!(priority in PRIORITIES) || !(recurrence in RECURRENCES) || !(status in STATUSES)) return fail("Invalid option selected.");
  const due = str(fd, "dueDate");
  if (recurrence !== "NONE" && !due) return fail("Recurring tasks need a due date.");

  // Employees can only create/keep tasks for themselves.
  let assigneeId = str(fd, "assigneeId");
  if (me.role !== "ADMIN") assigneeId = me.id;

  const data = {
    title,
    description: str(fd, "description"),
    category: str(fd, "category"),
    period: str(fd, "period"),
    clientId: str(fd, "clientId"),
    assigneeId,
    priority: priority as Priority,
    recurrence: recurrence as Recurrence,
    dueDate: toDbDate(due),
  };

  if (assigneeId) {
    const a = await db.user.findUnique({ where: { id: assigneeId }, select: { active: true } });
    if (!a?.active) return fail("That employee is inactive.");
  }

  if (id) {
    const before = await loadTaskFor(me, id);
    const changes: string[] = [];
    if (before.assigneeId !== data.assigneeId) changes.push("reassigned the task");
    if (ymd(before.dueDate) !== (due ?? "")) changes.push(`changed due date to ${due ? fmtDate(due) : "none"}`);
    if (before.priority !== data.priority) changes.push(`set priority to ${PRIORITIES[data.priority]}`);
    if (!changes.length) changes.push("edited the task");
    await Promise.all([
      db.task.update({ where: { id }, data }),
      db.taskActivity.createMany({ data: changes.map((action) => ({ taskId: id, actorId: me.id, action })) }),
      data.assigneeId && before.assigneeId !== data.assigneeId
        ? notify(data.assigneeId, me.id, `${me.name} assigned you: ${title}`, `/tasks/${id}`, due ? `Due ${fmtDate(due)}` : undefined)
        : null,
    ]);
    revalidateTasks(id);
    return ok("Task saved.", id);
  }

  const t = await db.task.create({
    data: { ...data, status: status as TaskStatus, createdById: me.id, activities: { create: { actorId: me.id, action: "created this task" } } },
  });
  if (assigneeId) await notify(assigneeId, me.id, `${me.name} assigned you: ${title}`, `/tasks/${t.id}`, due ? `Due ${fmtDate(due)}` : undefined);
  revalidateTasks();
  return ok("Task created.", t.id);
}

export async function setTaskStatus(id: string, status: TaskStatus) {
  const me = await requireUser();
  if (!(status in STATUSES)) throw new Error("Invalid status");
  const task = await loadTaskFor(me, id);
  if (task.status === status) return;

  const spawnNext = async () => {
    // Spawn the next occurrence of a recurring compliance task.
    if (status !== "COMPLETED" || task.recurrence === "NONE" || !task.dueDate) return;
    const nextDue = nextOccurrence(ymd(task.dueDate), task.recurrence);
    if (!nextDue || (await db.task.findUnique({ where: { previousId: id }, select: { id: true } }))) return;
    await Promise.all([
      db.task.create({
        data: {
          title: task.title, description: task.description, category: task.category, clientId: task.clientId,
          assigneeId: task.assigneeId, priority: task.priority, recurrence: task.recurrence,
          dueDate: toDbDate(nextDue), createdById: task.createdById, previousId: id,
          activities: { create: { actorId: me.id, action: `created automatically (repeats ${RECURRENCES[task.recurrence].toLowerCase()})` } },
        },
      }),
      db.taskActivity.create({ data: { taskId: id, actorId: me.id, action: `next occurrence scheduled for ${fmtDate(nextDue)}` } }),
    ]);
  };

  // Independent writes run in parallel: one round trip instead of several.
  await Promise.all([
    db.task.update({
      where: { id },
      data: {
        status,
        completedAt: status === "COMPLETED" ? new Date() : null,
        activities: { create: { actorId: me.id, action: `moved to ${STATUSES[status]}` } },
      },
    }),
    spawnNext(),
    notify([task.assigneeId, task.createdById], me.id, `${me.name} moved "${task.title}" to ${STATUSES[status]}`, `/tasks/${id}`),
  ]);

  revalidateTasks(id);
}

export async function deleteTask(id: string) {
  const me = await requireUser();
  const task = await loadTaskFor(me, id);
  if (me.role !== "ADMIN" && task.createdById !== me.id) throw new Error("Only admins can delete tasks");
  await db.task.delete({ where: { id } });
  revalidateTasks();
}

export async function addComment(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser();
  const taskId = str(fd, "taskId");
  const body = str(fd, "body");
  if (!taskId || !body) return fail("Write a comment first.");
  const [task, prior] = await Promise.all([
    loadTaskFor(me, taskId),
    db.taskComment.findMany({ where: { taskId }, select: { authorId: true }, distinct: ["authorId"] }),
  ]);
  await Promise.all([
    db.taskComment.create({ data: { taskId, body, authorId: me.id } }),
    notify(
      [task.assigneeId, task.createdById, ...prior.map((c) => c.authorId)],
      me.id,
      `${me.name} commented on "${task.title}"`,
      `/tasks/${taskId}`,
      body.slice(0, 140),
    ),
  ]);

  revalidatePath(`/tasks/${taskId}`);
  return ok();
}

export async function deleteComment(id: string) {
  const me = await requireUser();
  const c = await db.taskComment.findUniqueOrThrow({ where: { id } });
  if (me.role !== "ADMIN" && c.authorId !== me.id) throw new Error("Not allowed");
  await db.taskComment.delete({ where: { id } });
  revalidatePath(`/tasks/${c.taskId}`);
}
