import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { getI18n } from "@/i18n/server";
import { TermsEn } from "./content-en";
import { TermsTh } from "./content-th";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: `${m.common.terms} — Stocksme` };
}

export default async function TermsPage() {
  const { lang, m } = await getI18n();
  return <LegalPage title={m.common.terms}>{lang === "th" ? <TermsTh /> : <TermsEn />}</LegalPage>;
}
