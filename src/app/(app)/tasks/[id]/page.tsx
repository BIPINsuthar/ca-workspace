import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CalendarDays, Repeat, Tag, Trash2, User } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate, fmtDateTime, RECURRENCES, relativeDue, todayIST, ymd } from "@/lib/format";
import { StatusSelect } from "@/components/task-board";
import { TaskFormModal } from "@/components/task-form";
import { Avatar, Badge, PriorityBadge, StatusBadge, cx } from "@/components/ui";
import { CommentBox, DeleteCommentButton, DeleteTaskButton } from "./client";

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireUser();
  const admin = me.role === "ADMIN";
  const [task, employees, clients] = await Promise.all([
    db.task.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, designation: true } },
      createdBy: { select: { name: true } },
      comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true } } } },
      activities: { orderBy: { createdAt: "desc" }, take: 50, include: { actor: { select: { name: true } } } },
      previous: { select: { id: true, dueDate: true } },
      next: { select: { id: true, dueDate: true } },
    },
    }),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.client.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!task || (!admin && task.assigneeId !== me.id && task.createdById !== me.id)) notFound();
  const today = todayIST();
  const due = relativeDue(ymd(task.dueDate), task.status, today);

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/tasks" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft className="size-4" /> Tasks</Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-2">
            <StatusBadge s={task.status} />
            <PriorityBadge p={task.priority} />
            {task.category && <Badge tone="violet"><Tag className="size-3" /> {task.category}</Badge>}
            {task.recurrence !== "NONE" && <Badge tone="blue"><Repeat className="size-3" /> Repeats {RECURRENCES[task.recurrence].toLowerCase()}</Badge>}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>
          {task.period && <p className="mt-1 text-sm text-muted">Period: {task.period}</p>}
        </div>
        <div className="flex items-center gap-2">
          <StatusSelect id={task.id} status={task.status} className="py-2 text-sm" />
          <TaskFormModal
            employees={employees}
            clients={clients}
            isAdmin={admin}
            task={{
              id: task.id, title: task.title, description: task.description, category: task.category, period: task.period,
              clientId: task.clientId, assigneeId: task.assigneeId, priority: task.priority, recurrence: task.recurrence, dueDate: ymd(task.dueDate),
            }}
          />
          {(admin || task.createdById === me.id) && (
            <DeleteTaskButton id={task.id} title={task.title}><Trash2 className="size-4" /></DeleteTaskButton>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-2 text-sm font-semibold text-muted">Description</h2>
            {task.description ? <p className="whitespace-pre-wrap text-sm leading-6">{task.description}</p> : <p className="text-sm text-faint">No description.</p>}
          </section>

          <section className="card p-5">
            <h2 className="mb-4 font-semibold">Comments <span className="text-muted">({task.comments.length})</span></h2>
            <ul className="space-y-4">
              {task.comments.map((c) => (
                <li key={c.id} className="group flex gap-3">
                  <Avatar name={c.author?.name ?? "?"} />
                  <div className="min-w-0 flex-1 rounded-xl bg-panel-2 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{c.author?.name ?? "Former user"} <span className="ml-1 text-xs font-normal text-faint">{fmtDateTime(c.createdAt)}</span></p>
                      {(admin || c.author?.id === me.id) && <DeleteCommentButton id={c.id} />}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-fg/90">{c.body}</p>
                  </div>
                </li>
              ))}
              {task.comments.length === 0 && <p className="text-sm text-faint">No comments yet. Post updates, queries or document requests here.</p>}
            </ul>
            <CommentBox taskId={task.id} />
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card divide-y divide-line">
            <Row icon={User} label="Assigned to">
              {task.assignee ? <span className="flex items-center gap-2"><Avatar name={task.assignee.name} size="sm" />{task.assignee.name}</span> : <span className="text-amber-300">Unassigned</span>}
            </Row>
            <Row icon={Building2} label="Client">
              {task.client ? <Link href={`/clients/${task.client.id}`} className="text-blue-300 hover:underline">{task.client.name}</Link> : "Internal"}
            </Row>
            <Row icon={CalendarDays} label="Due">
              <span className={cx(due.tone === "danger" && "text-red-300", due.tone === "warn" && "text-amber-300")}>{task.dueDate ? `${fmtDate(task.dueDate)}` : "—"}</span>
              {task.dueDate && task.status !== "COMPLETED" && <span className="block text-xs text-muted">{due.text}</span>}
            </Row>
            {task.completedAt && <Row icon={CalendarDays} label="Completed">{fmtDateTime(task.completedAt)}</Row>}
            <Row icon={User} label="Created by">{task.createdBy?.name ?? "—"} <span className="block text-xs text-muted">{fmtDateTime(task.createdAt)}</span></Row>
            {(task.previous || task.next) && (
              <Row icon={Repeat} label="Recurrence">
                {task.previous && <Link href={`/tasks/${task.previous.id}`} className="block text-blue-300 hover:underline">← Previous ({fmtDate(task.previous.dueDate)})</Link>}
                {task.next && <Link href={`/tasks/${task.next.id}`} className="block text-blue-300 hover:underline">Next ({fmtDate(task.next.dueDate)}) →</Link>}
              </Row>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-sm font-semibold">Activity</h2>
            <ol className="relative space-y-4 border-l border-line pl-4">
              {task.activities.map((a) => (
                <li key={a.id} className="text-xs">
                  <span className="absolute -left-[5px] mt-1 size-2.5 rounded-full border-2 border-panel bg-faint" />
                  <p className="text-muted"><span className="text-fg">{a.actor?.name ?? "Someone"}</span> {a.action}</p>
                  <p className="text-faint">{fmtDateTime(a.createdAt)}</p>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 px-5 py-3.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-faint" />
      <div className="min-w-0 text-sm">
        <p className="mb-0.5 text-xs text-muted">{label}</p>
        {children}
      </div>
    </div>
  );
}
