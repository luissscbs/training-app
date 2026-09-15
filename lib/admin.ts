import { auth } from "@/auth";

/** Emails con acceso a /admin, en minúsculas. Misma cuenta sirve como atleta + admin. */
export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
}

/** Sesión actual si es admin, null si no. No redirige: la página decide qué mostrar. */
export async function getAdminSession(): Promise<{
  id: string;
  email: string;
} | null> {
  const session = await auth();
  const email = session?.user?.email;
  const id = session?.user?.id;
  if (!id || !email || !isAdminEmail(email)) return null;
  return { id, email };
}
