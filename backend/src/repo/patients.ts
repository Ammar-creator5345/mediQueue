import { sqlOne } from "../db/sql";

export interface PatientRow {
  id: string;
  user_id: string;
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  address: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function createPatient(userId: string): Promise<PatientRow> {
  const row = await sqlOne<PatientRow>(
    `insert into patients (user_id) values ($1) returning *`,
    [userId],
  );
  if (!row) throw new Error("Failed to create patient");
  return row;
}

