import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { csvResponse, toCsv } from "@/lib/csv";
import { CONSTITUTIONS, todayIST } from "@/lib/format";

export async function GET() {
  const me = await getUser();
  if (!me) return new Response("Unauthorized", { status: 401 });
  const clients = await db.client.findMany({ orderBy: { name: "asc" }, include: { partners: true, manager: { select: { name: true } } } });
  const csv = toCsv(
    ["Name", "Constitution", "GSTIN", "PAN", "Email", "Mobile", "Address", "City", "State", "PIN", "Partners", "Partner emails", "Partner mobiles", "Handled by", "Active"],
    clients.map((c) => [
      c.name, CONSTITUTIONS[c.constitution], c.gstin, c.pan, c.email, c.mobile, c.address, c.city, c.state, c.pincode,
      c.partners.map((p) => p.name).join("; "),
      c.partners.map((p) => p.email).filter(Boolean).join("; "),
      c.partners.map((p) => p.mobile).filter(Boolean).join("; "),
      c.manager?.name, c.active ? "Yes" : "No",
    ]),
  );
  return csvResponse(`clients-${todayIST()}.csv`, csv);
}
