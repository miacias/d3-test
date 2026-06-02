import Link from "next/link";
import { MAP_ROUTES } from "../components/mapRoutes";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">D3 World Map Examples</h1>
        <p className="max-w-3xl text-zinc-600">
          Each globe example now has its own page. Use the navigation above or the links below to open
          them individually.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {MAP_ROUTES.map((route) => (
          <article key={route.href} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-xl font-semibold text-teal-500">{route.label}</h2>
            <p className="mt-1 text-sm text-zinc-600">{route.description}</p>
            <Link
              href={route.href}
              className="mt-4 inline-flex rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
            >
              Open page
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
