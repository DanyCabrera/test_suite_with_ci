import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { PageHeader } from "../components/Layout";
import { formatSlot, mexicoToday } from "../lib/datetime";
import type { Appointment, Barber } from "../types";

function label(status: Appointment["status"]): string {
  if (status === "scheduled") return "Programada";
  if (status === "cancelled") return "Cancelada";
  return "Atendida";
}

function mexicoDayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function mexicoDayTitle(iso: string): string {
  const title = new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export function Agenda() {
  const { token, user } = useAuth();
  const [params, setParams] = useSearchParams();
  const initialDate = params.get("date");
  const [filtering, setFiltering] = useState(Boolean(initialDate));
  const [day, setDay] = useState(initialDate || mexicoToday());
  const [barberId, setBarberId] = useState("");
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== "admin") return;
    api<Barber[]>("/barbers")
      .then(setBarbers)
      .catch((reason: Error) => setError(reason.message));
  }, [user?.role]);

  useEffect(() => {
    const query = new URLSearchParams();
    if (filtering && day) query.set("date", day);
    if (user?.role === "admin" && barberId) query.set("barber_id", barberId);
    const qs = query.toString();
    const suffix = qs ? `?${qs}` : "";
    let active = true;
    setLoading(true);
    api<Appointment[]>(`/appointments${suffix}`, {}, token)
      .then((rows) => {
        if (active) setItems(rows);
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, filtering, day, barberId, user?.role]);

  const groups = useMemo(() => {
    const ordered = [...items].sort((a, b) => b.start_at.localeCompare(a.start_at));
    const buckets: { key: string; title: string; items: Appointment[] }[] = [];
    for (const item of ordered) {
      const key = mexicoDayKey(item.start_at);
      const current = buckets[buckets.length - 1];
      if (current?.key === key) current.items.push(item);
      else buckets.push({ key, title: mexicoDayTitle(item.start_at), items: [item] });
    }
    return buckets;
  }, [items]);

  function showAll() {
    setFiltering(false);
    setParams({});
  }

  function showDate(nextDay: string) {
    setDay(nextDay);
    setFiltering(true);
    setParams({ date: nextDay });
  }

  async function complete(id: number) {
    setError(null);
    try {
      await api(`/appointments/${id}/complete`, { method: "PATCH" }, token);
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, status: "completed" } : item)),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo actualizar");
    }
  }

  return (
    <section>
      <PageHeader
        title="Agenda"
        description={
          filtering
            ? "Citas del día que elegiste."
            : "Todas las citas: programadas, atendidas y canceladas."
        }
      />
      <div className="agenda-toolbar">
        <p className="agenda-count">
          {loading ? "Cargando…" : `${items.length} ${items.length === 1 ? "cita" : "citas"}`}
        </p>
        <div className="filters">
          {filtering ? (
            <>
              <label className="field compact">
                <span>Fecha</span>
                <input
                  data-testid="agenda-date"
                  type="date"
                  value={day}
                  onChange={(event) => showDate(event.target.value)}
                />
              </label>
              <button type="button" className="btn ghost" onClick={showAll}>
                Ver todas
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn"
              data-testid="agenda-filter"
              onClick={() => showDate(day)}
            >
              Filtrar por fecha
            </button>
          )}
          {user?.role === "admin" && (
            <label className="field compact">
              <span>Barbero</span>
              <select value={barberId} onChange={(event) => setBarberId(event.target.value)}>
                <option value="">Todos</option>
                {barbers.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    {barber.full_name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {!loading && items.length === 0 && (
        <p className="muted">{filtering ? "No hay citas en esta fecha." : "Todavía no hay citas."}</p>
      )}
      {!loading && (
      <div className="agenda-days">
        {groups.map((group) => (
          <section key={group.key} className="agenda-day">
            <h2>{group.title}</h2>
            <div className="list">
              {group.items.map((item) => (
                <article key={item.id} className="card agenda-card" data-testid="appointment-item">
                  <time className="agenda-time" dateTime={item.start_at}>
                    {formatSlot(item.start_at)}
                  </time>
                  <div>
                    <h3>{item.client_name}</h3>
                    <p>
                      {item.service_name} · {item.barber_name}
                    </p>
                  </div>
                  <div className="agenda-actions">
                    <p className={`status ${item.status}`}>{label(item.status)}</p>
                    {item.status === "scheduled" && (
                      <button
                        type="button"
                        className="btn primary sm"
                        data-testid="complete-appointment"
                        onClick={() => complete(item.id)}
                      >
                        Marcar atendida
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
      )}
    </section>
  );
}
