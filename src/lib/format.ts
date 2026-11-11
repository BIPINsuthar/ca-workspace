// Shared labels, date helpers and Indian tax-ID validation (safe for client and server).

export const CONSTITUTIONS = {
  INDIVIDUAL: "Individual",
  PROPRIETORSHIP: "Proprietorship",
  PARTNERSHIP: "Partnership",
  LLP: "LLP",
  PRIVATE_LIMITED: "Private Limited",
  PUBLIC_LIMITED: "Public Limited",
  OPC: "One Person Company",
  HUF: "HUF",
  TRUST: "Trust",
  SOCIETY: "Society",
  AOP_BOI: "AOP / BOI",
  OTHER: "Other",
} as const;
export type ConstitutionKey = keyof typeof CONSTITUTIONS;

/** What to call the people behind each kind of entity. */
export const PARTNER_LABEL: Record<ConstitutionKey, string> = {
  INDIVIDUAL: "Individual",
  PROPRIETORSHIP: "Proprietor",
  PARTNERSHIP: "Partner",
  LLP: "Designated Partner",
  PRIVATE_LIMITED: "Director",
  PUBLIC_LIMITED: "Director",
  OPC: "Director",
  HUF: "Karta",
  TRUST: "Trustee",
  SOCIETY: "Office Bearer",
  AOP_BOI: "Member",
  OTHER: "Contact",
};

export const STATUSES = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  REVIEW: "Under Review",
  COMPLETED: "Completed",
} as const;
export type StatusKey = keyof typeof STATUSES;

export const PRIORITIES = { LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent" } as const;
export type PriorityKey = keyof typeof PRIORITIES;

export const RECURRENCES = {
  NONE: "One-time",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  HALF_YEARLY: "Half-yearly",
  YEARLY: "Yearly",
} as const;
export type RecurrenceKey = keyof typeof RECURRENCES;

export const LOG_TYPES = {
  CALL: "Call",
  MEETING: "Meeting",
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  NOTICE: "Notice",
  VISIT: "Visit",
  OTHER: "Other",
} as const;
export type LogTypeKey = keyof typeof LOG_TYPES;

export const TASK_CATEGORIES = [
  "GST",
  "Income Tax",
  "TDS / TCS",
  "Audit",
  "ROC / MCA",
  "Accounting",
  "Payroll",
  "Advance Tax",
  "Notice / Assessment",
  "Registration",
  "Advisory",
  "Other",
];

export const GST_STATES: Record<string, string> = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh", "05": "Uttarakhand",
  "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim",
  "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur", "15": "Mizoram", "16": "Tripura",
  "17": "Meghalaya", "18": "Assam", "19": "West Bengal", "20": "Jharkhand", "21": "Odisha",
  "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat", "26": "Dadra & Nagar Haveli and Daman & Diu",
  "27": "Maharashtra", "29": "Karnataka", "30": "Goa", "31": "Lakshadweep", "32": "Kerala",
  "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman & Nicobar Islands", "36": "Telangana",
  "37": "Andhra Pradesh", "38": "Ladakh", "97": "Other Territory",
};

export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/** GSTIN checksum (last character) per the GSTN algorithm. */
export function gstinChecksumOk(gstin: string) {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const v = chars.indexOf(gstin[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(v / 36) + (v % 36);
  }
  return chars[(36 - (sum % 36)) % 36] === gstin[14];
}

export function gstinInfo(gstin: string) {
  const g = gstin.toUpperCase();
  if (!GSTIN_RE.test(g)) return null;
  return { pan: g.slice(2, 12), state: GST_STATES[g.slice(0, 2)] ?? null, checksumOk: gstinChecksumOk(g) };
}

// ── Dates ─ the firm works in IST, and due dates are plain calendar dates ──

/** Today's date in India as YYYY-MM-DD. */
export function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

/** A @db.Date value (UTC midnight) → YYYY-MM-DD. */
export function ymd(d: Date | string | null | undefined): string {
  if (!d) return "";
  return (typeof d === "string" ? d : d.toISOString()).slice(0, 10);
}

export function addDays(day: string, n: number): string {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return ymd(d);
}

export function addMonths(day: string, n: number): string {
  const [y, m, dd] = day.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(dd, last));
  return ymd(target);
}

export function nextOccurrence(day: string, r: RecurrenceKey): string | null {
  switch (r) {
    case "MONTHLY": return addMonths(day, 1);
    case "QUARTERLY": return addMonths(day, 3);
    case "HALF_YEARLY": return addMonths(day, 6);
    case "YEARLY": return addMonths(day, 12);
    default: return null;
  }
}

export function toDbDate(day: string | null | undefined): Date | null {
  return day ? new Date(day + "T00:00:00Z") : null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 2026-11-18 → 18 Nov 2026 */
export function fmtDate(d: Date | string | null | undefined): string {
  const s = ymd(d);
  if (!s) return "—";
  const [y, m, dd] = s.split("-");
  return `${Number(dd)} ${MONTHS[Number(m) - 1]} ${y}`;
}

export function fmtDateTime(d: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
  }).format(new Date(d));
}

export function relativeDue(due: string, status: string, today = todayIST()) {
  if (!due) return { text: "No due date", tone: "muted" as const };
  if (status === "COMPLETED") return { text: `Due ${fmtDate(due)}`, tone: "muted" as const };
  if (due < today) {
    const days = Math.round((Date.parse(today) - Date.parse(due)) / 86400000);
    return { text: `Overdue by ${days} day${days === 1 ? "" : "s"} · ${fmtDate(due)}`, tone: "danger" as const };
  }
  if (due === today) return { text: "Due today", tone: "warn" as const };
  if (due === addDays(today, 1)) return { text: "Due tomorrow", tone: "warn" as const };
  return { text: `Due ${fmtDate(due)}`, tone: "muted" as const };
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

export function formatMobile(m: string | null | undefined) {
  if (!m) return "";
  const digits = m.replace(/\D/g, "");
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  return m;
}
