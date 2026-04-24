import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Stethoscope, Users, Calendar, ListOrdered, BarChart3, Download } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { StatCard, Card, CardHeader, CardTitle, CardBody, Spinner, EmptyState, Badge } from "@/components/Card";
import { Button } from "@/components/Button";
import { getSummary, getAppointmentsPerDay, downloadAppointmentReceipt } from "@/services/reports";
import { listAppointments } from "@/services/appointments";
import { usePolling } from "@/hooks/usePolling";
import type { Appointment, ReportSummary } from "@/services/types";
import { formatDateTime, prettyStatus, statusColor } from "@/utils/format";
import { apiErrorMessage } from "@/services/api";

export function AdminDashboard() {
  const { user } = useAuth();
  const [recent, setRecent] = useState<Appointment[]>([]);
  const [perDay, setPerDay] = useState<Array<{ date: string; count: number }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listAppointments(), getAppointmentsPerDay(7)])
      .then(([a, p]) => {
        setRecent(a.slice(-8).reverse());
        setPerDay(p);
      })
      .finally(() => setLoading(false));
  }, []);

  const { data: summary } = usePolling<ReportSummary>(() => getSummary(), 6000);

  async function onDownload(id: string) {
    setDownloading(id);
    try {
      await downloadAppointmentReceipt(id);
      toast.success("Receipt downloaded");
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not download receipt"));
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin · {user!.name.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">System overview and operations health.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total doctors" value={summary?.totalDoctors ?? "—"} icon={<Stethoscope size={18} />} />
        <StatCard label="Total patients" value={summary?.totalPatients ?? "—"} icon={<Users size={18} />} />
        <StatCard label="Appointments today" value={summary?.totalAppointmentsToday ?? "—"} icon={<Calendar size={18} />} />
        <StatCard label="In queue now" value={summary?.waitingTokens ?? "—"} icon={<ListOrdered size={18} />} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Appointments — last 7 days</CardTitle>
            <Link href="/dashboard/reports"><Button size="sm" variant="ghost"><BarChart3 size={14} /> Full reports</Button></Link>
          </div>
        </CardHeader>
        <CardBody>
          {!perDay ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={perDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent appointments</CardTitle>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : recent.length === 0 ? (
            <EmptyState title="No appointments yet" description="Activity will appear here as patients book." />
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {a.patientName} <span className="text-xs text-muted-foreground">→ {a.doctorName}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(a.scheduledAt)} · {a.fee > 0 ? `₹${a.fee}` : "fee not set"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColor(a.status)}>{prettyStatus(a.status)}</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={downloading === a.id}
                      onClick={() => onDownload(a.id)}
                    >
                      <Download size={12} /> Receipt
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
