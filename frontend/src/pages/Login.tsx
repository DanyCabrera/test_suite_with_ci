import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Field } from "../components/Layout";
import { validateLogin } from "../lib/validation";
import type { TokenResponse } from "../types";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const validation = validateLogin(email, password);
    if (validation) {
      setError(validation);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const session = await api<TokenResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      login(session.access_token, session.user);
      if (session.user.role === "client") navigate(from && from !== "/login" ? from : "/reservar");
      else navigate("/agenda");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo entrar");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-page">
    <section className="panel narrow">
      <h1>Entrar</h1>
      <p className="muted">Clientes, barberos y administración usan la misma puerta.</p>
      <form onSubmit={onSubmit} className="stack">
        <Field label="Correo">
          <input
            data-testid="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label="Contraseña">
          <input
            data-testid="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        {error && <p className="error">{error}</p>}
        <button className="btn primary" type="submit" data-testid="submit-login" disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <p className="muted">
        ¿Aún no tienes cuenta? <Link to="/registro">Regístrate</Link>
      </p>
    </section>
    </div>
  );
}
