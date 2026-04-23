import { useEffect, useState } from "react";
import { Stethoscope, Clock } from "lucide-react";
import { Card, CardBody, EmptyState, Spinner, Badge } from "@/components/Card";
import { Input } from "@/components/Input";
import { listDoctors } from "@/services/doctors";
import type { Doctor } from "@/services/types";

export function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    listDoctors()
      .then(setDoctors)
      .finally(() => setLoading(false));
  }, []);

  const filtered = doctors.filter(
    (d) =>
      d.name.toLowerCase().includes(q.toLowerCase()) ||
      d.specialty.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Doctors</h1>
        <p className="text-sm text-muted-foreground">Browse the doctors available at the clinic.</p>
      </div>
      <Input placeholder="Search by name or specialty…" value={q} onChange={(e) => setQ(e.target.value)} />
      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No doctors found" description="Try a different search." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => (
            <Card key={d.id}>
              <CardBody>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Stethoscope size={20} />
                  </div>
                  <div>
                    <p className="font-semibold">{d.name}</p>
                    <Badge className="bg-accent text-accent-foreground">{d.specialty}</Badge>
                  </div>
                </div>
                {d.bio ? <p className="mt-3 text-sm text-muted-foreground">{d.bio}</p> : null}
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock size={12} /> {d.startTime} – {d.endTime} · {d.consultationMinutes} min slots
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
