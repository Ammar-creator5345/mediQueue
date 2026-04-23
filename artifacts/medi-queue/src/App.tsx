import { Switch, Route, Router as WouterRouter } from "wouter";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/layouts/DashboardLayout";

import { HomePage } from "@/pages/public/Home";
import { AboutPage } from "@/pages/public/About";
import { ContactPage } from "@/pages/public/Contact";
import { NotFoundPage } from "@/pages/public/NotFound";
import { LoginPage } from "@/pages/auth/Login";
import { SignupPage } from "@/pages/auth/Signup";
import { DashboardHome } from "@/pages/dashboard/DashboardHome";
import { AppointmentsPage } from "@/pages/dashboard/Appointments";
import { QueuePage } from "@/pages/dashboard/Queue";
import { DoctorsPage } from "@/pages/dashboard/Doctors";
import { PatientsPage } from "@/pages/dashboard/Patients";
import { ReportsPage } from "@/pages/dashboard/Reports";
import { NotificationsPage } from "@/pages/dashboard/Notifications";

function DashboardSwitch() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Switch>
          <Route path="/dashboard" component={DashboardHome} />
          <Route path="/dashboard/appointments" component={AppointmentsPage} />
          <Route path="/dashboard/queue" component={QueuePage} />
          <Route path="/dashboard/doctors" component={DoctorsPage} />
          <Route path="/dashboard/patients">
            <ProtectedRoute roles={["doctor", "receptionist", "admin"]}>
              <PatientsPage />
            </ProtectedRoute>
          </Route>
          <Route path="/dashboard/reports">
            <ProtectedRoute roles={["doctor", "receptionist", "admin"]}>
              <ReportsPage />
            </ProtectedRoute>
          </Route>
          <Route path="/dashboard/notifications" component={NotificationsPage} />
          <Route component={NotFoundPage} />
        </Switch>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/about" component={AboutPage} />
            <Route path="/contact" component={ContactPage} />
            <Route path="/login" component={LoginPage} />
            <Route path="/signup" component={SignupPage} />
            <Route path="/dashboard/:rest*" component={DashboardSwitch} />
            <Route path="/dashboard" component={DashboardSwitch} />
            <Route component={NotFoundPage} />
          </Switch>
          <Toaster richColors position="top-right" />
        </WouterRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
