import type { Request, Response } from "express";
import mongoose from "mongoose";
import { Appointment } from "../models/Appointment";
import { Doctor } from "../models/Doctor";
import { User } from "../models/User";
import { QueueToken } from "../models/QueueToken";
import { Notification } from "../models/Notification";
import { CreateAppointmentSchema, UpdateAppointmentSchema } from "../validators";
import { dayKeyFor, nextTokenNumber, genApptCode } from "../services/queueHelpers";

interface ApptJSON {
  id: string;
  code: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  scheduledAt: string;
  reason: string | null;
  status: string;
  createdAt: string;
}

async function serialize(a: any): Promise<ApptJSON> {
  const patient = a.patient && typeof a.patient === "object" && "name" in a.patient
    ? a.patient
    : await User.findById(a.patient);
  const doctor = a.doctor && typeof a.doctor === "object" && "specialty" in a.doctor
    ? a.doctor
    : await Doctor.findById(a.doctor).populate("user");
  const docUser = doctor?.user && typeof doctor.user === "object" && "name" in doctor.user
    ? doctor.user
    : doctor?.user
    ? await User.findById(doctor.user)
    : null;
  return {
    id: a._id.toString(),
    code: a.code,
    patientId: patient?._id?.toString() ?? a.patient?.toString() ?? "",
    patientName: patient?.name ?? "Unknown",
    doctorId: doctor?._id?.toString() ?? a.doctor?.toString() ?? "",
    doctorName: docUser?.name ?? "Doctor",
    specialty: doctor?.specialty ?? "",
    scheduledAt: a.scheduledAt.toISOString(),
    reason: a.reason ?? null,
    status: a.status,
    createdAt: a.createdAt.toISOString(),
  };
}

export async function listAppointments(req: Request, res: Response): Promise<void> {
  const u = req.user!;
  const filter: Record<string, unknown> = {};

  if (u.role === "patient") {
    filter["patient"] = new mongoose.Types.ObjectId(u.id);
  } else if (u.role === "doctor") {
    const doc = await Doctor.findOne({ user: new mongoose.Types.ObjectId(u.id) });
    if (!doc) {
      res.json([]);
      return;
    }
    filter["doctor"] = doc._id;
  }

  if (typeof req.query["status"] === "string" && req.query["status"]) {
    filter["status"] = req.query["status"];
  }
  if (typeof req.query["doctorId"] === "string" && req.query["doctorId"]) {
    filter["doctor"] = new mongoose.Types.ObjectId(req.query["doctorId"]);
  }
  if (typeof req.query["patientId"] === "string" && req.query["patientId"]) {
    filter["patient"] = new mongoose.Types.ObjectId(req.query["patientId"]);
  }
  if (typeof req.query["date"] === "string" && req.query["date"]) {
    const d = new Date(`${req.query["date"]}T00:00:00.000Z`);
    if (!isNaN(d.getTime())) {
      filter["scheduledAt"] = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
    }
  }

  const docs = await Appointment.find(filter)
    .populate({ path: "patient" })
    .populate({ path: "doctor", populate: { path: "user" } })
    .sort({ scheduledAt: 1 });

  const out: ApptJSON[] = [];
  for (const d of docs) out.push(await serialize(d));
  res.json(out);
}

export async function getAppointment(req: Request, res: Response): Promise<void> {
  const id = req.params["id"];
  if (!id) {
    res.status(400).json({ error: "id required" });
    return;
  }
  const a = await Appointment.findById(id)
    .populate({ path: "patient" })
    .populate({ path: "doctor", populate: { path: "user" } });
  if (!a) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  res.json(await serialize(a));
}

export async function createAppointment(req: Request, res: Response): Promise<void> {
  const parsed = CreateAppointmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", issues: parsed.error.issues });
    return;
  }
  const u = req.user!;
  const data = parsed.data;

  let patientId: string;
  if (u.role === "patient") {
    patientId = u.id;
  } else if (u.role === "receptionist" || u.role === "admin") {
    if (!data.patientId) {
      res.status(400).json({ error: "patientId required when booking on behalf of a patient" });
      return;
    }
    patientId = data.patientId;
  } else {
    res.status(403).json({ error: "Doctors cannot create appointments" });
    return;
  }

  const doctor = await Doctor.findById(data.doctorId);
  if (!doctor) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }

  const scheduledAt = new Date(data.scheduledAt);
  if (isNaN(scheduledAt.getTime())) {
    res.status(400).json({ error: "Invalid scheduledAt" });
    return;
  }

  const conflict = await Appointment.findOne({
    doctor: doctor._id,
    scheduledAt,
    status: { $ne: "cancelled" },
  });
  if (conflict) {
    res.status(409).json({ error: "That slot is no longer available" });
    return;
  }

  const appt = await Appointment.create({
    code: genApptCode(),
    patient: new mongoose.Types.ObjectId(patientId),
    doctor: doctor._id,
    scheduledAt,
    reason: data.reason ?? null,
    status: "scheduled",
  });

  await Notification.create({
    user: new mongoose.Types.ObjectId(patientId),
    title: "Appointment booked",
    body: `Your appointment ${appt.code} is scheduled for ${scheduledAt.toLocaleString()}`,
  });

  const populated = await Appointment.findById(appt._id)
    .populate({ path: "patient" })
    .populate({ path: "doctor", populate: { path: "user" } });
  res.status(201).json(await serialize(populated));
}

