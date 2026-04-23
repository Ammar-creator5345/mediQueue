import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User, publicUser } from "../models/User";
import { Doctor } from "../models/Doctor";
import { Patient } from "../models/Patient";
import { signToken } from "../middlewares/auth";
import { SignupSchema, LoginSchema, ContactSchema } from "../validators";
import { Contact } from "../models/Contact";

export async function signup(req: Request, res: Response): Promise<void> {
  const parsed = SignupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", issues: parsed.error.issues });
    return;
  }
  const data = parsed.data;
  const existing = await User.findOne({ email: data.email.toLowerCase() });
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await User.create({
    name: data.name,
    email: data.email,
    passwordHash,
    role: data.role,
    phone: data.phone ?? null,
  });

  if (data.role === "doctor") {
    await Doctor.create({
      user: user._id,
      specialty: data.specialty || "General Medicine",
      consultationMinutes: 20,
      startTime: "09:00",
      endTime: "17:00",
    });
  } else if (data.role === "patient") {
    await Patient.create({ user: user._id });
  }

  const token = signToken({
    id: user._id.toString(),
    role: user.role,
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
  const user = await User.findOne({ email: parsed.data.email.toLowerCase() });
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = signToken({
    id: user._id.toString(),
    role: user.role,
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
  const u = await User.findById(req.user.id);
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
  await Contact.create(parsed.data);
  res.status(201).json({ ok: true });
}
