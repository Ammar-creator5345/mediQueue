import { useAuth } from "@/context/AuthContext";
import { PatientDashboard } from "./role/PatientDashboard";
import { DoctorDashboard } from "./role/DoctorDashboard";
import { ReceptionistDashboard } from "./role/ReceptionistDashboard";
import { AdminDashboard } from "./role/AdminDashboard";

export function DashboardHome() {
  const { user } = useAuth();
  const role = user!.role;
  if (role === "patient") return <PatientDashboard />;
  if (role === "doctor") return <DoctorDashboard />;
  if (role === "receptionist") return <ReceptionistDashboard />;
  return <AdminDashboard />;
}
