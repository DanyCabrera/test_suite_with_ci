import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { PageHeader } from "../components/Layout";
import { formatPrice, formatSlot, nextOpenDay, weekday } from "../lib/datetime";
import type { Barber, Service } from "../types";

export function Book() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [service, setService] = useState<Service | null>(null);
  const [barber, setBarber] = useState<Barber | null>(null);
  const [day, setDay] = useState(nextOpenDay);
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState<string | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    Promise.all([api<Service[]>("/services"), api<Barber[]>("/barbers")])
      .then(([nextServices, nextBarbers]) => {
        setServices(nextServices);
        setBarbers(nextBarbers);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  useEffect(() => {
    if (!service || !barber) return;
    let cancelled = false;
    setSlotsLoading(true);
    setSlot(null);
    api<{ slots: string[] }>(`/barbers/${barber.id}/availability?service_id=${service.id}&date=${day}`)
      .then((data) => {
        if (!cancelled) setSlots(data.slots);
      })
      .catch((reason: Error) => {
        if (!cancelled) setError(reason.message);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [service, barber, day]);

  async function confirm() {
    if (!service || !barber || !slot) return;
    setPending(true);
    setError(null);
    try {
      await api(
        "/appointments",
        {
          method: "POST",
          body: JSON.stringify({
            barber_id: barber.id,
            service_id: service.id,
            start_at: slot,
          }),
        },
        token,
      );
      navigate("/mis-citas");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo reservar");
    } finally {
      setPending(false);
    }
  }

  const closed = weekday(day) === 0;

  return (
    <section>
      <PageHeader
        title="Reservar cita"
        description="Completa cada paso. Solo verás horarios reales según el servicio y el barbero."
      />
      {error && <p className="error">{error}</p>}

      <div className="step">
        <h2>1 · Servicio</h2>
        <div className="grid">
          {services.map((item) => (
            <button
              key={item.id}
              type="button"
              className={service?.id === item.id ? "card selected" : "card"}
              data-testid={`service-${item.id}`}
              aria-pressed={service?.id === item.id}
              onClick={() => {
                if (service?.id === item.id) return;
                setService(item);
                setSlot(null);
                setSlots([]);
                if (barber) setSlotsLoading(true);
              }}
            >
              <strong>{item.name}</strong>
              <span>
                {item.duration_minutes} min · {formatPrice(item.price)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="step">
        <h2>2 · Barbero</h2>
        {!service && <p className="muted">Selecciona un servicio para continuar.</p>}
        <div className="grid">
          {barbers.map((item) => (
            <button
              key={item.id}
              type="button"
              className={barber?.id === item.id ? "card selected" : "card"}
              data-testid={`barber-${item.id}`}
              aria-pressed={barber?.id === item.id}
              disabled={!service}
              onClick={() => {
                if (!service || barber?.id === item.id) return;
                setBarber(item);
                setSlot(null);
                setSlots([]);
                setSlotsLoading(true);
              }}
            >
              <strong>{item.full_name}</strong>
              {service ? (
                <span className="barber-service">
                  {service.name} · {service.duration_minutes} min · {formatPrice(service.price)}
                </span>
              ) : (
                <span className="muted">Sin servicio elegido</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="step">
        <h2>3 · Horario</h2>
        <label className="field compact">
          <span>Fecha</span>
          <input
            data-testid="date"
            type="date"
            value={day}
            onChange={(event) => {
              setDay(event.target.value);
              setSlot(null);
              setSlots([]);
              if (service && barber) setSlotsLoading(true);
            }}
          />
        </label>
        {closed && <p className="muted">Los domingos no abrimos.</p>}
        {service && barber && !closed && slotsLoading && <p className="muted">Consultando disponibilidad…</p>}
        {service && barber && !closed && !slotsLoading && slots.length === 0 && (
          <p className="muted">No hay horarios libres en esta fecha.</p>
        )}
        <div className="slots">
          {!closed &&
            slots.map((item, index) => (
              <button
                key={item}
                type="button"
                className={slot === item ? "slot selected" : "slot"}
                data-testid={`slot-${index}`}
                onClick={() => setSlot(item)}
              >
                {formatSlot(item)}
              </button>
            ))}
        </div>
      </div>

      <div className="step">
        <h2>4 · Confirmar</h2>
        <div className="confirm-bar">
          {service && barber && slot ? (
            <p className="confirm-summary">
              <strong>{service.name}</strong> con {barber.full_name} · {formatSlot(slot)}
            </p>
          ) : (
            <p className="confirm-summary">Elige servicio, barbero y horario para confirmar.</p>
          )}
          <button
            className="btn primary"
            type="button"
            data-testid="confirm-booking"
            disabled={!service || !barber || !slot || pending}
            onClick={confirm}
          >
            {pending ? "Reservando…" : "Confirmar reserva"}
          </button>
        </div>
      </div>
    </section>
  );
}
