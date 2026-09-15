"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LOCAL_TODAY_COOKIE, toDateStr } from "@/lib/dates";

function readCookie(name: string): string | null {
  for (const part of document.cookie.split("; ")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === name) {
      return decodeURIComponent(part.slice(i + 1));
    }
  }
  return null;
}

/**
 * Informa al servidor cuál es la fecha local del navegador mediante la
 * cookie `local-today` y refresca una vez para re-renderizar con el día
 * correcto. Solo actúa cuando la cookie falta o cambió ( medianoche, viaje).
 */
export function LocalDateSync() {
  const router = useRouter();
  useEffect(() => {
    const local = toDateStr(new Date());
    if (readCookie(LOCAL_TODAY_COOKIE) !== local) {
      document.cookie = `${LOCAL_TODAY_COOKIE}=${local}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    }
  }, [router]);
  return null;
}
