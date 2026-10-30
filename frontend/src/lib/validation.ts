export type RegisterInput = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
};

export function validateRegister(input: RegisterInput): string | null {
  if (!input.fullName.trim() || !input.email.trim() || !input.phone.trim() || !input.password) {
    return "Completa todos los campos";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    return "Correo inválido";
  }
  if (!/^[0-9+\-\s]{8,20}$/.test(input.phone.trim())) {
    return "Teléfono inválido";
  }
  if (input.password.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres";
  }
  return null;
}

export function validateLogin(email: string, password: string): string | null {
  if (!email.trim() || !password) return "Completa todos los campos";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Correo inválido";
  return null;
}
