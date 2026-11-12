import "server-only";
import { db } from "./db";

/** In-app notification for each user in `userIds` (one DB call), skipping whoever caused it. */
export async function notify(userIds: string | Iterable<string | null | undefined>, actorId: string, title: string, link?: string, body?: string) {
  const ids = new Set(typeof userIds === "string" ? [userIds] : [...userIds].filter((x): x is string => !!x));
  ids.delete(actorId);
  if (!ids.size) return;
  await db.notification.createMany({ data: [...ids].map((userId) => ({ userId, title, link, body })) });
}
