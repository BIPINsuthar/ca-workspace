import Link from "next/link";
import { Download, KanbanSquare, List } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PRIORITIES, STATUSES, TASK_CATEGORIES, todayIST, ymd } from "@/lib/format";
import { taskWhere, type SearchParams } from "@/lib/task-query";
import { FilterBar } from "@/components/filter-bar";
import { TaskBoard, TaskTable, type BoardTask } from "@/components/task-board";
import { TaskFormModal } from "@/components/task-form";
import { PageHeader, cx } from "@/components/ui";

export const metadata = { title: "Tasks" };

type SP = SearchParams;

export default async function TasksPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const me = await requireUser();
  const admin = me.role === "ADMIN";
  const today = todayIST();
  const view = sp.view === "list" ? "list" : "board";

  const [rows, employees, clients] = await Promise.all([
    db.task.findMany({
      where: taskWhere(sp, me, today),
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      include: { client: { select: { name: true } }, assignee: { select: { name: true } }, _count: { select: { comments: true } } },
      take: 500,
    }),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.client.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const tasks: BoardTask[] = rows.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    recurrence: t.recurrence,
    due: ymd(t.dueDate),
    category: t.category,
    client: t.client?.name ?? null,
    assignee: t.assignee?.name ?? null,
    comments: t._count.comments,
    canDelete: admin || t.createdById === me.id,
  }));

  const qs = (patch: SP) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([k, v]) => v && k !== "new") as [string, string][]);
    return `/tasks${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title={admin ? "Task management" : "My tasks"}
        subtitle={admin ? "Assign work, track progress and keep every deadline in sight." : "Everything assigned to you. Drag a card or change its status as you work."}
        actions={
          <>
            {admin && (
              <a href={`/api/export/tasks?${new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][])}`} className="btn-ghost">
                <Download className="size-4" /> Export
              </a>
            )}
            <TaskFormModal employees={employees} clients={clients} isAdmin={admin} defaultOpen={sp.new === "1"} defaultClientId={sp.client} />
          </>
        }
      />
      <FilterBar
        searchPlaceholder="Search tasks or clients…"
        filters={[
          { key: "status", label: "All statuses", options: Object.entries(STATUSES).map(([value, label]) => ({ value, label })) },
          ...(admin ? [{ key: "assignee", label: "All employees", options: [{ value: "none", label: "Unassigned" }, ...employees.map((e) => ({ value: e.id, label: e.name }))] }] : []),
          { key: "client", label: "All clients", options: clients.map((c) => ({ value: c.id, label: c.name })) },
          { key: "priority", label: "Any priority", options: Object.entries(PRIORITIES).map(([value, label]) => ({ value, label })) },
          { key: "category", label: "Any category", options: TASK_CATEGORIES.map((c) => ({ value: c, label: c })) },
          { key: "due", label: "Any due date", options: [{ value: "overdue", label: "Overdue" }, { value: "today", label: "Due today" }, { value: "week", label: "Next 7 days" }] },
        ]}
      >
        <div className="flex shrink-0 rounded-lg border border-line bg-panel p-0.5">
          <Link href={qs({ view: undefined })} className={cx("btn px-2.5 py-1.5", view === "board" ? "bg-panel-2 text-fg" : "text-muted")}><KanbanSquare className="size-4" /> Board</Link>
          <Link href={qs({ view: "list" })} className={cx("btn px-2.5 py-1.5", view === "list" ? "bg-panel-2 text-fg" : "text-muted")}><List className="size-4" /> List</Link>
        </div>
      </FilterBar>
      {view === "board" ? <TaskBoard tasks={tasks} today={today} /> : <TaskTable tasks={tasks} today={today} />}
    </>
  );
}
