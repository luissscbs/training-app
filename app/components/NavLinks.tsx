"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  Calendar,
  CalendarTime,
  Home,
  Muscles,
  Table2,
  TrendUp2,
} from "@tailgrids/icons";
import { cn } from "@/lib/cn";

export type NavKey = "dashboard" | "semana" | "calendario" | "registro" | "rutinas" | "progreso";

type NavItem = { key: NavKey; href: string; label: string; icon: ReactNode };

function useTodayWeekday(): number | null {
  const [wd, setWd] = useState<number | null>(null);
  useEffect(() => {
    // Solo en cliente: evita mismatch SSR/cliente si cambia el día entre medias.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWd((new Date().getDay() + 6) % 7);
  }, []);
  return wd;
}

function useNavItems(): NavItem[] {
  const wd = useTodayWeekday();
  return useMemo(
    () => [
      { key: "dashboard", href: "/", label: "Dashboard", icon: <Home /> },
      { key: "semana", href: "/semana", label: "Semana", icon: <Calendar /> },
      { key: "calendario", href: "/calendario", label: "Calendario", icon: <CalendarTime /> },
      {
        key: "registro",
        href: wd === null ? "/semana" : `/rutina/${wd}#registro`,
        label: "Registro",
        icon: <Muscles />,
      },
      { key: "rutinas", href: "/rutinas", label: "Rutinas", icon: <Table2 /> },
      { key: "progreso", href: "/progreso", label: "Progreso", icon: <TrendUp2 /> },
    ],
    [wd],
  );
}

function useActiveNav(): NavKey {
  const pathname = usePathname();
  if (pathname === "/semana") return "semana";
  if (pathname === "/calendario") return "calendario";
  if (pathname === "/rutinas" || pathname.startsWith("/rutinas/")) return "rutinas";
  if (pathname.startsWith("/rutina/")) return "registro";
  if (pathname === "/progreso") return "progreso";
  return "dashboard";
}

const linkCls = (isActive: boolean) =>
  cn(
    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-sidebar-navigation-nav-item-nav-hover-background text-text-primary"
      : "text-text-secondary hover:bg-sidebar-navigation-nav-item-nav-hover-background hover:text-text-primary",
  );

export function SideNavLinks({ collapsed = false }: { collapsed?: boolean }) {
  const items = useNavItems();
  const active = useActiveNav();
  return (
    <nav className={cn("flex flex-col", collapsed ? "items-center gap-1.5" : "gap-1")}>
      {items.map((item) => {
        const isActive = active === item.key;
        if (collapsed) {
          return (
            <Link
              key={item.key}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center justify-center rounded-lg px-3 py-2.5 transition-colors duration-200 [&>svg]:size-5",
                isActive
                  ? "bg-sidebar-navigation-nav-item-nav-hover-background text-icon-primary"
                  : "text-icon-tertiary hover:bg-sidebar-navigation-nav-item-nav-hover-background hover:text-icon-primary",
              )}
            >
              {item.icon}
            </Link>
          );
        }
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={linkCls(isActive)}
          >
            <span className="text-icon-tertiary [&>svg]:size-[18px]">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const items = useNavItems();
  const active = useActiveNav();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-card-border bg-card-surface-area/95 backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-6">
        {items.map((item) => {
          const isActive = active === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold uppercase tracking-wider [&>svg]:size-[22px]",
                isActive ? "text-text-primary" : "text-text-tertiary",
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
