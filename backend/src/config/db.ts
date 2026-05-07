import { logger } from "../lib/logger";
import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let connecting: Promise<void> | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    throw new Error("Database not initialized. Did you forget to call connectDB()?");
  }
  return pool;
}

export async function connectDB(): Promise<void> {
  let url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL is required");
  // Some providers show URLs without the scheme, like:
  // //user:pass@host/db?sslmode=require
  if (url.startsWith("//")) url = `postgres:${url}`;

  if (pool) return;
  if (!connecting) {
    connecting = (async () => {
      const u = new URL(url);
      const sslMode = u.searchParams.get("sslmode");
      const ssl =
        sslMode === "require"
          ? {
              // Common for managed providers (Neon/Supabase/etc)
              // If your provider gives you a CA cert, we can tighten this.
              rejectUnauthorized: false,
            }
          : undefined;

      pool = new Pool({
        connectionString: url,
        ssl,
      });

      // smoke test + ensure extensions we rely on for UUIDs
      const client = await pool.connect();
      try {
        await client.query("select 1 as ok");
        await client.query(`create extension if not exists "pgcrypto"`);

        // Minimal schema bootstrap (no migrations in repo yet)
        await client.query(`
          create table if not exists users (
            id uuid primary key default gen_random_uuid(),
            name text not null,
            email text not null unique,
            password_hash text not null,
            role text not null,
            phone text,
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now()
          );

          create table if not exists doctors (
            id uuid primary key default gen_random_uuid(),
            user_id uuid not null unique references users(id) on delete cascade,
            specialty text not null,
            bio text,
            consultation_minutes int not null default 20,
            consultation_fee numeric not null default 0,
            start_time text not null default '09:00',
            end_time text not null default '17:00',
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now()
          );

          create table if not exists patients (
            id uuid primary key default gen_random_uuid(),
            user_id uuid not null unique references users(id) on delete cascade,
            date_of_birth date,
            gender text,
            blood_group text,
            address text,
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now()
          );

          create table if not exists appointments (
            id uuid primary key default gen_random_uuid(),
            code text not null unique,
            patient_id uuid not null references users(id) on delete cascade,
            doctor_id uuid not null references doctors(id) on delete cascade,
            scheduled_at timestamptz not null,
            reason text,
            status text not null default 'scheduled',
            fee numeric not null default 0,
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now(),
            unique(doctor_id, scheduled_at)
          );

          create table if not exists queue_tokens (
            id uuid primary key default gen_random_uuid(),
            token_number int not null,
            appointment_id uuid references appointments(id) on delete set null,
            patient_id uuid references users(id) on delete set null,
            patient_name text not null,
            patient_phone text,
            doctor_id uuid not null references doctors(id) on delete cascade,
            status text not null default 'waiting',
            source text not null,
            notes text,
            day_key text not null,
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now(),
            unique(day_key, token_number)
          );

          create table if not exists notifications (
            id uuid primary key default gen_random_uuid(),
            user_id uuid not null references users(id) on delete cascade,
            title text not null,
            body text not null,
            read boolean not null default false,
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now()
          );
          create index if not exists notifications_user_created_at_idx on notifications(user_id, created_at desc);

          create table if not exists contacts (
            id uuid primary key default gen_random_uuid(),
            name text not null,
            email text not null,
            message text not null,
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now()
          );
        `);
      } finally {
        client.release();
      }

      logger.info("PostgreSQL connected");
    })();
  }
  await connecting;
}
