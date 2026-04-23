import type { Request, Response } from "express";
import { Doctor } from "../models/Doctor";
import { User } from "../models/User";
import { Appointment } from "../models/Appointment";

interface DoctorJSON {
  id: string;
  userId: string;
  name: string;
  email: string;
  specialty: string;
  bio: string | null;
  consultationMinutes: number;
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
