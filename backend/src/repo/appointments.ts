import { sql, sqlOne } from "../db/sql";

export type AppointmentStatus = "scheduled" | "checked_in" | "completed" | "cancelled" | "no_show";

export interface AppointmentRow {
  id: string;
  code: string;
  patient_id: string;
  doctor_id: string;
  scheduled_at: Date;
  reason: string | null;
  status: AppointmentStatus;
  fee: string; // numeric
  created_at: Date;
  updated_at: Date;
}

export async function listAppointments(filter: {
  patientId?: string;
  doctorId?: string;
  status?: string;
  dateStart?: Date;
  dateEnd?: Date;
}): Promise<AppointmentRow[]> {
  const where: string[] = [];
  const params: any[] = [];
  let i = 1;

  if (filter.patientId) {
    where.push(`a.patient_id = $${i++}`);
    params.push(filter.patientId);
  }
  if (filter.doctorId) {
    where.push(`a.doctor_id = $${i++}`);
    params.push(filter.doctorId);
  }
  if (filter.status) {
    where.push(`a.status = $${i++}`);
    params.push(filter.status);
  }
  if (filter.dateStart && filter.dateEnd) {
    where.push(`a.scheduled_at >= $${i++} and a.scheduled_at < $${i++}`);
    params.push(filter.dateStart, filter.dateEnd);
  }

  const q = `
    select a.*
    from appointments a
    ${where.length ? `where ${where.join(" and ")}` : ""}
    order by a.scheduled_at asc
  `;
  return await sql<AppointmentRow>(q, params);
}

export async function findAppointmentById(id: string): Promise<AppointmentRow | null> {
  return await sqlOne<AppointmentRow>(`select * from appointments where id = $1`, [id]);
}

export async function findAppointmentByCode(code: string): Promise<AppointmentRow | null> {
  return await sqlOne<AppointmentRow>(`select * from appointments where code = $1`, [code]);
}

export async function createAppointment(input: {
  code: string;
  patientId: string;
  doctorId: string;
  scheduledAt: Date;
  reason: string | null;
  status: AppointmentStatus;
  fee: number;
}): Promise<AppointmentRow> {
  const row = await sqlOne<AppointmentRow>(
    `
    insert into appointments (code, patient_id, doctor_id, scheduled_at, reason, status, fee)
    values ($1, $2, $3, $4, $5, $6, $7)
    returning *
    `,
    [input.code, input.patientId, input.doctorId, input.scheduledAt, input.reason, input.status, input.fee],
  );
  if (!row) throw new Error("Failed to create appointment");
  return row;
}

export async function updateAppointment(
  id: string,
  patch: Partial<{ status: AppointmentStatus; reason: string | null; scheduled_at: Date }>,
): Promise<AppointmentRow | null> {
  const fields: string[] = [];
  const params: any[] = [id];
  let idx = 2;
  for (const [k, v] of Object.entries(patch)) {
    fields.push(`${k} = $${idx++}`);
    params.push(v);
  }
  if (fields.length === 0) return await findAppointmentById(id);
  return await sqlOne<AppointmentRow>(
    `update appointments set ${fields.join(", ")}, updated_at = now() where id = $1 returning *`,
    params,
  );
}

export async function findAppointmentConflict(doctorId: string, scheduledAt: Date): Promise<AppointmentRow | null> {
  return await sqlOne<AppointmentRow>(
    `
    select *
    from appointments
    where doctor_id = $1 and scheduled_at = $2 and status <> 'cancelled'
    limit 1
    `,
    [doctorId, scheduledAt],
  );
}

export async function listAppointmentsForDoctorOnDay(doctorId: string, dayStart: Date, dayEnd: Date): Promise<Array<Pick<AppointmentRow, "scheduled_at">>> {
  return await sql<Array<Pick<AppointmentRow, "scheduled_at">>[number]>(
    `
    select scheduled_at
    from appointments
    where doctor_id = $1 and scheduled_at >= $2 and scheduled_at < $3 and status <> 'cancelled'
    `,
    [doctorId, dayStart, dayEnd],
  );
}

export async function countAppointmentsInRange(start: Date, end: Date): Promise<number> {
  const row = await sqlOne<{ count: string }>(
    `select count(*)::text as count from appointments where scheduled_at >= $1 and scheduled_at < $2`,
    [start, end],
  );
  return Number(row?.count ?? "0");
}

export async function appointmentsPerDay(start: Date, end: Date): Promise<Array<{ date: string; count: number }>> {
  const rows = await sql<{ day: string; count: string }>(
    `
    select to_char(date_trunc('day', scheduled_at at time zone 'utc'), 'YYYY-MM-DD') as day,
           count(*)::text as count
    from appointments
    where scheduled_at >= $1 and scheduled_at < $2
    group by 1
    order by 1 asc
    `,
    [start, end],
  );
  return rows.map((r) => ({ date: r.day, count: Number(r.count) }));
}

export async function appointmentStatusDistribution(): Promise<Array<{ label: string; count: number }>> {
  const rows = await sql<{ status: string; count: string }>(
    `select status, count(*)::text as count from appointments group by status`,
  );
  return rows.map((r) => ({ label: r.status, count: Number(r.count) }));
}

export async function doctorUtilizationSince(start: Date, end: Date): Promise<Array<{ doctor_id: string; count: number }>> {
  const rows = await sql<{ doctor_id: string; count: string }>(
    `
    select doctor_id, count(*)::text as count
    from appointments
    where scheduled_at >= $1 and scheduled_at < $2
    group by doctor_id
    `,
    [start, end],
  );
  return rows.map((r) => ({ doctor_id: r.doctor_id, count: Number(r.count) }));
}

