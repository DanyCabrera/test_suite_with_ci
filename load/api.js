import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:8000";

export const options = {
  vus: Number(__ENV.VUS || 10),
  duration: __ENV.DURATION || "30s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
};

export function setup() {
  const email = `carga-${Date.now()}@example.com`;
  const password = "carga-dev-pass";
  const payload = JSON.stringify({
    email,
    password,
    full_name: "Usuario Carga",
    phone: "5550001122",
  });
  const params = { headers: { "Content-Type": "application/json" } };
  const register = http.post(`${BASE}/auth/register`, payload, params);
  check(register, { "alta 201": (response) => response.status === 201 });
  const login = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({ email, password }),
    params,
  );
  check(login, { "login 200": (response) => response.status === 200 });
  return { token: login.json("access_token") };
}

export default function (data) {
  const services = http.get(`${BASE}/services`);
  const barbers = http.get(`${BASE}/barbers`);
  const mine = http.get(`${BASE}/appointments/me`, {
    headers: { Authorization: `Bearer ${data.token}` },
  });
  check(services, { "servicios 200": (response) => response.status === 200 });
  check(barbers, { "barberos 200": (response) => response.status === 200 });
  check(mine, { "mis citas 200": (response) => response.status === 200 });
  sleep(1);
}
