import { useEffect, useState } from "react";
import { Calendar, ListOrdered, Users, Stethoscope, Activity, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { StatCard, Card, CardHeader, CardTitle, CardBody, EmptyState, Spinner, Badge } from "@/components/Card";
import { listAppointments } from "@/services/appointments";
import { listQueue } from "@/services/queue";
import { getSummary } from "@/services/reports";
import { usePolling } from "@/hooks/usePolling";
import type { Appointment, QueueToken, ReportSummary } from "@/services/types";
import { formatDateTime, prettyStatus, statusColor } from "@/utils/format";
import { Link } from "wouter";
import { Button } from "@/components/Button";

export function DashboardHome() {
  const { user } = useAuth();
  const role = user!.role;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingA, setLoadingA] = useState(true);

  useEffect(() => {
    listAppointments()
      .then(setAppointments)
      .finally(() => setLoadingA(false));
  }, []);

  const upcoming = appointments
    .filter((a) => new Date(a.scheduledAt).getTime() > Date.now() - 60 * 60 * 1000 && a.status !== "cancelled")
    .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt))
    .slice(0, 5);

  const { data: queue } = usePolling<QueueToken[]>(() => listQueue(), 5000);
  const { data: summary } = usePolling<ReportSummary>(() => getSummary(), 8000);

  const myToken = queue?.find((t) => t.patientId === user!.id && (t.status === "waiting" || t.status === "called" || t.status === "in_progress"));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user!.name.split(" ")[0]} 👋</h1>
        <p className="text-sm text-muted-foreground">
          You are signed in as <span className="capitalize">{role}</span>. Here's what's happening today.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's Appointments"
          value={summary?.totalAppointmentsToday ?? "—"}
          icon={<Calendar size={18} />}
        />
        <StatCard
          label="Currently Waiting"
          value={summary?.waitingTokens ?? "—"}
          icon={<ListOrdered size={18} />}
        />
        <StatCard
          label="In Consultation"
          value={summary?.inProgressTokens ?? "—"}
          icon={<Activity size={18} />}
        />
        <StatCard
          label="Completed Today"
          value={summary?.completedToday ?? "—"}
          icon={<CheckCircle2 size={18} />}
        />
        {(role === "admin" || role === "receptionist") && (
          <>
            <StatCard label="Total Doctors" value={summary?.totalDoctors ?? "—"} icon={<Stethoscope size={18} />} />
            <StatCard label="Total Patients" value={summary?.totalPatients ?? "—"} icon={<Users size={18} />} />
          </>
        )}
      </div>

      {role === "patient" && myToken ? (
        <Card className="border-primary/40 bg-accent/40">
          <CardBody>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Your live token</p>
                <p className="mt-1 text-5xl font-bold text-primary">#{myToken.tokenNumber}</p>
                <p className="mt-2 text-sm">
                  with <span className="font-medium">{myToken.doctorName}</span> · {myToken.specialty}
                </p>
              </div>
              <Badge className={statusColor(myToken.status)}>{prettyStatus(myToken.status)}</Badge>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming Appointments</CardTitle>
              <Link href="/dashboard/appointments">
                <Button size="sm" variant="ghost">View all</Button>
              </Link>
            </div>
          </CardHeader>
          <CardBody>
            {loadingA ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : upcoming.length === 0 ? (
              <EmptyState
                title="No upcoming appointments"
                description={role === "patient" ? "Book one to get started." : "Nothing on the books right now."}
                action={
                  role === "patient" ? (
                    <Link href="/dashboard/appointments"><Button size="sm">Book Appointment</Button></Link>
                  ) : undefined
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {upcoming.map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{role === "patient" ? a.doctorName : a.patientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {role === "patient" ? a.specialty : a.doctorName} · {formatDateTime(a.scheduledAt)}
                      </p>
                    </div>
                    <Badge className={statusColor(a.status)}>{prettyStatus(a.status)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Live Queue</CardTitle>
              <Link href="/dashboard/queue">
                <Button size="sm" variant="ghost">Open queue</Button>
              </Link>
            </div>
          </CardHeader>
          <CardBody>
            {!queue ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : queue.length === 0 ? (
              <EmptyState title="Queue is empty" description="No one is waiting right now." />
            ) : (
              <ul className="divide-y divide-border">
                {queue.slice(0, 6).map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 font-semibold text-primary">
                        #{t.tokenNumber}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{t.patientName}</p>
                        <p className="text-xs text-muted-foreground">{t.doctorName} · {t.specialty}</p>
                      </div>
                    </div>
                    <Badge className={statusColor(t.status)}>{prettyStatus(t.status)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
