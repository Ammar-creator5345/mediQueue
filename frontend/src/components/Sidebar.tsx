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
  UserCog,
  type LucideIcon,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/services/types";
import { Button } from "./Button";

interface Item {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
}

const ALL: UserRole[] = ["patient", "doctor", "receptionist", "admin"];

const items: Item[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, roles: ALL },
  {
    href: "/dashboard/appointments",
    label: "Appointments",
    icon: Calendar,
    roles: ALL,
  },
  {
    href: "/dashboard/queue",
    label: "Live Queue",
    icon: ListOrdered,
    roles: ["doctor", "receptionist", "admin"],
  },
  {
    href: "/dashboard/doctors",
    label: "Doctors",
    icon: Stethoscope,
    roles: ["patient", "receptionist", "admin"],
  },
  {
    href: "/dashboard/patients",
    label: "Patients",
    icon: Users,
    roles: ["doctor", "receptionist", "admin"],
  },
  {
    href: "/dashboard/reports",
    label: "Reports",
    icon: BarChart3,
    roles: ["admin"],
  },
  {
    href: "/dashboard/profile",
    label: "Profile",
    icon: UserCog,
    roles: ["doctor"],
  },
  {
    href: "/dashboard/notifications",
    label: "Notifications",
    icon: Bell,
    roles: ALL,
  },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const role = user?.role ?? "patient";
  const [, navigate] = useLocation();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-card lg:block">
      <div className="flex h-full flex-col p-3">
        {/* <div className="mb-3 rounded-md bg-muted px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Signed in as</p>
          <p className="text-sm font-medium capitalize">{role}</p>
        </div> */}
        <nav className="flex-1 space-y-1">
          {items
            .filter((it) => it.roles.includes(role))
            .map((it) => {
              const Icon = it.icon;
              const active =
                location === it.href ||
                (it.href !== "/dashboard" && location.startsWith(it.href));
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={clsx(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition cursor-pointer",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon size={16} />
                  {it.label}
                </Link>
              );
            })}
        </nav>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            logout();
            navigate("/");
          }}
        >
          <LogOut size={14} /> Logout
        </Button>
      </div>
    </aside>
  );
}