async function ensureCanModify(req: Request, appt: { patient: mongoose.Types.ObjectId; doctor: mongoose.Types.ObjectId }): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const u = req.user!;
  if (u.role === "admin" || u.role === "receptionist") return { ok: true };
  if (u.role === "patient") {
    if (appt.patient.toString() === u.id) return { ok: true };
    return { ok: false, status: 403, error: "You can only modify your own appointments" };
  }
  if (u.role === "doctor") {
    const doc = await Doctor.findOne({ user: new mongoose.Types.ObjectId(u.id) });
    if (doc && appt.doctor.toString() === doc._id.toString()) return { ok: true };
    return { ok: false, status: 403, error: "You can only modify appointments assigned to you" };
  }
  return { ok: false, status: 403, error: "Forbidden" };
}

export async function updateAppointment(req: Request, res: Response): Promise<void> {
  const id = req.params["id"];
  if (!id) {
    res.status(400).json({ error: "id required" });
    return;
  }
  const parsed = UpdateAppointmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", issues: parsed.error.issues });
    return;
  }
  const existing = await Appointment.findById(id);
  if (!existing) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  const guard = await ensureCanModify(req, existing);
  if (!guard.ok) {
    res.status(guard.status).json({ error: guard.error });
    return;
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.status) update["status"] = parsed.data.status;
  if (parsed.data.reason !== undefined) update["reason"] = parsed.data.reason;
  if (parsed.data.scheduledAt) update["scheduledAt"] = new Date(parsed.data.scheduledAt);

  const a = await Appointment.findByIdAndUpdate(id, update, { new: true })
    .populate({ path: "patient" })
    .populate({ path: "doctor", populate: { path: "user" } });
  if (!a) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  res.json(await serialize(a));
}

export async function cancelAppointment(req: Request, res: Response): Promise<void> {
  const id = req.params["id"];
  if (!id) {
    res.status(400).json({ error: "id required" });
    return;
  }
  const existing = await Appointment.findById(id);
  if (!existing) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  const guard = await ensureCanModify(req, existing);
  if (!guard.ok) {
    res.status(guard.status).json({ error: guard.error });
    return;
  }
  await Appointment.findByIdAndUpdate(id, { status: "cancelled" });
  res.status(204).end();
}

export async function checkInAppointment(req: Request, res: Response): Promise<void> {
  const id = req.params["id"];
  if (!id) {
    res.status(400).json({ error: "id required" });
    return;
  }
  const appt = await Appointment.findById(id);
  if (!appt) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  if (appt.status === "cancelled") {
    res.status(400).json({ error: "Cannot check in a cancelled appointment" });
    return;
  }

  const existing = await QueueToken.findOne({ appointment: appt._id });
  if (existing) {
    const populated = await QueueToken.findById(existing._id)
      .populate({ path: "patient" })
      .populate({ path: "doctor", populate: { path: "user" } });
    res.status(200).json(await serializeToken(populated));
    return;
  }

  const dayKey = dayKeyFor(appt.doctor);
  const tokenNumber = await nextTokenNumber(dayKey);
  const patient = await User.findById(appt.patient);

  const token = await QueueToken.create({
    tokenNumber,
    appointment: appt._id,
    patient: appt.patient,
    patientName: patient?.name ?? "Patient",
    doctor: appt.doctor,
    status: "waiting",
    source: "appointment",
    dayKey,
  });

  appt.status = "checked_in";
  await appt.save();

  await Notification.create({
    user: appt.patient,
    title: `Token #${tokenNumber} issued`,
    body: `You are checked in. Your token number is ${tokenNumber}.`,
  });

  const populated = await QueueToken.findById(token._id)
    .populate({ path: "patient" })
    .populate({ path: "doctor", populate: { path: "user" } });
  res.status(201).json(await serializeToken(populated));
}

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
