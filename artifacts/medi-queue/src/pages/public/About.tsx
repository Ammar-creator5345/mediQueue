import { PublicLayout } from "@/layouts/PublicLayout";
import { Card } from "@/components/Card";

export function AboutPage() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h1 className="text-4xl font-bold">About MediQueue</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          MediQueue is a modern Medical Appointment Scheduling and Queue Management System built for outpatient clinics, polyclinics, and small hospitals that want to ditch spreadsheets and pen-and-paper queues.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card className="p-6">
            <h3 className="text-lg font-semibold">Our Mission</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              To eliminate the friction patients experience in clinics — long waits, lost paperwork, opaque queues — and give clinical staff the tools they need to focus on care.
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-lg font-semibold">Built for Real Clinics</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Every feature was designed against real outpatient workflows: appointment slots, walk-ins, no-shows, doctor breaks, and reception desk operations.
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-lg font-semibold">Stack</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              MERN under the hood: MongoDB, Express, React, Node — with JWT auth, bcrypt-hashed passwords, Zod and Yup validation, Axios, and Recharts for visualizations.
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-lg font-semibold">Roles</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Patient, Doctor, Receptionist, and Admin — each with a tailored dashboard and a precise set of permissions enforced on the API.
            </p>
          </Card>
        </div>
      </section>
    </PublicLayout>
  );
}
