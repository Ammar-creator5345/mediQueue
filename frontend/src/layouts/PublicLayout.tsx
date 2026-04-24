import type { ReactNode } from "react";
import { PublicNavbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
