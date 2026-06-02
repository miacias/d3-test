"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MAP_ROUTES } from "./mapRoutes";

export const Navigation = () => {
  const pathname = usePathname();

  return (
    <nav className="w-full border-b border-zinc-200 bg-teal-600 px-4 py-3 backdrop-blur sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 sm:gap-4">
        <Link
          href="/"
          className="mr-2 rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-semibold text-zinc-100 transition hover:text-zinc-700 hover:bg-zinc-100"
        >
          World Maps
        </Link>

        {MAP_ROUTES.map((route) => {
          const isActive = pathname === route.href;

          return (
            <Link
              key={route.href}
              href={route.href}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                isActive ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {route.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};