"use client";

import {
  Bell1,
  Calendar,
  CalendarTime,
  CheckCircle1,
  ChevronDown,
  ClockThree,
  Close,
  Exit,
  UserCircle1,
} from "@tailgrids/icons";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/app/components/BrandLogo";
import { UnitToggle } from "@/app/components/UnitToggle";
import { cn } from "@/lib/cn";

export type HeaderNotification = {
  id: number;
  title: string;
  desc: string;
  dateLabel: string;
  href: string;
  done: boolean;
};

export type HeaderUser = {
  name: string | null;
  email: string | null;
  image: string | null;
};

function useEscape(onClose: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onClose]);
}

/** Campana con panel de actividad reciente (sesiones). */
function NotificationsButton({
  initial,
}: {
  initial: HeaderNotification[];
}) {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  useEscape(() => setOpen(false), open);

  const unread = initial.filter((n) => !readIds.has(n.id)).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notificaciones"
        aria-expanded={open}
        className="relative flex size-10 items-center justify-center rounded-lg border border-card-border bg-card-background text-icon-primary shadow-xs outline-none transition-colors hover:bg-background-gray-secondary focus-visible:border-input-primary-focus-border focus-visible:ring-4 focus-visible:ring-input-primary-focus-border/20"
      >
        <Bell1 size={20} />
        {unread > 0 && (
          <span className="absolute top-2 right-2.75 z-[1] size-2 rounded-full bg-red-400">
            <span className="absolute inset-0 -z-[1] animate-ping rounded-full bg-red-400 opacity-75" />
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-card-border bg-card-background p-0 shadow-3xl">
            <div className="flex items-center justify-between border-b border-card-border px-5 pt-5 pb-4">
              <p className="font-semibold leading-6 text-text-primary">
                Actividad
              </p>
              {unread > 0 && (
                <span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-xs font-medium text-brand-500">
                  {unread} nuevas
                </span>
              )}
            </div>

            {initial.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-text-tertiary">
                Sin actividad todavía. Registra tu primera sesión.
              </p>
            ) : (
              <ul className="scrollbar-thin max-h-96 overflow-y-auto px-3 py-2">
                {initial.map((n) => {
                  const isUnread = !readIds.has(n.id);
                  return (
                    <li key={n.id}>
                      <Link
                        href={n.href}
                        onClick={() => {
                          setReadIds((p) => new Set(p).add(n.id));
                          setOpen(false);
                        }}
                        className="group flex w-full gap-3.5 rounded-lg px-3 py-3 text-left transition-colors duration-300 hover:bg-background-gray-secondary"
                      >
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-card-border bg-background-gray-secondary text-icon-secondary transition-all duration-300 group-hover:bg-brand-500 group-hover:text-white",
                            n.done ? "text-[#22C55E]" : "text-[#F97316]",
                          )}
                        >
                          {n.done ? (
                            <CheckCircle1 size={20} />
                          ) : (
                            <ClockThree size={20} />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold leading-5 text-text-primary">
                              {n.title}
                            </span>
                            {isUnread && (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                            )}
                          </span>
                          <span className="mt-1 line-clamp-2 block text-xs leading-4 text-text-secondary">
                            {n.desc}
                          </span>
                          <span className="mt-2 block text-xs leading-4 text-text-tertiary">
                            {n.dateLabel}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex items-center justify-between border-t border-card-border px-5 py-4">
              <button
                type="button"
                onClick={() =>
                  setReadIds(new Set(initial.map((n) => n.id)))
                }
                className="text-xs font-medium text-text-secondary underline transition-colors hover:text-text-primary"
              >
                Marcar todas como leídas
              </button>
              <Link
                href="/progreso"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-button-primary-background px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-button-primary-hover-background"
              >
                Ver todo
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Avatar + nombre con menú (perfil, semana, salir). */
function UserProfileButton({
  user,
  signOut,
}: {
  user: HeaderUser;
  signOut: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  useEscape(() => setOpen(false), open);
  const initial = (user.name ?? user.email ?? "?")[0]?.toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menú de usuario"
        aria-expanded={open}
        className="group flex items-center gap-2.5 rounded-lg border-0 p-0 outline-none transition-all focus-visible:ring-4 focus-visible:ring-input-primary-focus-border/20 focus-visible:ring-offset-1"
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt="Perfil"
            src={user.image}
            className="size-10 rounded-lg object-cover"
          />
        ) : (
          <span className="flex size-10 items-center justify-center rounded-lg border border-card-border bg-background-gray-secondary text-sm font-medium text-text-primary">
            {initial}
          </span>
        )}
        <span className="hidden text-sm font-medium leading-5 text-text-primary md:block">
          {user.name ?? user.email}
        </span>
        <ChevronDown
          size={18}
          className={cn(
            "hidden text-icon-tertiary transition-transform duration-200 md:block",
            open && "-rotate-180",
          )}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-70 overflow-hidden rounded-xl border border-card-border bg-card-background p-0 shadow-3xl">
            <div className="flex w-full items-center justify-start gap-2 border-b border-card-border px-4 py-3">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt="Perfil"
                  src={user.image}
                  className="size-10 rounded-lg object-cover"
                />
              ) : (
                <span className="flex size-10 items-center justify-center rounded-lg border border-card-border bg-background-gray-secondary text-sm font-medium text-text-primary">
                  {initial}
                </span>
              )}
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-text-primary">
                  {user.name ?? user.email}
                </span>
                <span className="truncate text-xs text-text-tertiary">
                  {user.email}
                </span>
              </span>
            </div>

            <div className="p-1.5">
              {[
                { href: "/perfil", icon: <UserCircle1 size={20} />, label: "Mi perfil" },
                { href: "/rutinas#mi-semana", icon: <Calendar size={20} />, label: "Mi semana" },
                { href: "/calendario", icon: <CalendarTime size={20} />, label: "Calendario" },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-background-gray-secondary hover:text-text-primary"
                >
                  <span className="shrink-0 text-icon-secondary group-hover:text-text-primary">
                    {item.icon}
                  </span>
                  <span className="font-medium leading-5">{item.label}</span>
                </Link>
              ))}
            </div>

            <div className="border-t border-card-border" />

            <form action={signOut} className="m-1.5">
              <button
                type="submit"
                className="group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-background-gray-secondary hover:text-text-primary"
              >
                <span className="shrink-0 text-icon-secondary group-hover:text-text-primary">
                  <Exit size={20} />
                </span>
                <span className="font-medium leading-5">Salir</span>
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

export function HeaderBar({
  dateLabel,
  unit,
  user,
  notifications,
  signOut,
  signIn,
  googleConfigured,
}: {
  dateLabel: string;
  unit: "kg" | "lb";
  user: HeaderUser | null;
  notifications: HeaderNotification[];
  signOut: () => Promise<void>;
  signIn: () => Promise<void>;
  googleConfigured: boolean;
}) {
  return (
    <header className="sticky top-0 z-40 w-full border-b-[0.5px] border-card-border bg-card-surface-area px-2 py-4 lg:px-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="lg:hidden">
            <BrandLogo compact />
          </span>
          <Link
            href="/calendario"
            title="Abrir calendario"
            className="hidden h-10 max-w-xs flex-1 items-center gap-2 rounded-lg border border-card-border bg-input-background px-3 text-sm text-text-secondary transition-colors hover:border-input-primary-focus-border hover:text-text-primary sm:flex"
          >
            <span className="shrink-0 text-icon-tertiary">
              <Calendar size={20} />
            </span>
            <span className="truncate">{dateLabel}</span>
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          {user && <UnitToggle unit={unit} />}
          {user ? (
            <>
              <NotificationsButton initial={notifications} />
              <UserProfileButton user={user} signOut={signOut} />
            </>
          ) : googleConfigured ? (
            <form action={signIn}>
              <button
                type="submit"
                className="h-10 rounded-lg bg-button-primary-background px-4 text-sm font-medium text-white transition-colors hover:bg-button-primary-hover-background"
              >
                Entrar con Google
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </header>
  );
}

/** Botón X redondo para modales (reutilizable). */
export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Cerrar"
      className="flex size-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary"
    >
      <Close size={18} />
    </button>
  );
}
