import { sqlOne } from "../db/sql";

export interface ContactRow {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: Date;
  updated_at: Date;
}

export async function createContact(input: { name: string; email: string; message: string }): Promise<ContactRow> {
  const row = await sqlOne<ContactRow>(
    `
    insert into contacts (name, email, message)
    values ($1, $2, $3)
    returning *
    `,
    [input.name, input.email, input.message],
  );
  if (!row) throw new Error("Failed to create contact");
  return row;
}

