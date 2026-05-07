import type { Request, Response } from "express";
import { listQueueTokens, createQueueToken, updateQueueToken as updateQueueTokenRow, findQueueTokenById } from "../repo/queueTokens";
import { findDoctorById, findDoctorByUserId, findDoctorWithUserById } from "../repo/doctors";
import { findUserById } from "../repo/users";
import { AddWalkInSchema, UpdateQueueTokenSchema } from "../validators";
import { dayKeyFor, nextTokenNumber } from "../services/queueHelpers";
import { notifyUser, notifyRoles } from "../services/notify";

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

function todayUTCDayPrefix(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}-`;
}

export async function listQueue(req: Request, res: Response): Promise<void> {
  const u = req.user!;
  const filter: { dayKeyPrefix: string; doctorId?: string; status?: string; patientId?: string } = {
    dayKeyPrefix: todayUTCDayPrefix(),
  };
  if (typeof req.query["doctorId"] === "string" && req.query["doctorId"]) {
    filter.doctorId = req.query["doctorId"];
  }
  if (typeof req.query["status"] === "string" && req.query["status"]) {
    filter.status = req.query["status"];
  }
  if (u.role === "doctor") {
    const doc = await findDoctorByUserId(u.id);
    if (!doc) {
      res.json([]);
      return;
    }
    // Doctor isolation: they can ONLY see their own queue regardless of any doctorId query
    filter.doctorId = doc.id;
  } else if (u.role === "patient") {
    filter.patientId = u.id;
  }

  const tokens = await listQueueTokens(filter);
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
  const doctor = await findDoctorWithUserById(data.doctorId);
  if (!doctor) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }
  const dayKey = dayKeyFor(doctor.id);
  const tokenNumber = await nextTokenNumber(dayKey);
  const token = await createQueueToken({
    tokenNumber,
    appointmentId: null,
    patientId: null,
    doctorId: doctor.id,
    patientName: data.patientName,
    patientPhone: data.patientPhone ?? null,
    notes: data.notes ?? null,
    source: "walkin",
    status: "waiting",
    dayKey,
  });

  const docUser: any = { id: doctor.user_id, name: doctor.user_name };
  await Promise.all([
    docUser?.id ? notifyUser(docUser.id, "Walk-in added to queue", `${data.patientName} is in your queue with token #${tokenNumber}.`) : Promise.resolve(),
    notifyRoles(["admin"], "Walk-in registered", `${data.patientName} → ${docUser?.name ?? "Doctor"} (token #${tokenNumber}).`),
  ]);

  res.status(201).json(await serializeToken(token));
}

export async function updateQueueToken(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"] ?? "");
  if (!id) {
    res.status(400).json({ error: "id required" });
    return;
  }
  const parsed = UpdateQueueTokenSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", issues: parsed.error.issues });
    return;
  }
  const update: any = { status: parsed.data.status };
  if (parsed.data.notes !== undefined) update["notes"] = parsed.data.notes;

  const t = await updateQueueTokenRow(id, update);
  if (!t) {
    res.status(404).json({ error: "Token not found" });
    return;
  }

  if (t.appointment_id && (parsed.data.status === "completed" || parsed.data.status === "skipped")) {
    const { updateAppointment } = await import("../repo/appointments");
    await updateAppointment(t.appointment_id, {
      status: parsed.data.status === "completed" ? "completed" : "no_show",
    } as any);
  }

  if (t.patient_id) {
    let title = `Token #${t.token_number} updated`;
    let body = `Your token status is now ${parsed.data.status}.`;
    if (parsed.data.status === "called") body = `You have been called. Please proceed to the consultation room.`;
    if (parsed.data.status === "in_progress") body = `Your consultation has started.`;
    if (parsed.data.status === "completed") body = `Your consultation is complete. Thank you.`;
    await notifyUser(t.patient_id, title, body);
  }

  // Notify receptionists on completion/skip so they can keep flow moving
  if (parsed.data.status === "completed" || parsed.data.status === "skipped") {
    await notifyRoles(["receptionist"], "Queue update",
      `Token #${t.token_number} (${t.patient_name}) marked ${parsed.data.status}.`);
  }

  res.json(await serializeToken(t));
}
