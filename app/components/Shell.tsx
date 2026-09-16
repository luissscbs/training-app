"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { BrandLogo, ForgeMark } from "@/app/components/BrandLogo";
import { MobileNav, SideNavLinks } from "@/app/components/NavLinks";
import { cn } from "@/lib/cn";

const OPEN_W = 270;
const SHUT_W = 72;

function ExpandIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 18 18" fill="none">
      <path
        d="M1.5 8.25C1.5 5.42157 1.5 4.00736 2.37868 3.12868C3.25736 2.25 4.67157 2.25 7.5 2.25H10.5C13.3284 2.25 14.7426 2.25 15.6213 3.12868C16.5 4.00736 16.5 5.42157 16.5 8.25V9.75C16.5 12.5784 16.5 13.9926 15.6213 14.8713C14.7426 15.75 13.3284 15.75 10.5 15.75H7.5C4.67157 15.75 3.25736 15.75 2.37868 14.8713C1.5 13.9926 1.5 12.5784 1.5 9.75V8.25Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M4.125 7.5H8.625" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4.875 10.5H7.875" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11.25 15.75L11.25 2.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ThreeDots() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={18} height={4} viewBox="0 0 18 4" fill="none">
      <path
        d="M4 2C4 3.10457 3.10457 4 2 4C0.89543 4 0 3.10457 0 2C0 0.89543 0.89543 0 2 0C3.10457 0 4 0.89543 4 2Z"
        fill="currentColor"
      />
      <path
        d="M11 2C11 3.10457 10.1046 4 9 4C7.89543 4 7 3.10457 7 2C7 0.89543 7.89543 0 9 0C10.1046 0 11 0.89543 11 2Z"
        fill="currentColor"
      />
      <path
        d="M18 2C18 3.10457 17.1046 4 16 4C14.8954 4 14 3.10457 14 2C14 0.89543 14.8954 0 16 0C17.1046 0 18 0.89543 18 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ShieldMiniIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9 1.5l5.25 2.1v4.2c0 3.465-2.257 5.985-5.25 6.9-2.993-.915-5.25-3.435-5.25-6.9V3.6L9 1.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M6.75 8.625l1.5 1.5 3-3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Shell de la app estilo NextAdmin: sidebar fija colapsable en PC
 * (270px ↔ 72px), header y contenido al lado.
 */
export function Shell({
  showAdmin,
  topBar,
  children,
}: {
  showAdmin: boolean;
  topBar: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh lg:h-dvh lg:overflow-hidden">
      <aside
        style={{
          width: open ? OPEN_W : SHUT_W,
          minWidth: open ? OPEN_W : SHUT_W,
          transition:
            "width 300ms cubic-bezier(0.4,0,0.2,1), min-width 300ms cubic-bezier(0.4,0,0.2,1)",
        }}
        className="fixed inset-y-0 left-0 z-50 hidden shrink-0 overflow-hidden bg-background-gray-secondary_alt_2 lg:block"
      >
        <div className="flex h-full flex-col overflow-hidden">
          <div
            className={cn(
              "flex items-center px-4 pt-7 text-text-primary",
              open ? "justify-between" : "flex-col justify-center gap-4",
            )}
          >
            {open ? (
              <BrandLogo />
            ) : (
              <Link href="/" aria-label="Ir al inicio">
                <ForgeMark />
              </Link>
            )}
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? "Colapsar menú" : "Expandir menú"}
              className="p-1.5 text-icon-tertiary transition-colors hover:text-text-secondary"
            >
              <ExpandIcon />
            </button>
          </div>

          <nav
            className={cn(
              "scrollbar-thin flex-1 overflow-y-auto",
              open ? "mt-7 space-y-6 px-4" : "mt-5 space-y-1.5 px-2",
            )}
          >
            <div>
              {open ? (
                <p className="mb-4 mt-6 text-xs uppercase text-text-tertiary">
                  Menú principal
                </p>
              ) : (
                <span className="flex items-center justify-center pb-4 pt-6 text-icon-secondary">
                  <ThreeDots />
                </span>
              )}
              <SideNavLinks collapsed={!open} />
            </div>
            {showAdmin && (
              <div>
                {open ? (
                  <p className="mb-4 mt-6 text-xs uppercase text-text-tertiary">
                    Otros
                  </p>
                ) : (
                  <span className="flex items-center justify-center pb-4 pt-6 text-icon-secondary">
                    <ThreeDots />
                  </span>
                )}
                <Link
                  href="/admin"
                  title="Admin"
                  className={cn(
                    "flex items-center rounded-lg text-sm font-medium transition-colors duration-200",
                    open
                      ? "w-full gap-3 px-3 py-2 text-text-secondary hover:bg-sidebar-navigation-nav-item-nav-hover-background hover:text-text-primary"
                      : "justify-center px-3 py-2.5 text-icon-tertiary hover:bg-sidebar-navigation-nav-item-nav-hover-background hover:text-icon-primary",
                  )}
                >
                  <ShieldMiniIcon />
                  {open && <span>Admin</span>}
                </Link>
              </div>
            )}
          </nav>
        </div>
      </aside>

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col transition-[padding] duration-300",
          open ? "lg:pl-[270px]" : "lg:pl-[72px]",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col lg:m-4 lg:overflow-hidden lg:rounded-2xl lg:border-[0.5px] lg:border-card-surface-border lg:bg-card-surface-area lg:shadow-[0_3px_6px_-2px_rgba(0,0,0,0.02),0_1px_1px_0_rgba(0,0,0,0.04)]">
          {topBar}
          <main className="min-h-0 flex-1 lg:overflow-y-auto scrollbar-thin">
            <div
              key={pathname}
              className="page-transition mx-auto w-full max-w-[96rem] pb-28 lg:pb-8"
            >
              {children}
            </div>
          </main>
        </div>
        <MobileNav />
      </div>
    </div>
  );
}
