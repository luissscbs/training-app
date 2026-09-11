"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/app/components/Icon";

export type NavKey = "dashboard" | "semana" | "registro" | "rutinas" | "progreso";

type NavItem = { key: NavKey; href: string; label: string; icon: string };

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
      { key: "dashboard", href: "/", label: "Dashboard", icon: "grid_view" },
      { key: "semana", href: "/semana", label: "Semana", icon: "calendar_month" },
      {
        key: "registro",
        href: wd === null ? "/semana" : `/rutina/${wd}#registro`,
        label: "Registro",
        icon: "fitness_center",
      },
      { key: "rutinas", href: "/rutinas", label: "Rutinas", icon: "list_alt" },
      { key: "progreso", href: "/progreso", label: "Progreso", icon: "monitoring" },
    ],
    [wd],
  );
}

function useActiveNav(): NavKey {
  const pathname = usePathname();
  if (pathname === "/semana") return "semana";
  if (pathname === "/rutinas" || pathname.startsWith("/rutinas/")) return "rutinas";
  if (pathname.startsWith("/rutina/")) return "registro";
  if (pathname === "/progreso") return "progreso";
  return "dashboard";
}

const ACTIVE =
  "bg-pcont text-onpcont font-bold shadow-[0_0_16px_-2px_rgba(132,204,22,0.35)]";
const IDLE = "text-onvariant hover:bg-shigh hover:text-onsurface";

export function SideNavLinks() {
  const items = useNavItems();
  const active = useActiveNav();
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={active === item.key ? "page" : undefined}
          className={`flex items-center gap-3 rounded-lg px-4 py-2 text-sm transition-all duration-150 ${active === item.key ? ACTIVE : IDLE}`}
        >
          <Icon name={item.icon} className="text-[20px]" />
          <span className="text-sm font-semibold">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function MobileNav() {
  const items = useNavItems();
  const active = useActiveNav();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slowest/95 backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-5">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active === item.key ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold uppercase tracking-wider ${
              active === item.key ? "text-primary" : "text-onvariant"
            }`}
          >
            <Icon name={item.icon} className="text-[22px]" filled={active === item.key} />
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
