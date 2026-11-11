"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fail, ok, str, type ActionState } from "@/lib/action-state";
import { toDbDate } from "@/lib/format";

export async function saveEmployee(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  const id = str(fd, "id");
  const name = str(fd, "name");
  const email = str(fd, "email")?.toLowerCase();
  const password = String(fd.get("password") ?? "");
  const role = str(fd, "role") === "ADMIN" ? "ADMIN" : "EMPLOYEE";
  if (!name) return fail("Full name is required.");
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return fail("Enter a valid login email.");
  if (!id && password.length < 8) return fail("Initial password must be at least 8 characters.");

  const taken = await db.user.findFirst({ where: { email, NOT: id ? { id } : undefined } });
  if (taken) return fail("Another user already uses this email.");
  if (id === me.id && role !== "ADMIN") return fail("You can't remove your own admin access.");

  const data = {
    name,
    email,
    role: role as "ADMIN" | "EMPLOYEE",
    designation: str(fd, "designation"),
    mobile: str(fd, "mobile"),
    joinedOn: toDbDate(str(fd, "joinedOn")),
  };
  if (id) await db.user.update({ where: { id }, data });
  else await db.user.create({ data: { ...data, passwordHash: await bcrypt.hash(password, 10) } });
  revalidatePath("/employees");
  return ok(id ? "Employee updated." : `Login created for ${email}.`);
}

export async function resetPassword(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(fd, "id");
  const password = String(fd.get("password") ?? "");
  if (!id) return fail("Missing employee.");
  if (password.length < 8) return fail("Password must be at least 8 characters.");
  await db.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  return ok("Password reset. Share it with the employee securely.");
}

export async function toggleEmployeeActive(id: string) {
  const me = await requireAdmin();
  if (id === me.id) throw new Error("You can't deactivate yourself.");
  const u = await db.user.findUniqueOrThrow({ where: { id }, select: { active: true } });
  await db.user.update({ where: { id }, data: { active: !u.active } });
  revalidatePath("/employees");
}
