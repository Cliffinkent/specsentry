import Link from "next/link";
import { demoModeSchema } from "@/lib/schemas";
import { ShopJourney } from "./shop-journey";

type ShopPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const rawMode = (await searchParams).mode;
  const mode = demoModeSchema.safeParse(Array.isArray(rawMode) ? rawMode[0] : rawMode);

  if (!mode.success) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-6 py-14">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--teal)]">Sentry Shop fixture</p>
        <h1 className="mt-4 text-5xl font-black tracking-[-0.04em]">Choose an explicit demo build.</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">Fixture behavior is never selected implicitly. Use one of the validated modes below.</p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link className="bg-[var(--ink)] px-5 py-3 font-bold text-white" href="/demo/shop?mode=defective">Open defective build</Link>
          <Link className="border border-[var(--ink)] bg-[var(--surface)] px-5 py-3 font-bold" href="/demo/shop?mode=passing">Open passing build</Link>
          <Link className="border border-[var(--ink)] bg-[var(--surface)] px-5 py-3 font-bold" href="/demo/shop?mode=validation-missing">Open missing-validation build</Link>
          <Link className="border border-[var(--ink)] bg-[var(--surface)] px-5 py-3 font-bold" href="/demo/shop?mode=basket-lost">Open basket-loss build</Link>
          <Link className="border border-[var(--ink)] bg-[var(--surface)] px-5 py-3 font-bold" href="/demo/shop?mode=dependency-unavailable">Open unavailable-dependency build</Link>
        </div>
      </main>
    );
  }

  return <ShopJourney mode={mode.data} />;
}
