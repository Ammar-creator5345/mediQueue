import { useEffect, useState } from "react";
import { Stethoscope, Clock, IndianRupee, Save } from "lucide-react";
import { toast } from "sonner";
import { Card, CardBody, EmptyState, Spinner, Badge } from "@/components/Card";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { listDoctors, updateDoctorFee } from "@/services/doctors";
import { useAuth } from "@/context/AuthContext";
import { apiErrorMessage } from "@/services/api";
import type { Doctor } from "@/services/types";

export function DoctorsPage() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [feeDraft, setFeeDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const list = await listDoctors();
      setDoctors(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = doctors.filter(
    (d) =>
      d.name.toLowerCase().includes(q.toLowerCase()) ||
      d.specialty.toLowerCase().includes(q.toLowerCase())
  );

  async function onSaveFee(d: Doctor) {
    const raw = feeDraft[d.id] ?? String(d.consultationFee);
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error("Enter a valid fee amount");
      return;
    }
    setSaving(d.id);
    try {
      const updated = await updateDoctorFee(d.id, parsed);
      setDoctors((prev) => prev.map((x) => (x.id === d.id ? updated : x)));
      setFeeDraft((prev) => {
        const next = { ...prev };
        delete next[d.id];
        return next;
      });
      toast.success(`Fee updated for ${updated.name}`);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not update fee"));
    } finally {
      setSaving(null);
    }
  }

  const isAdmin = user?.role === "admin";

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
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{d.name}</p>
                    <Badge className="bg-accent text-accent-foreground">{d.specialty}</Badge>
                  </div>
                </div>
                {d.bio ? <p className="mt-3 text-sm text-muted-foreground">{d.bio}</p> : null}
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock size={12} /> {d.startTime} – {d.endTime} · {d.consultationMinutes} min slots
                </div>
                <div className="mt-3 flex items-center justify-between rounded-md bg-muted px-3 py-2">
                  <div className="flex items-center gap-1.5 text-sm">
                    <IndianRupee size={14} className="text-primary" />
                    <span className="font-medium">
                      {d.consultationFee > 0 ? `₹${d.consultationFee}` : "Fee not set"}
                    </span>
                    <span className="text-xs text-muted-foreground">/ consultation</span>
                  </div>
                </div>
                {isAdmin ? (
                  <div className="mt-3 flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={50}
                      placeholder="New fee"
                      value={feeDraft[d.id] ?? String(d.consultationFee)}
                      onChange={(e) => setFeeDraft((p) => ({ ...p, [d.id]: e.target.value }))}
                    />
                    <Button size="sm" loading={saving === d.id} onClick={() => onSaveFee(d)}>
                      <Save size={12} /> Save
                    </Button>
                  </div>
                ) : null}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
