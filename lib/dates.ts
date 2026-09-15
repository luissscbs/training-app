/** Nombre de la cookie con la que el navegador informa su fecha local. */
export const LOCAL_TODAY_COOKIE = "local-today";

/** 0=Lun … 6=Dom para una fecha YYYY-MM-DD. */
export function dateWeekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** YYYY-MM-DD con formato válido y día real del calendario. */
export function isValidDateStr(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** Convierte YYYY-MM-DD a Date en hora local (sin desvíos UTC). */
export function parseDateStr(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Desplaza una fecha YYYY-MM-DD n días con matemática local (sin UTC). */
export function shiftDateStr(date: string, days: number): string {
  const dt = parseDateStr(date);
  dt.setDate(dt.getDate() + days);
  return toDateStr(dt);
}
