import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChartNoAxesCombined,
  Coins,
  FileSpreadsheet,
  Lock,
  NotebookPen,
  Smartphone,
  Upload,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { BrandMark, Wordmark } from "@/components/Brand";
import LanguagePicker from "@/components/LanguagePicker";
import { PeakHero } from "@/components/PeakCards";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: `Stocksme — ${m.welcome.eyebrow}`, description: m.welcome.heroBody };
}

const FEATURES: { icon: LucideIcon; n: 1 | 2 | 3 | 4 | 5 | 6 }[] = [
  { icon: FileSpreadsheet, n: 1 },
  { icon: Coins, n: 2 },
  { icon: ChartNoAxesCombined, n: 3 },
  { icon: CalendarDays, n: 4 },
  { icon: NotebookPen, n: 5 },
  { icon: Smartphone, n: 6 },
];

const STEPS: { icon: LucideIcon; n: 1 | 2 | 3 }[] = [
  { icon: UserPlus, n: 1 },
  { icon: Upload, n: 2 },
  { icon: ChartNoAxesCombined, n: 3 },
];

export default async function WelcomePage() {
  const { m } = await getI18n();
  const w = m.welcome;
  return (
    <div className="min-h-dvh px-2.5 pt-3 pb-10 sm:px-5 sm:pt-6 lg:px-7 lg:pt-8">
      <div className="mx-auto w-full max-w-[1180px] space-y-4">
        <header className="glass flex h-14 items-center justify-between gap-3 rounded-[18px] px-3 sm:h-[62px] sm:rounded-[20px] sm:px-5">
          <Link href="/welcome" className="flex items-center gap-2.5">
            <BrandMark size={28} className="-my-1" />
            <Wordmark className="text-[17px]" />
          </Link>
          <nav className="flex items-center gap-0.5 sm:gap-2">
            <LanguagePicker />
            <Link href="/login" className="rounded-[9px] px-2.5 py-2 text-[13px] whitespace-nowrap hover:bg-[var(--hover)] sm:px-3">
              {m.common.signIn}
            </Link>
            <Link href="/login?mode=signup" className="btn btn-primary whitespace-nowrap">
              {m.common.startFree}
            </Link>
          </nav>
        </header>

        <main className="glass space-y-12 rounded-[22px] px-4 py-10 sm:space-y-16 sm:rounded-[27px] sm:px-10 sm:py-14">
          {/* Hero */}
          <section className="grid items-center gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
            <div>
              <p className="mb-3 text-[13px] text-muted">{w.eyebrow}</p>
              <h1 className="text-[34px] leading-[1.12] font-medium tracking-[-0.04em] sm:text-[46px]">
                {w.heroLine1}
                <br />
                {w.heroLine2}
              </h1>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">
                {w.heroBody}
              </p>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <Link href="/login?mode=signup" className="btn btn-primary px-5 py-2.5 text-sm">
                  {m.common.startFree} <ArrowRight size={15} aria-hidden="true" />
                </Link>
                <Link href="/login" className="btn px-5 py-2.5 text-sm">
                  {w.haveAccount}
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                <span className="mr-1">{w.importFrom}</span>
                {["Dime!", "Webull", "CSV / Excel"].map((b) => (
                  <span key={b} className="tag bg-bg text-fg">
                    {b}
                  </span>
                ))}
              </div>
            </div>

            {/* ภาพตัวอย่าง (ข้อมูลสมมติ) */}
            <PeakHero />
          </section>

          {/* Features */}
          <section>
            <h2 className="mb-5 text-[22px] font-medium tracking-[-0.03em] sm:text-[26px]">{w.featuresTitle}</h2>
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, n }) => (
                <div key={n} className="card">
                  <span className="mb-3 grid h-9 w-9 place-items-center rounded-[10px]" style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)" }}>
                    <Icon size={18} strokeWidth={1.7} aria-hidden="true" />
                  </span>
                  <h3 className="text-sm font-semibold tracking-tight">{w[`f${n}Title`]}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{w[`f${n}Body`]}</p>
                </div>
              ))}
            </div>
          </section>

          {/* How it works */}
          <section>
            <h2 className="mb-5 text-[22px] font-medium tracking-[-0.03em] sm:text-[26px]">{w.stepsTitle}</h2>
            <ol className="grid gap-3 sm:grid-cols-3 sm:gap-4">
              {STEPS.map(({ icon: Icon, n }, i) => (
                <li key={n} className="card flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold text-brand-ink">{i + 1}</span>
                  <div>
                    <h3 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
                      <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
                      {w[`s${n}Title`]}
                    </h3>
                    <p className="mt-1 text-[13px] text-muted">{w[`s${n}Body`]}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Privacy */}
          <section className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6 sm:!p-7">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full" style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)" }}>
              <Lock size={24} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <div className="flex-1">
              <h2 className="text-base font-semibold tracking-tight">{w.privacyTitle}</h2>
              <ul className="mt-2 space-y-1 text-[13px] text-muted">
                <li>{w.p1}</li>
                <li>{w.p2}</li>
                <li>{w.p3}</li>
              </ul>
            </div>
            <Link href="/login?mode=signup" className="btn btn-primary self-start sm:self-center">
              {m.common.startFree} <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </section>
        </main>

        <footer className="glass flex flex-col items-center justify-between gap-1.5 rounded-[16px] px-4 py-3 text-center text-[11px] text-muted sm:flex-row sm:text-left">
          <span>{w.footer}</span>
          <span className="flex gap-3">
            <Link href="/privacy" className="hover:text-fg">
              {m.common.privacy}
            </Link>
            <Link href="/terms" className="hover:text-fg">
              {m.common.terms}
            </Link>
          </span>
        </footer>
      </div>
    </div>
  );
}
