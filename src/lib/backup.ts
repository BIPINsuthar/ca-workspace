import "server-only";
import { db } from "./db";

// Everything except notifications (short-lived alerts) — order matters for restore (parents first).
const TABLES = ["user", "client", "partner", "task", "taskComment", "taskActivity", "message", "clientLog", "reminder"] as const;
type Table = (typeof TABLES)[number];

export const BACKUP_FORMAT = "ca-workspace-backup";
export const BACKUP_VERSION = 1;

type Backup = { format: string; version: number; createdAt: string; data: Record<Table, Record<string, unknown>[]> };

// Prisma delegates share a shape we only use generically here.
type Delegate = {
  findMany: (args?: object) => Promise<Record<string, unknown>[]>;
  createMany: (args: { data: Record<string, unknown>[] }) => Promise<{ count: number }>;
  deleteMany: (args?: object) => Promise<{ count: number }>;
  count: () => Promise<number>;
};
type Tx = Record<Table | "notification", Delegate> & { task: Delegate & { update: (a: object) => Promise<unknown> } };
const d = (client: unknown) => client as Tx;

export async function exportBackup(): Promise<Backup> {
  const rows = await Promise.all(TABLES.map((t) => d(db)[t].findMany({ orderBy: { id: "asc" } })));
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    data: Object.fromEntries(TABLES.map((t, i) => [t, rows[i]])) as Backup["data"],
  };
}

export async function workspaceIsEmpty() {
  const [clients, tasks, logs] = await Promise.all([db.client.count(), db.task.count(), db.clientLog.count()]);
  return clients + tasks + logs === 0;
}

/** Replaces the (empty) workspace with the backup. Returns row counts per table. */
export async function restoreBackup(raw: unknown) {
  const b = raw as Backup;
  if (!b || b.format !== BACKUP_FORMAT || typeof b.data !== "object") throw new UserError("This file isn't a CA Workspace backup.");
  if (b.version > BACKUP_VERSION) throw new UserError("This backup was made by a newer version of the app. Update the app first.");
  for (const t of TABLES) if (!Array.isArray(b.data[t])) throw new UserError(`The backup is missing the "${t}" section.`);
  if (!b.data.user.some((u) => u.role === "ADMIN" && u.active !== false)) throw new UserError("The backup has no active admin, so nobody could sign in afterwards.");
  if (!(await workspaceIsEmpty())) {
    throw new UserError("Restore only works on a new, empty workspace (no clients, tasks or logs). This one already has data, so nothing was changed.");
  }

  return db.$transaction(
    async (tx) => {
      const t = d(tx);
      // The only rows in an empty workspace are the seeded admin login (and its notifications/reminders).
      for (const table of [...TABLES].reverse()) await t[table].deleteMany();
      await t.notification.deleteMany();

      const counts: Record<string, number> = {};
      for (const table of TABLES) {
        let rows = b.data[table];
        // Recurring tasks point at their previous occurrence; link them after all tasks exist.
        if (table === "task") rows = rows.map((r) => ({ ...r, previousId: null }));
        for (let i = 0; i < rows.length; i += 1000) await t[table].createMany({ data: rows.slice(i, i + 1000) });
        counts[table] = rows.length;
      }
      for (const r of b.data.task) {
        // Pass updatedAt explicitly so the restored task keeps its original timestamp.
        if (r.previousId) await t.task.update({ where: { id: r.id }, data: { previousId: r.previousId, updatedAt: r.updatedAt } });
      }
      return counts;
    },
    { timeout: 120_000, maxWait: 20_000 },
  );
}

export class UserError extends Error {}
