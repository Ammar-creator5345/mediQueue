import { sql, sqlOne } from "../db/sql";

export interface DoctorRow {
  id: string;
  user_id: string;
  specialty: string;
  bio: string | null;
  consultation_minutes: number;
  consultation_fee: string; // numeric comes back as string in pg
  start_time: string;
  end_time: string;
  created_at: Date;
  updated_at: Date;
}

export interface DoctorWithUserRow extends DoctorRow {
  user_name: string;
  user_email: string;
  user_phone: string | null;
}

export async function createDoctor(input: {
  userId: string;
  specialty: string;
  consultationMinutes: number;
  consultationFee: number;
  startTime: string;
  endTime: string;
  bio?: string | null;
}): Promise<DoctorRow> {
  const row = await sqlOne<DoctorRow>(
    `
    insert into doctors (user_id, specialty, bio, consultation_minutes, consultation_fee, start_time, end_time)
    values ($1, $2, $3, $4, $5, $6, $7)
    returning *
    `,
    [
      input.userId,
      input.specialty,
      input.bio ?? null,
      input.consultationMinutes,
      input.consultationFee,
      input.startTime,
      input.endTime,
    ],
  );
  if (!row) throw new Error("Failed to create doctor");
  return row;
}

export async function findDoctorById(id: string): Promise<DoctorRow | null> {
  return await sqlOne<DoctorRow>(`select * from doctors where id = $1`, [id]);
}

export async function findDoctorByUserId(userId: string): Promise<DoctorRow | null> {
  return await sqlOne<DoctorRow>(`select * from doctors where user_id = $1`, [userId]);
}

export async function listDoctors(filter: { specialty?: string } = {}): Promise<DoctorRow[]> {
  if (filter.specialty) {
    return await sql<DoctorRow>(
      `select * from doctors where specialty = $1 order by created_at asc`,
      [filter.specialty],
    );
  }
  return await sql<DoctorRow>(`select * from doctors order by created_at asc`);
}

export async function listDoctorsWithUser(filter: { specialty?: string } = {}): Promise<DoctorWithUserRow[]> {
  if (filter.specialty) {
    return await sql<DoctorWithUserRow>(
      `
      select d.*, u.name as user_name, u.email as user_email, u.phone as user_phone
      from doctors d
      join users u on u.id = d.user_id
      where d.specialty = $1
      order by d.created_at asc
      `,
      [filter.specialty],
    );
  }
  return await sql<DoctorWithUserRow>(
    `
    select d.*, u.name as user_name, u.email as user_email, u.phone as user_phone
    from doctors d
    join users u on u.id = d.user_id
    order by d.created_at asc
    `,
  );
}

export async function findDoctorWithUserById(id: string): Promise<DoctorWithUserRow | null> {
  return await sqlOne<DoctorWithUserRow>(
    `
    select d.*, u.name as user_name, u.email as user_email, u.phone as user_phone
    from doctors d
    join users u on u.id = d.user_id
    where d.id = $1
    `,
    [id],
  );
}

export async function findDoctorWithUserByUserId(userId: string): Promise<DoctorWithUserRow | null> {
  return await sqlOne<DoctorWithUserRow>(
    `
    select d.*, u.name as user_name, u.email as user_email, u.phone as user_phone
    from doctors d
    join users u on u.id = d.user_id
    where d.user_id = $1
    `,
    [userId],
  );
}

export async function updateDoctor(
  id: string,
  patch: Partial<{
    specialty: string;
    consultation_fee: number;
    start_time: string;
    end_time: string;
    bio: string | null;
  }>,
): Promise<void> {
  const fields: string[] = [];
  const params: any[] = [id];
  let idx = 2;
  for (const [k, v] of Object.entries(patch)) {
    fields.push(`${k} = $${idx++}`);
    params.push(v);
  }
  if (fields.length === 0) return;
  await sql(`update doctors set ${fields.join(", ")}, updated_at = now() where id = $1`, params);
}

export async function countDoctors(): Promise<number> {
  const row = await sqlOne<{ count: string }>(`select count(*)::text as count from doctors`);
  return Number(row?.count ?? "0");
}

