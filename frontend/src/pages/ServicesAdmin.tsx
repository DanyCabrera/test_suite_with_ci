import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { Field, PageHeader } from "../components/Layout";
import { formatPrice } from "../lib/datetime";
import type { Service } from "../types";

export function ServicesAdmin() {
  const { token } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("30");
  const [price, setPrice] = useState("100");
  const [error, setError] = useState<string | null>(null);

  function load() {
    api<Service[]>("/services")
      .then(setServices)
      .catch((reason: Error) => setError(reason.message));
  }

  useEffect(() => {
    load();
  }, []);

  function edit(service: Service) {
    setEditingId(service.id);
    setName(service.name);
    setDuration(String(service.duration_minutes));
    setPrice(String(service.price));
  }

  function reset() {
    setEditingId(null);
    setName("");
    setDuration("30");
    setPrice("100");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const payload = {
      name,
      duration_minutes: Number(duration),
      price: Number(price),
    };
    try {
      if (editingId) {
        await api(`/services/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) }, token);
      } else {
        await api("/services", { method: "POST", body: JSON.stringify(payload) }, token);
      }
      reset();
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar");
    }
  }

  return (
    <section>
      <PageHeader title="Servicios" description="Alta y edición del catálogo visible para clientes." />
      {error && <p className="error">{error}</p>}
      <form className="panel stack" onSubmit={onSubmit}>
        <Field label="Nombre">
          <input data-testid="service-name" value={name} onChange={(event) => setName(event.target.value)} required />
        </Field>
        <Field label="Duración (minutos)">
          <input
            data-testid="service-duration"
            type="number"
            min={1}
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            required
          />
        </Field>
        <Field label="Precio">
          <input
            data-testid="service-price"
            type="number"
            min={1}
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            required
          />
        </Field>
        <button className="btn primary" type="submit" data-testid="save-service">
          {editingId ? "Guardar cambios" : "Agregar servicio"}
        </button>
      </form>
      <div className="list">
        {services.map((service) => (
          <article key={service.id} className="card row">
            <div>
              <h3>{service.name}</h3>
              <p>
                {service.duration_minutes} min · {formatPrice(service.price)}
              </p>
            </div>
            <button type="button" className="btn ghost" onClick={() => edit(service)}>
              Editar
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
