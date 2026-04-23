import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Logo } from "@/components/Logo";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { apiErrorMessage } from "@/services/api";

interface FormValues {
  email: string;
  password: string;
}

const schema = yup.object({
  email: yup.string().required("Email is required").email("Invalid email"),
  password: yup.string().required("Password is required").min(6, "At least 6 characters"),
});

export function LoginPage() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: yupResolver(schema) });

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      await login(values.email, values.password);
      navigate("/dashboard");
    } catch (e) {
      setError(apiErrorMessage(e, "Login failed"));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-accent via-background to-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 flex flex-col items-center">
          <Logo />
          <h1 className="mt-4 text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Log in to continue to MediQueue</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Email" type="email" placeholder="you@example.com" autoComplete="email" {...register("email")} error={errors.email?.message} />
          <Input label="Password" type="password" placeholder="••••••••" autoComplete="current-password" {...register("password")} error={errors.password?.message} />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" loading={isSubmitting}>Sign in</Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to MediQueue?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">Create an account</Link>
        </p>
        <div className="mt-4 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Demo accounts (password shown):</p>
          <ul className="mt-1 space-y-0.5">
            <li>patient@mediqueue.dev / patient123</li>
            <li>aarav@mediqueue.dev / doctor123</li>
            <li>reception@mediqueue.dev / reception123</li>
            <li>admin@mediqueue.dev / admin123</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
