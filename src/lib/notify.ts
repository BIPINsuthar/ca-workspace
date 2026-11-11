import "server-only";
import { db } from "./db";

/** In-app notification for `userId`, unless they caused it themselves. */
export async function notify(userId: string, actorId: string, title: string, link?: string, body?: string) {
  if (userId === actorId) return;
  await db.notification.create({ data: { userId, title, link, body } });
}
