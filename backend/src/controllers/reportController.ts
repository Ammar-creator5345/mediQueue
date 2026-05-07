import type { Request, Response } from "express";
import { countAppointmentsInRange, appointmentsPerDay, appointmentStatusDistribution, doctorUtilizationSince } from "../repo/appointments";
import { countTokensByDayPrefixAndStatus, queueStatusDistributionForDayPrefix } from "../repo/queueTokens";
import { countDoctors, findDoctorWithUserById } from "../repo/doctors";
import { countPatients } from "../repo/users";

function startOfTodayUTC(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function todayDayKeyPrefix(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}-`;
}

export async function getReportSummary(_req: Request, res: Response): Promise<void> {
  const today = startOfTodayUTC();
  const tomorrow = new Date(today.getTime() + 86400000);
  const dayPrefix = todayDayKeyPrefix();

  const [totalAppointmentsToday, waitingTokens, inProgressTokens, completedToday, totalDoctors, totalPatients] =
    await Promise.all([
      countAppointmentsInRange(today, tomorrow),
      countTokensByDayPrefixAndStatus(dayPrefix, "waiting"),
      countTokensByDayPrefixAndStatus(dayPrefix, "in_progress"),
      countTokensByDayPrefixAndStatus(dayPrefix, "completed"),
      countDoctors(),
      countPatients(),
    ]);

  res.json({
    totalAppointmentsToday,
    waitingTokens,
    inProgressTokens,
    completedToday,
    totalDoctors,
    totalPatients,
  });
}

export async function getAppointmentsPerDay(req: Request, res: Response): Promise<void> {
  const days = Math.min(60, Math.max(1, parseInt(String(req.query["days"] ?? "14"), 10) || 14));
  const today = startOfTodayUTC();
  const start = new Date(today.getTime() - (days - 1) * 86400000);

  const end = new Date(today.getTime() + 86400000);
  const rows = await appointmentsPerDay(start, end);
  const map = new Map<string, number>(rows.map((r) => [r.date, r.count]));

  const out: Array<{ date: string; count: number }> = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    out.push({ date: key, count: map.get(key) ?? 0 });
  }
  res.json(out);
}

export async function getStatusDistribution(_req: Request, res: Response): Promise<void> {
  res.json(await appointmentStatusDistribution());
}

export async function getQueueStatusReport(_req: Request, res: Response): Promise<void> {
  const dayPrefix = todayDayKeyPrefix();
  res.json(await queueStatusDistributionForDayPrefix(dayPrefix));
}

export async function getDoctorUtilization(_req: Request, res: Response): Promise<void> {
  const today = startOfTodayUTC();
  const weekAgo = new Date(today.getTime() - 6 * 86400000);
  const rows = await doctorUtilizationSince(weekAgo, new Date(today.getTime() + 86400000));
  const out = [];
  for (const r of rows) {
    const d = await findDoctorWithUserById(r.doctor_id);
    if (!d) continue;
    out.push({
      doctorId: d.id,
      doctorName: d.user_name ?? "Doctor",
      specialty: d.specialty,
      count: r.count,
    });
  }
  out.sort((a, b) => b.count - a.count);
  res.json(out);
}
