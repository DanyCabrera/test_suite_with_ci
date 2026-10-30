import { describe, expect, it } from "vitest";
import { validateLogin, validateRegister } from "./validation";

const valid = {
  fullName: "Ana López",
  email: "ana@example.com",
  phone: "5551234567",
  password: "secreto123",
};

describe("validateRegister", () => {
  it("acepta un formulario completo", () => {
    expect(validateRegister(valid)).toBeNull();
  });

  it("exige todos los campos", () => {
    expect(validateRegister({ ...valid, fullName: "  " })).toBe("Completa todos los campos");
    expect(validateRegister({ ...valid, phone: "" })).toBe("Completa todos los campos");
  });

  it("rechaza correo, teléfono y contraseña cortos", () => {
    expect(validateRegister({ ...valid, email: "ana" })).toBe("Correo inválido");
    expect(validateRegister({ ...valid, phone: "12ab" })).toBe("Teléfono inválido");
    expect(validateRegister({ ...valid, password: "corta" })).toBe(
      "La contraseña debe tener al menos 8 caracteres",
    );
  });
});

describe("validateLogin", () => {
  it("exige correo válido", () => {
    expect(validateLogin("", "secreto123")).toBe("Completa todos los campos");
    expect(validateLogin("ana", "secreto123")).toBe("Correo inválido");
    expect(validateLogin("ana@example.com", "secreto123")).toBeNull();
  });
});
