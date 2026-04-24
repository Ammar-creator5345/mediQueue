import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardBody, Spinner, EmptyState, Badge } from "@/components/Card";
import { Button } from "@/components/Button";
import {
  getAppointmentsPerDay,
  getStatusDistribution,
  getQueueStatusReport,
  getDoctorUtilization,
  downloadAppointmentReceipt,
} from "@/services/reports";
import { listAppointments } from "@/services/appointments";
import type { Appointment } from "@/services/types";
import { apiErrorMessage } from "@/services/api";
import { formatDateTime, prettyStatus, statusColor } from "@/utils/format";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export function ReportsPage() {
  const [perDay, setPerDay] = useState<Array<{ date: string; count: number }> | null>(null);
  const [statusDist, setStatusDist] = useState<Array<{ label: string; count: number }> | null>(null);
  const [queueDist, setQueueDist] = useState<Array<{ label: string; count: number }> | null>(null);
  const [util, setUtil] = useState<Array<{ doctorName: string; specialty: string; count: number }> | null>(null);
  const [appts, setAppts] = useState<Appointment[] | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    getAppointmentsPerDay(14).then(setPerDay);
    getStatusDistribution().then(setStatusDist);
    getQueueStatusReport().then(setQueueDist);
    getDoctorUtilization().then(setUtil);
    listAppointments().then((list) => setAppts(list.slice().reverse()));
  }, []);

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
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">Live insights into appointments and queue activity.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointments — last 14 days</CardTitle>
        </CardHeader>
        <CardBody>
          {!perDay ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={perDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Appointment status distribution</CardTitle>
          </CardHeader>
          <CardBody>
            {!statusDist ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : statusDist.length === 0 ? (
              <EmptyState title="No data" description="Once appointments are created, this chart populates." />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDist.map((s) => ({ name: prettyStatus(s.label), value: s.count }))}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={90}
                      label
                    >
                      {statusDist.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today's queue by status</CardTitle>
          </CardHeader>
          <CardBody>
            {!queueDist ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : queueDist.length === 0 ? (
              <EmptyState title="No queue activity yet" description="Tokens issued today will show here." />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={queueDist.map((q) => ({ name: prettyStatus(q.label), value: q.count }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Doctor utilization (last 7 days)</CardTitle>
        </CardHeader>
        <CardBody>
          {!util ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : util.length === 0 ? (
            <EmptyState title="No appointments yet" description="As doctors see patients, you'll see comparative load here." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={util} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis dataKey="doctorName" type="category" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--chart-3))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <span className="inline-flex items-center gap-2"><FileText size={16} /> Appointment receipts</span>
          </CardTitle>
        </CardHeader>
        <CardBody>
          {!appts ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : appts.length === 0 ? (
            <EmptyState title="No appointments to download" description="Appointments will appear here as they are created." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-4">Code</th>
                    <th className="py-2 pr-4">Patient</th>
                    <th className="py-2 pr-4">Doctor</th>
                    <th className="py-2 pr-4">When</th>
                    <th className="py-2 pr-4">Fee</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {appts.slice(0, 50).map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0">
                      <td className="py-3 pr-4 font-mono text-xs">{a.code}</td>
                      <td className="py-3 pr-4">{a.patientName}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{a.doctorName}</td>
                      <td className="py-3 pr-4 text-xs">{formatDateTime(a.scheduledAt)}</td>
                      <td className="py-3 pr-4 font-medium">{a.fee > 0 ? `₹${a.fee}` : "—"}</td>
                      <td className="py-3 pr-4">
                        <Badge className={statusColor(a.status)}>{prettyStatus(a.status)}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          loading={downloading === a.id}
                          onClick={() => onDownload(a.id)}
                        >
                          <Download size={12} /> PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
