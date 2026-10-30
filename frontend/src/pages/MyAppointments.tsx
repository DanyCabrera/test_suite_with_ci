import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { PageHeader } from "../components/Layout";
import { formatAppointment } from "../lib/datetime";
import type { Appointment } from "../types";

function label(status: Appointment["status"]): string {
  if (status === "scheduled") return "Programada";
  if (status === "cancelled") return "Cancelada";
  return "Atendida";
}

export function MyAppointments() {
  const { token } = useAuth();
  const [items, setItems] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api<Appointment[]>("/appointments/me", {}, token)
      .then(setItems)
      .catch((reason: Error) => setError(reason.message));
  }

  useEffect(() => {
    load();
  }, [token]);

  async function cancel(id: number) {
    setError(null);
    try {
      await api(`/appointments/${id}/cancel`, { method: "PATCH" }, token);
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo cancelar");
    }
  }

  return (
    <section>
      <PageHeader title="Mis citas" description="Consulta y cancela tus citas programadas." />
      {error && <p className="error">{error}</p>}
      {items.length === 0 && <p className="muted">No tienes citas.</p>}
      <div className="list">
        {items.map((item) => (
          <article key={item.id} className="card row" data-testid="appointment-item">
            <div>
              <h3>{item.service_name}</h3>
              <p>
                {item.barber_name} · {formatAppointment(item.start_at)}
              </p>
              <p className={`status ${item.status}`}>{label(item.status)}</p>
            </div>
            {item.status === "scheduled" && (
              <button
                type="button"
                className="btn ghost"
                data-testid="cancel-appointment"
                onClick={() => cancel(item.id)}
              >
                Cancelar
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
