import Link from "next/link";
import type { Constitution, Prisma } from "@prisma/client";
import { Download, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CONSTITUTIONS, formatMobile } from "@/lib/format";
import { FilterBar } from "@/components/filter-bar";
import { Badge, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Clients" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const me = await requireUser();
  const admin = me.role === "ADMIN";

  const where: Prisma.ClientWhereInput = {
    active: sp.show === "inactive" ? false : sp.show === "all" ? undefined : true,
    constitution: sp.type && sp.type in CONSTITUTIONS ? (sp.type as Constitution) : undefined,
    managerId: sp.manager || undefined,
    OR: sp.q
      ? [
          { name: { contains: sp.q, mode: "insensitive" } },
          { gstin: { contains: sp.q, mode: "insensitive" } },
          { pan: { contains: sp.q, mode: "insensitive" } },
          { email: { contains: sp.q, mode: "insensitive" } },
          { mobile: { contains: sp.q } },
          { city: { contains: sp.q, mode: "insensitive" } },
          { partners: { some: { name: { contains: sp.q, mode: "insensitive" } } } },
        ]
      : undefined,
  };

  const [clients, employees, total] = await Promise.all([
    db.client.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        partners: { select: { name: true } },
        manager: { select: { name: true } },
        _count: { select: { tasks: { where: { status: { not: "COMPLETED" } } } } },
      },
    }),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.client.count({ where: { active: true } }),
  ]);

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle={`${total} active client${total === 1 ? "" : "s"} in your register`}
        actions={
          <>
            <a href="/api/export/clients" className="btn-ghost"><Download className="size-4" /> Export</a>
            {admin && <Link href="/clients/new" className="btn-primary"><Plus className="size-4" /> New client</Link>}
          </>
        }
      />
      <FilterBar
        searchPlaceholder="Search name, GSTIN, PAN, partner…"
        filters={[
          { key: "type", label: "All constitutions", options: Object.entries(CONSTITUTIONS).map(([value, label]) => ({ value, label })) },
          { key: "manager", label: "Any handler", options: employees.map((e) => ({ value: e.id, label: e.name })) },
          { key: "show", label: "Active clients", options: [{ value: "inactive", label: "Inactive clients" }, { value: "all", label: "All clients" }] },
        ]}
      />

      <div className="card overflow-x-auto">
        {clients.length === 0 ? (
          <Empty title="No clients found">{admin && sp.q == null ? <Link href="/clients/new" className="text-blue-300 hover:underline">Add your first client</Link> : "Try a different search."}</Empty>
        ) : (
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-line">
              <tr>
                <th className="th">Client</th>
                <th className="th">GSTIN / PAN</th>
                <th className="th">Partners</th>
                <th className="th">Contact</th>
                <th className="th">Location</th>
                <th className="th">Handled by</th>
                <th className="th text-right">Open tasks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {clients.map((c) => (
                <tr key={c.id} className="transition hover:bg-panel-2/50">
                  <td className="td">
                    <Link href={`/clients/${c.id}`} className="font-medium hover:text-blue-300">{c.name}</Link>
                    <div className="mt-1 flex gap-1.5">
                      <Badge>{CONSTITUTIONS[c.constitution]}</Badge>
                      {!c.active && <Badge tone="red">Inactive</Badge>}
                    </div>
                  </td>
                  <td className="td font-mono text-xs">
                    <div>{c.gstin ?? <span className="font-sans text-faint">No GSTIN</span>}</div>
                    <div className="text-muted">{c.pan}</div>
                  </td>
                  <td className="td text-muted">{c.partners.map((p) => p.name).join(", ") || "—"}</td>
                  <td className="td">
                    {c.email && <a href={`mailto:${c.email}`} className="block text-blue-300 hover:underline">{c.email}</a>}
                    {c.mobile && <a href={`tel:${c.mobile}`} className="block text-muted">{formatMobile(c.mobile)}</a>}
                  </td>
                  <td className="td text-muted">{[c.city, c.state].filter(Boolean).join(", ") || "—"}</td>
                  <td className="td text-muted">{c.manager?.name ?? "—"}</td>
                  <td className="td text-right">
                    <Link href={`/tasks?client=${c.id}`} className={c._count.tasks ? "text-amber-300 hover:underline" : "text-faint"}>{c._count.tasks}</Link>
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
