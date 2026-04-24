import type { Request, Response } from "express";
import mongoose from "mongoose";
import { QueueToken } from "../models/QueueToken";
import { Doctor } from "../models/Doctor";
import { User } from "../models/User";
import { AddWalkInSchema, UpdateQueueTokenSchema } from "../validators";
import { dayKeyFor, nextTokenNumber } from "../services/queueHelpers";
import { notifyUser, notifyRoles } from "../services/notify";

async function serializeToken(t: any) {
  const doctor = t.doctor && typeof t.doctor === "object" && "specialty" in t.doctor
    ? t.doctor
    : await Doctor.findById(t.doctor).populate("user");
  const docUser = doctor?.user && typeof doctor.user === "object" && "name" in doctor.user
    ? doctor.user
    : doctor?.user
    ? await User.findById(doctor.user)
    : null;
  return {
    id: t._id.toString(),
    tokenNumber: t.tokenNumber,
    appointmentId: t.appointment?.toString() ?? null,
    patientId: t.patient?.toString() ?? null,
    patientName: t.patientName,
    patientPhone: t.patientPhone ?? null,
    doctorId: doctor?._id?.toString() ?? t.doctor?.toString() ?? "",
    doctorName: docUser?.name ?? "Doctor",
    specialty: doctor?.specialty ?? "",
    status: t.status,
    source: t.source,
    notes: t.notes ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

function todayUTCDayPrefix(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}-`;
}

export async function listQueue(req: Request, res: Response): Promise<void> {
  const u = req.user!;
  const filter: Record<string, unknown> = {
    dayKey: { $regex: `^${todayUTCDayPrefix()}` },
  };
  if (typeof req.query["doctorId"] === "string" && req.query["doctorId"]) {
    filter["doctor"] = new mongoose.Types.ObjectId(req.query["doctorId"]);
  }
  if (typeof req.query["status"] === "string" && req.query["status"]) {
    filter["status"] = req.query["status"];
  }
  if (u.role === "doctor") {
    const doc = await Doctor.findOne({ user: new mongoose.Types.ObjectId(u.id) });
    if (!doc) {
      res.json([]);
      return;
    }
    // Doctor isolation: they can ONLY see their own queue regardless of any doctorId query
    filter["doctor"] = doc._id;
  } else if (u.role === "patient") {
    filter["patient"] = new mongoose.Types.ObjectId(u.id);
  }

  const tokens = await QueueToken.find(filter)
    .populate({ path: "doctor", populate: { path: "user" } })
    .sort({ tokenNumber: 1 });
  const out = [];
  for (const t of tokens) out.push(await serializeToken(t));
  res.json(out);
}

export async function addWalkIn(req: Request, res: Response): Promise<void> {
  const parsed = AddWalkInSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", issues: parsed.error.issues });
    return;
  }
  const data = parsed.data;
  const doctor = await Doctor.findById(data.doctorId).populate("user");
  if (!doctor) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }
  const dayKey = dayKeyFor(doctor._id);
  const tokenNumber = await nextTokenNumber(dayKey);
  const token = await QueueToken.create({
    tokenNumber,
    doctor: doctor._id,
    patientName: data.patientName,
    patientPhone: data.patientPhone ?? null,
    notes: data.notes ?? null,
    source: "walkin",
    status: "waiting",
    dayKey,
  });

  const docUser: any = doctor.user;
  await Promise.all([
    docUser?._id ? notifyUser(docUser._id, "Walk-in added to queue", `${data.patientName} is in your queue with token #${tokenNumber}.`) : Promise.resolve(),
    notifyRoles(["admin"], "Walk-in registered", `${data.patientName} → ${docUser?.name ?? "Doctor"} (token #${tokenNumber}).`),
  ]);

  const populated = await QueueToken.findById(token._id).populate({
    path: "doctor",
    populate: { path: "user" },
  });
  res.status(201).json(await serializeToken(populated));
}

export async function updateQueueToken(req: Request, res: Response): Promise<void> {
  const id = req.params["id"];
  if (!id) {
    res.status(400).json({ error: "id required" });
    return;
  }
  const parsed = UpdateQueueTokenSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", issues: parsed.error.issues });
    return;
  }
  const update: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.notes !== undefined) update["notes"] = parsed.data.notes;

  const t = await QueueToken.findByIdAndUpdate(id, update, { new: true }).populate({
    path: "doctor",
    populate: { path: "user" },
  });
  if (!t) {
    res.status(404).json({ error: "Token not found" });
    return;
  }

  if (t.appointment && (parsed.data.status === "completed" || parsed.data.status === "skipped")) {
    const { Appointment } = await import("../models/Appointment");
    await Appointment.findByIdAndUpdate(t.appointment, {
      status: parsed.data.status === "completed" ? "completed" : "no_show",
    });
  }

  if (t.patient) {
    let title = `Token #${t.tokenNumber} updated`;
    let body = `Your token status is now ${parsed.data.status}.`;
    if (parsed.data.status === "called") body = `You have been called. Please proceed to the consultation room.`;
    if (parsed.data.status === "in_progress") body = `Your consultation has started.`;
    if (parsed.data.status === "completed") body = `Your consultation is complete. Thank you.`;
    await notifyUser(t.patient, title, body);
  }

  // Notify receptionists on completion/skip so they can keep flow moving
  if (parsed.data.status === "completed" || parsed.data.status === "skipped") {
    await notifyRoles(["receptionist"], "Queue update",
      `Token #${t.tokenNumber} (${t.patientName}) marked ${parsed.data.status}.`);
  }

  res.json(await serializeToken(t));
}
