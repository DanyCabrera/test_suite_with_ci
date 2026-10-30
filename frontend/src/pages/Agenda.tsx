import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { PageHeader } from "../components/Layout";
import { formatAppointment, mexicoToday } from "../lib/datetime";
import type { Appointment, Barber } from "../types";

function label(status: Appointment["status"]): string {
  if (status === "scheduled") return "Programada";
  if (status === "cancelled") return "Cancelada";
  return "Atendida";
}

export function Agenda() {
  const { token, user } = useAuth();
  const [params] = useSearchParams();
  const [day, setDay] = useState(params.get("date") || mexicoToday());
  const [barberId, setBarberId] = useState("");
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [items, setItems] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== "admin") return;
    api<Barber[]>("/barbers")
      .then(setBarbers)
      .catch((reason: Error) => setError(reason.message));
  }, [user?.role]);

  useEffect(() => {
    const query = new URLSearchParams({ date: day });
    if (user?.role === "admin" && barberId) query.set("barber_id", barberId);
    api<Appointment[]>(`/appointments?${query.toString()}`, {}, token)
      .then(setItems)
      .catch((reason: Error) => setError(reason.message));
  }, [token, day, barberId, user?.role]);

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
      <PageHeader title="Agenda" description="Citas del día por barbero y estado." />
      <div className="filters">
        <label className="field compact">
          <span>Fecha</span>
          <input
            data-testid="agenda-date"
            type="date"
            value={day}
            onChange={(event) => setDay(event.target.value)}
          />
        </label>
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
      {error && <p className="error">{error}</p>}
      {items.length === 0 && <p className="muted">No hay citas en esta fecha.</p>}
      <div className="list">
        {items.map((item) => (
          <article key={item.id} className="card row" data-testid="appointment-item">
            <div>
              <h3>{item.client_name}</h3>
              <p>
                {item.service_name} · {item.barber_name} · {formatAppointment(item.start_at)}
              </p>
              <p className={`status ${item.status}`}>{label(item.status)}</p>
            </div>
            {item.status === "scheduled" && (
              <button
                type="button"
                className="btn primary"
                data-testid="complete-appointment"
                onClick={() => complete(item.id)}
              >
                Marcar atendida
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
