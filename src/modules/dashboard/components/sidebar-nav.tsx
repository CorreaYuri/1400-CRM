"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavigationItem } from "@/modules/dashboard/types";

type SidebarNavProps = {
  title: string;
  items: NavigationItem[];
};

export function SidebarNav({ title, items }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <div>
      <p className="font-heading text-[0.64rem] uppercase tracking-[0.28em] text-zinc-500">
        {title}
      </p>
      <nav className="mt-4 grid gap-2.5">
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`group relative grid grid-cols-[1fr_auto] items-center overflow-hidden rounded-[0.68rem] border px-4 py-3.5 transition-all duration-200 ${
                isActive
                  ? "border-amber-300/50 bg-[linear-gradient(135deg,rgba(245,158,11,0.22),rgba(255,255,255,0.08))] text-amber-50 shadow-[0_14px_30px_rgba(217,119,6,0.12),inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "border-white/8 bg-white/6 text-zinc-100 hover:border-white/16 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span
                className={`absolute left-0 top-3 bottom-3 w-1 rounded-[0.5rem] transition-all ${
                  isActive ? "bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.55)]" : "bg-transparent group-hover:bg-white/18"
                }`}
              />
              <span className="font-heading text-sm uppercase tracking-[0.18em]">
                {item.label}
              </span>
              {item.count ? (
                <span
                  className={`rounded-[0.5rem] px-2.5 py-1 text-[0.64rem] uppercase tracking-[0.18em] ${
                    isActive
                      ? "bg-amber-200/15 text-amber-100"
                      : "bg-white/10 text-zinc-300 group-hover:bg-white/15 group-hover:text-white"
                  }`}
                >
                  {item.count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
