import { Link, useLocation } from "wouter";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { Button } from "./Button";
import { Moon, Sun, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function PublicNavbar() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="cursor-pointer">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="/" className="text-muted-foreground hover:text-foreground">Home</Link>
          <Link href="/about" className="text-muted-foreground hover:text-foreground">About</Link>
          <Link href="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {mounted && theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </Button>
          {user ? (
            <Button size="sm" onClick={() => navigate("/dashboard")}>Dashboard</Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => navigate("/login")}>
                <LogIn size={14} /> Login
              </Button>
              <Button size="sm" onClick={() => navigate("/signup")}>
                <UserPlus size={14} /> Sign Up
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
