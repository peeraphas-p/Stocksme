import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark, Wordmark } from "@/components/Brand";
import LanguagePicker from "@/components/LanguagePicker";
import { getI18n } from "@/i18n/server";

export const LEGAL_UPDATED = "2026-11-17";
export const CONTACT_URL = "https://github.com/peeraphas-p/Stocksme/issues";

/** หน้ากฎหมาย (ฉบับอังกฤษและไทย) */
export async function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  const { m, t, fmt } = await getI18n();
  return (
    <div className="min-h-dvh px-2.5 pt-3 pb-10 sm:px-5 sm:pt-6">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <header className="glass flex h-14 items-center justify-between rounded-[18px] px-4 sm:h-[62px] sm:px-5">
          <Link href="/welcome" className="flex items-center gap-2.5">
            <BrandMark size={26} className="-my-1" />
            <Wordmark className="text-[16px]" />
          </Link>
          <div className="flex items-center gap-1">
            <LanguagePicker />
            <Link href="/" className="flex items-center gap-1.5 px-2 text-[13px] text-muted hover:text-fg">
              <ArrowLeft size={14} aria-hidden="true" />
              {m.common.back}
            </Link>
          </div>
        </header>
        <article className="glass rounded-[22px] px-5 py-8 sm:px-10 sm:py-10 [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:tracking-tight [&_li]:mt-1 [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 text-[14px] leading-relaxed">
          <h1 className="text-[28px] font-medium tracking-[-0.035em]">{title}</h1>
          <p className="text-xs text-muted">{t(m.legal.updated, { d: fmt.day(LEGAL_UPDATED) })}</p>
          {children}
        </article>
        <footer className="flex justify-center gap-4 text-[12px] text-muted">
          <Link href="/privacy" className="hover:text-fg">
            {m.common.privacy}
          </Link>
          <Link href="/terms" className="hover:text-fg">
            {m.common.terms}
          </Link>
        </footer>
      </div>
    </div>
  );
}
