import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, isSameDay, isToday, isTomorrow, startOfDay, isBefore } from "date-fns";
import { pt } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, CalendarIcon, Check, Clock, Scissors, User, Loader2 } from "lucide-react";
import { getServices, getAvailableSlots, createBooking } from "@/lib/booking.functions";
import { useServerFn } from "@tanstack/react-start";

const servicesQueryOptions = queryOptions({
  queryKey: ["services"],
  queryFn: () => getServices(),
});

const bookingSchema = z.object({
  serviceId: z.string().uuid("Escolhe um serviço"),
  date: z.date({ required_error: "Escolhe uma data" }),
  time: z.string().min(1, "Escolhe um horário"),
  clientName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  clientPhone: z.string().min(5, "Telefone deve ter pelo menos 5 dígitos").max(20),
  notes: z.string().max(500).optional(),
});

type BookingForm = z.infer<typeof bookingSchema>;

export const Route = createFileRoute("/agendar")({
  head: () => ({
    meta: [
      { title: "Marcar - Kouratos Barber Club" },
      { name: "description", content: "Marca o teu corte ou barba na Kouratos Barber Club." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(servicesQueryOptions),
  component: AgendarPage,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-destructive">Erro: {error.message}</p>
      </div>
    </div>
  ),
});

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0; // Sunday
}

function isMondayToSaturday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 6;
}

function AgendarPage() {
  const navigate = useNavigate();
  const { data: services } = useSuspenseQuery(servicesQueryOptions);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createBookingFn = useServerFn(createBooking);

  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      serviceId: "",
      notes: "",
    },
  });

  const selectedServiceId = form.watch("serviceId");
  const selectedDate = form.watch("date");
  const selectedService = services.find((s) => s.id === selectedServiceId);

  const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";

  const { data: availableSlots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ["slots", formattedDate, selectedServiceId],
    queryFn: () =>
      getAvailableSlots({ data: { date: formattedDate, serviceId: selectedServiceId } }),
    enabled: !!formattedDate && !!selectedServiceId && step === 3,
  });

  const totalSteps = 4;

  function handleNext() {
    if (step === 1 && !form.getValues("serviceId")) {
      form.setError("serviceId", { message: "Escolhe um serviço" });
      return;
    }
    if (step === 2 && !form.getValues("date")) {
      form.setError("date", { message: "Escolhe uma data" });
      return;
    }
    if (step === 3 && !form.getValues("time")) {
      form.setError("time", { message: "Escolhe um horário" });
      return;
    }
    if (step < totalSteps) {
      setStep(step + 1);
    }
  }

  function handleBack() {
    if (step > 1) {
      setStep(step - 1);
    }
  }

  async function onSubmit(data: BookingForm) {
    setIsSubmitting(true);
    try {
      const booking = await createBookingFn({
        data: {
          clientName: data.clientName,
          clientPhone: data.clientPhone,
          serviceId: data.serviceId,
          bookingDate: format(data.date, "yyyy-MM-dd"),
          startTime: data.time,
          notes: data.notes,
        },
      });
      navigate({ to: "/confirmacao/$bookingId", params: { bookingId: booking.id } });
    } catch (e: any) {
      form.setError("root", { message: e.message || "Erro ao criar marcação. Tenta novamente." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-foreground">Marcação</h1>
        <p className="text-muted-foreground">Preenche os passos abaixo</p>
      </div>

      {/* Progress */}
      <div className="mb-10">
        <div className="flex items-center justify-between">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${
                  i + 1 <= step
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                {i + 1 < step ? <Check className="h-5 w-5" /> : i + 1}
              </div>
              {i < totalSteps - 1 && (
                <div
                  className={`mx-2 h-0.5 w-12 sm:w-20 ${
                    i + 1 < step ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Step 1: Service */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">1. Escolhe o serviço</h2>
            {form.formState.errors.serviceId && (
              <p className="text-sm text-destructive">{form.formState.errors.serviceId.message}</p>
            )}
            <div className="grid gap-4">
              {services.map((service) => (
                <label
                  key={service.id}
                  className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all hover:border-primary/50 ${
                    selectedServiceId === service.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card"
                  }`}
                >
                  <input
                    type="radio"
                    value={service.id}
                    {...form.register("serviceId")}
                    className="h-5 w-5 accent-primary"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{service.name}</span>
                      <span className="text-lg font-bold text-primary">{service.price_euros}€</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <Clock className="mr-1 inline h-3 w-3" />
                      {service.duration_minutes} minutos
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Date */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleBack} className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-semibold">2. Escolhe a data</h2>
            </div>
            {selectedService && (
              <div className="rounded-lg bg-secondary/50 p-3 text-sm">
                <span className="font-medium">Serviço:</span> {selectedService.name} — {selectedService.price_euros}€
              </div>
            )}
            {form.formState.errors.date && (
              <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>
            )}
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) form.setValue("date", date);
                }}
                disabled={(date) => {
                  const today = startOfDay(new Date());
                  return isBefore(date, today) || !isMondayToSaturday(date);
                }}
                locale={pt}
                className="rounded-xl border border-border"
              />
            </div>
          </div>
        )}

        {/* Step 3: Time */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleBack} className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-semibold">3. Escolhe o horário</h2>
            </div>
            {selectedService && selectedDate && (
              <div className="rounded-lg bg-secondary/50 p-3 text-sm">
                <span className="font-medium">{selectedService.name}</span> —{" "}
                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: pt })}
              </div>
            )}
            {form.formState.errors.time && (
              <p className="text-sm text-destructive">{form.formState.errors.time.message}</p>
            )}
            {slotsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <p className="text-muted-foreground">Sem horários disponíveis nesta data.</p>
                <p className="mt-2 text-sm text-muted-foreground">Tenta outro dia.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {availableSlots.map((slot) => (
                  <label
                    key={slot}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border p-3 text-center transition-all hover:border-primary/50 ${
                      form.watch("time") === slot
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-foreground"
                    }`}
                  >
                    <input
                      type="radio"
                      value={slot}
                      {...form.register("time")}
                      className="sr-only"
                    />
                    <Clock className="mb-1 h-4 w-4" />
                    <span className="text-sm font-medium">{slot}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Client Info */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleBack} className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-semibold">4. Os teus dados</h2>
            </div>

            {/* Summary */}
            {selectedService && selectedDate && form.watch("time") && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-3 font-semibold text-foreground">Resumo da marcação</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Serviço</span>
                    <span className="font-medium">{selectedService.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data</span>
                    <span className="font-medium">
                      {format(selectedDate, "EEEE, d 'de' MMMM", { locale: pt })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hora</span>
                    <span className="font-medium">{form.watch("time")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duração</span>
                    <span className="font-medium">{selectedService.duration_minutes} min</span>
                  </div>
                  <div className="border-t border-border pt-2">
                    <div className="flex justify-between">
                      <span className="font-medium text-foreground">Total</span>
                      <span className="text-lg font-bold text-primary">{selectedService.price_euros}€</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="clientName">Nome completo</Label>
                <Input
                  id="clientName"
                  placeholder="O teu nome"
                  {...form.register("clientName")}
                  className="mt-1"
                />
                {form.formState.errors.clientName && (
                  <p className="mt-1 text-sm text-destructive">{form.formState.errors.clientName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="clientPhone">Telefone</Label>
                <Input
                  id="clientPhone"
                  type="tel"
                  placeholder="9XX XXX XXX"
                  {...form.register("clientPhone")}
                  className="mt-1"
                />
                {form.formState.errors.clientPhone && (
                  <p className="mt-1 text-sm text-destructive">{form.formState.errors.clientPhone.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Alguma observação?"
                  {...form.register("notes")}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>

            {form.formState.errors.root && (
              <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  A processar...
                </>
              ) : (
                "Confirmar Marcação"
              )}
            </Button>
          </div>
        )}

        {/* Navigation buttons */}
        {step < totalSteps && (
          <div className="flex justify-end">
            <Button type="button" onClick={handleNext} size="lg">
              Próximo
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
