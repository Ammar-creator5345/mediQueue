export type UserRole = "patient" | "doctor" | "receptionist" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  createdAt: string;
}

export interface Doctor {
  id: string;
  userId: string;
  name: string;
  email: string;
  specialty: string;
  bio: string | null;
  consultationMinutes: number;
  startTime: string;
  endTime: string;
  createdAt: string;
}

export type AppointmentStatus =
  | "scheduled"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "no_show";

export interface Appointment {
  id: string;
  code: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  scheduledAt: string;
  reason: string | null;
  status: AppointmentStatus;
  createdAt: string;
}

export type TokenStatus =
  | "waiting"
  | "called"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "skipped";

export interface QueueToken {
  id: string;
  tokenNumber: number;
  appointmentId: string | null;
  patientId: string | null;
  patientName: string;
  patientPhone: string | null;
  doctorId: string;
  doctorName: string;
  specialty: string;
  status: TokenStatus;
  source: "appointment" | "walkin";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface ReportSummary {
  totalAppointmentsToday: number;
  waitingTokens: number;
  inProgressTokens: number;
  completedToday: number;
  totalDoctors: number;
  totalPatients: number;
}
