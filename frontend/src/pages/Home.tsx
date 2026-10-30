import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { formatPrice } from "../lib/datetime";
import type { Barber, Service } from "../types";

export function Home() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api<Service[]>("/services"), api<Barber[]>("/barbers")])
      .then(([nextServices, nextBarbers]) => {
        setServices(nextServices);
        setBarbers(nextBarbers);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  return (
    <>
      <section className="hero">
        <p className="eyebrow">Lun–Sáb · 09:00–18:00 · GT</p>
        <h1>Reserva tu cita en minutos</h1>
        <p className="lede">
          Elige servicio, barbero y horario disponible. Sin llamadas ni filas: la silla queda reservada hasta que
          llegues.
        </p>
        {user?.role === "client" ? (
          <Link className="btn primary" to="/reservar">
            Ir a reservar
          </Link>
        ) : !user ? (
          <Link className="btn primary" to="/registro">
            Crear cuenta y reservar
          </Link>
        ) : null}
      </section>
      {error && <p className="error">{error}</p>}
      <div className="split">
        <section className="section-block">
          <h2>Servicios</h2>
          <div className="grid">
            {services.map((service) => (
              <article key={service.id} className="card">
                <h3>{service.name}</h3>
                <p>
                  {service.duration_minutes} min · {formatPrice(service.price)}
                </p>
              </article>
            ))}
          </div>
        </section>
        <section className="section-block">
          <h2>Equipo</h2>
          <div className="grid">
            {barbers.map((barber) => (
              <article key={barber.id} className="card">
                <h3>{barber.full_name}</h3>
                <p className="muted">Barbero</p>
                <ul className="chips">
                  {services.map((service) => (
                    <li key={service.id}>
                      <span className="chip">{service.name}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
