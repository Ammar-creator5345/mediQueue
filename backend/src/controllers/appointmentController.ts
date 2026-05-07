import type { Request, Response } from "express";
import {
  createAppointment as createAppointmentRow,
  findAppointmentById,
  listAppointments as listAppointmentRows,
  findAppointmentConflict,
  updateAppointment as updateAppointmentRow,
} from "../repo/appointments";
import { findDoctorByUserId, findDoctorWithUserById } from "../repo/doctors";
import { findUserById } from "../repo/users";
import { createQueueToken, findQueueTokenByAppointment } from "../repo/queueTokens";
import { CreateAppointmentSchema, UpdateAppointmentSchema } from "../validators";
import { dayKeyFor, nextTokenNumber, genApptCode } from "../services/queueHelpers";
import { notifyUser, notifyRoles } from "../services/notify";

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
  fee: number;
  createdAt: string;
}

async function serialize(a: any): Promise<ApptJSON> {
  const patient = await findUserById(a.patient_id);
  const doctor = await findDoctorWithUserById(a.doctor_id);
  const docUser = doctor ? { id: doctor.user_id, name: doctor.user_name } : null;
  return {
    id: a.id,
    code: a.code,
    patientId: patient?.id ?? a.patient_id ?? "",
    patientName: patient?.name ?? "Unknown",
    doctorId: doctor?.id ?? a.doctor_id ?? "",
    doctorName: docUser?.name ?? "Doctor",
    specialty: doctor?.specialty ?? "",
    scheduledAt: new Date(a.scheduled_at).toISOString(),
    reason: a.reason ?? null,
    status: a.status,
    fee: Number(a.fee ?? 0),
    createdAt: a.created_at.toISOString(),
  };
}

export async function listAppointments(req: Request, res: Response): Promise<void> {
  const u = req.user!;
  const filter: {
    patientId?: string;
    doctorId?: string;
    status?: string;
    dateStart?: Date;
    dateEnd?: Date;
  } = {};

  if (u.role === "patient") {
    filter.patientId = u.id;
  } else if (u.role === "doctor") {
    const doc = await findDoctorByUserId(u.id);
    if (!doc) {
      res.json([]);
      return;
    }
    filter.doctorId = doc.id;
  }

  if (typeof req.query["status"] === "string" && req.query["status"]) {
    filter.status = req.query["status"];
  }
  if (typeof req.query["doctorId"] === "string" && req.query["doctorId"]) {
    filter.doctorId = req.query["doctorId"];
  }
  if (typeof req.query["patientId"] === "string" && req.query["patientId"]) {
    filter.patientId = req.query["patientId"];
  }
  if (typeof req.query["date"] === "string" && req.query["date"]) {
    const d = new Date(`${req.query["date"]}T00:00:00.000Z`);
    if (!isNaN(d.getTime())) {
      filter.dateStart = d;
      filter.dateEnd = new Date(d.getTime() + 86400000);
    }
  }

  const docs = await listAppointmentRows(filter);

  const out: ApptJSON[] = [];
  for (const d of docs) out.push(await serialize(d));
  res.json(out);
}

export async function getAppointment(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"] ?? "");
  if (!id) {
    res.status(400).json({ error: "id required" });
    return;
  }
  const a = await findAppointmentById(id);
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

  const doctor = await findDoctorWithUserById(data.doctorId);
  if (!doctor) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }

  const scheduledAt = new Date(data.scheduledAt);
  if (isNaN(scheduledAt.getTime())) {
    res.status(400).json({ error: "Invalid scheduledAt" });
    return;
  }

  const conflict = await findAppointmentConflict(doctor.id, scheduledAt);
  if (conflict) {
    res.status(409).json({ error: "That slot is no longer available" });
    return;
  }

  const appt = await createAppointmentRow({
    code: genApptCode(),
    patientId,
    doctorId: doctor.id,
    scheduledAt,
    reason: data.reason ?? null,
    status: "scheduled",
    fee: Number(doctor.consultation_fee ?? 0),
  });

  const patientUser = await findUserById(patientId);
  const doctorUser = { id: doctor.user_id, name: doctor.user_name };
  const whenStr = scheduledAt.toLocaleString();

  await Promise.all([
    notifyUser(patientId, "Appointment booked", `Your appointment ${appt.code} with ${doctorUser?.name ?? "the doctor"} is scheduled for ${whenStr}.`),
    notifyUser(doctor.user_id, "New appointment assigned", `${patientUser?.name ?? "A patient"} booked appointment ${appt.code} for ${whenStr}.`),
    notifyRoles(["receptionist", "admin"], "New appointment booked", `${patientUser?.name ?? "A patient"} → ${doctorUser?.name ?? "Doctor"} on ${whenStr} (${appt.code}).`),
  ]);

  res.status(201).json(await serialize(appt));
}

type ModifyGuard = { ok: true } | { ok: false; status: number; error: string };

