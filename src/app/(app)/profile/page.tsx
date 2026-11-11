import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { PasswordForm, ProfileForm } from "./client";

export const metadata = { title: "My profile" };

export default async function ProfilePage() {
  const me = await requireUser();
  const u = await db.user.findUniqueOrThrow({ where: { id: me.id }, select: { name: true, email: true, mobile: true, designation: true, role: true } });
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="My profile" subtitle={`${u.email} · ${u.role === "ADMIN" ? "Administrator" : u.designation ?? "Employee"}`} />
      <section className="card p-5 sm:p-6">
        <h2 className="mb-4 font-semibold">Details</h2>
        <ProfileForm name={u.name} mobile={u.mobile ?? ""} />
      </section>
      <section className="card mt-4 p-5 sm:p-6">
        <h2 className="mb-4 font-semibold">Change password</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
