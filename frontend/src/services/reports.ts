import { api } from "./api";
import type { ReportSummary } from "./types";

export async function getSummary(): Promise<ReportSummary> {
  const { data } = await api.get<ReportSummary>("/reports/summary");
  return data;
}

export async function getAppointmentsPerDay(days = 14): Promise<Array<{ date: string; count: number }>> {
  const { data } = await api.get<Array<{ date: string; count: number }>>("/reports/appointments-per-day", {
    params: { days },
  });
  return data;
}

export async function getStatusDistribution(): Promise<Array<{ label: string; count: number }>> {
  const { data } = await api.get<Array<{ label: string; count: number }>>("/reports/status-distribution");
  return data;
}

export async function getQueueStatusReport(): Promise<Array<{ label: string; count: number }>> {
  const { data } = await api.get<Array<{ label: string; count: number }>>("/reports/queue-status");
  return data;
}

export async function getDoctorUtilization(): Promise<
  Array<{ doctorId: string; doctorName: string; specialty: string; count: number }>
> {
  const { data } = await api.get("/reports/doctor-utilization");
  return data;
}

export async function downloadAppointmentReceipt(appointmentId: string): Promise<void> {
  const res = await api.get(`/reports/receipt/${appointmentId}`, { responseType: "blob" });
  const blob = res.data as Blob;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `receipt-${appointmentId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
