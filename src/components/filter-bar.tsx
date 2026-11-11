"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

export type FilterDef = { key: string; label: string; options: { value: string; label: string }[] };

/** URL-driven filters: every change updates the query string so views are shareable. */
export function FilterBar({ filters, searchPlaceholder, children }: { filters: FilterDef[]; searchPlaceholder?: string; children?: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("new");
    router.replace(`${path}${next.size ? `?${next}` : ""}`, { scroll: false });
  };

  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    const t = setTimeout(() => set("q", q.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const active = filters.some((f) => params.get(f.key)) || !!params.get("q");

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {searchPlaceholder && (
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} className="field pl-9" />
        </div>
      )}
      {filters.map((f) => (
        <select key={f.key} value={params.get(f.key) ?? ""} onChange={(e) => set(f.key, e.target.value)} className="field min-w-0 basis-[calc(50%-0.25rem)] sm:w-auto sm:basis-auto" aria-label={f.label}>
          <option value="">{f.label}</option>
          {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ))}
      {active && (
        <button
          onClick={() => {
            setQ("");
            const keep = new URLSearchParams();
            const view = params.get("view");
            if (view) keep.set("view", view);
            router.replace(`${path}${keep.size ? `?${keep}` : ""}`);
          }}
          className="btn text-muted hover:text-fg"
        >
          <X className="size-4" /> Clear
        </button>
      )}
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </div>
  );
}
