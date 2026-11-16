import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { getI18n } from "@/i18n/server";
import { PrivacyEn } from "./content-en";
import { PrivacyTh } from "./content-th";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: `${m.common.privacy} — Stocksme` };
}

export default async function PrivacyPage() {
  const { lang, m } = await getI18n();
  return <LegalPage title={m.common.privacy}>{lang === "th" ? <PrivacyTh /> : <PrivacyEn />}</LegalPage>;
}
