import type { Request, Response } from "express";
import { Appointment } from "../models/Appointment";
import { QueueToken } from "../models/QueueToken";
import { Doctor } from "../models/Doctor";
import { User } from "../models/User";

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
      Appointment.countDocuments({ scheduledAt: { $gte: today, $lt: tomorrow } }),
      QueueToken.countDocuments({ dayKey: { $regex: `^${dayPrefix}` }, status: "waiting" }),
      QueueToken.countDocuments({ dayKey: { $regex: `^${dayPrefix}` }, status: "in_progress" }),
      QueueToken.countDocuments({ dayKey: { $regex: `^${dayPrefix}` }, status: "completed" }),
      Doctor.countDocuments(),
      User.countDocuments({ role: "patient" }),
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

  const rows = await Appointment.aggregate([
    { $match: { scheduledAt: { $gte: start, $lt: new Date(today.getTime() + 86400000) } } },
    {
      $group: {
        _id: {
          y: { $year: "$scheduledAt" },
          m: { $month: "$scheduledAt" },
          d: { $dayOfMonth: "$scheduledAt" },
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const map = new Map<string, number>();
  for (const r of rows) {
    const date = `${r._id.y}-${String(r._id.m).padStart(2, "0")}-${String(r._id.d).padStart(2, "0")}`;
    map.set(date, r.count);
  }

  const out: Array<{ date: string; count: number }> = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    out.push({ date: key, count: map.get(key) ?? 0 });
  }
  res.json(out);
}

export async function getStatusDistribution(_req: Request, res: Response): Promise<void> {
  const rows = await Appointment.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  res.json(rows.map((r) => ({ label: r._id, count: r.count })));
}

export async function getQueueStatusReport(_req: Request, res: Response): Promise<void> {
  const dayPrefix = todayDayKeyPrefix();
  const rows = await QueueToken.aggregate([
    { $match: { dayKey: { $regex: `^${dayPrefix}` } } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  res.json(rows.map((r) => ({ label: r._id, count: r.count })));
}

export async function getDoctorUtilization(_req: Request, res: Response): Promise<void> {
  const today = startOfTodayUTC();
  const weekAgo = new Date(today.getTime() - 6 * 86400000);
  const rows = await Appointment.aggregate([
    { $match: { scheduledAt: { $gte: weekAgo, $lt: new Date(today.getTime() + 86400000) } } },
    { $group: { _id: "$doctor", count: { $sum: 1 } } },
  ]);
  const out = [];
  for (const r of rows) {
    const d = await Doctor.findById(r._id).populate("user");
    if (!d) continue;
    const u = d.user && typeof d.user === "object" && "name" in d.user
      ? (d.user as any)
      : await User.findById(d.user);
    out.push({
      doctorId: d._id.toString(),
      doctorName: u?.name ?? "Doctor",
      specialty: d.specialty,
      count: r.count,
    });
  }
  out.sort((a, b) => b.count - a.count);
  res.json(out);
}
