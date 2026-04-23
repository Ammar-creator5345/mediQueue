import { Link, useLocation } from "wouter";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Calendar,
  Users,
  ListOrdered,
  BarChart3,
  Bell,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/services/types";

interface Item {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[];
}

const items: Item[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/appointments", label: "Appointments", icon: Calendar },
  { href: "/dashboard/queue", label: "Live Queue", icon: ListOrdered },
  { href: "/dashboard/doctors", label: "Doctors", icon: Stethoscope, roles: ["receptionist", "admin", "patient"] },
  { href: "/dashboard/patients", label: "Patients", icon: Users, roles: ["receptionist", "admin", "doctor"] },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3, roles: ["doctor", "receptionist", "admin"] },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const role = user?.role ?? "patient";

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-card lg:block">
      <div className="flex h-full flex-col p-3">
        <nav className="flex-1 space-y-1">
          {items
            .filter((it) => !it.roles || it.roles.includes(role))
            .map((it) => {
              const Icon = it.icon;
              const active = location === it.href || (it.href !== "/dashboard" && location.startsWith(it.href));
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={clsx(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition cursor-pointer",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon size={16} />
                  {it.label}
                </Link>
              );
            })}
        </nav>
      </div>
    </aside>
  );
}
