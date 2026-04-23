import { Link } from "wouter";
import { PublicLayout } from "@/layouts/PublicLayout";
import { Button } from "@/components/Button";

export function NotFoundPage() {
  return (
    <PublicLayout>
      <section className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
        <p className="text-7xl font-bold text-primary">404</p>
        <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
        <Link href="/"><Button className="mt-6">Back home</Button></Link>
      </section>
    </PublicLayout>
  );
}
