import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { createUser, findUserByEmail, findUserById, type UserRole } from "../repo/users";
import { createDoctor } from "../repo/doctors";
import { createPatient } from "../repo/patients";
import { signToken } from "../middlewares/auth";
import { SignupSchema, LoginSchema, ContactSchema } from "../validators";
import { createContact } from "../repo/contacts";
import { notifyRoles } from "../services/notify";

function publicUser(u: { id: string; name: string; email: string; role: UserRole; phone: string | null; created_at: Date }) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone ?? null,
    createdAt: u.created_at.toISOString(),
  };
}

export async function signup(req: Request, res: Response): Promise<void> {
  const parsed = SignupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", issues: parsed.error.issues });
    return;
  }
  const data = parsed.data;
  const existing = await findUserByEmail(data.email);
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await createUser({
    name: data.name,
    email: data.email,
    passwordHash,
    role: data.role as UserRole,
    phone: data.phone ?? null,
  });

  if (data.role === "doctor") {
    await createDoctor({
      userId: user.id,
      specialty: data.specialty || "General Medicine",
      consultationMinutes: 20,
      consultationFee: 0,
      startTime: "09:00",
      endTime: "17:00",
    });
    await notifyRoles(["admin"], "New doctor registered", `Dr. ${user.name} (${data.specialty || "General Medicine"}) has joined.`);
  } else if (data.role === "patient") {
    await createPatient(user.id);
  } else if (data.role === "receptionist") {
    await notifyRoles(["admin"], "New receptionist registered", `${user.name} has joined the front desk.`);
  } else if (data.role === "admin") {
    await notifyRoles(["admin"], "New admin added", `${user.name} now has admin access.`);
  }

  const token = signToken({
    id: user.id,
    role: user.role as any,
    email: user.email,
    name: user.name,
  });
  res.status(201).json({ token, user: publicUser(user) });
}

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", issues: parsed.error.issues });
    return;
  }
  const user = await findUserByEmail(parsed.data.email);
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const ok = await bcrypt.compare(parsed.data.password, user.password_hash);
  if (!ok) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = signToken({
    id: user.id,
    role: user.role as any,
    email: user.email,
    name: user.name,
  });
  res.json({ token, user: publicUser(user) });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const u = await findUserById(req.user.id);
  if (!u) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(publicUser(u));
}

export async function submitContact(req: Request, res: Response): Promise<void> {
  const parsed = ContactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", issues: parsed.error.issues });
    return;
  }
  const c = await createContact(parsed.data as any);
  await notifyRoles(["admin"], "New contact message", `${c.name} (${c.email}): ${c.message.slice(0, 80)}`);
  res.status(201).json({ ok: true });
}
