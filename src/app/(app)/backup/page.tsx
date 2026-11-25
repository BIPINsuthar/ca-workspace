import { Download } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaceIsEmpty } from "@/lib/backup";
import { PageHeader } from "@/components/ui";
import { RestoreForm } from "./client";

export const metadata = { title: "Backup & restore" };

export default async function BackupPage() {
  await requireAdmin();
  const [empty, clients, tasks, users] = await Promise.all([workspaceIsEmpty(), db.client.count(), db.task.count(), db.user.count()]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Backup & restore" subtitle="Download all your data as one file, or load a backup into a new workspace (for example after moving the database)." />

      <section className="card p-5 sm:p-6">
        <h2 className="font-semibold">Download a backup</h2>
        <p className="mt-1 text-sm text-muted">
          Includes {users} users (with their logins), {clients} clients with partners, {tasks} tasks with comments and history, messages, client logs and reminders.
          Keep the file private: it contains everything in your workspace.
        </p>
        <a href="/api/backup" className="btn-primary mt-4"><Download className="size-4" /> Download backup</a>
      </section>

      <section className="card mt-4 p-5 sm:p-6">
        <h2 className="font-semibold">Restore a backup</h2>
        {empty ? (
          <>
            <p className="mt-1 text-sm text-muted">
              This workspace is empty, so you can load a backup into it. Everything from the backup comes across, including every login and password.
              You&apos;ll be signed out afterwards. Sign in again with your <strong>old</strong> email and password from the backup.
            </p>
            <RestoreForm />
          </>
        ) : (
          <p className="mt-1 text-sm text-muted">
            Restore is only available on a new, empty workspace, so a backup can never overwrite your current data. This workspace already has clients or tasks.
          </p>
        )}
      </section>
    </div>
  );
}
