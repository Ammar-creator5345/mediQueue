import { sql } from "../db/sql";
import { listUsersByRoles, type UserRole } from "../repo/users";

export async function notifyUser(
  userId: string,
  title: string,
  body: string
): Promise<void> {
  await sql(
    `insert into notifications (user_id, title, body, read) values ($1, $2, $3, false)`,
    [userId, title, body],
  );
}

export async function notifyRoles(
  roles: UserRole[],
  title: string,
  body: string
): Promise<void> {
  if (roles.length === 0) return;
  const users = await listUsersByRoles(roles);
  if (users.length === 0) return;
  await Promise.all(
    users.map((u) =>
      sql(
        `insert into notifications (user_id, title, body, read) values ($1, $2, $3, false)`,
        [u.id, title, body],
      ),
    ),
  );
}
