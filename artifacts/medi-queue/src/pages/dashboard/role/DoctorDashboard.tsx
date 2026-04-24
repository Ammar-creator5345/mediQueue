import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Activity, ListOrdered, CheckCircle2, Calendar, Phone, PlayCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { StatCard, Card, CardHeader, CardTitle, CardBody, EmptyState, Spinner, Badge } from "@/components/Card";
import { Button } from "@/components/Button";
import { listAppointments } from "@/services/appointments";
import { listQueue, updateQueueToken } from "@/services/queue";
import { usePolling } from "@/hooks/usePolling";
import type { Appointment, QueueToken } from "@/services/types";
import { formatTime, prettyStatus, statusColor } from "@/utils/format";
import { apiErrorMessage } from "@/services/api";
import { toast } from "sonner";

export function DoctorDashboard() {
  const { user } = useAuth();
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAppointments().then(setAppts).finally(() => setLoading(false));
  }, []);

  const { data: queue, refresh } = usePolling<QueueToken[]>(() => listQueue(), 4000);

  const today = new Date().toDateString();
  const todayAppts = appts.filter((a) => new Date(a.scheduledAt).toDateString() === today);

  const waiting = (queue ?? []).filter((t) => t.status === "waiting").length;
  const inProgress = (queue ?? []).filter((t) => t.status === "in_progress");
  const completedToday = (queue ?? []).filter((t) => t.status === "completed").length;
  const nextUp = (queue ?? []).filter((t) => t.status === "waiting" || t.status === "called").slice(0, 5);

  async function setStatus(id: string, status: QueueToken["status"]) {
    try {
      await updateQueueToken(id, { status });
      await refresh();
      toast.success(`Token marked ${prettyStatus(status)}`);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not update token"));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Good day, Dr. {user!.name.split(" ").slice(-1)[0]}</h1>
        <p className="text-sm text-muted-foreground">Doctor console · manage your queue and consultations.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's appointments" value={todayAppts.length} icon={<Calendar size={18} />} />
        <StatCard label="Waiting" value={waiting} icon={<ListOrdered size={18} />} />
        <StatCard label="In consultation" value={inProgress.length} icon={<Activity size={18} />} />
        <StatCard label="Completed today" value={completedToday} icon={<CheckCircle2 size={18} />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Now serving</CardTitle>
          </CardHeader>
          <CardBody>
            {!queue ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : inProgress.length === 0 ? (
              <EmptyState
                title="No one in consultation"
                description="Call the next waiting token to start."
                action={<Link href="/dashboard/queue"><Button size="sm">Open queue</Button></Link>}
              />
            ) : (
              <ul className="space-y-3">
                {inProgress.map((t) => (
                  <li key={t.id} className="flex items-center justify-between rounded-md border border-border p-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-lg font-bold text-primary">#{t.tokenNumber}</span>
                      <div>
                        <p className="font-medium">{t.patientName}</p>
                        <p className="text-xs text-muted-foreground">Started {formatTime(t.updatedAt)}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="success" onClick={() => setStatus(t.id, "completed")}>
                      <CheckCircle2 size={12} /> Complete
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
              <CardTitle>Next in line</CardTitle>
              <Link href="/dashboard/queue"><Button size="sm" variant="ghost">Full queue</Button></Link>
            </div>
          </CardHeader>
          <CardBody>
            {!queue ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : nextUp.length === 0 ? (
              <EmptyState title="Queue is empty" description="No tokens waiting." />
            ) : (
              <ul className="divide-y divide-border">
                {nextUp.map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 font-semibold text-primary">#{t.tokenNumber}</span>
                      <div>
                        <p className="text-sm font-medium">{t.patientName}</p>
                        <p className="text-xs text-muted-foreground">{prettyStatus(t.status)}</p>
                      </div>
                    </div>
                    {t.status === "waiting" ? (
                      <Button size="sm" onClick={() => setStatus(t.id, "called")}><Phone size={12} /> Call</Button>
                    ) : (
                      <Button size="sm" variant="primary" onClick={() => setStatus(t.id, "in_progress")}>
                        <PlayCircle size={12} /> Start
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today's appointments</CardTitle>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : todayAppts.length === 0 ? (
            <EmptyState title="Nothing on the books today" description="Your assigned appointments will appear here." />
          ) : (
            <ul className="divide-y divide-border">
              {todayAppts.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{a.patientName}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(a.scheduledAt)} · {a.reason ?? "—"}</p>
                  </div>
                  <Badge className={statusColor(a.status)}>{prettyStatus(a.status)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
