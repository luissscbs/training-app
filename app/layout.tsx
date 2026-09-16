import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./css/calendars.css";
import { LocalDateSync } from "@/app/components/LocalDateSync";
import { cn } from "@/lib/cn";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Forge · Training Tracker",
  description: "Rutinas por día, registro de pesos y progreso",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={cn("antialiased", inter.className)}>
      <body
        className="bg-background-gray-secondary_alt_2 text-text-primary"
      >
        <LocalDateSync />
        {children}
      </body>
    </html>
  );
}
