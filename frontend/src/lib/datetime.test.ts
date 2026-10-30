import { describe, expect, it } from "vitest";
import { formatSlot, nextOpenDayFrom } from "./datetime";

describe("formatSlot", () => {
  it("muestra la hora de Ciudad de México", () => {
    expect(formatSlot("2026-10-13T15:00:00.000Z")).toBe("09:00");
    expect(formatSlot("2026-10-13T21:00:00.000Z")).toBe("15:00");
  });
});

describe("nextOpenDayFrom", () => {
  it("pasa del sábado al lunes y deja el viernes en sábado", () => {
    expect(nextOpenDayFrom("2026-10-16")).toBe("2026-10-17");
    expect(nextOpenDayFrom("2026-10-17")).toBe("2026-10-19");
    expect(nextOpenDayFrom("2026-10-18")).toBe("2026-10-19");
  });
});
