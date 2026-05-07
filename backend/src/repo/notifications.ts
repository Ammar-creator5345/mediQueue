import { sql, sqlOne } from "../db/sql";

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function listNotificationsForUser(userId: string): Promise<NotificationRow[]> {
  return await sql<NotificationRow>(
    `select * from notifications where user_id = $1 order by created_at desc limit 50`,
    [userId],
  );
}

export async function markNotificationReadForUser(userId: string, id: string): Promise<NotificationRow | null> {
  return await sqlOne<NotificationRow>(
    `
    update notifications
    set read = true, updated_at = now()
    where id = $2 and user_id = $1
    returning *
    `,
    [userId, id],
  );
}

