import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { CheckCircle, Calendar, Clock, Scissors, User, Phone, MapPin, Instagram, ArrowLeft } from "lucide-react";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { getBooking } from "@/lib/booking.functions";

const bookingQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["booking", id],
    queryFn: () => getBooking({ data: { id } }),
  });

export const Route = createFileRoute("/confirmacao/$bookingId")({
  head: () => ({
    meta: [
      { title: "Marcação Confirmada - Kouratos Barber Club" },
      { name: "description", content: "A tua marcação na Kouratos Barber Club foi confirmada com sucesso." },
    ],
  }),
  component: ConfirmacaoPage,
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      A carregar marcação...
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-destructive">Erro ao carregar marcação: {error.message}</p>
        <Link to="/agendar" className="mt-4 inline-block text-primary hover:underline">
          Fazer nova marcação
        </Link>
      </div>
    </div>
  ),
});

function ConfirmacaoPage() {
  const { bookingId } = Route.useParams();
  const { data: booking } = useSuspenseQuery(bookingQueryOptions(bookingId));

  const service = (booking as any).services;
  const date = parseISO(booking.booking_date);

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle className="h-10 w-10 text-primary" />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-foreground">Marcação Confirmada!</h1>
        <p className="text-muted-foreground">
          Obrigado, {booking.client_name}. A tua marcação está guardada.
        </p>
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-6 text-center text-lg font-semibold text-foreground">
          Detalhes da Marcação
        </h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Scissors className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Serviço</p>
              <p className="font-semibold text-foreground">{service?.name ?? "—"}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data</p>
              <p className="font-semibold text-foreground">
                {format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hora</p>
              <p className="font-semibold text-foreground">
                {booking.start_time} — {booking.end_time}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cliente</p>
              <p className="font-semibold text-foreground">{booking.client_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Telefone</p>
              <p className="font-semibold text-foreground">{booking.client_phone}</p>
            </div>
          </div>

          {booking.notes && (
            <div className="rounded-lg bg-secondary/50 p-3 text-sm">
              <p className="text-muted-foreground">Notas:</p>
              <p className="text-foreground">{booking.notes}</p>
            </div>
          )}

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-foreground">Total</span>
              <span className="text-2xl font-bold text-primary">{service?.price_euros ?? "—"}€</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          Guarda este comprovativo. Se precisares de alterar ou cancelar, contacta-nos via Instagram.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Início
          </Link>
          <a
            href="https://instagram.com/kouratus.barber_"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Instagram className="h-4 w-4" />
            Instagram
          </a>
        </div>
      </div>
    </div>
  );
}
