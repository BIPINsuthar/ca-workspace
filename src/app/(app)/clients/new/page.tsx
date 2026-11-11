import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ClientForm } from "@/components/client-form";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "New client" };

export default async function NewClientPage() {
  await requireAdmin();
  const employees = await db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/clients" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft className="size-4" /> Clients</Link>
      <PageHeader title="New client" subtitle="Add a client to your register." />
      <ClientForm employees={employees} />
    </div>
  );
}
