import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Calendar, Plus, X, LogIn } from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody, Badge, EmptyState, Spinner } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input, Select, Textarea } from "@/components/Input";
import { useAuth } from "@/context/AuthContext";
import {
  listAppointments,
  createAppointment,
  cancelAppointment,
  checkInAppointment,
  type CreateAppointmentPayload,
} from "@/services/appointments";
import { listDoctors, listSlots } from "@/services/doctors";
import { apiErrorMessage } from "@/services/api";
import type { Appointment, Doctor } from "@/services/types";
import { formatDateTime, formatTime, prettyStatus, statusColor, todayISO } from "@/utils/format";

interface BookForm {
  doctorId: string;
  date: string;
  scheduledAt: string;
  reason?: string;
  patientEmail?: string;
}

const schema = yup.object({
  doctorId: yup.string().required("Pick a doctor"),
  date: yup.string().required("Pick a date"),
  scheduledAt: yup.string().required("Pick a time slot"),
  reason: yup.string().optional(),
  patientEmail: yup.string().optional(),
});

export function AppointmentsPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canBook = user!.role === "patient" || user!.role === "receptionist" || user!.role === "admin";
  const canCheckIn = user!.role === "receptionist" || user!.role === "admin" || user!.role === "patient";

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BookForm>({
    resolver: yupResolver(schema),
    defaultValues: { date: todayISO() },
  });

  const doctorId = watch("doctorId");
  const date = watch("date");

  async function refresh() {
    setLoading(true);
    try {
      const list = await listAppointments();
      setAppointments(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    if (canBook) {
      listDoctors().then(setDoctors).catch(() => undefined);
    }
  }, [canBook]);

  useEffect(() => {
    if (!doctorId || !date) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    setValue("scheduledAt", "");
    listSlots(doctorId, date)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [doctorId, date, setValue]);

  async function onBook(values: BookForm) {
    setError(null);
    setSuccess(null);
    try {
      const payload: CreateAppointmentPayload = {
        doctorId: values.doctorId,
        scheduledAt: values.scheduledAt,
        reason: values.reason || undefined,
      };
      if (user!.role !== "patient" && values.patientEmail) {
        // Receptionists must provide a registered patient. We'll let the API echo a clearer error if not found.
        // For simplicity in this demo, only patients self-book; reception walk-ins use the queue.
      }
      await createAppointment(payload);
      setSuccess("Appointment booked");
      setShowForm(false);
      reset({ date: todayISO() });
      await refresh();
    } catch (e) {
      setError(apiErrorMessage(e, "Could not book"));
    }
  }

  async function onCancel(id: string) {
    setError(null);
    try {
      await cancelAppointment(id);
      await refresh();
    } catch (e) {
      setError(apiErrorMessage(e, "Could not cancel"));
    }
  }

  async function onCheckIn(id: string) {
    setError(null);
    try {
      const tok = await checkInAppointment(id);
      setSuccess(`Checked in! Your token is #${tok.tokenNumber}`);
      await refresh();
    } catch (e) {
      setError(apiErrorMessage(e, "Could not check in"));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-sm text-muted-foreground">Manage and track your appointments.</p>
        </div>
        {user!.role === "patient" ? (
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? <><X size={14} /> Close</> : <><Plus size={14} /> Book new</>}
          </Button>
        ) : null}
      </div>

      {success ? (
        <div className="rounded-md border border-success bg-success/10 p-3 text-sm text-success">{success}</div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      ) : null}

      {showForm && user!.role === "patient" ? (
        <Card>
          <CardHeader>
            <CardTitle>Book an appointment</CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit(onBook)} className="grid gap-4 md:grid-cols-2">
              <Select label="Doctor" {...register("doctorId")} error={errors.doctorId?.message}>
                <option value="">Select a doctor…</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.specialty}
                    {d.consultationFee > 0 ? ` · ₹${d.consultationFee}` : ""}
                  </option>
                ))}
              </Select>
              <Input label="Date" type="date" min={todayISO()} {...register("date")} error={errors.date?.message} />
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-foreground">Available slots</label>
                {loadingSlots ? (
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Spinner /> Checking availability…</div>
                ) : slots.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">{doctorId && date ? "No slots available — try another day." : "Pick a doctor and date."}</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {slots.map((s) => (
                      <label key={s} className="cursor-pointer">
                        <input
                          type="radio"
                          value={s}
                          {...register("scheduledAt")}
                          className="peer sr-only"
                        />
                        <span className="inline-flex items-center rounded-md border border-border bg-card px-3 py-1.5 text-sm peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground">
                          {formatTime(s)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {errors.scheduledAt ? <p className="mt-1 text-xs text-destructive">{errors.scheduledAt.message}</p> : null}
              </div>
              <div className="md:col-span-2">
                <Textarea label="Reason (optional)" placeholder="Briefly describe your visit" {...register("reason")} />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" loading={isSubmitting}>Confirm booking</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>All appointments</CardTitle>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : appointments.length === 0 ? (
            <EmptyState
              title="No appointments yet"
              description="Once you book or are assigned an appointment, it will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-4">Code</th>
                    <th className="py-2 pr-4">{user!.role === "patient" ? "Doctor" : "Patient"}</th>
                    <th className="py-2 pr-4">Specialty</th>
                    <th className="py-2 pr-4">When</th>
                    <th className="py-2 pr-4">Fee</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0">
                      <td className="py-3 pr-4 font-mono text-xs">{a.code}</td>
                      <td className="py-3 pr-4">{user!.role === "patient" ? a.doctorName : a.patientName}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{a.specialty}</td>
                      <td className="py-3 pr-4">
                        <Calendar size={12} className="mr-1 inline-block text-muted-foreground" />
                        {formatDateTime(a.scheduledAt)}
                      </td>
                      <td className="py-3 pr-4 font-medium">{a.fee > 0 ? `₹${a.fee}` : "—"}</td>
                      <td className="py-3 pr-4">
                        <Badge className={statusColor(a.status)}>{prettyStatus(a.status)}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <div className="flex justify-end gap-2">
                          {canCheckIn && a.status === "scheduled" && new Date(a.scheduledAt).getTime() < Date.now() + 60 * 60 * 1000 ? (
                            <Button size="sm" variant="success" onClick={() => onCheckIn(a.id)}>
                              <LogIn size={12} /> Check in
                            </Button>
                          ) : null}
                          {a.status !== "cancelled" && a.status !== "completed" ? (
                            <Button size="sm" variant="outline" onClick={() => onCancel(a.id)}>
                              Cancel
                            </Button>
                          ) : null}
                        </div>
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
