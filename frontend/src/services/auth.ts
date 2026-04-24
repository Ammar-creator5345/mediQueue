import { api } from "./api";
import type { User, UserRole } from "./types";

export interface AuthResponse {
  token: string;
  user: User;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
  return data;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  specialty?: string;
}

export async function signup(payload: SignupPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/signup", payload);
  return data;
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>("/auth/me");
  return data;
}

export async function submitContact(payload: { name: string; email: string; message: string }): Promise<void> {
  await api.post("/contact", payload);
}
