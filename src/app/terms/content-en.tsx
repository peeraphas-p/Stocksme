import Link from "next/link";
import { CONTACT_URL } from "@/components/LegalPage";

/** English version */
export function TermsEn() {
  return (
    <>
      <p>By signing up for or using Stocksme you agree to the terms below.</p>

      <h2>What Stocksme is</h2>
      <p>
        A free tool for recording trades and calculating results from data you enter or import yourself. It is not connected to any brokerage account and cannot place orders.
      </p>

      <h2>Not investment advice</h2>
      <p>
        The numbers, charts and reports on this site are only for reviewing your own trading. They are not investment, financial or tax advice. Stocksme is not a licensed investment adviser. Your investment decisions are your own responsibility.
      </p>

      <h2>Accuracy of the numbers</h2>
      <ul>
        <li>Results depend on the data you import (such as broker files), FIFO matching and the exchange rates used, and may differ from your broker&apos;s statements or methods.</li>
        <li>Latest prices and exchange rates come from outside sources and may be delayed or inaccurate.</li>
        <li>Before using the numbers for taxes or other important matters, check them against your broker&apos;s documents or ask a professional.</li>
      </ul>

      <h2>Your account</h2>
      <ul>
        <li>Use your real email address and keep your password safe.</li>
        <li>Enter only your own trading data, or data you have the right to use.</li>
        <li>Do not misuse the service — for example by trying to access other people&apos;s data, attacking the system, or creating accounts in bulk automatically. We may suspend accounts used this way.</li>
      </ul>

      <h2>The service and changes</h2>
      <p>
        The service is provided &quot;as is&quot;. We try to keep it running, but we do not guarantee it will be free of errors or interruptions, and we may change or end it. If we end it, we will give reasonable notice so you can download your data from{" "}
        <Link href="/settings">Settings</Link>. We recommend downloading a backup from time to time.
      </p>

      <h2>Limitation of liability</h2>
      <p>To the extent the law allows, the Stocksme administrator is not liable for investment losses, decisions or data loss resulting from use of this service.</p>

      <h2>Personal data</h2>
      <p>
        See the <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of Thailand.</p>

      <h2>Contact</h2>
      <p>
        <a href={CONTACT_URL} className="underline underline-offset-2" target="_blank" rel="noreferrer">
          GitHub Issues
        </a>
      </p>
    </>
  );
}
