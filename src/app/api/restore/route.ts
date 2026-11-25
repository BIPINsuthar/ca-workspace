import { getUser } from "@/lib/auth";
import { restoreBackup, UserError } from "@/lib/backup";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Admin-only: load a backup file into a new, empty workspace. */
export async function POST(req: Request) {
  const me = await getUser();
  if (!me || me.role !== "ADMIN") return Response.json({ error: "Only admins can restore backups." }, { status: 403 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Couldn't read the file. Choose the .json backup you downloaded." }, { status: 400 });
  }
  try {
    const counts = await restoreBackup(body);
    return Response.json({ ok: true, counts });
  } catch (e) {
    if (e instanceof UserError) return Response.json({ error: e.message }, { status: 400 });
    console.error("Restore failed", e);
    return Response.json({ error: "Restore failed and nothing was changed. Check the Vercel logs for details." }, { status: 500 });
  }
}
