import { useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import { Card, CardBody, EmptyState, Spinner } from "@/components/Card";
import { Input } from "@/components/Input";
import { listAppointments } from "@/services/appointments";
import type { Appointment } from "@/services/types";

interface PatientSummary {
  id: string;
  name: string;
  visits: number;
  lastVisit: string;
}

export function PatientsPage() {
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    listAppointments()
      .then(setAppts)
      .finally(() => setLoading(false));
  }, []);

  const patients: PatientSummary[] = useMemo(() => {
    const map = new Map<string, PatientSummary>();
    for (const a of appts) {
      const existing = map.get(a.patientId);
      if (!existing) {
        map.set(a.patientId, { id: a.patientId, name: a.patientName, visits: 1, lastVisit: a.scheduledAt });
      } else {
        existing.visits += 1;
        if (new Date(a.scheduledAt) > new Date(existing.lastVisit)) existing.lastVisit = a.scheduledAt;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.visits - a.visits);
  }, [appts]);

  const filtered = patients.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Patients</h1>
        <p className="text-sm text-muted-foreground">Patients you have seen or who have appointments scheduled.</p>
      </div>
      <Input placeholder="Search patients…" value={q} onChange={(e) => setQ(e.target.value)} />
      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No patients yet" description="Once appointments are booked, patients will appear here." />
      ) : (
        <Card>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-4">Patient</th>
                    <th className="py-2 pr-4">Visits</th>
                    <th className="py-2 pr-4">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
                            <Users size={14} />
                          </span>
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">{p.visits}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{new Date(p.lastVisit).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
