import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Mail, MapPin, Phone } from "lucide-react";
import { PublicLayout } from "@/layouts/PublicLayout";
import { Card } from "@/components/Card";
import { Input, Textarea } from "@/components/Input";
import { Button } from "@/components/Button";
import { submitContact } from "@/services/auth";
import { apiErrorMessage } from "@/services/api";

interface FormValues {
  name?: string;
  email?: string;
  message?: string;
}

const schema: yup.ObjectSchema<FormValues> = yup
  .object({
    name: yup.string().defined().required("Name is required").min(2, "Too short"),
    email: yup.string().defined().required("Email is required").email("Invalid email"),
    message: yup.string().defined().required("Message is required").min(5, "Please write a few more characters"),
  })
  .required()
  .defined();

export function ContactPage() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: yupResolver<FormValues>(schema),
    defaultValues: { name: "", email: "", message: "" },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      await submitContact({
        name: values.name!,
        email: values.email!,
        message: values.message!,
      });
      setDone(true);
      reset();
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  }

  return (
    <PublicLayout>
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h1 className="text-4xl font-bold">Get in touch</h1>
        <p className="mt-2 text-muted-foreground">We'd love to hear from you. Send us a message and we'll respond within one business day.</p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <Card className="p-6 md:col-span-1">
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <Mail className="text-primary" size={18} />
                <div>
                  <p className="text-sm font-semibold">Email</p>
                  <p className="text-sm text-muted-foreground">hello@mediqueue.dev</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="text-primary" size={18} />
                <div>
                  <p className="text-sm font-semibold">Phone</p>
                  <p className="text-sm text-muted-foreground">+1 (555) 010-2030</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="text-primary" size={18} />
                <div>
                  <p className="text-sm font-semibold">Office</p>
                  <p className="text-sm text-muted-foreground">Satellite Town,Bahawalpur</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 md:col-span-2">
            {done ? (
              <div className="rounded-md border border-success bg-success/10 p-4 text-success-foreground">
                <p className="font-medium text-success">Thanks — we received your message!</p>
                <p className="mt-1 text-sm text-muted-foreground">Our team will reach out shortly.</p>
                <Button className="mt-4" variant="outline" onClick={() => setDone(false)}>
                  Send another
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input label="Name" placeholder="Your name" {...register("name")} error={errors.name?.message} />
                <Input label="Email" type="email" placeholder="you@example.com" {...register("email")} error={errors.email?.message} />
                <Textarea label="Message" placeholder="How can we help?" rows={5} {...register("message")} error={errors.message?.message} />
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <Button type="submit" loading={isSubmitting}>Send message</Button>
              </form>
            )}
          </Card>
        </div>
      </section>
    </PublicLayout>
  );
}
