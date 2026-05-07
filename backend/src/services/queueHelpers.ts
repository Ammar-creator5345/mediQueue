import { lastTokenForDay } from "../repo/queueTokens";

export function dayKeyFor(doctorId: string, date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}-${doctorId.toString()}`;
}

export async function nextTokenNumber(dayKey: string): Promise<number> {
  const last = await lastTokenForDay(dayKey);
  return (last?.token_number ?? 0) + 1;
}

export function genApptCode(): string {
  const t = Date.now().toString(36).toUpperCase().slice(-6);
  const r = Math.floor(Math.random() * 36 * 36 * 36)
    .toString(36)
    .toUpperCase()
    .padStart(3, "0");
  return `APT-${t}-${r}`;
}
