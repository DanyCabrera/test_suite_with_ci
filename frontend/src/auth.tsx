import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api } from "./api";
import type { Role, User } from "./types";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  ready: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setReady(true);
      return;
    }
    let cancelled = false;
    api<User>("/auth/me", {}, token)
      .then((current) => {
        if (!cancelled) setUser(current);
      })
      .catch(() => {
        localStorage.removeItem("token");
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      ready,
      login: (nextToken, nextUser) => {
        localStorage.setItem("token", nextToken);
        setToken(nextToken);
        setUser(nextUser);
        setReady(true);
      },
      logout: () => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
      },
    }),
    [user, token, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return value;
}

export function RequireAuth({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <p className="auth-loading">Cargando sesión…</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!roles.includes(user.role)) {
    return <p className="error">No tienes acceso a esta sección.</p>;
  }
  return children;
}
