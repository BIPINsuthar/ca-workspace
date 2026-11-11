import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate, formatMobile, todayIST, toDbDate, ymd } from "@/lib/format";
import { Avatar, Badge, PageHeader } from "@/components/ui";
import { EmployeeActions, EmployeeFormModal } from "./client";

export const metadata = { title: "Employees" };

export default async function EmployeesPage() {
  const me = await requireAdmin();
  const today = todayIST();
  const users = await db.user.findMany({
    orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          assignedTasks: { where: { status: { not: "COMPLETED" } } },
        },
      },
    },
  });
  const overdue = await db.task.groupBy({
    by: ["assigneeId"],
    where: { status: { not: "COMPLETED" }, dueDate: { lt: toDbDate(today)! } },
    _count: true,
  });
  const overdueBy = new Map(overdue.map((o) => [o.assigneeId, o._count]));

  return (
    <>
      <PageHeader title="Team & employees" subtitle="Create logins, reset passwords and manage your team's access." actions={<EmployeeFormModal />} />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px]">
          <thead className="border-b border-line">
            <tr>
              <th className="th">Employee</th>
              <th className="th">Designation</th>
              <th className="th">Mobile</th>
              <th className="th">Joined</th>
              <th className="th">Open tasks</th>
              <th className="th">Status</th>
              <th className="th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id} className={u.active ? "" : "opacity-60"}>
                <td className="td">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} />
                    <div>
                      <p className="font-medium">{u.name} {u.id === me.id && <span className="text-xs text-faint">(you)</span>}</p>
                      <p className="text-xs text-muted">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="td text-muted">{u.designation ?? "—"}</td>
                <td className="td text-muted">{u.mobile ? <a href={`tel:${u.mobile}`}>{formatMobile(u.mobile)}</a> : "—"}</td>
                <td className="td text-muted">{fmtDate(u.joinedOn)}</td>
                <td className="td">
                  <Link href={`/tasks?assignee=${u.id}`} className="hover:underline">{u._count.assignedTasks}</Link>
                  {!!overdueBy.get(u.id) && <span className="ml-2 text-xs text-red-300">{overdueBy.get(u.id)} overdue</span>}
                </td>
                <td className="td">
                  <div className="flex gap-1.5">
                    {u.role === "ADMIN" && <Badge tone="violet">Admin</Badge>}
                    <Badge tone={u.active ? "green" : "red"}>{u.active ? "Active" : "Inactive"}</Badge>
                  </div>
                </td>
                <td className="td">
                  <EmployeeActions
                    self={u.id === me.id}
                    user={{ id: u.id, name: u.name, email: u.email, role: u.role, designation: u.designation, mobile: u.mobile, joinedOn: ymd(u.joinedOn), active: u.active }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-faint">
        Admins see and manage everything. Employees see the dashboard, their own tasks, the client register and the inbox. Deactivated users can no longer sign in; their history is kept.
      </p>
    </>
  );
}
