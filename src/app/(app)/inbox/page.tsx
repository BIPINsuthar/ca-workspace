import { Suspense } from "react";
import Link from "next/link";
import type { LogType, Prisma } from "@prisma/client";
import { Bone } from "@/components/skeleton";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate, fmtDateTime, LOG_TYPES, todayIST, ymd } from "@/lib/format";
import { FilterBar } from "@/components/filter-bar";
import { DeleteLogButton, LogFormModal } from "@/components/log-form";
import { Avatar, Badge, Empty, PageHeader, Tabs, cx } from "@/components/ui";
import { MessageComposer, ReminderActions, ReminderFormModal, MarkAllRead, ThreadScroller } from "./client";

export const metadata = { title: "Inbox" };

type SP = Record<string, string | undefined>;

export default async function InboxPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const me = await requireUser();
  const tab = ["messages", "logs", "reminders", "notifications"].includes(sp.tab ?? "") ? sp.tab! : "messages";

  // Tab badges and tab content load in parallel (each in its own Suspense boundary).
  return (
    <>
      <PageHeader title="Inbox" subtitle="Team messages, client communication, reminders and alerts." />
      <Suspense fallback={<InboxTabs active={tab} />}>
        <InboxTabsWithCounts active={tab} userId={me.id} />
      </Suspense>
      <Suspense key={`${tab}-${sp.with ?? ""}`} fallback={<Bone className="h-[60dvh] rounded-2xl" />}>
        {tab === "messages" && <Messages me={me} withId={sp.with} />}
        {tab === "logs" && <Logs me={me} sp={sp} />}
        {tab === "reminders" && <Reminders userId={me.id} />}
        {tab === "notifications" && <Notifications userId={me.id} />}
      </Suspense>
    </>
  );
}

function InboxTabs({ active, counts = [0, 0, 0] }: { active: string; counts?: number[] }) {
  return (
    <Tabs
      active={active}
      items={[
        { key: "messages", label: "Team messages", href: "/inbox?tab=messages", count: counts[0] },
        { key: "logs", label: "Client logs", href: "/inbox?tab=logs" },
        { key: "reminders", label: "Reminders", href: "/inbox?tab=reminders", count: counts[1] },
        { key: "notifications", label: "Notifications", href: "/inbox?tab=notifications", count: counts[2] },
      ]}
    />
  );
}

async function InboxTabsWithCounts({ active, userId }: { active: string; userId: string }) {
  const counts = await Promise.all([
    db.message.count({ where: { recipientId: userId, readAt: null } }),
    db.reminder.count({ where: { userId, done: false, remindOn: { lte: new Date(todayIST() + "T00:00:00Z") } } }),
    db.notification.count({ where: { userId, readAt: null } }),
  ]);
  return <InboxTabs active={active} counts={counts} />;
}

