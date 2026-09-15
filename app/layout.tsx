import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SideNav } from "@/app/components/SideNav";
import { TopBar } from "@/app/components/TopBar";
import { MobileNav } from "@/app/components/NavLinks";
import { LocalDateSync } from "@/app/components/LocalDateSync";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Kinetix · Training Tracker",
  description: "Rutinas por día, registro de pesos y progreso",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`dark ${jakarta.variable}`}>
      <head>
        {/* Icon font: no existe en next/font/google; en el layout raíz aplica a todas las páginas */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning className="min-h-full font-sans antialiased">
        <LocalDateSync />
        <SideNav />
        <div className="lg:pl-72">
          <TopBar />
          <div className="px-4 pb-28 pt-16 sm:px-6 lg:px-8">{children}</div>
          <MobileNav />
        </div>
      </body>
    </html>
  );
}
