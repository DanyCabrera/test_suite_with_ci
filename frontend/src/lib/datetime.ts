export function mexicoToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function weekday(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function nextOpenDayFrom(todayIso: string): string {
  let cursor = addDays(todayIso, 1);
  while (weekday(cursor) === 0) cursor = addDays(cursor, 1);
  return cursor;
}

export function nextOpenDay(): string {
  return nextOpenDayFrom(mexicoToday());
}

export function formatSlot(iso: string): string {
  const parts = new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const hour = (parts.find((part) => part.type === "hour")?.value ?? "").padStart(2, "0");
  const minute = (parts.find((part) => part.type === "minute")?.value ?? "").padStart(2, "0");
  return `${hour}:${minute}`;
}

export function formatAppointment(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function formatPrice(price: string | number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(Number(price));
}
