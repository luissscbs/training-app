import { cookies } from "next/headers";
import {
  LOCAL_TODAY_COOKIE,
  isValidDateStr,
  toDateStr,
} from "@/lib/dates";

/**
 * "Hoy" según el navegador del usuario (cookie `local-today`, escrita por
 * `<LocalDateSync />`), con fallback a la fecha del servidor.
 *
 * Los Server Components y las server actions usan `new Date()` del servidor,
 * que en Vercel va en UTC: para un usuario en América, a partir de la tarde
 * la app mostraba "mañana". Esta función prefiere siempre la fecha local
 * real del usuario cuando el navegador ya la informó.
 */
export async function getRequestToday(): Promise<string> {
  try {
    const jar = await cookies();
    const v = jar.get(LOCAL_TODAY_COOKIE)?.value;
    if (v && isValidDateStr(v)) return v;
  } catch {
    // Sin acceso a cookies: se usa el fallback de abajo.
  }
  return toDateStr(new Date());
}
