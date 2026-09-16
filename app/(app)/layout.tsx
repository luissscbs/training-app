import type { ReactNode } from "react";
import { auth } from "@/auth";
import { Shell } from "@/app/components/Shell";
import { TopBar } from "@/app/components/TopBar";
import { isAdminEmail } from "@/lib/admin";

/** Chrome de la app (sidebar colapsable + header + nav móvil). /login vive en (auth) sin esto. */
export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  return (
    <Shell
      showAdmin={isAdminEmail(session?.user?.email)}
      topBar={<TopBar />}
    >
      {children}
    </Shell>
  );
}
