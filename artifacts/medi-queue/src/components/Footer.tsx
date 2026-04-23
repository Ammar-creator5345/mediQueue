import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <Logo />
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              MediQueue helps clinics streamline appointment scheduling and live patient queues with role-based dashboards.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} MediQueue. Built for modern clinics.
          </div>
        </div>
      </div>
    </footer>
  );
}
