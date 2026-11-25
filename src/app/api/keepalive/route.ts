import { db } from "@/lib/db";

// Called once a day by Vercel Cron (see vercel.json) so the free Supabase project
// sees regular activity and isn't paused for inactivity.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, at: new Date().toISOString() });
  } catch (e) {
    console.error("Keepalive: database unreachable", e);
    return Response.json({ ok: false, error: "database unreachable" }, { status: 503 });
  }
}
