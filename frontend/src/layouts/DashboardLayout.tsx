import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "next-themes";
import { LogOut, Moon, Sun, Bell } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Card";
import { useAuth } from "@/context/AuthContext";
import { prettyStatus } from "@/utils/format";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex h-screen flex-col">
      <header className="z-20 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
        <Link href="/dashboard" className="cursor-pointer">
          <Logo />
        </Link>
        <div className="flex items-center gap-5">
          {/* <Link
            href="/dashboard/notifications"
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell size={18} />
          </Link> */}
          <Button
            variant="ghost"
            size="sm"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </Button>
          <div className="hidden items-center gap-5 sm:flex">
            <div className="text-right">
              <p className="text-sm font-medium leading-tight">{user?.name}</p>
              <p className="text-xs text-muted-foreground leading-tight">
                {user?.email}
              </p>
            </div>
            <Badge className="bg-accent text-accent-foreground capitalize">
              {prettyStatus(user?.role ?? "")}
            </Badge>
          </div>
          {/* <Button
            variant="outline"
            size="sm"
            onClick={() => {
              logout();
              navigate("/");
            }}
          >
            <LogOut size={14} /> Logout
          </Button> */}
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
