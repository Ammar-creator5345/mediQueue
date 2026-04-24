import { api } from "./api";
import type { Appointment, AppointmentStatus, QueueToken } from "./types";

export interface AppointmentFilters {
  status?: AppointmentStatus;
  doctorId?: string;
  patientId?: string;
  date?: string;
}

export async function listAppointments(filters: AppointmentFilters = {}): Promise<Appointment[]> {
  const { data } = await api.get<Appointment[]>("/appointments", { params: filters });
  return data;
}

export interface CreateAppointmentPayload {
  doctorId: string;
  scheduledAt: string;
  reason?: string;
  patientId?: string;
}

export async function createAppointment(payload: CreateAppointmentPayload): Promise<Appointment> {
  const { data } = await api.post<Appointment>("/appointments", payload);
  return data;
}

export async function cancelAppointment(id: string): Promise<void> {
  await api.delete(`/appointments/${id}`);
}

export async function checkInAppointment(id: string): Promise<QueueToken> {
  const { data } = await api.post<QueueToken>(`/appointments/${id}/check-in`);
  return data;
}

export async function updateAppointment(
  id: string,
  payload: { status?: AppointmentStatus; reason?: string; scheduledAt?: string }
): Promise<Appointment> {
  const { data } = await api.patch<Appointment>(`/appointments/${id}`, payload);
  return data;
}
