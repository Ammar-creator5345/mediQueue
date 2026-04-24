import { z } from "zod";

export const RoleSchema = z.enum(["patient", "doctor", "receptionist", "admin"]);

export const SignupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: RoleSchema,
  phone: z.string().nullish(),
  specialty: z.string().nullish(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const ContactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  message: z.string().min(5),
});

export const CreateAppointmentSchema = z.object({
  doctorId: z.string().min(1),
  patientId: z.string().nullish(),
  scheduledAt: z.string().datetime({ offset: true }).or(z.string().datetime()),
  reason: z.string().nullish(),
});

export const AppointmentStatusSchema = z.enum([
  "scheduled",
  "checked_in",
  "completed",
  "cancelled",
  "no_show",
]);

export const UpdateAppointmentSchema = z.object({
  status: AppointmentStatusSchema.optional(),
  scheduledAt: z.string().datetime().nullish(),
  reason: z.string().nullish(),
});

export const TokenStatusSchema = z.enum([
  "waiting",
  "called",
  "in_progress",
  "on_hold",
  "completed",
  "skipped",
]);

export const AddWalkInSchema = z.object({
  patientName: z.string().min(2),
  patientPhone: z.string().nullish(),
  doctorId: z.string().min(1),
  notes: z.string().nullish(),
});

export const UpdateQueueTokenSchema = z.object({
  status: TokenStatusSchema,
  notes: z.string().nullish(),
});

export const UpdateDoctorFeeSchema = z.object({
  consultationFee: z.number().min(0).max(1000000),
});
