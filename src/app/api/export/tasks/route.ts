import type { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { csvResponse, toCsv } from "@/lib/csv";
import { PRIORITIES, RECURRENCES, STATUSES, todayIST, ymd } from "@/lib/format";
import { taskWhere } from "@/lib/task-query";

export async function GET(req: NextRequest) {
  const me = await getUser();
  if (!me) return new Response("Unauthorized", { status: 401 });
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const today = todayIST();
  const tasks = await db.task.findMany({
    where: taskWhere(sp, me, today),
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }],
    include: { client: { select: { name: true, gstin: true } }, assignee: { select: { name: true } } },
  });
  const csv = toCsv(
    ["Title", "Client", "GSTIN", "Category", "Period", "Assignee", "Priority", "Status", "Due date", "Overdue", "Repeats", "Completed at", "Description"],
    tasks.map((t) => [
      t.title, t.client?.name, t.client?.gstin, t.category, t.period, t.assignee?.name ?? "Unassigned", PRIORITIES[t.priority], STATUSES[t.status],
      ymd(t.dueDate), t.status !== "COMPLETED" && t.dueDate && ymd(t.dueDate) < today ? "Yes" : "", RECURRENCES[t.recurrence],
      t.completedAt ? t.completedAt.toISOString().slice(0, 10) : "", t.description,
    ]),
  );
  return csvResponse(`tasks-${today}.csv`, csv);
}
