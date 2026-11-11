import Link from "next/link";
import { initials, PRIORITIES, STATUSES, type PriorityKey, type StatusKey } from "@/lib/format";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const palette = ["bg-blue-500/20 text-blue-300", "bg-emerald-500/20 text-emerald-300", "bg-amber-500/20 text-amber-300", "bg-violet-500/20 text-violet-300", "bg-rose-500/20 text-rose-300", "bg-cyan-500/20 text-cyan-300"];
  const tone = palette[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length];
  const s = size === "sm" ? "size-6 text-[10px]" : size === "lg" ? "size-11 text-sm" : "size-8 text-xs";
  return <span className={cx("inline-flex shrink-0 items-center justify-center rounded-full font-semibold", s, tone)}>{initials(name)}</span>;
}

const BADGE = {
  gray: "bg-slate-500/15 text-slate-300 ring-slate-500/25",
  blue: "bg-blue-500/15 text-blue-300 ring-blue-500/25",
  green: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25",
  amber: "bg-amber-500/15 text-amber-300 ring-amber-500/25",
  red: "bg-red-500/15 text-red-300 ring-red-500/25",
  violet: "bg-violet-500/15 text-violet-300 ring-violet-500/25",
};
export type BadgeTone = keyof typeof BADGE;

export function Badge({ tone = "gray", children, className }: { tone?: BadgeTone; children: React.ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset", BADGE[tone], className)}>{children}</span>;
}

export const PRIORITY_TONE: Record<PriorityKey, BadgeTone> = { LOW: "gray", MEDIUM: "blue", HIGH: "amber", URGENT: "red" };
export const STATUS_TONE: Record<StatusKey, BadgeTone> = { PENDING: "amber", IN_PROGRESS: "blue", REVIEW: "violet", COMPLETED: "green" };
export const STATUS_COLOR: Record<StatusKey, string> = { PENDING: "#f59e0b", IN_PROGRESS: "#3b82f6", REVIEW: "#8b5cf6", COMPLETED: "#10b981" };

export function PriorityBadge({ p }: { p: PriorityKey }) {
  return <Badge tone={PRIORITY_TONE[p]}>{PRIORITIES[p]}</Badge>;
}
export function StatusBadge({ s }: { s: StatusKey }) {
  return <Badge tone={STATUS_TONE[s]}>{STATUSES[s]}</Badge>;
}

export function Field({ label, hint, children, className }: { label: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
    </label>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Tabs({ items, active }: { items: { key: string; label: string; href: string; count?: number }[]; active: string }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-line bg-panel p-1">
      {items.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={cx(
            "flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition",
            active === t.key ? "bg-panel-2 text-fg" : "text-muted hover:text-fg",
          )}
        >
          {t.label}
          {!!t.count && <span className="rounded-full bg-brand px-1.5 text-[11px] leading-5 text-white">{t.count}</span>}
        </Link>
      ))}
    </div>
  );
}
