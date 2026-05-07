import type { Request, Response } from "express";
import { findDoctorById, findDoctorByUserId, findDoctorWithUserById, findDoctorWithUserByUserId, listDoctorsWithUser, updateDoctor } from "../repo/doctors";
import { updateUserName } from "../repo/users";
import { listAppointmentsForDoctorOnDay } from "../repo/appointments";
import { UpdateDoctorProfileSchema } from "../validators";
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
  return {
    id: d.id,
    userId: d.user_id,
    name: d.user_name ?? "Unknown",
    email: d.user_email ?? "",
    specialty: d.specialty,
    bio: d.bio ?? null,
    consultationMinutes: d.consultation_minutes,
    consultationFee: Number(d.consultation_fee ?? 0),
    startTime: d.start_time,
    endTime: d.end_time,
    createdAt: d.created_at.toISOString(),
  };
}

export async function listDoctors(req: Request, res: Response): Promise<void> {
  const filter: Record<string, unknown> = {};
  if (typeof req.query["specialty"] === "string" && req.query["specialty"]) {
    filter["specialty"] = req.query["specialty"];
  }
  const docs = await listDoctorsWithUser({ specialty: filter["specialty"] as any });
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
  const d = await findDoctorWithUserByUserId(u.id);
  if (!d) {
    res.status(404).json({ error: "Doctor profile not found" });
    return;
  }
  res.json(await serializeDoctor(d));
}

export async function updateMyDoctorProfile(req: Request, res: Response): Promise<void> {
  const u = req.user!;
  if (u.role !== "doctor") {
    res.status(403).json({ error: "Only doctors can update their profile" });
    return;
  }
  const parsed = UpdateDoctorProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", issues: parsed.error.issues });
    return;
  }
  const d = await findDoctorByUserId(u.id);
  if (!d) {
    res.status(404).json({ error: "Doctor profile not found" });
    return;
  }

  const data = parsed.data;
  if (data.startTime && data.endTime && data.startTime >= data.endTime) {
    res.status(400).json({ error: "Start time must be before end time" });
    return;
  }
  if (data.startTime && !data.endTime && data.startTime >= d.end_time) {
    res.status(400).json({ error: "Start time must be before current end time" });
    return;
  }
  if (data.endTime && !data.startTime && d.start_time >= data.endTime) {
    res.status(400).json({ error: "End time must be after current start time" });
    return;
  }

  const feeChanged = data.consultationFee !== undefined && Number(d.consultation_fee) !== data.consultationFee;

  await updateDoctor(d.id, {
    ...(data.specialty !== undefined ? { specialty: data.specialty } : {}),
    ...(data.consultationFee !== undefined ? { consultation_fee: data.consultationFee } : {}),
    ...(data.startTime !== undefined ? { start_time: data.startTime } : {}),
    ...(data.endTime !== undefined ? { end_time: data.endTime } : {}),
  });

  if (data.name) {
    await updateUserName(d.user_id, data.name);
  }

  await notifyUser(d.user_id, "Profile updated", "Your doctor profile has been updated successfully.");
  if (feeChanged) {
    const populated = await findDoctorWithUserById(d.id);
    const ownerName = populated?.user_name ?? "Doctor";
    await notifyRoles(["admin"], "Doctor fee updated", `${ownerName}'s consultation fee is now ₹${data.consultationFee}.`);
  }

  const populated = await findDoctorWithUserById(d.id);
  res.json(await serializeDoctor(populated));
}

export async function getDoctor(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"] ?? "");
  if (!id) {
    res.status(400).json({ error: "Doctor id required" });
    return;
  }
  const d = await findDoctorWithUserById(id);
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
  const id = String(req.params["id"] ?? "");
  const dateStr = req.query["date"];
  if (!id || typeof dateStr !== "string" || !dateStr) {
    res.status(400).json({ error: "Doctor id and date required" });
    return;
  }
  const d = await findDoctorById(id);
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

  const start = timeToMinutes(d.start_time);
  const end = timeToMinutes(d.end_time);
  const step = d.consultation_minutes;

  const taken = await listAppointmentsForDoctorOnDay(d.id, dayStart, dayEnd);

  const takenSet = new Set(taken.map((a) => new Date(a.scheduled_at).toISOString()));

  const slots: string[] = [];
  for (let m = start; m + step <= end; m += step) {
    const slot = new Date(dayStart.getTime() + m * 60 * 1000);
    if (slot.getTime() > Date.now() && !takenSet.has(slot.toISOString())) {
      slots.push(slot.toISOString());
    }
  }
  res.json(slots);
}
