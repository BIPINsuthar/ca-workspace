import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ClientForm } from "@/components/client-form";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Edit client" };

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  const [c, employees] = await Promise.all([
    db.client.findUnique({ where: { id }, include: { partners: true } }),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!c) notFound();
  return (
    <div className="mx-auto max-w-5xl">
      <Link href={`/clients/${c.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft className="size-4" /> {c.name}</Link>
      <PageHeader title="Edit client" />
      <ClientForm
        employees={employees}
        initial={{
          id: c.id,
          name: c.name,
          constitution: c.constitution,
          gstin: c.gstin ?? "",
          pan: c.pan ?? "",
          email: c.email ?? "",
          mobile: c.mobile ?? "",
          address: c.address ?? "",
          city: c.city ?? "",
          state: c.state ?? "",
          pincode: c.pincode ?? "",
          notes: c.notes ?? "",
          managerId: c.managerId ?? "",
          partners: c.partners.map((p) => ({ name: p.name, designation: p.designation ?? "", email: p.email ?? "", mobile: p.mobile ?? "", pan: p.pan ?? "", din: p.din ?? "" })),
        }}
      />
    </div>
  );
}
