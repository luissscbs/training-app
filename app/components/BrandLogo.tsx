import Link from "next/link";
import { cn } from "@/lib/cn";

/** Silueta de yunque original de Forge. */
function AnvilGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 6h12l6 2.5-6 2.5h-3.5v3H15v2.5h2.5V19h-11v-2.5H9V14H6.5v-3H3V6z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Marca Forge: yunque desnudo en morado brand, como el logo del template. */
export function ForgeMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center text-[#5750F1] [&>svg]:size-8",
        className,
      )}
    >
      <AnvilGlyph />
    </span>
  );
}

/**
 * Logo Forge — marca mancuerna + palabra.
 * `variant="dark-panel"` para usar sobre fondos brand (panel del login).
 */
export function BrandLogo({
  variant = "default",
  compact = false,
  className = "",
}: {
  variant?: "default" | "dark-panel";
  compact?: boolean;
  className?: string;
}) {
  const onDarkPanel = variant === "dark-panel";
  return (
    <Link
      href="/"
      aria-label="Ir al inicio"
      className={cn(
        "flex items-center gap-2.5 rounded-xl transition-opacity hover:opacity-80",
        className,
      )}
    >
      {onDarkPanel ? (
        <span
          aria-hidden
          className="flex shrink-0 items-center justify-center text-white [&>svg]:size-8"
        >
          <AnvilGlyph />
        </span>
      ) : (
        <ForgeMark />
      )}
      {!compact && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "text-xl font-extrabold tracking-tight",
              onDarkPanel ? "text-white" : "text-text-primary",
            )}
          >
            FORGE
          </span>
          <span
            className={cn(
              "mt-1 text-[10px] font-bold uppercase tracking-widest",
              onDarkPanel ? "text-white/70" : "text-text-tertiary",
            )}
          >
            Training Tracker
          </span>
        </span>
      )}
    </Link>
  );
}
