"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Building2, Calculator, ClipboardList, Inbox, LayoutDashboard, LogOut, Menu, UserCog, Users, X } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Avatar, cx } from "./ui";

type Props = {
  user: { name: string; role: "ADMIN" | "EMPLOYEE"; designation: string | null };
  firm: string;
  tagline: string;
  inboxCount: number;
  bell: React.ReactNode;
};

export function Sidebar({ user, firm, tagline, inboxCount, bell }: Props) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  const nav = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/tasks", label: user.role === "ADMIN" ? "Tasks" : "My Tasks", icon: ClipboardList },
    { href: "/clients", label: "Clients", icon: Building2 },
    ...(user.role === "ADMIN" ? [{ href: "/employees", label: "Employees", icon: Users }] : []),
    { href: "/inbox", label: "Inbox", icon: Inbox, count: inboxCount },
  ];
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <>
      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} className="icon-btn -ml-2" aria-label="Open menu"><Menu className="size-5" /></button>
        <span className="font-semibold">{firm}</span>
        {bell}
      </header>

      {open && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-line bg-panel transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-5">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white"><Calculator className="size-5" /></span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">{firm}</span>
              <span className="block truncate text-xs text-muted">{tagline}</span>
            </span>
          </Link>
          <button onClick={() => setOpen(false)} className="icon-btn lg:hidden" aria-label="Close menu"><X className="size-4" /></button>
          <span className="hidden lg:block">{bell}</span>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {nav.map(({ href, label, icon: Icon, count }) => (
            <Link
              key={href}
              href={href}
              className={cx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active(href) ? "bg-brand/15 text-blue-300" : "text-muted hover:bg-panel-2 hover:text-fg",
              )}
            >
              <Icon className="size-4" />
              <span className="flex-1">{label}</span>
              {!!count && <span className="rounded-full bg-brand px-1.5 text-[11px] leading-5 text-white">{count}</span>}
            </Link>
          ))}
        </nav>

        <div className="border-t border-line p-3">
          <Link href="/profile" className={cx("flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-panel-2", path === "/profile" && "bg-panel-2")}>
            <Avatar name={user.name} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{user.name}</span>
              <span className="block truncate text-xs text-muted">{user.role === "ADMIN" ? "Administrator" : user.designation || "Employee"}</span>
            </span>
            <UserCog className="size-4 text-faint" />
          </Link>
          <form action={logout}>
            <button className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted transition hover:bg-panel-2 hover:text-fg">
              <LogOut className="size-4" /> Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
