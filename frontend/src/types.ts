export type Role = "client" | "barber" | "admin";

export type User = {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  role: Role;
};

export type Service = {
  id: number;
  name: string;
  duration_minutes: number;
  price: string | number;
};

export type Barber = {
  id: number;
  full_name: string;
  email: string;
};

export type AppointmentStatus = "scheduled" | "cancelled" | "completed";

export type Appointment = {
  id: number;
  client_id: number;
  client_name: string;
  barber_id: number;
  barber_name: string;
  service_id: number;
  service_name: string;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  user: User;
};
