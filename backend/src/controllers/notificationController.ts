import type { Request, Response } from "express";
import { listNotificationsForUser, markNotificationReadForUser } from "../repo/notifications";

function serialize(n: any) {
  return {
    id: n.id,
    userId: n.user_id,
    title: n.title,
    body: n.body,
    read: n.read,
    createdAt: n.created_at.toISOString(),
  };
}

export async function listNotifications(req: Request, res: Response): Promise<void> {
  const u = req.user!;
  const items = await listNotificationsForUser(u.id);
  res.json(items.map(serialize));
}

export async function markNotificationRead(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"] ?? "");
  if (!id) {
    res.status(400).json({ error: "id required" });
    return;
  }
  const u = req.user!;
  const n = await markNotificationReadForUser(u.id, id);
  if (!n) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  res.json(serialize(n));
}
