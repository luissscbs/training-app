"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import multiMonthPlugin from "@fullcalendar/multimonth";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import esLocale from "@fullcalendar/core/locales/es";
import { ExpandSquare4 } from "@tailgrids/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { CloseButton } from "@/app/components/HeaderBar";

export type DayStatus = "done" | "progress" | "missed" | "planned" | "rest";

export type DayInfo = {
  status: DayStatus;
  title?: string;
  focus?: string | null;
  sets?: number;
  volume?: string;
  /** URL de registro (?date=) */
  url?: string;
  /** URL de detalle de la rutina */
  detailUrl?: string;
};

const DOT: Record<DayStatus, string> = {
  done: "bg-[#22C55E]",
  progress: "bg-[#F97316]",
  missed: "bg-[#EF4444]",
  planned: "bg-[#3758F9]",
  rest: "bg-transparent",
};

const STATUS_LABEL: Record<DayStatus, string> = {
  done: "Hecha",
  progress: "En curso",
  missed: "Pendiente",
  planned: "Programada",
  rest: "Descanso",
};

function StatusBadge({ status }: { status: DayStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        status === "done" && "bg-[rgba(34,197,94,0.10)] text-[#22C55E]",
        status === "progress" && "bg-[rgba(249,115,22,0.10)] text-[#F97316]",
        status === "missed" && "bg-[rgba(239,68,68,0.10)] text-[#EF4444]",
        status === "planned" && "bg-[rgba(55,88,249,0.10)] text-[#3758F9]",
        status === "rest" && "bg-background-gray-secondary text-text-tertiary",
      )}
    >
      <span className={cn("size-1.5 rounded-full", DOT[status])} />
      {STATUS_LABEL[status]}
    </span>
  );
}

/**
 * Calendario minimalista estilo NextAdmin (.custom-calendar):
 * solo punto de estado por día, vista previa siempre visible debajo
 * y modal ampliado al tocar la vista previa.
 */
export function TrainingCalendar({
  days,
  today,
}: {
  days: Record<string, DayInfo>;
  today: string;
}) {
  const [selected, setSelected] = useState<string>(today);
  const [expanded, setExpanded] = useState(false);
  const info = days[selected];

  const miniEvents = useMemo(
    () =>
      Object.entries(days)
        .filter(([, d]) => d.status !== "rest" && d.title)
        .map(([date, d]) => ({
          id: date,
          title: d.title as string,
          date,
          classNames: [
            "event-fc-color",
            d.status === "done"
              ? "fc-bg-success"
              : d.status === "progress"
                ? "fc-bg-warning"
                : d.status === "missed"
                  ? "fc-bg-danger"
                  : "fc-bg-primary",
          ],
          extendedProps: { status: d.status },
        })),
    [days],
  );

  const close = useCallback(() => setExpanded(false), []);
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, close]);

  const dateTitle = new Date(`${selected}T12:00:00`).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <>
      <div className="custom-calendar overflow-hidden rounded-xl border-[0.5px] border-card-border bg-card-background">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, multiMonthPlugin]}
          initialView="dayGridMonth"
          initialDate={today}
          locales={[esLocale]}
          locale="es"
          firstDay={1}
          navLinks={false}
          editable={false}
          selectable={false}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,multiMonthYear",
          }}
          buttonText={{
            today: "Hoy",
            month: "Mes",
            week: "Semana",
            year: "Año",
          }}
          dayCellClassNames={() => ""}
          events={miniEvents}
          dayMaxEvents={2}
          eventDisplay="block"
          eventContent={(arg) => (
            <div className={`event-fc-color ${arg.event.classNames.join(" ")}`}>
              <span className="fc-daygrid-event-dot" />
              <span className="truncate">{arg.event.title}</span>
            </div>
          )}
          eventClick={(arg) => {
            arg.jsEvent.preventDefault();
            setSelected(arg.event.startStr.slice(0, 10));
          }}
          dateClick={(arg) => setSelected(arg.dateStr)}
        />
      </div>

      {/* Vista previa del día seleccionado (siempre visible) */}
      {info && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          title="Tocar para ampliar"
          className="flex w-full items-center gap-3 rounded-xl border-[0.5px] border-card-border bg-card-background p-4 text-left transition-colors hover:bg-background-gray-secondary"
        >
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
              {dateTitle}
            </span>
            <span className="mt-0.5 truncate font-semibold leading-6 tracking-[-0.2px] text-text-primary">
              {info.title ?? "Descanso"}
            </span>
          </span>
          <StatusBadge status={info.status} />
          <span className="shrink-0 text-icon-tertiary">
            <ExpandSquare4 size={20} />
          </span>
        </button>
      )}

      {expanded && info && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={`Detalle del ${selected}`}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-card-border bg-card-background p-6 shadow-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
                  {dateTitle}
                </p>
                <h2 className="mt-1 text-xl font-medium leading-7 text-text-primary">
                  {info.title ?? "Descanso"}
                </h2>
              </div>
              <CloseButton onClick={close} />
            </div>

            {info.status !== "rest" ? (
              <>
                {info.focus && (
                  <p className="mt-1 text-sm text-text-tertiary">{info.focus}</p>
                )}
                <div className="mt-4 flex items-center gap-2">
                  <StatusBadge status={info.status} />
                  {info.sets !== undefined && info.sets > 0 && (
                    <span className="tabular text-xs text-text-tertiary">
                      {info.sets} series
                      {info.volume ? ` · ${info.volume}` : ""}
                    </span>
                  )}
                </div>
                <div className="mt-5 flex gap-2.5">
                  {info.url && (
                    <a
                      href={info.url}
                      className="flex h-11 flex-1 items-center justify-center rounded-lg bg-button-primary-background px-4 text-sm font-medium text-white transition-colors hover:bg-button-primary-hover-background"
                    >
                      Registrar
                    </a>
                  )}
                  {info.detailUrl && (
                    <a
                      href={info.detailUrl}
                      className="flex h-11 flex-1 items-center justify-center rounded-lg border border-card-border bg-card-background px-4 text-sm font-medium text-text-primary transition-colors hover:bg-background-gray-secondary"
                    >
                      Ver ejercicios
                    </a>
                  )}
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-text-tertiary">
                Día libre según tu plan. Recuperar también es entrenar.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
