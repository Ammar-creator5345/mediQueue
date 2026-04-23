import type { Request, Response } from "express";
import mongoose from "mongoose";
import { Notification } from "../models/Notification";

function serialize(n: any) {
  return {
    id: n._id.toString(),
    userId: n.user.toString(),
    title: n.title,
    body: n.body,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  };
}

export async function listNotifications(req: Request, res: Response): Promise<void> {
  const u = req.user!;
  const items = await Notification.find({ user: new mongoose.Types.ObjectId(u.id) })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json(items.map(serialize));
}

export async function markNotificationRead(req: Request, res: Response): Promise<void> {
  const id = req.params["id"];
  if (!id) {
    res.status(400).json({ error: "id required" });
    return;
  }
  const u = req.user!;
  const n = await Notification.findOneAndUpdate(
    { _id: id, user: new mongoose.Types.ObjectId(u.id) },
    { read: true },
    { new: true }
  );
  if (!n) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  res.json(serialize(n));
}
