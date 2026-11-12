/**
 * Seeds the first admin login (from SEED_ADMIN_* in .env) and, if SEED_DEMO="true",
 * a demo workspace. Safe to run more than once.
 *   npm run db:seed
 */
import { PrismaClient, type Priority, type Recurrence, type TaskStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const day = (offset: number) => {
  const d = new Date(today + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
};

/** Supabase exposes public tables through its Data API; lock them (the app connects as the table owner, so it is unaffected). */
async function lockTables() {
  await db.$executeRawUnsafe(`
    DO $$
    DECLARE t record;
    BEGIN
      FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
      END LOOP;
    END $$;`);
  console.log("✔ Row level security enabled on all tables");
}

async function main() {
  await lockTables();
  const email = (process.env.SEED_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "";
  const name = process.env.SEED_ADMIN_NAME || "Firm Admin";
  if (!email || password.length < 8) {
    if ((await db.user.count({ where: { role: "ADMIN" } })) > 0) return; // already set up
    throw new Error("No admin exists yet. Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (8+ characters) in your environment variables.");
  }

  const existing = await db.user.findUnique({ where: { email } });
  const admin = existing
    ? await db.user.update({ where: { email }, data: { role: "ADMIN", active: true } })
    : await db.user.create({
        data: { email, name, role: "ADMIN", designation: "Partner", passwordHash: await bcrypt.hash(password, 10) },
      });
  console.log(existing ? `✔ Admin ${email} already exists (password unchanged)` : `✔ Created admin ${email}`);

  if (process.env.SEED_DEMO !== "true") return;
  if ((await db.client.count()) > 0) {
    console.log("• Clients already exist, skipping demo data");
    return;
  }

  const empHash = await bcrypt.hash("Employee@123", 10);
  const mk = (n: string, e: string, d: string, m: string, j: string) =>
    db.user.upsert({
      where: { email: e },
      update: {},
      create: { name: n, email: e, designation: d, mobile: m, joinedOn: new Date(j), passwordHash: empHash },
    });
  const rahul = await mk("Rahul Sharma", "rahul@cafirm.in", "Senior Accountant", "9820011223", "2019-04-01");
  const priya = await mk("Priya Mehta", "priya@cafirm.in", "Tax Associate", "9820044556", "2021-07-15");
  const arjun = await mk("Arjun Nair", "arjun@cafirm.in", "Audit Assistant", "9820077889", "2023-01-10");

  const client = (data: Parameters<typeof db.client.create>[0]["data"]) => db.client.create({ data });
  const sharma = await client({
    name: "Sharma Textiles Pvt Ltd", constitution: "PRIVATE_LIMITED", gstin: "27AABCS1429B1Z1", pan: "AABCS1429B",
    email: "accounts@sharmatextiles.in", mobile: "2240012233", address: "201, Textile Market, Andheri East",
    city: "Mumbai", state: "Maharashtra", pincode: "400069", managerId: rahul.id,
    partners: { create: [
      { name: "Rajesh Agrawal", designation: "Director", email: "rajesh@sharmatextiles.in", mobile: "9821012345", din: "01234567" },
      { name: "Sunita Agrawal", designation: "Director", email: "sunita@sharmatextiles.in", mobile: "9821054321" },
    ] },
  });
  const gokul = await client({
    name: "Gokul Foods", constitution: "PARTNERSHIP", gstin: "27AACFG5678C1ZK", pan: "AACFG5678C",
    email: "gokulfoods@gmail.com", mobile: "9821133445", address: "12, APMC Yard, Vashi", city: "Navi Mumbai",
    state: "Maharashtra", pincode: "400703", managerId: priya.id,
    partners: { create: [
      { name: "Nikhil Shah", designation: "Partner", email: "nikhil@gokulfoods.in", mobile: "9867011122" },
      { name: "Kiran Shah", designation: "Partner", mobile: "9867033344" },
    ] },
  });
  const kulkarni = await client({
    name: "Kulkarni & Sons", constitution: "PROPRIETORSHIP", gstin: "27AEFPK1234A1Z5", pan: "AEFPK1234A",
    email: "kulkarni.sons@outlook.com", mobile: "2024456677", address: "57, Laxmi Road", city: "Pune",
    state: "Maharashtra", pincode: "411002", managerId: priya.id,
    partners: { create: [{ name: "Sanjay Kulkarni", designation: "Proprietor", mobile: "9890012345", email: "sanjay@kulkarnisons.in" }] },
  });
  const nova = await client({
    name: "Nova Tech Solutions LLP", constitution: "LLP", gstin: "29AAGFN7890D1Z2", pan: "AAGFN7890D",
    email: "finance@novatech.io", mobile: "8045678899", address: "4th Floor, Prestige Tech Park", city: "Bengaluru",
    state: "Karnataka", pincode: "560103", managerId: arjun.id,
    partners: { create: [
      { name: "Sana Rao", designation: "Designated Partner", email: "sana@novatech.io", mobile: "9845012345" },
      { name: "Vikram Iyer", designation: "Designated Partner", email: "vikram@novatech.io", mobile: "9845067890" },
    ] },
  });
  const bapu = await client({
    name: "Bapu Charitable Trust", constitution: "TRUST", gstin: "27AAATB3456E1ZL", pan: "AAATB3456E",
    email: "office@baputrust.org", mobile: "9867544332", address: "Sector 17, Vashi", city: "Navi Mumbai",
    state: "Maharashtra", pincode: "400705",
    partners: { create: [{ name: "Anand Joshi", designation: "Managing Trustee", mobile: "9867500011" }] },
  });

  type T = [string, string, string | null, string, TaskStatus, Priority, number, Recurrence, string];
  const tasks: T[] = [
    ["GSTR-3B filing — Sharma Textiles", sharma.id, rahul.id, "GST", "PENDING", "HIGH", 7, "MONTHLY", "Reconcile ITC with GSTR-2B and file 3B."],
    ["GST notice reply — Gokul Foods", gokul.id, priya.id, "Notice / Assessment", "PENDING", "URGENT", -4, "NONE", "Reply to ASMT-10 shortfall notice with workings."],
    ["ITR filing — Kulkarni & Sons", kulkarni.id, priya.id, "Income Tax", "PENDING", "MEDIUM", -2, "NONE", "Collect 26AS, AIS and bank statements."],
    ["Payroll processing — Nova Tech", nova.id, arjun.id, "Payroll", "IN_PROGRESS", "MEDIUM", 0, "MONTHLY", ""],
    ["Tax audit fieldwork — Nova Tech", nova.id, arjun.id, "Audit", "PENDING", "HIGH", 2, "NONE", "Form 3CD clauses 1–20, vouching sample."],
    ["ROC annual filing — Sharma Textiles", sharma.id, rahul.id, "ROC / MCA", "PENDING", "MEDIUM", 5, "YEARLY", "AOC-4 and MGT-7."],
    ["Advance tax computation — Kulkarni & Sons", kulkarni.id, rahul.id, "Advance Tax", "REVIEW", "MEDIUM", 8, "QUARTERLY", ""],
    ["GSTR-1 filing — Nova Tech", nova.id, priya.id, "GST", "PENDING", "HIGH", 21, "MONTHLY", ""],
    ["TDS 26Q return — Gokul Foods", gokul.id, rahul.id, "TDS / TCS", "IN_PROGRESS", "MEDIUM", -1, "QUARTERLY", ""],
    ["Bookkeeping review — Gokul Foods", gokul.id, arjun.id, "Accounting", "IN_PROGRESS", "LOW", 3, "MONTHLY", ""],
    ["Client onboarding — Bapu Trust", bapu.id, priya.id, "Registration", "COMPLETED", "LOW", -7, "NONE", "12A / 80G documents collected."],
    ["GSTR-1 filing — Sharma Textiles", sharma.id, rahul.id, "GST", "COMPLETED", "HIGH", -0, "NONE", ""],
    ["Form 10B audit report — Bapu Trust", bapu.id, null, "Audit", "PENDING", "MEDIUM", 14, "YEARLY", ""],
  ];
  for (const [title, clientId, assigneeId, category, status, priority, due, recurrence, description] of tasks) {
    const t = await db.task.create({
      data: {
        title, clientId, assigneeId, category, status, priority, recurrence, description: description || null,
        dueDate: day(due), createdById: admin.id,
        completedAt: status === "COMPLETED" ? new Date(Date.now() - Math.abs(due) * 86400000) : null,
      },
    });
    await db.taskActivity.create({ data: { taskId: t.id, actorId: admin.id, action: "created this task" } });
  }

  const gst = await db.task.findFirst({ where: { title: "GSTR-3B filing — Sharma Textiles" } });
  if (gst) {
    await db.taskComment.createMany({ data: [
      { taskId: gst.id, authorId: rahul.id, body: "90% reconciled. Two supplier invoices mismatched in 2B — following up with vendor." },
      { taskId: gst.id, authorId: admin.id, body: "Please share the mismatch sheet before filing." },
    ] });
  }

  await db.message.createMany({ data: [
    { senderId: admin.id, recipientId: rahul.id, subject: "GSTR-3B documents", body: "Hi Rahul, have the purchase invoices for Sharma Textiles been reconciled? Filing is due this week.", createdAt: new Date(Date.now() - 2 * 86400000) },
    { senderId: rahul.id, recipientId: admin.id, body: "Almost done — 90% reconciled. Two supplier invoices are mismatched; sharing the file for your review.", createdAt: new Date(Date.now() - 86400000) },
    { senderId: admin.id, recipientId: priya.id, subject: "ITR documents pending", body: "Please chase Kulkarni & Sons for the AIS and loan interest certificate." },
    { senderId: admin.id, recipientId: arjun.id, subject: "Tax audit checklist", body: "Shared the 3CD checklist in the drive. Start with fixed assets." },
  ] });

  await db.clientLog.createMany({ data: [
    { clientId: nova.id, date: day(-5), type: "CALL", summary: "Discussed advance tax instalment and books closure timeline with their finance head.", contactPerson: "Sana Rao", loggedById: priya.id },
    { clientId: sharma.id, date: day(-6), type: "MEETING", summary: "Quarterly review; discussed ITC reconciliation and pending vendor bills.", contactPerson: "Rajesh Agrawal", loggedById: admin.id, followUpOn: day(3) },
    { clientId: kulkarni.id, date: day(-8), type: "EMAIL", summary: "Sent reminder for Form 26AS, bank statements and loan interest certificates.", contactPerson: "Sanjay Kulkarni", loggedById: priya.id },
    { clientId: gokul.id, date: day(-10), type: "NOTICE", summary: "Received GST shortfall notice; drafted reply with workings, awaiting partner sign-off.", contactPerson: "Nikhil Shah", loggedById: admin.id },
  ] });

  await db.reminder.createMany({ data: [
    { userId: admin.id, title: "Renew practising certificate", note: "COP renewal due end of month.", remindOn: day(6) },
    { userId: admin.id, title: "Follow up TDS software licence", note: "Call vendor for renewal quote.", remindOn: day(-1) },
  ] });

  console.log("✔ Demo workspace created (employees log in with password Employee@123)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
