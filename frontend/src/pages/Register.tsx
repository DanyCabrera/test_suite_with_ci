import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Field } from "../components/Layout";
import { validateRegister } from "../lib/validation";
import type { TokenResponse, User } from "../types";

export function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const validation = validateRegister({ fullName, email, phone, password });
    if (validation) {
      setError(validation);
      return;
    }
    setPending(true);
    setError(null);
    try {
      await api<User>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
          password,
        }),
      });
      const session = await api<TokenResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      login(session.access_token, session.user);
      navigate("/reservar");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo crear la cuenta");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-page">
    <section className="panel narrow">
      <h1>Crear cuenta</h1>
      <p className="muted">El registro es para clientes. La agenda del local entra con su propio usuario.</p>
      <form onSubmit={onSubmit} className="stack">
        <Field label="Nombre">
          <input data-testid="full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
        </Field>
        <Field label="Correo">
          <input
            data-testid="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label="Teléfono">
          <input data-testid="phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </Field>
        <Field label="Contraseña">
          <input
            data-testid="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        {error && <p className="error">{error}</p>}
        <button className="btn primary" type="submit" data-testid="submit-register" disabled={pending}>
          {pending ? "Creando…" : "Crear cuenta"}
        </button>
      </form>
      <p className="muted">
        ¿Ya tienes cuenta? <Link to="/login">Entra</Link>
      </p>
    </section>
    </div>
  );
}
