import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Calendar, ListOrdered, Bell, CheckCircle2, Plus, Stethoscope } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { StatCard, Card, CardHeader, CardTitle, CardBody, EmptyState, Spinner, Badge } from "@/components/Card";
import { Button } from "@/components/Button";
import { listAppointments } from "@/services/appointments";
import { listQueue } from "@/services/queue";
import { listNotifications } from "@/services/notifications";
import { usePolling } from "@/hooks/usePolling";
import type { Appointment, QueueToken, Notification } from "@/services/types";
import { formatDateTime, prettyStatus, statusColor } from "@/utils/format";

export function PatientDashboard() {
  const { user } = useAuth();
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAppointments().then(setAppts).finally(() => setLoading(false));
  }, []);

  const { data: queue } = usePolling<QueueToken[]>(() => listQueue(), 4000);
  const { data: notifs } = usePolling<Notification[]>(() => listNotifications(), 8000);

  const upcoming = appts
    .filter((a) => new Date(a.scheduledAt).getTime() > Date.now() - 60 * 60 * 1000 && a.status !== "cancelled")
    .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));

  const myToken = queue?.find(
    (t) => t.patientId === user!.id && (t.status === "waiting" || t.status === "called" || t.status === "in_progress" || t.status === "on_hold")
  );

  const completedVisits = appts.filter((a) => a.status === "completed").length;
  const unread = (notifs ?? []).filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hi {user!.name.split(" ")[0]}, welcome back</h1>
        <p className="text-sm text-muted-foreground">Patient portal · book visits, track your queue position, and stay informed.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Upcoming visits" value={upcoming.length} icon={<Calendar size={18} />} />
        <StatCard label="In queue today" value={myToken ? `#${myToken.tokenNumber}` : "—"} icon={<ListOrdered size={18} />} />
        <StatCard label="Past visits" value={completedVisits} icon={<CheckCircle2 size={18} />} />
        <StatCard label="Unread alerts" value={unread} icon={<Bell size={18} />} />
      </div>

      {myToken ? (
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
              <CardTitle>Upcoming appointments</CardTitle>
              <Link href="/dashboard/appointments">
                <Button size="sm" variant="ghost">View all</Button>
              </Link>
            </div>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : upcoming.length === 0 ? (
              <EmptyState
                title="No upcoming appointments"
                description="Book a visit with one of our doctors."
                action={
                  <Link href="/dashboard/appointments">
                    <Button size="sm"><Plus size={14} /> Book appointment</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {upcoming.slice(0, 5).map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{a.doctorName}</p>
                      <p className="text-xs text-muted-foreground">{a.specialty} · {formatDateTime(a.scheduledAt)}</p>
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
              <CardTitle>Quick actions</CardTitle>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href="/dashboard/appointments">
                <Card className="cursor-pointer transition hover:border-primary">
                  <CardBody>
                    <Calendar className="text-primary" size={20} />
                    <p className="mt-2 font-medium">Book a visit</p>
                    <p className="text-xs text-muted-foreground">Pick a doctor and time slot</p>
                  </CardBody>
                </Card>
              </Link>
              <Link href="/dashboard/doctors">
                <Card className="cursor-pointer transition hover:border-primary">
                  <CardBody>
                    <Stethoscope className="text-primary" size={20} />
                    <p className="mt-2 font-medium">Browse doctors</p>
                    <p className="text-xs text-muted-foreground">Specialties and hours</p>
                  </CardBody>
                </Card>
              </Link>
              <Link href="/dashboard/notifications">
                <Card className="cursor-pointer transition hover:border-primary">
                  <CardBody>
                    <Bell className="text-primary" size={20} />
                    <p className="mt-2 font-medium">Notifications</p>
                    <p className="text-xs text-muted-foreground">{unread} unread</p>
                  </CardBody>
                </Card>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
