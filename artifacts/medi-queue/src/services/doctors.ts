import { api } from "./api";
import type { Doctor } from "./types";

export async function listDoctors(specialty?: string): Promise<Doctor[]> {
  const { data } = await api.get<Doctor[]>("/doctors", { params: specialty ? { specialty } : undefined });
  return data;
}

export async function getDoctor(id: string): Promise<Doctor> {
  const { data } = await api.get<Doctor>(`/doctors/${id}`);
  return data;
}

export async function listSlots(doctorId: string, date: string): Promise<string[]> {
  const { data } = await api.get<string[]>(`/doctors/${doctorId}/slots`, { params: { date } });
  return data;
}
