import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Scissors, Clock, MapPin, Phone, Instagram, Award, Crown } from "lucide-react";
import logoAsset from "../assets/logo.png.asset.json";
import { getServices } from "@/lib/booking.functions";

const servicesQueryOptions = queryOptions({
  queryKey: ["services"],
  queryFn: () => getServices(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TK House - Barbearia Tiago Estevão" },
      { name: "description", content: "Marcações online na TK House. Corte e barba com Tiago Estevão. Motherfucking Style." },
      { property: "og:title", content: "TK House - Barbearia Tiago Estevão" },
      { property: "og:description", content: "Marcações online na TK House. Corte e barba com Tiago Estevão. Motherfucking Style." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(servicesQueryOptions),
  component: HomePage,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-destructive">Erro ao carregar: {error.message}</p>
      </div>
    </div>
  ),
});

function HomePage() {
  const { data: services } = useSuspenseQuery(servicesQueryOptions);

  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/hero.jpg"
            alt="Barbearia TK House"
            className="h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
          <img
            src={logoAsset.url}
            alt="TK House Logo"
            className="mx-auto mb-6 h-auto w-48 sm:w-64"
          />
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            Tiago Estevão
          </h1>
          <p className="mb-2 text-lg text-primary sm:text-xl">Barber</p>
          <p className="mb-8 text-muted-foreground">Curso tirado com @cunha24</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/agendar"
              className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-base font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105"
            >
              Marcar Agora
            </Link>
            <a
              href="https://instagram.com/kouratus.barber_"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-8 py-3 text-base font-medium text-foreground transition-all hover:bg-accent"
            >
              <Instagram className="h-5 w-5" />
              Instagram
            </a>
          </div>
        </div>
      </section>

      {/* Serviços */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">Serviços</h2>
          <p className="text-muted-foreground">Escolhe o teu estilo</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.id}
              className="group relative rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:bg-card/80"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Scissors className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-card-foreground">
                {service.name}
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {service.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-primary">{service.price_euros}€</span>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {service.duration_minutes} min
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            to="/agendar"
            className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-base font-semibold text-primary-foreground transition-all hover:bg-primary/90"
          >
            Agendar Serviço
          </Link>
        </div>
      </section>

      {/* Info */}
      <section className="border-y border-border/50 bg-secondary/30">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Horário</h3>
              <p className="text-muted-foreground">Segunda a Sábado</p>
              <p className="font-medium text-foreground">9:00 - 18:30</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Localização</h3>
              <p className="text-muted-foreground">37°10'52.9"N 7°27'19.8"W</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Award className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Formação</h3>
              <p className="text-muted-foreground">Curso com</p>
              <p className="font-medium text-foreground">@cunha24</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <Crown className="mx-auto mb-6 h-12 w-12 text-primary" />
        <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
          Motherfucking Style
        </h2>
        <p className="mb-8 text-lg text-muted-foreground">
          Agora a tua marcação é feita online. Rápido, simples e sem complicações.
        </p>
        <Link
          to="/agendar"
          className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105"
        >
          Fazer Marcação
        </Link>
      </section>
    </>
  );
}
