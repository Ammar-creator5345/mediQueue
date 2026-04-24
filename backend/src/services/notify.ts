import mongoose from "mongoose";
import { Notification } from "../models/Notification";
import { User, type UserRole } from "../models/User";

export async function notifyUser(
  userId: mongoose.Types.ObjectId | string,
  title: string,
  body: string
): Promise<void> {
  const id = typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;
  await Notification.create({ user: id, title, body });
}

export async function notifyRoles(
  roles: UserRole[],
  title: string,
  body: string
): Promise<void> {
  if (roles.length === 0) return;
  const users = await User.find({ role: { $in: roles } }).select("_id");
  if (users.length === 0) return;
  await Notification.insertMany(
    users.map((u) => ({ user: u._id, title, body, read: false }))
  );
}
