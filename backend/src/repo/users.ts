import { sql, sqlOne } from "../db/sql";

export type UserRole = "patient" | "doctor" | "receptionist" | "admin";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  phone: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  phone: string | null;
}): Promise<UserRow> {
  const row = await sqlOne<UserRow>(
    `
    insert into users (name, email, password_hash, role, phone)
    values ($1, $2, $3, $4, $5)
    returning *
    `,
    [input.name, input.email.toLowerCase(), input.passwordHash, input.role, input.phone],
  );
  if (!row) throw new Error("Failed to create user");
  return row;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  return await sqlOne<UserRow>(`select * from users where email = $1`, [email.toLowerCase()]);
}

export async function findUserById(id: string): Promise<UserRow | null> {
  return await sqlOne<UserRow>(`select * from users where id = $1`, [id]);
}

export async function updateUserName(id: string, name: string): Promise<void> {
  await sql(`update users set name = $2, updated_at = now() where id = $1`, [id, name]);
}

export async function listUsersByRoles(roles: UserRole[]): Promise<Array<Pick<UserRow, "id">>> {
  if (roles.length === 0) return [];
  const rows = await sql<{ id: string }>(`select id from users where role = any($1::text[])`, [roles]);
  return rows;
}

export async function countPatients(): Promise<number> {
  const row = await sqlOne<{ count: string }>(`select count(*)::text as count from users where role = 'patient'`);
  return Number(row?.count ?? "0");
}

