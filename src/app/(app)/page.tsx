import Link from "next/link";
import { AlarmClock, AlertTriangle, ArrowRight, Bell, Building2, CalendarClock, CheckCircle2, Clock, ClipboardList, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, fmtDate, fmtDateTime, relativeDue, STATUSES, todayIST, ymd, type StatusKey } from "@/lib/format";
import { CompletedArea, StatusDonut, WorkloadBars } from "@/components/charts-lazy";
import { Avatar, PageHeader, PriorityBadge, STATUS_COLOR, cx } from "@/components/ui";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const me = await requireUser();
  const admin = me.role === "ADMIN";
  const today = todayIST();
  const since = new Date(addDays(today, -13) + "T00:00:00+05:30");
  const scope = admin ? {} : { assigneeId: me.id };

  const [tasks, completedRecent, clientCount, employees, reminders, activity] = await Promise.all([
    db.task.findMany({
      where: { ...scope, status: { not: "COMPLETED" } },
      select: { id: true, title: true, status: true, priority: true, dueDate: true, assigneeId: true, client: { select: { name: true } }, assignee: { select: { name: true } } },
      orderBy: [{ dueDate: "asc" }],
    }),
    db.task.findMany({ where: { ...scope, status: "COMPLETED", completedAt: { gte: since } }, select: { completedAt: true, assigneeId: true } }),
    db.client.count({ where: { active: true } }),
    admin ? db.user.findMany({ where: { active: true, role: "EMPLOYEE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    db.reminder.findMany({ where: { userId: me.id, done: false, remindOn: { lte: new Date(addDays(today, 7) + "T00:00:00Z") } }, orderBy: { remindOn: "asc" }, take: 5 }),
    db.taskActivity.findMany({
      where: admin ? {} : { task: { assigneeId: me.id } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { actor: { select: { name: true } }, task: { select: { id: true, title: true } } },
    }),
  ]);

  const due = (t: (typeof tasks)[number]) => ymd(t.dueDate);
  const overdue = tasks.filter((t) => t.dueDate && due(t) < today);
  const dueToday = tasks.filter((t) => due(t) === today);
  const upcoming = tasks.filter((t) => t.dueDate && due(t) > today && due(t) <= addDays(today, 7));
  const count = (s: StatusKey) => tasks.filter((t) => t.status === s).length;

  const donut = (["PENDING", "IN_PROGRESS", "REVIEW"] as StatusKey[])
    .map((s) => ({ name: STATUSES[s] as string, value: count(s), color: STATUS_COLOR[s] }))
    .concat([{ name: "Completed (14d)", value: completedRecent.length, color: STATUS_COLOR.COMPLETED }])
    .filter((d) => d.value > 0);

  const workload = employees.map((e) => {
    const mine = tasks.filter((t) => t.assigneeId === e.id);
    return {
      name: e.name,
      overdue: mine.filter((t) => t.dueDate && due(t) < today).length,
      pending: mine.filter((t) => t.status === "PENDING" && !(t.dueDate && due(t) < today)).length,
      active: mine.filter((t) => t.status !== "PENDING" && !(t.dueDate && due(t) < today)).length,
    };
  });
  const unassigned = tasks.filter((t) => !t.assigneeId).length;

  const daily = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(today, i - 13);
    return {
      day: d.slice(5).split("-").reverse().join("/"),
      count: completedRecent.filter((t) => t.completedAt && new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(t.completedAt) === d).length,
    };
  });

  const stats = [
    admin
      ? { label: "Active clients", value: clientCount, icon: Building2, tone: "bg-blue-500/15 text-blue-300", href: "/clients" }
      : { label: "My open tasks", value: tasks.length, icon: ClipboardList, tone: "bg-blue-500/15 text-blue-300", href: "/tasks" },
    admin
      ? { label: "Active employees", value: employees.length, icon: Users, tone: "bg-emerald-500/15 text-emerald-300", href: "/employees" }
      : { label: "Completed (14 days)", value: completedRecent.length, icon: CheckCircle2, tone: "bg-emerald-500/15 text-emerald-300", href: "/tasks?status=COMPLETED" },
    { label: "Pending", value: count("PENDING"), icon: ClipboardList, tone: "bg-amber-500/15 text-amber-300", href: "/tasks?status=PENDING" },
    { label: "In progress / review", value: count("IN_PROGRESS") + count("REVIEW"), icon: Clock, tone: "bg-violet-500/15 text-violet-300", href: "/tasks?status=IN_PROGRESS" },
    { label: "Due today", value: dueToday.length, icon: AlarmClock, tone: "bg-orange-500/15 text-orange-300", href: "/tasks?due=today" },
    { label: "Overdue", value: overdue.length, icon: AlertTriangle, tone: "bg-red-500/15 text-red-300", href: "/tasks?due=overdue" },
  ];

  const hour = Number(new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }).format(new Date()));
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <PageHeader
        title={`${greet}, ${me.name.split(" ")[0]}`}
        subtitle={`${fmtDate(today)} · ${overdue.length ? `${overdue.length} overdue, ` : ""}${dueToday.length} due today, ${upcoming.length} due this week`}
        actions={<Link href="/tasks?new=1" className="btn-primary">New task</Link>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card group p-4 transition hover:border-faint">
            <span className={cx("flex size-9 items-center justify-center rounded-lg", s.tone)}><s.icon className="size-4" /></span>
            <p className="mt-3 text-2xl font-semibold">{s.value}</p>
            <p className="text-xs text-muted">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className={cx("mt-4 grid gap-4", admin ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
        <section className="card p-5">
          <h2 className="mb-2 font-semibold">Task status</h2>
          <StatusDonut data={donut} />
        </section>
        {admin && (
          <section className="card p-5">
            <h2 className="mb-2 font-semibold">Workload by employee</h2>
            <WorkloadBars
              data={workload}
              series={[
                { key: "pending", name: "Pending", color: "#f59e0b" },
                { key: "active", name: "In progress", color: "#3b82f6" },
                { key: "overdue", name: "Overdue", color: "#ef4444" },
              ]}
            />
            {unassigned > 0 && (
              <Link href="/tasks?assignee=none" className="mt-2 block text-xs text-amber-300 hover:underline">{unassigned} task{unassigned > 1 ? "s" : ""} not assigned to anyone →</Link>
            )}
          </section>
        )}
        <section className="card p-5">
          <h2 className="mb-2 font-semibold">Completed — last 14 days</h2>
          <CompletedArea data={daily} />
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold"><CalendarClock className="size-4 text-amber-300" /> Needs attention</h2>
            <Link href="/tasks" className="text-xs text-muted hover:text-fg">All tasks <ArrowRight className="inline size-3" /></Link>
          </div>
          {[...overdue, ...dueToday, ...upcoming].length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">Nothing due in the next 7 days. 🎉</p>
          ) : (
            <ul className="divide-y divide-line">
              {[...overdue, ...dueToday, ...upcoming].slice(0, 10).map((t) => {
                const r = relativeDue(due(t), t.status, today);
                return (
                  <li key={t.id}>
                    <Link href={`/tasks/${t.id}`} className="flex items-center gap-3 py-3 transition hover:opacity-80">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.title}</p>
                        <p className="truncate text-xs text-muted">
                          {[t.client?.name, t.assignee?.name ?? "Unassigned"].filter(Boolean).join(" · ")} ·{" "}
                          <span className={r.tone === "danger" ? "text-red-300" : r.tone === "warn" ? "text-amber-300" : ""}>{r.text}</span>
                        </p>
                      </div>
                      <PriorityBadge p={t.priority} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="space-y-4">
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold"><Bell className="size-4 text-blue-300" /> My reminders</h2>
              <Link href="/inbox?tab=reminders" className="text-xs text-muted hover:text-fg">Manage</Link>
            </div>
            {reminders.length === 0 ? (
              <p className="text-sm text-muted">No reminders this week.</p>
            ) : (
              <ul className="space-y-2">
                {reminders.map((r) => (
                  <li key={r.id} className="rounded-lg bg-panel-2 px-3 py-2">
                    <p className="text-sm">{r.title}</p>
                    <p className={cx("text-xs", ymd(r.remindOn) < today ? "text-red-300" : "text-muted")}>{fmtDate(r.remindOn)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-semibold">Recent activity</h2>
            <ul className="space-y-3">
              {activity.map((a) => (
                <li key={a.id} className="flex gap-2.5">
                  <Avatar name={a.actor?.name ?? "System"} size="sm" />
                  <p className="min-w-0 text-xs leading-5 text-muted">
                    <span className="text-fg">{a.actor?.name ?? "Someone"}</span> {a.action} ·{" "}
                    <Link href={`/tasks/${a.task.id}`} className="text-blue-300 hover:underline">{a.task.title}</Link>
                    <span className="block text-faint">{fmtDateTime(a.createdAt)}</span>
                  </p>
                </li>
              ))}
              {activity.length === 0 && <p className="text-sm text-muted">No activity yet.</p>}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
