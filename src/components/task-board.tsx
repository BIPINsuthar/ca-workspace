"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { Building2, CalendarDays, MessageSquare, Repeat, Trash2 } from "lucide-react";
import { deleteTask, setTaskStatus } from "@/app/actions/tasks";
import { RECURRENCES, relativeDue, STATUSES, type PriorityKey, type RecurrenceKey, type StatusKey } from "@/lib/format";
import { ConfirmButton } from "./forms";
import { Avatar, Badge, PriorityBadge, STATUS_COLOR, StatusBadge, cx } from "./ui";

export type BoardTask = {
  id: string;
  title: string;
  status: StatusKey;
  priority: PriorityKey;
  recurrence: RecurrenceKey;
  due: string;
  category: string | null;
  client: string | null;
  assignee: string | null;
  comments: number;
  canDelete: boolean;
};

const COLUMNS: StatusKey[] = ["PENDING", "IN_PROGRESS", "REVIEW", "COMPLETED"];

export function StatusSelect({ id, status, className, onChange }: { id: string; status: StatusKey; className?: string; onChange?: (s: StatusKey) => void }) {
  // Shows the new status immediately; the server catches up in the background.
  const [shown, setShown] = useOptimistic(status);
  const [, start] = useTransition();
  return (
    <select
      value={shown}
      onChange={(e) => {
        const next = e.target.value as StatusKey;
        start(async () => {
          setShown(next);
          onChange?.(next);
          await setTaskStatus(id, next);
        });
      }}
      className={cx("field w-auto py-1 text-xs", className)}
      aria-label="Status"
      onClick={(e) => e.stopPropagation()}
    >
      {COLUMNS.map((s) => <option key={s} value={s}>{STATUSES[s]}</option>)}
    </select>
  );
}

function DueText({ due, status, today }: { due: string; status: StatusKey; today: string }) {
  if (!due) return null;
  const r = relativeDue(due, status, today);
  return (
    <span className={cx("inline-flex items-center gap-1 text-xs", r.tone === "danger" ? "text-red-300" : r.tone === "warn" ? "text-amber-300" : "text-muted")}>
      <CalendarDays className="size-3.5" /> {r.text}
    </span>
  );
}

export function TaskBoard({ tasks, today }: { tasks: BoardTask[]; today: string }) {
  const [optimistic, move] = useOptimistic(tasks, (state, { id, status }: { id: string; status: StatusKey }) =>
    state.map((t) => (t.id === id ? { ...t, status } : t)),
  );
  const [, start] = useTransition();
  const [over, setOver] = useState<StatusKey | null>(null);

  const drop = (status: StatusKey, id: string) => {
    const t = optimistic.find((x) => x.id === id);
    if (!t || t.status === status) return;
    start(async () => {
      move({ id, status });
      await setTaskStatus(id, status);
    });
  };

  return (
    <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0 xl:grid xl:grid-cols-4 xl:overflow-visible">
      {COLUMNS.map((col) => {
        const items = optimistic.filter((t) => t.status === col);
        return (
          <section
            key={col}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(col);
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              setOver(null);
              drop(col, e.dataTransfer.getData("text/task"));
            }}
            className={cx("w-[85vw] max-w-sm shrink-0 snap-start rounded-2xl border border-transparent p-1 transition sm:w-80 xl:w-auto xl:max-w-none", over === col && "border-brand/50 bg-brand/5")}
          >
            <header className="mb-3 flex items-center justify-between px-1">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <span className="size-2 rounded-full" style={{ background: STATUS_COLOR[col] }} />
                {STATUSES[col]}
              </h2>
              <span className="rounded-full bg-panel-2 px-2 text-xs leading-5 text-muted">{items.length}</span>
            </header>
            <div className="space-y-3">
              {items.map((t) => (
                <article
                  key={t.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/task", t.id)}
                  className="card group cursor-grab p-4 transition hover:border-faint active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/tasks/${t.id}`} className="text-sm font-medium leading-snug hover:text-blue-300">{t.title}</Link>
                    {t.canDelete && (
                      <ConfirmButton action={() => deleteTask(t.id)} label="Delete task" confirm={`Delete "${t.title}"? This cannot be undone.`} className="icon-btn -mr-1.5 -mt-1 size-7 opacity-0 transition hover:text-red-400 group-hover:opacity-100 max-lg:opacity-100">
                        <Trash2 className="size-3.5" />
                      </ConfirmButton>
                    )}
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {t.client && <Badge><Building2 className="size-3" /> {t.client}</Badge>}
                    {t.category && <Badge tone="violet">{t.category}</Badge>}
                    {t.recurrence !== "NONE" && <Badge tone="blue"><Repeat className="size-3" /> {RECURRENCES[t.recurrence]}</Badge>}
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <PriorityBadge p={t.priority} />
                    <DueText due={t.due} status={t.status} today={today} />
                  </div>
                  <footer className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
                    <span className="flex min-w-0 items-center gap-2 text-xs text-muted">
                      {t.assignee ? <Avatar name={t.assignee} size="sm" /> : null}
                      <span className="truncate">{t.assignee ?? "Unassigned"}</span>
                      {t.comments > 0 && <span className="flex items-center gap-0.5 text-faint"><MessageSquare className="size-3" />{t.comments}</span>}
                    </span>
                    <StatusSelect id={t.id} status={t.status} onChange={(status) => move({ id: t.id, status })} />
                  </footer>
                </article>
              ))}
              {items.length === 0 && <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-xs text-faint">Drop tasks here</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function TaskTable({ tasks, today }: { tasks: BoardTask[]; today: string }) {
  if (!tasks.length) return <p className="card px-6 py-14 text-center text-sm text-muted">No tasks match these filters.</p>;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[820px]">
        <thead className="border-b border-line">
          <tr>
            <th className="th">Task</th>
            <th className="th">Client</th>
            <th className="th">Assignee</th>
            <th className="th">Due</th>
            <th className="th">Priority</th>
            <th className="th">Status</th>
            <th className="th w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {tasks.map((t) => (
            <tr key={t.id} className="transition hover:bg-panel-2/50">
              <td className="td">
                <Link href={`/tasks/${t.id}`} className="font-medium hover:text-blue-300">{t.title}</Link>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {t.category && <Badge tone="violet">{t.category}</Badge>}
                  {t.recurrence !== "NONE" && <Badge tone="blue"><Repeat className="size-3" /> {RECURRENCES[t.recurrence]}</Badge>}
                </div>
              </td>
              <td className="td text-muted">{t.client ?? "—"}</td>
              <td className="td">
                <span className="flex items-center gap-2 text-muted">{t.assignee && <Avatar name={t.assignee} size="sm" />}{t.assignee ?? "Unassigned"}</span>
              </td>
              <td className="td"><DueText due={t.due} status={t.status} today={today} /></td>
              <td className="td"><PriorityBadge p={t.priority} /></td>
              <td className="td"><StatusSelect id={t.id} status={t.status} /></td>
              <td className="td">
                {t.canDelete && (
                  <ConfirmButton action={() => deleteTask(t.id)} label="Delete task" confirm={`Delete "${t.title}"?`}>
                    <Trash2 className="size-4" />
                  </ConfirmButton>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { StatusBadge };