async function ensureCanModify(req: Request, appt: { patient_id: string; doctor_id: string }): Promise<ModifyGuard> {
  const u = req.user!;
  if (u.role === "admin" || u.role === "receptionist") return { ok: true as const };
  if (u.role === "patient") {
    if (appt.patient_id.toString() === u.id) return { ok: true as const };
    return { ok: false as const, status: 403, error: "You can only modify your own appointments" };
  }
  if (u.role === "doctor") {
    const doc = await findDoctorByUserId(u.id);
    if (doc && appt.doctor_id.toString() === doc.id.toString()) return { ok: true as const };
    return { ok: false as const, status: 403, error: "You can only modify appointments assigned to you" };
  }
  return { ok: false as const, status: 403, error: "Forbidden" };
}

export async function updateAppointment(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"] ?? "");
  if (!id) {
    res.status(400).json({ error: "id required" });
    return;
  }
  const parsed = UpdateAppointmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", issues: parsed.error.issues });
    return;
  }
  const existing = await findAppointmentById(id);
  if (!existing) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  const guard = await ensureCanModify(req, existing);
  if (guard.ok === false) {
    res.status(guard.status).json({ error: guard.error });
    return;
  }

  const update: any = {};
  if (parsed.data.status) update["status"] = parsed.data.status;
  if (parsed.data.reason !== undefined) update["reason"] = parsed.data.reason;
  if (parsed.data.scheduledAt) update["scheduled_at"] = new Date(parsed.data.scheduledAt);

  const a = await updateAppointmentRow(id, update);
  if (!a) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  res.json(await serialize(a));
}

export async function cancelAppointment(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"] ?? "");
  if (!id) {
    res.status(400).json({ error: "id required" });
    return;
  }
  const existing = await findAppointmentById(id);
  if (!existing) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  const guard = await ensureCanModify(req, existing);
  if (guard.ok === false) {
    res.status(guard.status).json({ error: guard.error });
    return;
  }
  await updateAppointmentRow(id, { status: "cancelled" } as any);

  const patientUser = await findUserById(existing.patient_id);
  const doctor = await findDoctorWithUserById(existing.doctor_id);
  const doctorUserId = doctor?.user_id ?? null;
  const doctorName = doctor?.user_name ?? "Doctor";
  await Promise.all([
    notifyUser(existing.patient_id, "Appointment cancelled", `Your appointment ${existing.code} was cancelled.`),
    doctorUserId ? notifyUser(doctorUserId, "Appointment cancelled", `${patientUser?.name ?? "A patient"} cancelled appointment ${existing.code}.`) : Promise.resolve(),
    notifyRoles(["receptionist", "admin"], "Appointment cancelled", `${patientUser?.name ?? "A patient"} cancelled appointment ${existing.code} with ${doctorName}.`),
  ]);

  res.status(204).end();
}

export async function checkInAppointment(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"] ?? "");
  if (!id) {
    res.status(400).json({ error: "id required" });
    return;
  }
  const appt = await findAppointmentById(id);
  if (!appt) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  if (appt.status === "cancelled") {
    res.status(400).json({ error: "Cannot check in a cancelled appointment" });
    return;
  }

  const existing = await findQueueTokenByAppointment(appt.id);
  if (existing) {
    res.status(200).json(await serializeToken(existing));
    return;
  }

  const dayKey = dayKeyFor(appt.doctor_id);
  const tokenNumber = await nextTokenNumber(dayKey);
  const patient = await findUserById(appt.patient_id);
  const doctor = await findDoctorWithUserById(appt.doctor_id);
  const docUser: any = doctor ? { id: doctor.user_id, name: doctor.user_name } : null;

  const token = await createQueueToken({
    tokenNumber,
    appointmentId: appt.id,
    patientId: appt.patient_id,
    patientName: patient?.name ?? "Patient",
    patientPhone: patient?.phone ?? null,
    doctorId: appt.doctor_id,
    status: "waiting",
    source: "appointment",
    notes: null,
    dayKey,
  });

  await updateAppointmentRow(appt.id, { status: "checked_in" } as any);

  await Promise.all([
    notifyUser(appt.patient_id, `Token #${tokenNumber} issued`, `You are checked in. Your token number is ${tokenNumber}.`),
    docUser?.id ? notifyUser(docUser.id, "Patient checked in", `${patient?.name ?? "A patient"} is in your queue with token #${tokenNumber}.`) : Promise.resolve(),
    notifyRoles(["receptionist", "admin"], "Patient checked in", `${patient?.name ?? "Patient"} → ${docUser?.name ?? "Doctor"} (token #${tokenNumber}).`),
  ]);

  res.status(201).json(await serializeToken(token));
}

async function serializeToken(t: any) {
  const doctor = await findDoctorWithUserById(t.doctor_id);
  const docUser = doctor ? { id: doctor.user_id, name: doctor.user_name } : null;
  return {
    id: t.id,
    tokenNumber: t.token_number,
    appointmentId: t.appointment_id ?? null,
    patientId: t.patient_id ?? null,
    patientName: t.patient_name,
    patientPhone: t.patient_phone ?? null,
    doctorId: doctor?.id ?? t.doctor_id ?? "",
    doctorName: docUser?.name ?? "Doctor",
    specialty: doctor?.specialty ?? "",
    status: t.status,
    source: t.source,
    notes: t.notes ?? null,
    createdAt: t.created_at.toISOString(),
    updatedAt: t.updated_at.toISOString(),
  };
}
