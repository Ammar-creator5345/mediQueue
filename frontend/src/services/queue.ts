import { api } from "./api";
import type { QueueToken, TokenStatus } from "./types";

export async function listQueue(filters: { doctorId?: string; status?: TokenStatus } = {}): Promise<QueueToken[]> {
  const { data } = await api.get<QueueToken[]>("/queue", { params: filters });
  return data;
}

export interface AddWalkInPayload {
  patientName: string;
  patientPhone?: string;
  doctorId: string;
  notes?: string;
}

export async function addWalkIn(payload: AddWalkInPayload): Promise<QueueToken> {
  const { data } = await api.post<QueueToken>("/queue", payload);
  return data;
}

export async function updateQueueToken(
  id: string,
  payload: { status: TokenStatus; notes?: string }
): Promise<QueueToken> {
  const { data } = await api.patch<QueueToken>(`/queue/${id}`, payload);
  return data;
}
