"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, ok, str, type ActionState } from "@/lib/action-state";
import { notify } from "@/lib/notify";
import { toDbDate } from "@/lib/format";

export async function sendMessage(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser();
  const recipientId = str(fd, "recipientId");
  const body = str(fd, "body");
  if (!recipientId) return fail("Choose who to message.");
  if (!body) return fail("Write a message.");
  if (recipientId === me.id) return fail("You can't message yourself.");
  const r = await db.user.findUnique({ where: { id: recipientId }, select: { active: true } });
  if (!r?.active) return fail("That user is inactive.");
  await Promise.all([
    db.message.create({ data: { senderId: me.id, recipientId, body, subject: str(fd, "subject") } }),
    notify(recipientId, me.id, `New message from ${me.name}`, `/inbox?tab=messages&with=${me.id}`, body.slice(0, 140)),
  ]);
  revalidatePath("/inbox");
  return ok(undefined, recipientId);
}

export async function markThreadRead(otherId: string) {
  const me = await requireUser();
  await db.message.updateMany({ where: { senderId: otherId, recipientId: me.id, readAt: null }, data: { readAt: new Date() } });
}

export async function saveReminder(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser();
  const id = str(fd, "id");
  const title = str(fd, "title");
  const remindOn = str(fd, "remindOn");
  if (!title) return fail("Title is required.");
  if (!remindOn) return fail("Pick a date.");
  const data = { title, note: str(fd, "note"), remindOn: toDbDate(remindOn)! };
  if (id) await db.reminder.updateMany({ where: { id, userId: me.id }, data });
  else await db.reminder.create({ data: { ...data, userId: me.id } });
  revalidatePath("/inbox");
  revalidatePath("/");
  return ok();
}

export async function toggleReminder(id: string) {
  const me = await requireUser();
  const r = await db.reminder.findFirstOrThrow({ where: { id, userId: me.id } });
  await db.reminder.update({ where: { id }, data: { done: !r.done } });
  revalidatePath("/inbox");
  revalidatePath("/");
}

export async function deleteReminder(id: string) {
  const me = await requireUser();
  await db.reminder.deleteMany({ where: { id, userId: me.id } });
  revalidatePath("/inbox");
}

export async function markNotificationsRead() {
  const me = await requireUser();
  await db.notification.updateMany({ where: { userId: me.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/inbox");
}

export async function openNotification(id: string) {
  const me = await requireUser();
  // No revalidation: the bell already shows it as read, and re-rendering every page here would slow navigation.
  await db.notification.updateMany({ where: { id, userId: me.id }, data: { readAt: new Date() } });
}
