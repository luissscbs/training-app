import { Icon } from "@/app/components/Icon";
import { SideNavLinks } from "@/app/components/NavLinks";

export function SideNav() {
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-72 flex-col justify-between bg-slowest p-6 lg:flex">
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-2 px-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pcont text-onpcont shadow-[0_0_16px_-2px_rgba(132,204,22,0.4)]">
            <Icon name="fitness_center" className="text-[22px]" />
          </span>
          <div className="flex flex-col">
            <span className="text-[22px] font-extrabold leading-none tracking-tight">
              KINETIX
            </span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-primary">
              Training Tracker
            </span>
          </div>
        </div>
        <SideNavLinks />
      </div>
      <div className="flex flex-col gap-2 rounded-xl bg-slow p-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-onvariant">
            Sincronización
          </span>
          <span className="flex h-2 w-2 animate-pulse rounded-full bg-primary" />
        </div>
        <div className="flex items-center gap-2">
          <Icon name="cloud_sync" className="text-[18px] text-secondary" />
          <span className="truncate text-xs text-onsurface">
            Neon Postgres Live
          </span>
        </div>
      </div>
    </aside>
  );
}
