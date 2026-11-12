import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, Pencil, Phone } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CONSTITUTIONS, fmtDate, formatMobile, LOG_TYPES, PARTNER_LABEL, relativeDue, todayIST, ymd } from "@/lib/format";
import { DeleteLogButton, LogFormModal } from "@/components/log-form";
import { TaskFormModal } from "@/components/task-form";
import { Avatar, Badge, PriorityBadge, StatusBadge, cx } from "@/components/ui";
import { ClientAdminActions } from "./client";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireUser();
  const admin = me.role === "ADMIN";
  const [c, employees, clients] = await Promise.all([
    db.client.findUnique({
    where: { id },
    include: {
      partners: true,
      manager: { select: { name: true } },
      tasks: {
        where: admin ? {} : { assigneeId: me.id },
        orderBy: [{ status: "asc" }, { dueDate: { sort: "asc", nulls: "last" } }],
        take: 100,
        include: { assignee: { select: { name: true } } },
      },
      logs: { orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 50, include: { loggedBy: { select: { id: true, name: true } } } },
    },
    }),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.client.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!c) notFound();
  const today = todayIST();
  const open = c.tasks.filter((t) => t.status !== "COMPLETED");
  const done = c.tasks.filter((t) => t.status === "COMPLETED");

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/clients" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft className="size-4" /> Clients</Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge tone="blue">{CONSTITUTIONS[c.constitution]}</Badge>
            {!c.active && <Badge tone="red">Inactive</Badge>}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{c.name}</h1>
          {c.manager && <p className="mt-1 text-sm text-muted">Handled by {c.manager.name}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <TaskFormModal employees={employees} clients={clients} isAdmin={admin} defaultClientId={c.id} />
          {admin && (
            <>
              <Link href={`/clients/${c.id}/edit`} className="btn-ghost"><Pencil className="size-4" /> Edit</Link>
              <ClientAdminActions id={c.id} name={c.name} active={c.active} />
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-4 text-sm font-semibold">Registration</h2>
            <dl className="space-y-3 text-sm">
              <div><dt className="text-xs text-muted">GSTIN</dt><dd className="font-mono">{c.gstin ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted">PAN</dt><dd className="font-mono">{c.pan ?? "—"}</dd></div>
            </dl>
            <h2 className="mb-3 mt-6 text-sm font-semibold">Contact</h2>
            <div className="space-y-2 text-sm">
              {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-blue-300 hover:underline"><Mail className="size-4 text-faint" />{c.email}</a>}
              {c.mobile && <a href={`tel:${c.mobile}`} className="flex items-center gap-2"><Phone className="size-4 text-faint" />{formatMobile(c.mobile)}</a>}
              {(c.address || c.city) && (
                <p className="flex gap-2 text-muted"><MapPin className="mt-0.5 size-4 shrink-0 text-faint" />{[c.address, c.city, c.state, c.pincode].filter(Boolean).join(", ")}</p>
              )}
              {!c.email && !c.mobile && !c.address && <p className="text-faint">No contact details.</p>}
            </div>
            {c.notes && (
              <>
                <h2 className="mb-2 mt-6 text-sm font-semibold">Notes</h2>
                <p className="whitespace-pre-wrap text-sm text-muted">{c.notes}</p>
              </>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-4 text-sm font-semibold">{PARTNER_LABEL[c.constitution]}s ({c.partners.length})</h2>
            <ul className="space-y-4">
              {c.partners.map((p) => (
                <li key={p.id} className="flex gap-3">
                  <Avatar name={p.name} />
                  <div className="min-w-0 text-sm">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted">{[p.designation, p.din && `DIN ${p.din}`, p.pan && `PAN ${p.pan}`].filter(Boolean).join(" · ")}</p>
                    {p.email && <a href={`mailto:${p.email}`} className="block truncate text-xs text-blue-300 hover:underline">{p.email}</a>}
                    {p.mobile && <a href={`tel:${p.mobile}`} className="block text-xs text-muted">{formatMobile(p.mobile)}</a>}
                  </div>
                </li>
              ))}
              {c.partners.length === 0 && <p className="text-sm text-faint">None added.</p>}
            </ul>
          </section>
        </aside>

        <div className="space-y-6">
          <section className="card">
            <header className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-semibold">Open tasks ({open.length})</h2>
              <Link href={`/tasks?client=${c.id}&view=list`} className="text-xs text-muted hover:text-fg">View in Tasks →</Link>
            </header>
            <TaskRows tasks={open} today={today} empty="No open work for this client." />
            {done.length > 0 && (
              <details className="border-t border-line">
                <summary className="cursor-pointer px-5 py-3 text-sm text-muted hover:text-fg">Completed ({done.length})</summary>
                <TaskRows tasks={done} today={today} empty="" />
              </details>
            )}
          </section>

          <section className="card">
            <header className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-semibold">Communication log</h2>
              <LogFormModal clients={[]} fixedClientId={c.id} />
            </header>
            <ul className="divide-y divide-line">
              {c.logs.map((l) => (
                <li key={l.id} className="flex gap-4 px-5 py-4">
                  <div className="w-20 shrink-0 text-xs text-muted">{fmtDate(l.date)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge tone={l.type === "NOTICE" ? "red" : l.type === "MEETING" ? "violet" : "gray"}>{LOG_TYPES[l.type]}</Badge>
                      {l.contactPerson && <span className="text-xs text-muted">with {l.contactPerson}</span>}
                      {l.followUpOn && <span className={cx("text-xs", ymd(l.followUpOn) < today ? "text-red-300" : "text-amber-300")}>Follow up {fmtDate(l.followUpOn)}</span>}
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{l.summary}</p>
                    <p className="mt-1 text-xs text-faint">Logged by {l.loggedBy?.name ?? "—"}</p>
                  </div>
                  {(admin || l.loggedBy?.id === me.id) && (
                    <div className="flex shrink-0 items-start">
                      <LogFormModal clients={[]} fixedClientId={c.id} log={{ id: l.id, clientId: c.id, date: ymd(l.date), type: l.type, summary: l.summary, contactPerson: l.contactPerson, followUpOn: ymd(l.followUpOn) }} />
                      <DeleteLogButton id={l.id} />
                    </div>
                  )}
                </li>
              ))}
              {c.logs.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted">No calls, meetings or notices logged yet.</p>}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

type Row = { id: string; title: string; status: "PENDING" | "IN_PROGRESS" | "REVIEW" | "COMPLETED"; priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"; dueDate: Date | null; assignee: { name: string } | null };

function TaskRows({ tasks, today, empty }: { tasks: Row[]; today: string; empty: string }) {
  if (!tasks.length) return empty ? <p className="px-5 py-8 text-center text-sm text-muted">{empty}</p> : null;
  return (
    <ul className="divide-y divide-line">
      {tasks.map((t) => {
        const r = relativeDue(ymd(t.dueDate), t.status, today);
        return (
          <li key={t.id}>
            <Link href={`/tasks/${t.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 transition hover:bg-panel-2/50">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.title}</p>
                <p className="text-xs text-muted">
                  {t.assignee?.name ?? "Unassigned"} · <span className={r.tone === "danger" ? "text-red-300" : r.tone === "warn" ? "text-amber-300" : ""}>{r.text}</span>
                </p>
              </div>
              <PriorityBadge p={t.priority} />
              <StatusBadge s={t.status} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
