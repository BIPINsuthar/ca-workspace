import { getUser } from "@/lib/auth";
import { exportBackup } from "@/lib/backup";
import { todayIST } from "@/lib/format";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Admin-only: download the whole workspace as one JSON file. */
export async function GET() {
  const me = await getUser();
  if (!me || me.role !== "ADMIN") return new Response("Only admins can download backups.", { status: 403 });
  const backup = await exportBackup();
  return new Response(JSON.stringify(backup), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="ca-workspace-backup-${todayIST()}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
