import { Link } from "wouter";
import { motion } from "framer-motion";
import { Calendar, ListOrdered, Users, BarChart3, ShieldCheck, Bell } from "lucide-react";
import { PublicLayout } from "@/layouts/PublicLayout";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

const features = [
  { icon: Calendar, title: "Smart Scheduling", body: "Book appointments by doctor, specialty, and live availability — no double-booking, ever." },
  { icon: ListOrdered, title: "Live Queue", body: "Patients see their token number and position in real time. Doctors call patients with one click." },
  { icon: Users, title: "Role-Based Dashboards", body: "Patients, doctors, receptionists, and admins each get a tailored workspace." },
  { icon: BarChart3, title: "Insightful Reports", body: "Visualize appointment trends, queue throughput, and doctor utilization with charts." },
  { icon: ShieldCheck, title: "Secure by Default", body: "JWT authentication, bcrypt password hashing, and role-protected APIs." },
  { icon: Bell, title: "Instant Notifications", body: "Patients are notified the moment they're called or their appointment is booked." },
];

export function HomePage() {
  return (
    <PublicLayout>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-accent via-background to-background" />
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-3xl text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Live queue updates every few seconds
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
              Modern <span className="text-primary">appointment</span> & <span className="text-secondary">queue</span> management for clinics
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              MediQueue brings together patients, doctors, and receptionists with one secure, real-time platform — no spreadsheets, no missed visits.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup">
                <Button size="lg">Get Started Free</Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">Sign In</Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Try it instantly: <code className="rounded bg-muted px-1">patient@mediqueue.dev</code> / <code className="rounded bg-muted px-1">patient123</code>
            </p>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold">Everything your clinic needs</h2>
          <p className="mt-2 text-muted-foreground">From booking to consultation, beautifully connected.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <Card className="overflow-hidden">
          <div className="grid gap-8 p-8 sm:p-12 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-3xl font-bold">Ready to streamline your clinic?</h2>
              <p className="mt-3 text-muted-foreground">
                Sign up as a patient, doctor, receptionist, or admin and explore the dashboards designed for your role.
              </p>
              <div className="mt-6 flex gap-3">
                <Link href="/signup"><Button>Create Account</Button></Link>
                <Link href="/contact"><Button variant="outline">Contact Sales</Button></Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: "Patient", v: "Book & track visits" },
                { k: "Doctor", v: "Manage your queue" },
                { k: "Receptionist", v: "Walk-ins & check-ins" },
                { k: "Admin", v: "Reports & oversight" },
              ].map((x) => (
                <div key={x.k} className="rounded-lg border border-border bg-background p-4">
                  <p className="text-sm font-semibold">{x.k}</p>
                  <p className="text-xs text-muted-foreground">{x.v}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>
    </PublicLayout>
  );
}
