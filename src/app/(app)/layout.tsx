import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/sidebar";
import { NotificationBell } from "@/components/notification-bell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  const [unreadMessages, notifications, unreadCount] = await Promise.all([
    db.message.count({ where: { recipientId: me.id, readAt: null } }),
    db.notification.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, take: 12 }),
    db.notification.count({ where: { userId: me.id, readAt: null } }),
  ]);

  return (
    <div className="min-h-dvh lg:pl-64">
      <Sidebar
        user={{ name: me.name, role: me.role, designation: me.designation }}
        firm={process.env.FIRM_NAME || "LedgerPulse"}
        tagline={process.env.FIRM_TAGLINE || "CA Workspace Manager"}
        inboxCount={unreadMessages}
        bell={
          <NotificationBell
            unread={unreadCount}
            items={notifications.map((n) => ({ id: n.id, title: n.title, body: n.body, link: n.link, read: !!n.readAt, at: n.createdAt.toISOString() }))}
          />
        }
      />
      <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-20 sm:px-6 lg:px-8 lg:pt-8">{children}</main>
    </div>
  );
}
