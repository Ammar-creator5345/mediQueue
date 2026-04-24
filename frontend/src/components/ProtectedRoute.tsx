import { type ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Spinner } from "./Card";
import type { UserRole } from "@/services/types";

export function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: UserRole[];
}) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/login");
    else if (roles && !roles.includes(user.role)) navigate("/dashboard");
  }, [user, loading, roles, navigate]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (roles && !roles.includes(user.role)) return null;
  return <>{children}</>;
}
