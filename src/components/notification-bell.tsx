"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { markNotificationsRead, openNotification } from "@/app/actions/inbox";
import { fmtDateTime } from "@/lib/format";
import { cx } from "./ui";

type Item = { id: string; title: string; body: string | null; link: string | null; read: boolean; at: string };

export function NotificationBell({ unread: serverUnread, items: serverItems }: { unread: number; items: Item[] }) {
  const [open, setOpen] = useState(false);
  // Local copy so "read" shows instantly; resyncs whenever the server sends fresh data.
  const [items, setItems] = useState(serverItems);
  useEffect(() => setItems(serverItems), [serverItems]);
  const unread = Math.min(serverUnread, items.filter((n) => !n.read).length);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="icon-btn relative" aria-label="Notifications">
        <Bell className="size-4" />
        {unread > 0 && <span className="absolute right-1 top-1 size-2 rounded-full bg-danger" />}
      </button>
      {open && (
        <div className="fixed left-4 right-4 top-16 z-[60] rounded-2xl border border-line bg-panel shadow-2xl sm:absolute sm:left-auto sm:right-auto sm:top-10 sm:w-96 lg:left-0">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <button
                onClick={() => {
                  setItems((xs) => xs.map((x) => ({ ...x, read: true })));
                  markNotificationsRead();
                }}
                className="text-xs text-blue-300 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted">You're all caught up.</p>}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  setOpen(false);
                  setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
                  if (n.link) router.push(n.link);
                  if (!n.read) openNotification(n.id); // background; no need to wait
                }}
                className={cx("block w-full border-b border-line/60 px-4 py-3 text-left transition last:border-0 hover:bg-panel-2", !n.read && "bg-brand/5")}
              >
                <p className="flex items-start gap-2 text-sm">
                  {!n.read && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />}
                  <span>{n.title}</span>
                </p>
                {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.body}</p>}
                <p className="mt-1 text-[11px] text-faint">{fmtDateTime(n.at)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
