import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { cancelBooking, deleteBooking, lockAdmin, listBookings } from "@/lib/admin.functions";

const bookingsQueryOptions = queryOptions({
  queryKey: ["admin", "bookings"],
  queryFn: () => listBookings(),
});

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin — Koratus Barber Club" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(bookingsQueryOptions),
  component: AdminPage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-md p-8 text-center">
      <p className="text-sm text-destructive">{error.message}</p>
      <Link to="/admin/unlock" className="mt-4 inline-block text-sm text-primary underline">
        Voltar para o login
      </Link>
    </div>
  ),
});

type BookingRow = Awaited<ReturnType<typeof listBookings>>[number];

function formatDate(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function AdminPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: bookings } = useSuspenseQuery(bookingsQueryOptions);
  const cancel = useServerFn(cancelBooking);
  const remove = useServerFn(deleteBooking);
  const lock = useServerFn(lockAdmin);

  const [filter, setFilter] = useState<"today" | "upcoming" | "all" | "cancelled">("upcoming");
  const [search, setSearch] = useState("");

  const today = todayISO();

  const filtered = useMemo(() => {
    let list: BookingRow[] = bookings;
    if (filter === "today") {
      list = list.filter((b) => b.booking_date === today && b.status !== "cancelled");
    } else if (filter === "upcoming") {
      list = list.filter((b) => b.booking_date >= today && b.status !== "cancelled");
    } else if (filter === "cancelled") {
      list = list.filter((b) => b.status === "cancelled");
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.client_name.toLowerCase().includes(q) ||
          b.client_phone.toLowerCase().includes(q),
      );
    }
    // Sort: upcoming by date asc, others by date desc
    const sorted = [...list].sort((a, b) => {
      if (a.booking_date !== b.booking_date) {
        return filter === "upcoming" || filter === "today"
          ? a.booking_date.localeCompare(b.booking_date)
          : b.booking_date.localeCompare(a.booking_date);
      }
      return a.start_time.localeCompare(b.start_time);
    });
    return sorted;
  }, [bookings, filter, search, today]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, BookingRow[]>();
    for (const b of filtered) {
      const arr = map.get(b.booking_date) ?? [];
      arr.push(b);
      map.set(b.booking_date, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  async function handleCancel(id: string) {
    if (!confirm("Cancelar esta marcação?")) return;
    await cancel({ data: { id } });
    await queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] });
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminar permanentemente esta marcação?")) return;
    await remove({ data: { id } });
    await queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] });
  }

  async function handleLock() {
    await lock();
    await router.navigate({ to: "/admin/unlock" });
  }

  const tabs: { key: typeof filter; label: string }[] = [
    { key: "today", label: "Hoje" },
    { key: "upcoming", label: "Próximas" },
    { key: "all", label: "Histórico" },
    { key: "cancelled", label: "Canceladas" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Marcações</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "marcação" : "marcações"}
          </p>
        </div>
        <button
          onClick={handleLock}
          className="rounded-md border border-input bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        >
          Sair
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Pesquisar por nome ou telefone..."
        className="mt-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
      />

      <div className="mt-6 space-y-6">
        {grouped.length === 0 && (
          <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Sem marcações para mostrar.
          </p>
        )}
        {grouped.map(([date, items]) => (
          <section key={date}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {formatDate(date)}
            </h2>
            <ul className="space-y-2">
              {items.map((b) => (
                <li
                  key={b.id}
                  className={`rounded-md border border-border bg-card p-4 ${
                    b.status === "cancelled" ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-3">
                        <span className="font-mono text-lg text-primary">
                          {b.start_time.slice(0, 5)}
                        </span>
                        <span className="text-base font-semibold text-foreground">
                          {b.client_name}
                        </span>
                        {b.status === "cancelled" && (
                          <span className="rounded bg-destructive/20 px-2 py-0.5 text-xs text-destructive">
                            Cancelada
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {b.services?.name ?? "Serviço"} ·{" "}
                        {b.services?.duration_minutes ?? 0} min ·{" "}
                        {b.services?.price_euros ?? 0}€
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <a
                          href={`tel:${b.client_phone}`}
                          className="hover:text-primary"
                        >
                          {b.client_phone}
                        </a>
                      </p>
                      {b.notes && (
                        <p className="mt-2 rounded bg-muted/40 p-2 text-sm text-foreground/80">
                          {b.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {b.status !== "cancelled" && (
                        <button
                          onClick={() => handleCancel(b.id)}
                          className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="rounded-md border border-destructive/40 bg-background px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}