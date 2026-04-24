import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardBody, Spinner } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { getMyDoctorProfile, updateMyDoctorProfile } from "@/services/doctors";
import { apiErrorMessage } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import type { Doctor } from "@/services/types";

interface FormValues {
  name: string;
  specialty: string;
  consultationFee: number;
  startTime: string;
  endTime: string;
}

const schema: yup.ObjectSchema<FormValues> = yup.object({
  name: yup.string().required("Name is required").min(2, "Too short").max(120, "Too long"),
  specialty: yup.string().required("Specialty is required").min(2, "Too short").max(120, "Too long"),
  consultationFee: yup
    .number()
    .typeError("Enter a valid number")
    .required("Fee is required")
    .min(0, "Fee cannot be negative")
    .max(1000000, "Too high"),
  startTime: yup
    .string()
    .required("Start time is required")
    .matches(/^\d{2}:\d{2}$/, "Use HH:MM format"),
  endTime: yup
    .string()
    .required("End time is required")
    .matches(/^\d{2}:\d{2}$/, "Use HH:MM format")
    .test("after-start", "End time must be after start time", function (value) {
      const { startTime } = this.parent as FormValues;
      if (!startTime || !value) return true;
      return value > startTime;
    }),
});

export function DoctorProfilePage() {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({ resolver: yupResolver(schema) });

  useEffect(() => {
    getMyDoctorProfile()
      .then((p) => {
        setProfile(p);
        reset({
          name: p.name,
          specialty: p.specialty,
          consultationFee: p.consultationFee,
          startTime: p.startTime,
          endTime: p.endTime,
        });
      })
      .catch((e) => toast.error(apiErrorMessage(e, "Could not load profile")))
      .finally(() => setLoading(false));
  }, [reset]);

  async function onSubmit(values: FormValues) {
    try {
      const updated = await updateMyDoctorProfile({
        name: values.name,
        specialty: values.specialty,
        consultationFee: Number(values.consultationFee),
        startTime: values.startTime,
        endTime: values.endTime,
      });
      setProfile(updated);
      reset({
        name: updated.name,
        specialty: updated.specialty,
        consultationFee: updated.consultationFee,
        startTime: updated.startTime,
        endTime: updated.endTime,
      });
      await refreshUser?.();
      toast.success("Profile updated");
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not update profile"));
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
        Doctor profile not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-sm text-muted-foreground">Update your professional details and availability.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Doctor profile</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Input
                label="Full name"
                placeholder="Dr. Jane Doe"
                error={errors.name?.message}
                {...register("name")}
              />
            </div>

            <Input
              label="Specialty"
              placeholder="Cardiology, Pediatrics…"
              error={errors.specialty?.message}
              {...register("specialty")}
            />

            <Input
              label="Consultation fee (₹)"
              type="number"
              min={0}
              step={50}
              error={errors.consultationFee?.message}
              {...register("consultationFee", { valueAsNumber: true })}
            />

            <Input
              label="Available from"
              type="time"
              error={errors.startTime?.message}
              {...register("startTime")}
            />

            <Input
              label="Available until"
              type="time"
              error={errors.endTime?.message}
              {...register("endTime")}
            />

            <div className="md:col-span-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Your email ({profile.email}) is managed by an administrator.
              </p>
              <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
                <Save size={14} /> Save changes
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
