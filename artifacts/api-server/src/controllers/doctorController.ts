import type { Request, Response } from "express";
import mongoose from "mongoose";
import { Doctor } from "../models/Doctor";
import { User } from "../models/User";
import { Appointment } from "../models/Appointment";
import { UpdateDoctorFeeSchema } from "../validators";
import { notifyRoles, notifyUser } from "../services/notify";

interface DoctorJSON {
  id: string;
  userId: string;
  name: string;
  email: string;
  specialty: string;
  bio: string | null;
  consultationMinutes: number;
  consultationFee: number;
  startTime: string;
  endTime: string;
  createdAt: string;
}

async function serializeDoctor(d: any): Promise<DoctorJSON> {
  const u = d.user && typeof d.user === "object" && "name" in d.user ? d.user : await User.findById(d.user);
  return {
    id: d._id.toString(),
    userId: u?._id?.toString() ?? d.user?.toString() ?? "",
    name: u?.name ?? "Unknown",
    email: u?.email ?? "",
    specialty: d.specialty,
    bio: d.bio ?? null,
    consultationMinutes: d.consultationMinutes,
    consultationFee: d.consultationFee ?? 0,
    startTime: d.startTime,
    endTime: d.endTime,
    createdAt: d.createdAt.toISOString(),
  };
}

export async function listDoctors(req: Request, res: Response): Promise<void> {
  const filter: Record<string, unknown> = {};
  if (typeof req.query["specialty"] === "string" && req.query["specialty"]) {
    filter["specialty"] = req.query["specialty"];
  }
  const docs = await Doctor.find(filter).populate("user").sort({ createdAt: 1 });
  const out: DoctorJSON[] = [];
  for (const d of docs) out.push(await serializeDoctor(d));
  res.json(out);
}

export async function getMyDoctorProfile(req: Request, res: Response): Promise<void> {
  const u = req.user!;
  if (u.role !== "doctor") {
    res.status(403).json({ error: "Only doctors have a doctor profile" });
    return;
  }
  const d = await Doctor.findOne({ user: new mongoose.Types.ObjectId(u.id) }).populate("user");
  if (!d) {
    res.status(404).json({ error: "Doctor profile not found" });
    return;
  }
  res.json(await serializeDoctor(d));
}

export async function getDoctor(req: Request, res: Response): Promise<void> {
  const id = req.params["id"];
  if (!id) {
    res.status(400).json({ error: "Doctor id required" });
    return;
  }
  const d = await Doctor.findById(id).populate("user");
  if (!d) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }
  res.json(await serializeDoctor(d));
}

export async function updateDoctorFee(req: Request, res: Response): Promise<void> {
  const id = req.params["id"];
  if (!id) {
    res.status(400).json({ error: "Doctor id required" });
    return;
  }
  const parsed = UpdateDoctorFeeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", issues: parsed.error.issues });
    return;
  }
  const d = await Doctor.findById(id);
  if (!d) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }
  const u = req.user!;
  if (u.role !== "admin") {
    if (u.role !== "doctor" || d.user.toString() !== u.id) {
      res.status(403).json({ error: "Only the owning doctor or an admin can update this fee" });
      return;
    }
  }

  d.consultationFee = parsed.data.consultationFee;
  await d.save();
  const populated = await Doctor.findById(d._id).populate("user");

  const ownerName = (await User.findById(d.user))?.name ?? "Doctor";
  await notifyUser(d.user, "Consultation fee updated", `Your fee is now ₹${parsed.data.consultationFee}.`);
  await notifyRoles(["admin"], "Doctor fee updated", `${ownerName}'s consultation fee is now ₹${parsed.data.consultationFee}.`);

  res.json(await serializeDoctor(populated));
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

export async function listDoctorSlots(req: Request, res: Response): Promise<void> {
  const id = req.params["id"];
  const dateStr = req.query["date"];
  if (!id || typeof dateStr !== "string" || !dateStr) {
    res.status(400).json({ error: "Doctor id and date required" });
    return;
  }
  const d = await Doctor.findById(id);
  if (!d) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }

  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  if (isNaN(dayStart.getTime())) {
    res.status(400).json({ error: "Invalid date" });
    return;
  }
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const start = timeToMinutes(d.startTime);
  const end = timeToMinutes(d.endTime);
  const step = d.consultationMinutes;

  const taken = await Appointment.find({
    doctor: d._id,
    scheduledAt: { $gte: dayStart, $lt: dayEnd },
    status: { $ne: "cancelled" },
  }).select("scheduledAt");

  const takenSet = new Set(taken.map((a) => a.scheduledAt.toISOString()));

  const slots: string[] = [];
  for (let m = start; m + step <= end; m += step) {
    const slot = new Date(dayStart.getTime() + m * 60 * 1000);
    if (slot.getTime() > Date.now() && !takenSet.has(slot.toISOString())) {
      slots.push(slot.toISOString());
    }
  }
  res.json(slots);
}
