import bcrypt from "bcryptjs";
import { User, type UserRole } from "../models/User";
import { Doctor } from "../models/Doctor";
import { Patient } from "../models/Patient";
import { logger } from "../lib/logger";

interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  doctor?: { specialty: string; bio: string; consultationMinutes: number };
}

const SEED_USERS: SeedUser[] = [
  { name: "Admin", email: "admin@mediqueue.dev", password: "admin123", role: "admin" },
  { name: "Riya Reception", email: "reception@mediqueue.dev", password: "reception123", role: "receptionist" },
  {
    name: "Dr. Aarav Patel",
    email: "aarav@mediqueue.dev",
    password: "doctor123",
    role: "doctor",
    doctor: { specialty: "General Medicine", bio: "10+ years in primary care.", consultationMinutes: 20 },
  },
  {
    name: "Dr. Saanvi Iyer",
    email: "saanvi@mediqueue.dev",
    password: "doctor123",
    role: "doctor",
    doctor: { specialty: "Pediatrics", bio: "Pediatric specialist focused on early childhood care.", consultationMinutes: 25 },
  },
  {
    name: "Dr. Noah Williams",
    email: "noah@mediqueue.dev",
    password: "doctor123",
    role: "doctor",
    doctor: { specialty: "Cardiology", bio: "Interventional cardiology, preventive care.", consultationMinutes: 30 },
  },
  {
    name: "Sample Patient",
    email: "patient@mediqueue.dev",
    password: "patient123",
    role: "patient",
    phone: "+1-555-0100",
  },
];

export async function seedIfEmpty(): Promise<void> {
  let created = 0;
  for (const s of SEED_USERS) {
    const existing = await User.findOne({ email: s.email });
    let user = existing;
    if (!existing) {
      const passwordHash = await bcrypt.hash(s.password, 10);
      user = await User.create({
        name: s.name,
        email: s.email,
        passwordHash,
        role: s.role,
        phone: s.phone ?? null,
      });
      created++;
    } else {
      // Always reset demo passwords so the credentials shown in the UI work.
      const passwordHash = await bcrypt.hash(s.password, 10);
      existing.passwordHash = passwordHash;
      existing.role = s.role;
      existing.name = s.name;
      if (s.phone) existing.phone = s.phone;
      await existing.save();
    }

    if (s.role === "doctor" && user) {
      const doc = await Doctor.findOne({ user: user._id });
      if (!doc) {
        await Doctor.create({
          user: user._id,
          specialty: s.doctor!.specialty,
          bio: s.doctor!.bio,
          consultationMinutes: s.doctor!.consultationMinutes,
          startTime: "09:00",
          endTime: "17:00",
        });
      }
    } else if (s.role === "patient" && user) {
      const pat = await Patient.findOne({ user: user._id });
      if (!pat) await Patient.create({ user: user._id });
    }
  }
  logger.info({ created, total: SEED_USERS.length }, "Seed sync complete");
}
