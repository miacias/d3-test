import type { ReactNode } from "react";

type MapPageShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export const MapPageShell = ({ title, description, children }: MapPageShellProps) => {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-8 sm:px-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold text-teal-400">{title}</h1>
        <p className="text-sm text-zinc-400 sm:text-base">{description}</p>
      </header>
      <section className="rounded-xl border border-zinc-200 bg-zinc-800 p-3 shadow-sm sm:p-4">{children}</section>
    </main>
  );
};
