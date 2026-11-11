"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, requireUser } from "@/lib/auth";
import { fail, ok, str, type ActionState } from "@/lib/action-state";

// Simple in-memory throttle against password guessing (per email, per server instance).
const attempts = new Map<string, { n: number; until: number }>();

export async function login(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = (str(fd, "email") ?? "").toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return fail("Enter your email and password.");

  const a = attempts.get(email);
  if (a && a.until > Date.now()) return fail("Too many attempts. Try again in a few minutes.");

  const user = await db.user.findUnique({ where: { email } });
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !valid) {
    const n = (a?.n ?? 0) + 1;
    attempts.set(email, { n, until: n >= 5 ? Date.now() + 5 * 60_000 : 0 });
    return fail("Incorrect email or password.");
  }
  if (!user.active) return fail("Your account is deactivated. Contact your firm admin.");
  attempts.delete(email);
  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function changePassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (next.length < 8) return fail("New password must be at least 8 characters.");
  if (next !== confirm) return fail("New passwords do not match.");
  const user = await db.user.findUniqueOrThrow({ where: { id: me.id } });
  if (!(await bcrypt.compare(current, user.passwordHash))) return fail("Current password is incorrect.");
  await db.user.update({ where: { id: me.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  return ok("Password updated.");
}

export async function updateProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser();
  const name = str(fd, "name");
  if (!name) return fail("Name is required.");
  await db.user.update({ where: { id: me.id }, data: { name, mobile: str(fd, "mobile") } });
  return ok("Profile saved.");
}
