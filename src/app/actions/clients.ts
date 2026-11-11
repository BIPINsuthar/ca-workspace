"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Constitution, LogType } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { fail, ok, str, type ActionState } from "@/lib/action-state";
import { CONSTITUTIONS, GST_STATES, GSTIN_RE, LOG_TYPES, PAN_RE, toDbDate } from "@/lib/format";

type PartnerInput = { name: string; designation?: string; email?: string; mobile?: string; pan?: string; din?: string };

function parseClient(fd: FormData) {
  const name = str(fd, "name");
  if (!name) return { error: "Client name is required." } as const;

  const constitution = str(fd, "constitution") ?? "PROPRIETORSHIP";
  if (!(constitution in CONSTITUTIONS)) return { error: "Choose a valid constitution type." } as const;

  const gstin = str(fd, "gstin")?.toUpperCase().replace(/\s/g, "") ?? null;
  if (gstin && !GSTIN_RE.test(gstin)) return { error: "GSTIN must be 15 characters, e.g. 27AABCS1429B1Z1." } as const;

  let pan = str(fd, "pan")?.toUpperCase().replace(/\s/g, "") ?? null;
  if (!pan && gstin) pan = gstin.slice(2, 12);
  if (pan && !PAN_RE.test(pan)) return { error: "PAN must look like ABCDE1234F." } as const;

  const email = str(fd, "email")?.toLowerCase() ?? null;
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email address." } as const;

  const mobile = str(fd, "mobile");
  if (mobile && mobile.replace(/\D/g, "").length < 10) return { error: "Mobile number looks too short." } as const;

  let partners: PartnerInput[] = [];
  try {
    partners = (JSON.parse(String(fd.get("partners") ?? "[]")) as PartnerInput[])
      .map((p) => ({
        name: (p.name ?? "").trim(),
        designation: p.designation?.trim() || undefined,
        email: p.email?.trim().toLowerCase() || undefined,
        mobile: p.mobile?.trim() || undefined,
        pan: p.pan?.trim().toUpperCase() || undefined,
        din: p.din?.trim() || undefined,
      }))
      .filter((p) => p.name);
  } catch {
    return { error: "Could not read partner details." } as const;
  }

  return {
    data: {
      name,
      constitution: constitution as Constitution,
      gstin,
      pan,
      email,
      mobile,
      address: str(fd, "address"),
      city: str(fd, "city"),
      state: str(fd, "state") ?? (gstin ? GST_STATES[gstin.slice(0, 2)] ?? null : null),
      pincode: str(fd, "pincode"),
      notes: str(fd, "notes"),
      managerId: str(fd, "managerId"),
    },
    partners,
  } as const;
}

export async function saveClient(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(fd, "id");
  const parsed = parseClient(fd);
  if ("error" in parsed) return fail(parsed.error!);
  const { data, partners } = parsed;

  if (data.gstin) {
    const dup = await db.client.findFirst({ where: { gstin: data.gstin, NOT: id ? { id } : undefined }, select: { name: true } });
    if (dup) return fail(`GSTIN already belongs to ${dup.name}.`);
  }

  let clientId = id;
  if (id) {
    await db.$transaction([
      db.client.update({ where: { id }, data }),
      db.partner.deleteMany({ where: { clientId: id } }),
      db.partner.createMany({ data: partners.map((p) => ({ ...p, clientId: id })) }),
    ]);
  } else {
    const c = await db.client.create({ data: { ...data, partners: { create: partners } } });
    clientId = c.id;
  }
  revalidatePath("/clients");
  redirect(`/clients/${clientId}`);
}

export async function deleteClient(id: string) {
  await requireAdmin();
  await db.client.delete({ where: { id } });
  revalidatePath("/clients");
  redirect("/clients");
}

export async function toggleClientActive(id: string) {
  await requireAdmin();
  const c = await db.client.findUniqueOrThrow({ where: { id }, select: { active: true } });
  await db.client.update({ where: { id }, data: { active: !c.active } });
  revalidatePath(`/clients/${id}`);
  revalidatePath("/clients");
}

export async function saveClientLog(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser();
  const id = str(fd, "id");
  const clientId = str(fd, "clientId");
  const summary = str(fd, "summary");
  const date = str(fd, "date");
  const type = str(fd, "type") ?? "CALL";
  if (!clientId) return fail("Choose a client.");
  if (!summary) return fail("Write a short summary.");
  if (!date) return fail("Pick the date.");
  if (!(type in LOG_TYPES)) return fail("Choose a valid type.");
  const data = {
    clientId,
    summary,
    date: toDbDate(date)!,
    type: type as LogType,
    contactPerson: str(fd, "contactPerson"),
    followUpOn: toDbDate(str(fd, "followUpOn")),
  };
  if (id) {
    const log = await db.clientLog.findUniqueOrThrow({ where: { id } });
    if (me.role !== "ADMIN" && log.loggedById !== me.id) return fail("You can only edit your own entries.");
    await db.clientLog.update({ where: { id }, data });
  } else {
    await db.clientLog.create({ data: { ...data, loggedById: me.id } });
  }
  revalidatePath("/inbox");
  revalidatePath(`/clients/${clientId}`);
  return ok();
}

export async function deleteClientLog(id: string) {
  const me = await requireUser();
  const log = await db.clientLog.findUniqueOrThrow({ where: { id } });
  if (me.role !== "ADMIN" && log.loggedById !== me.id) throw new Error("Not allowed");
  await db.clientLog.delete({ where: { id } });
  revalidatePath("/inbox");
  revalidatePath(`/clients/${log.clientId}`);
}
