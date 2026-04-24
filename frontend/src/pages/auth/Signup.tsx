import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Logo } from "@/components/Logo";
import { Card } from "@/components/Card";
import { Input, Select } from "@/components/Input";
import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { apiErrorMessage } from "@/services/api";
import type { UserRole } from "@/services/types";

interface FormValues {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  specialty?: string;
}

const schema = yup.object({
  name: yup.string().required("Name is required").min(2, "Too short"),
  email: yup.string().required("Email is required").email("Invalid email"),
  password: yup
    .string()
    .required("Password is required")
    .min(6, "At least 6 characters"),
  role: yup
    .mixed<UserRole>()
    .oneOf(["patient", "doctor", "receptionist", "admin"])
    .required("Role is required"),
  phone: yup.string().optional(),
  specialty: yup.string().when("role", {
    is: "doctor",
    then: (s) => s.required("Specialty is required for doctors"),
    otherwise: (s) => s.optional(),
  }),
});

export function SignupPage() {
  const { signup } = useAuth();
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: { role: "patient" },
  });
  const role = watch("role");

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      await signup(values);
      setTimeout(() => navigate("/dashboard"), 0);
    } catch (e) {
      setError(apiErrorMessage(e, "Sign up failed"));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-accent via-background to-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 flex flex-col items-center">
          <Logo />
          <h1 className="mt-4 text-2xl font-bold">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            Pick a role to get started
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Full name"
            placeholder="Jane Doe"
            {...register("name")}
            error={errors.name?.message}
          />
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            {...register("email")}
            error={errors.email?.message}
          />
          <Input
            label="Password"
            type="password"
            placeholder="At least 6 characters"
            autoComplete="new-password"
            {...register("password")}
            error={errors.password?.message}
          />
          <Input
            label="Phone (optional)"
            placeholder="+1 555 0100"
            {...register("phone")}
            error={errors.phone?.message}
          />
          <Select
            label="I am a..."
            {...register("role")}
            error={errors.role?.message}
          >
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
            <option value="receptionist">Receptionist</option>
            <option value="admin">Administrator</option>
          </Select>
          {role === "doctor" ? (
            <Input
              label="Specialty"
              placeholder="e.g. Pediatrics"
              {...register("specialty")}
              error={errors.specialty?.message}
            />
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Create account
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
