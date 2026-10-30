import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <NavLink to="/" className="brand" data-testid="nav-home">
            <span className="brand-mark" aria-hidden="true">
              BN
            </span>
            <span className="brand-text">
              Barbería Norte
              <small>Reservas</small>
            </span>
          </NavLink>
          <nav className="topnav" aria-label="Principal">
            {user?.role === "client" && (
              <>
                <NavLink to="/reservar" className="nav-link" data-testid="nav-book">
                  Reservar
                </NavLink>
                <NavLink to="/mis-citas" className="nav-link" data-testid="nav-mine">
                  Mis citas
                </NavLink>
              </>
            )}
            {(user?.role === "barber" || user?.role === "admin") && (
              <NavLink to="/agenda" className="nav-link" data-testid="nav-agenda">
                Agenda
              </NavLink>
            )}
            {user?.role === "admin" && (
              <NavLink to="/servicios" className="nav-link" data-testid="nav-services">
                Servicios
              </NavLink>
            )}
          </nav>
          {user ? (
            <div className="session">
              <span className="avatar" aria-hidden="true">
                {initials(user.full_name)}
              </span>
              <span className="session-name">{user.full_name}</span>
              <button type="button" className="btn ghost sm" data-testid="nav-logout" onClick={logout}>
                Salir
              </button>
            </div>
          ) : (
            <div className="session session-guest">
              <NavLink to="/login" className="btn ghost sm" data-testid="nav-login">
                Entrar
              </NavLink>
              <NavLink to="/registro" className="btn primary sm" data-testid="nav-register">
                Crear cuenta
              </NavLink>
            </div>
          )}
        </div>
      </header>
      <main className="container page">
        <Outlet />
      </main>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
      {description && <p className="muted">{description}</p>}
    </header>
  );
}
