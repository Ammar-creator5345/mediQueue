import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Calendar, ListOrdered, Activity, UserPlus, LogIn, Stethoscope } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { StatCard, Card, CardHeader, CardTitle, CardBody, EmptyState, Spinner, Badge } from "@/components/Card";
import { Button } from "@/components/Button";
import { listAppointments, checkInAppointment } from "@/services/appointments";
import { listQueue } from "@/services/queue";
import { getSummary } from "@/services/reports";
import { usePolling } from "@/hooks/usePolling";
import type { Appointment, QueueToken, ReportSummary } from "@/services/types";
import { formatTime, prettyStatus, statusColor } from "@/utils/format";
import { apiErrorMessage } from "@/services/api";
import { toast } from "sonner";

export function ReceptionistDashboard() {
  const { user } = useAuth();
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAppts() {
    setLoading(true);
    try {
      const list = await listAppointments();
      setAppts(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppts();
  }, []);

  const { data: queue } = usePolling<QueueToken[]>(() => listQueue(), 4000);
  const { data: summary } = usePolling<ReportSummary>(() => getSummary(), 8000);

  const today = new Date().toDateString();
  const todayAppts = appts.filter((a) => new Date(a.scheduledAt).toDateString() === today);
  const pendingCheckIn = todayAppts.filter((a) => a.status === "scheduled");
  const walkInToday = (queue ?? []).filter((t) => t.source === "walkin").length;

  async function onCheckIn(id: string) {
    try {
      const tok = await checkInAppointment(id);
      toast.success(`Token #${tok.tokenNumber} issued`);
      await loadAppts();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not check in"));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Front desk · {user!.name.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">Manage check-ins, walk-ins and the live queue.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's appointments" value={summary?.totalAppointmentsToday ?? "—"} icon={<Calendar size={18} />} />
        <StatCard label="In queue now" value={summary?.waitingTokens ?? "—"} icon={<ListOrdered size={18} />} />
        <StatCard label="In consultation" value={summary?.inProgressTokens ?? "—"} icon={<Activity size={18} />} />
        <StatCard label="Walk-ins today" value={walkInToday} icon={<UserPlus size={18} />} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/dashboard/queue">
          <Card className="cursor-pointer transition hover:border-primary">
            <CardBody className="flex items-center gap-3">
              <UserPlus className="text-primary" size={22} />
              <div>
                <p className="font-medium">Add walk-in</p>
                <p className="text-xs text-muted-foreground">Issue a queue token</p>
              </div>
            </CardBody>
          </Card>
        </Link>
        <Link href="/dashboard/queue">
          <Card className="cursor-pointer transition hover:border-primary">
            <CardBody className="flex items-center gap-3">
              <ListOrdered className="text-primary" size={22} />
              <div>
                <p className="font-medium">Open live queue</p>
                <p className="text-xs text-muted-foreground">Manage all tokens</p>
              </div>
            </CardBody>
          </Card>
        </Link>
        <Link href="/dashboard/doctors">
          <Card className="cursor-pointer transition hover:border-primary">
            <CardBody className="flex items-center gap-3">
              <Stethoscope className="text-primary" size={22} />
              <div>
                <p className="font-medium">Doctors on duty</p>
                <p className="text-xs text-muted-foreground">Specialties & hours</p>
              </div>
            </CardBody>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending check-ins ({pendingCheckIn.length})</CardTitle>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : pendingCheckIn.length === 0 ? (
            <EmptyState title="All clear" description="No appointments waiting to be checked in." />
          ) : (
            <ul className="divide-y divide-border">
              {pendingCheckIn.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{a.patientName} <span className="text-xs text-muted-foreground">→ {a.doctorName}</span></p>
                    <p className="text-xs text-muted-foreground">{formatTime(a.scheduledAt)} · {a.specialty}</p>
                  </div>
                  <Button size="sm" variant="success" onClick={() => onCheckIn(a.id)}>
                    <LogIn size={12} /> Check in
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Live queue snapshot</CardTitle>
            <Link href="/dashboard/queue"><Button size="sm" variant="ghost">Manage</Button></Link>
          </div>
        </CardHeader>
        <CardBody>
          {!queue ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : queue.length === 0 ? (
            <EmptyState title="Queue is empty" description="No active tokens right now." />
          ) : (
            <ul className="divide-y divide-border">
              {queue.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 font-semibold text-primary">#{t.tokenNumber}</span>
                    <div>
                      <p className="text-sm font-medium">{t.patientName}</p>
                      <p className="text-xs text-muted-foreground">{t.doctorName} · {t.source === "walkin" ? "Walk-in" : "Appointment"}</p>
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
  );
}