async function Messages({ me, withId }: { me: { id: string }; withId?: string }) {
  const [people, recent, unread] = await Promise.all([
    db.user.findMany({ where: { id: { not: me.id }, active: true }, select: { id: true, name: true, designation: true }, orderBy: { name: "asc" } }),
    db.message.findMany({
      where: { OR: [{ senderId: me.id }, { recipientId: me.id }] },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { senderId: true, recipientId: true, body: true, subject: true, createdAt: true },
    }),
    db.message.groupBy({ by: ["senderId"], where: { recipientId: me.id, readAt: null }, _count: true }),
  ]);
  const unreadBy = new Map(unread.map((u) => [u.senderId, u._count]));
  const last = new Map<string, (typeof recent)[number]>();
  for (const m of recent) {
    const other = m.senderId === me.id ? m.recipientId : m.senderId;
    if (!last.has(other)) last.set(other, m);
  }
  const sorted = [...people].sort((a, b) => (last.get(b.id)?.createdAt.getTime() ?? 0) - (last.get(a.id)?.createdAt.getTime() ?? 0));
  const other = withId ? people.find((p) => p.id === withId) : undefined;

  let thread: { id: string; body: string; subject: string | null; createdAt: Date; senderId: string }[] = [];
  if (other) {
    unreadBy.delete(other.id);
    [thread] = await Promise.all([
      db.message.findMany({
        where: { OR: [{ senderId: me.id, recipientId: other.id }, { senderId: other.id, recipientId: me.id }] },
        orderBy: { createdAt: "asc" },
        take: 500,
        select: { id: true, body: true, subject: true, createdAt: true, senderId: true },
      }),
      db.message.updateMany({ where: { senderId: other.id, recipientId: me.id, readAt: null }, data: { readAt: new Date() } }),
    ]);
  }

  return (
    <div className="card grid min-h-[60dvh] overflow-hidden md:grid-cols-[300px_1fr]">
      <aside className={cx("border-line md:border-r", other && "max-md:hidden")}>
        <p className="border-b border-line px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">Your team</p>
        <ul className="max-h-[70dvh] overflow-y-auto">
          {sorted.map((p) => {
            const m = last.get(p.id);
            const n = unreadBy.get(p.id);
            return (
              <li key={p.id}>
                <Link href={`/inbox?tab=messages&with=${p.id}`} className={cx("flex items-center gap-3 px-4 py-3 transition hover:bg-panel-2", other?.id === p.id && "bg-panel-2")}>
                  <Avatar name={p.name} />
                  <div className="min-w-0 flex-1">
                    <p className={cx("truncate text-sm", n ? "font-semibold" : "font-medium")}>{p.name}</p>
                    <p className="truncate text-xs text-muted">{m ? `${m.senderId === me.id ? "You: " : ""}${m.subject ?? m.body}` : p.designation ?? "Start a conversation"}</p>
                  </div>
                  {!!n && <span className="rounded-full bg-brand px-1.5 text-[11px] leading-5 text-white">{n}</span>}
                </Link>
              </li>
            );
          })}
          {sorted.length === 0 && <p className="px-4 py-8 text-sm text-muted">Add employees to start messaging.</p>}
        </ul>
      </aside>
      <section className={cx("flex min-h-[60dvh] flex-col", !other && "max-md:hidden")}>
        {!other ? (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted">Select a teammate to read or start a conversation.</div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-line px-5 py-3">
              <Link href="/inbox?tab=messages" className="text-sm text-muted md:hidden">←</Link>
              <Avatar name={other.name} />
              <div>
                <p className="text-sm font-medium">{other.name}</p>
                <p className="text-xs text-muted">{other.designation}</p>
              </div>
            </header>
            <ThreadScroller>
              {thread.map((m) => {
                const mine = m.senderId === me.id;
                return (
                  <div key={m.id} className={cx("flex", mine ? "justify-end" : "justify-start")}>
                    <div className={cx("max-w-[80%] rounded-2xl px-4 py-2.5", mine ? "rounded-br-sm bg-brand text-white" : "rounded-bl-sm bg-panel-2")}>
                      {m.subject && <p className="mb-0.5 text-xs font-semibold opacity-80">{m.subject}</p>}
                      <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                      <p className={cx("mt-1 text-[11px]", mine ? "text-white/70" : "text-faint")}>{fmtDateTime(m.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
              {thread.length === 0 && <p className="py-10 text-center text-sm text-muted">No messages yet. Say hello 👋</p>}
            </ThreadScroller>
            <MessageComposer recipientId={other.id} name={other.name} />
          </>
        )}
      </section>
    </div>
  );
}

async function Logs({ me, sp }: { me: { id: string; role: string }; sp: SP }) {
  const where: Prisma.ClientLogWhereInput = {
    clientId: sp.client || undefined,
    type: sp.type && sp.type in LOG_TYPES ? (sp.type as LogType) : undefined,
    summary: sp.q ? { contains: sp.q, mode: "insensitive" } : undefined,
    followUpOn: sp.followup === "1" ? { not: null } : undefined,
  };
  const [logs, clients] = await Promise.all([
    db.clientLog.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 200,
      include: { client: { select: { id: true, name: true } }, loggedBy: { select: { id: true, name: true } } },
    }),
    db.client.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const today = todayIST();
  return (
    <>
      <FilterBar
        searchPlaceholder="Search summaries…"
        filters={[
          { key: "client", label: "All clients", options: clients.map((c) => ({ value: c.id, label: c.name })) },
          { key: "type", label: "All types", options: Object.entries(LOG_TYPES).map(([value, label]) => ({ value, label })) },
          { key: "followup", label: "Any follow-up", options: [{ value: "1", label: "Has follow-up date" }] },
        ]}
      >
        <LogFormModal clients={clients} />
      </FilterBar>
      <div className="card overflow-x-auto">
        {logs.length === 0 ? (
          <Empty title="No communication logged">Record calls, meetings, emails and notices with clients here.</Empty>
        ) : (
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-line">
              <tr>
                <th className="th">Date</th>
                <th className="th">Client</th>
                <th className="th">Type</th>
                <th className="th">Summary</th>
                <th className="th">Contact</th>
                <th className="th">Follow up</th>
                <th className="th">Logged by</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="td whitespace-nowrap text-muted">{fmtDate(l.date)}</td>
                  <td className="td"><Link href={`/clients/${l.client.id}`} className="hover:text-blue-300">{l.client.name}</Link></td>
                  <td className="td"><Badge tone={l.type === "NOTICE" ? "red" : l.type === "MEETING" ? "violet" : "gray"}>{LOG_TYPES[l.type]}</Badge></td>
                  <td className="td max-w-md whitespace-pre-wrap">{l.summary}</td>
                  <td className="td text-muted">{l.contactPerson ?? "—"}</td>
                  <td className={cx("td whitespace-nowrap", l.followUpOn ? (ymd(l.followUpOn) < today ? "text-red-300" : "text-amber-300") : "text-faint")}>{l.followUpOn ? fmtDate(l.followUpOn) : "—"}</td>
                  <td className="td text-muted">{l.loggedBy?.name ?? "—"}</td>
                  <td className="td">
                    {(me.role === "ADMIN" || l.loggedBy?.id === me.id) && (
                      <div className="flex">
                        <LogFormModal clients={clients} log={{ id: l.id, clientId: l.client.id, date: ymd(l.date), type: l.type, summary: l.summary, contactPerson: l.contactPerson, followUpOn: ymd(l.followUpOn) }} />
                        <DeleteLogButton id={l.id} />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

async function Reminders({ userId }: { userId: string }) {
  const reminders = await db.reminder.findMany({ where: { userId }, orderBy: [{ done: "asc" }, { remindOn: "asc" }], take: 200 });
  const today = todayIST();
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-sm text-muted">Private to you. Due reminders show on your dashboard.</p>
        <ReminderFormModal />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {reminders.map((r) => {
          const d = ymd(r.remindOn);
          return (
            <article key={r.id} className={cx("card p-4", r.done && "opacity-50")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={cx("font-medium", r.done && "line-through")}>{r.title}</p>
                  {r.note && <p className="mt-1 text-sm text-muted">{r.note}</p>}
                  <p className={cx("mt-2 text-xs", !r.done && d < today ? "text-red-300" : !r.done && d === today ? "text-amber-300" : "text-faint")}>
                    {!r.done && d < today ? "Overdue · " : d === today ? "Today · " : ""}Remind on {fmtDate(d)}
                  </p>
                </div>
                <ReminderActions r={{ id: r.id, title: r.title, note: r.note, remindOn: d, done: r.done }} />
              </div>
            </article>
          );
        })}
      </div>
      {reminders.length === 0 && <div className="card"><Empty title="No reminders">Add personal reminders like COP renewal or software licence follow-ups.</Empty></div>}
    </>
  );
}

async function Notifications({ userId }: { userId: string }) {
  const items = await db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div className="card">
      <header className="flex items-center justify-between border-b border-line px-5 py-3">
        <p className="text-sm text-muted">Task assignments, status changes, comments and messages.</p>
        {items.some((n) => !n.readAt) && <MarkAllRead />}
      </header>
      <ul className="divide-y divide-line">
        {items.map((n) => (
          <li key={n.id}>
            <Link href={n.link ?? "#"} className={cx("block px-5 py-3 transition hover:bg-panel-2/50", !n.readAt && "bg-brand/5")}>
              <p className="flex items-center gap-2 text-sm">{!n.readAt && <span className="size-1.5 rounded-full bg-brand" />}{n.title}</p>
              {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.body}</p>}
              <p className="mt-1 text-[11px] text-faint">{fmtDateTime(n.createdAt)}</p>
            </Link>
          </li>
        ))}
        {items.length === 0 && <Empty title="No notifications yet" />}
      </ul>
    </div>
  );
}
