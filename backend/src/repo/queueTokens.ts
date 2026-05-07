import { sql, sqlOne } from "../db/sql";

export type TokenStatus = "waiting" | "called" | "in_progress" | "on_hold" | "completed" | "skipped";
export type TokenSource = "appointment" | "walkin";

export interface QueueTokenRow {
  id: string;
  token_number: number;
  appointment_id: string | null;
  patient_id: string | null;
  patient_name: string;
  patient_phone: string | null;
  doctor_id: string;
  status: TokenStatus;
  source: TokenSource;
  notes: string | null;
  day_key: string;
  created_at: Date;
  updated_at: Date;
}

export async function listQueueTokens(filter: {
  dayKeyPrefix: string;
  doctorId?: string;
  status?: string;
  patientId?: string;
}): Promise<QueueTokenRow[]> {
  const where: string[] = [`qt.day_key like $1`];
  const params: any[] = [`${filter.dayKeyPrefix}%`];
  let i = 2;

  if (filter.doctorId) {
    where.push(`qt.doctor_id = $${i++}`);
    params.push(filter.doctorId);
  }
  if (filter.status) {
    where.push(`qt.status = $${i++}`);
    params.push(filter.status);
  }
  if (filter.patientId) {
    where.push(`qt.patient_id = $${i++}`);
    params.push(filter.patientId);
  }

  return await sql<QueueTokenRow>(
    `
    select qt.*
    from queue_tokens qt
    where ${where.join(" and ")}
    order by qt.token_number asc
    `,
    params,
  );
}

export async function createQueueToken(input: {
  tokenNumber: number;
  appointmentId: string | null;
  patientId: string | null;
  patientName: string;
  patientPhone: string | null;
  doctorId: string;
  status: TokenStatus;
  source: TokenSource;
  notes: string | null;
  dayKey: string;
}): Promise<QueueTokenRow> {
  const row = await sqlOne<QueueTokenRow>(
    `
    insert into queue_tokens
      (token_number, appointment_id, patient_id, patient_name, patient_phone, doctor_id, status, source, notes, day_key)
    values
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    returning *
    `,
    [
      input.tokenNumber,
      input.appointmentId,
      input.patientId,
      input.patientName,
      input.patientPhone,
      input.doctorId,
      input.status,
      input.source,
      input.notes,
      input.dayKey,
    ],
  );
  if (!row) throw new Error("Failed to create token");
  return row;
}

export async function findQueueTokenById(id: string): Promise<QueueTokenRow | null> {
  return await sqlOne<QueueTokenRow>(`select * from queue_tokens where id = $1`, [id]);
}

export async function findQueueTokenByAppointment(appointmentId: string): Promise<QueueTokenRow | null> {
  return await sqlOne<QueueTokenRow>(`select * from queue_tokens where appointment_id = $1 limit 1`, [appointmentId]);
}

export async function updateQueueToken(
  id: string,
  patch: Partial<{ status: TokenStatus; notes: string | null }>,
): Promise<QueueTokenRow | null> {
  const fields: string[] = [];
  const params: any[] = [id];
  let idx = 2;
  for (const [k, v] of Object.entries(patch)) {
    fields.push(`${k} = $${idx++}`);
    params.push(v);
  }
  if (fields.length === 0) return await findQueueTokenById(id);
  return await sqlOne<QueueTokenRow>(
    `update queue_tokens set ${fields.join(", ")}, updated_at = now() where id = $1 returning *`,
    params,
  );
}

export async function lastTokenForDay(dayKey: string): Promise<QueueTokenRow | null> {
  return await sqlOne<QueueTokenRow>(
    `select * from queue_tokens where day_key = $1 order by token_number desc limit 1`,
    [dayKey],
  );
}

export async function countTokensByDayPrefixAndStatus(dayPrefix: string, status: TokenStatus): Promise<number> {
  const row = await sqlOne<{ count: string }>(
    `select count(*)::text as count from queue_tokens where day_key like $1 and status = $2`,
    [`${dayPrefix}%`, status],
  );
  return Number(row?.count ?? "0");
}

export async function queueStatusDistributionForDayPrefix(dayPrefix: string): Promise<Array<{ label: string; count: number }>> {
  const rows = await sql<{ status: string; count: string }>(
    `select status, count(*)::text as count from queue_tokens where day_key like $1 group by status`,
    [`${dayPrefix}%`],
  );
  return rows.map((r) => ({ label: r.status, count: Number(r.count) }));
}

