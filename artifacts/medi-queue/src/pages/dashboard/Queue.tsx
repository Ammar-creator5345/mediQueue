import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Plus, Phone, PlayCircle, CheckCircle2, PauseCircle, SkipForward } from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody, Badge, EmptyState, Spinner } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input, Select } from "@/components/Input";
import { useAuth } from "@/context/AuthContext";
import { usePolling } from "@/hooks/usePolling";
import { listQueue, addWalkIn, updateQueueToken } from "@/services/queue";
import { listDoctors } from "@/services/doctors";
import type { Doctor, QueueToken, TokenStatus } from "@/services/types";
import { formatTime, prettyStatus, statusColor } from "@/utils/format";
import { useEffect } from "react";
import { apiErrorMessage } from "@/services/api";

interface WalkInForm {
  patientName: string;
  patientPhone?: string;
  doctorId: string;
  notes?: string;
}

const walkInSchema = yup.object({
  patientName: yup.string().required("Name is required").min(2, "Too short"),
  doctorId: yup.string().required("Pick a doctor"),
  patientPhone: yup.string().optional(),
  notes: yup.string().optional(),
});

export function QueuePage() {
  const { user } = useAuth();
  const role = user!.role;
  const canManage = role === "doctor" || role === "receptionist" || role === "admin";
  const canAddWalkIn = role === "receptionist" || role === "admin";

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filterDoctor, setFilterDoctor] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WalkInForm>({ resolver: yupResolver(walkInSchema) });

  useEffect(() => {
    if (role !== "patient") {
      listDoctors().then(setDoctors).catch(() => undefined);
    }
  }, [role]);

  const { data, refresh } = usePolling<QueueToken[]>(
    () => listQueue(filterDoctor ? { doctorId: filterDoctor } : {}),
    4000
  );

  async function onAddWalkIn(values: WalkInForm) {
    setError(null);
    try {
      await addWalkIn(values);
      reset();
      setShowForm(false);
      await refresh();
    } catch (e) {
      setError(apiErrorMessage(e, "Could not add walk-in"));
    }
  }

  async function setStatus(id: string, status: TokenStatus) {
    setError(null);
    try {
      await updateQueueToken(id, { status });
      await refresh();
    } catch (e) {
      setError(apiErrorMessage(e, "Could not update token"));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live Queue</h1>
          <p className="text-sm text-muted-foreground">Updates automatically every few seconds.</p>
        </div>
        {canAddWalkIn ? (
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus size={14} /> Add walk-in
          </Button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      ) : null}

      {role !== "patient" ? (
        <Card>
          <CardBody className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Select label="Filter by doctor" value={filterDoctor} onChange={(e) => setFilterDoctor(e.target.value)}>
                <option value="">All doctors</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.specialty}
                  </option>
                ))}
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              {data ? `${data.length} token${data.length === 1 ? "" : "s"} in queue today` : "Loading queue..."}
            </div>
          </CardBody>
        </Card>
      ) : null}

      {showForm && canAddWalkIn ? (
        <Card>
          <CardHeader>
            <CardTitle>Add a walk-in patient</CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit(onAddWalkIn)} className="grid gap-4 md:grid-cols-2">
              <Input label="Patient name" placeholder="Full name" {...register("patientName")} error={errors.patientName?.message} />
              <Input label="Phone (optional)" {...register("patientPhone")} error={errors.patientPhone?.message} />
              <Select label="Doctor" {...register("doctorId")} error={errors.doctorId?.message}>
                <option value="">Select a doctor…</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.specialty}
                  </option>
                ))}
              </Select>
              <Input label="Notes (optional)" {...register("notes")} error={errors.notes?.message} />
              <div className="md:col-span-2">
                <Button type="submit" loading={isSubmitting}>Issue token</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}

      {!data ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : data.length === 0 ? (
        <EmptyState title="Queue is empty" description="No tokens have been issued for today yet." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((t) => (
            <Card key={t.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-2xl font-bold text-primary">
                      #{t.tokenNumber}
                    </div>
                    <div>
                      <p className="font-semibold">{t.patientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.doctorName} · {t.specialty}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Joined {formatTime(t.createdAt)} · {t.source === "walkin" ? "Walk-in" : "Appointment"}
                      </p>
                    </div>
                  </div>
                  <Badge className={statusColor(t.status)}>{prettyStatus(t.status)}</Badge>
                </div>

                {canManage ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {t.status === "waiting" ? (
                      <Button size="sm" onClick={() => setStatus(t.id, "called")}>
                        <Phone size={12} /> Call
                      </Button>
                    ) : null}
                    {t.status === "called" || t.status === "on_hold" ? (
                      <Button size="sm" variant="primary" onClick={() => setStatus(t.id, "in_progress")}>
                        <PlayCircle size={12} /> Start
                      </Button>
                    ) : null}
                    {t.status === "in_progress" ? (
                      <>
                        <Button size="sm" variant="success" onClick={() => setStatus(t.id, "completed")}>
                          <CheckCircle2 size={12} /> Complete
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setStatus(t.id, "on_hold")}>
                          <PauseCircle size={12} /> Hold
                        </Button>
                      </>
                    ) : null}
                    {t.status !== "completed" && t.status !== "skipped" ? (
                      <Button size="sm" variant="outline" onClick={() => setStatus(t.id, "skipped")}>
                        <SkipForward size={12} /> Skip
                      </Button>
                    ) : null}
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
