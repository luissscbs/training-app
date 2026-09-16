"use client";

import {
  ArrowRight,
  ArrowUpward,
  ArrowDownward,
  BarChart2,
  Bell1,
  Bolt1,
  Calendar,
  CalendarTime,
  Check,
  CheckCircle1,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClockThree,
  Eye,
  Heart,
  Home,
  LaptopPhone,
  Locked3,
  Exit,
  MenuHamburger1,
  MoonStar1,
  Muscles,
  Pencil1,
  PieChart1,
  Play,
  Plus,
  RefreshCircle1Clockwise,
  Search1,
  Shield1Check,
  SlidersDoubleHorizontal,
  Sun1,
  Table2,
  TrendUp2,
  Trash1,
  User2,
  UserCircle1,
  UserMultiple1,
} from "@tailgrids/icons";
import type { ComponentType } from "react";
import { cn } from "@/lib/cn";

function DumbbellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HourglassIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6 3h12M6 21h12M7.5 3v4.2L12 12l4.5-4.8V3M7.5 21v-4.2L12 12l4.5 4.8V21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6 21V4M6 4h11l-2.5 4L17 12H6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function TrophyIcon() {  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM7 6H4a1 1 0 00-1 1c0 2.5 2 4.5 4.5 4.5M17 6h3a1 1 0 011 1c0 2.5-2 4.5-4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const MAP: Record<string, ComponentType> = {
  menu: MenuHamburger1,
  home: Home,
  grid_view: Home,
  calendar: Calendar,
  calendar_month: Calendar,
  calendar_today: CalendarTime,
  edit_calendar: CalendarTime,
  event_available: Calendar,
  user: User2,
  person: User2,
  person_add: UserCircle1,
  users: UserMultiple1,
  group: UserMultiple1,
  shield: Shield1Check,
  edit: Pencil1,
  delete: Trash1,
  check: Check,
  check_circle: CheckCircle1,
  verified: CheckCircle1,
  chevron_right: ChevronRight,
  chevron_left: ChevronLeft,
  expand_more: ChevronDown,
  arrow_forward: ArrowRight,
  arrow_upward: ArrowUpward,
  arrow_downward: ArrowDownward,
  eye: Eye,
  visibility: Eye,
  search: Search1,
  bell: Bell1,
  sun: Sun1,
  light_mode: Sun1,
  moon: MoonStar1,
  dark_mode: MoonStar1,
  hotel: MoonStar1,
  plus: Plus,
  add_circle: Plus,
  play_arrow: Play,
  play: Play,
  timer: ClockThree,
  history: RefreshCircle1Clockwise,
  replay: RefreshCircle1Clockwise,
  flag: FlagIcon,
  hourglass_top: HourglassIcon,
  radio_button_unchecked: CircleIcon,
  lock: Locked3,
  login: Exit,
  logout: Exit,
  heart: Heart,
  favorite: Heart,
  bolt: Bolt1,
  pace: Bolt1,
  tune: SlidersDoubleHorizontal,
  devices: LaptopPhone,
  save: Check,
  chart: BarChart2,
  bar_chart: BarChart2,
  pie_chart: PieChart1,
  monitoring: TrendUp2,
  trend: TrendUp2,
  table: Table2,
  list_alt: Table2,
  fitness_center: DumbbellIcon,
  muscles: Muscles,
  military_tech: TrophyIcon,
  trophy: TrophyIcon,
};

/**
 * Icono estilo NextAdmin (outline 1.5px, currentColor).
 * El tamaño lo controla la clase `text-[Npx]` del padre (1em).
 */
export function Icon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
  filled?: boolean;
}) {
  const Cmp = MAP[name] ?? Check;
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center [&>svg]:size-[1em]", className)}
    >
      <Cmp />
    </span>
  );
}
