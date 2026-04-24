import { api, TOKEN_KEY } from "./api";
import type { Doctor } from "./types";

export async function listDoctors(specialty?: string): Promise<Doctor[]> {
  const { data } = await api.get<Doctor[]>("/doctors", { params: specialty ? { specialty } : undefined });
  return data;
}

export async function getDoctor(id: string): Promise<Doctor> {
  const { data } = await api.get<Doctor>(`/doctors/${id}`);
  return data;
}

export async function getMyDoctorProfile(): Promise<Doctor> {
  const { data } = await api.get<Doctor>("/doctors/me");
  return data;
}

export interface UpdateDoctorProfilePayload {
  name?: string;
  specialty?: string;
  consultationFee?: number;
  startTime?: string;
  endTime?: string;
}

export async function updateMyDoctorProfile(payload: UpdateDoctorProfilePayload): Promise<Doctor> {
  const { data } = await api.put<Doctor>("/doctors/profile", payload);
  return data;
}

export async function listSlots(doctorId: string, date: string): Promise<string[]> {
  const { data } = await api.get<string[]>(`/doctors/${doctorId}/slots`, { params: { date } });
  return data;
}

export function buildReceiptUrl(appointmentId: string): string {
  const baseURL = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api`.replace(/^\/\//, "/");
  const token = localStorage.getItem(TOKEN_KEY) ?? "";
  return `${baseURL}/reports/receipt/${appointmentId}?access_token=${encodeURIComponent(token)}`;
}
