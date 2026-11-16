import Link from "next/link";
import { CONTACT_URL } from "@/components/LegalPage";

/** English version */
export function PrivacyEn() {
  return (
    <>
      <p>
        Stocksme is a tool for recording trades and calculating trading results. This page explains what data we keep, where it is stored, what it is used for, and how you stay in control of it.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <b>Account data:</b> your email and password (stored as a one-way hash — administrators cannot read your password).
        </li>
        <li>
          <b>Data you enter or import:</b> trades (symbol, quantity, price, fees, date, exchange rate, order number), cash deposits and withdrawals, journal entries, strategies, emotions, notes and settings.
        </li>
        <li>
          <b>Only in your browser:</b> theme, glass appearance, display currency and language (not sent to us, except the language cookie your browser sends with each page request).
        </li>
        <li>
          <b>Technical data:</b> our hosting and database providers keep standard access logs, such as time, requested page and IP address.
        </li>
      </ul>
      <p>
        We never ask for, and do not want, your brokerage password, account number or a connection to your broker — you upload files you exported yourself. Uploaded files are read in your browser, and only the trades read from them are sent and stored. The original file is not kept.
      </p>

      <h2>How we use data</h2>
      <ul>
        <li>To calculate and show your trading results (profit and loss, statistics, reports).</li>
        <li>To sign you in and send account emails, such as password-reset links.</li>
      </ul>
      <p>We do not sell or rent your data or use it for advertising. This site has no ad trackers or behavioural analytics.</p>

      <h2>Where data is stored and who can access it</h2>
      <ul>
        <li>
          <b>Supabase</b> — database and sign-in. Every table uses Row Level Security, so each account can read and change only its own data.
        </li>
        <li>
          <b>Netlify</b> — hosts the website.
        </li>
        <li>The Stocksme administrator can technically access the database to maintain the service and fix problems, but will not look at your data without a need to.</li>
      </ul>

      <h2>Outside services our server calls</h2>
      <ul>
        <li>
          <b>Stock logos</b> (Parqet and Financial Modeling Prep) and <b>latest prices</b> — the server sends only the ticker, such as &quot;NVDA&quot;, never your identity or account data, and caches the results.
        </li>
        <li>
          <b>Exchange rates</b> (Frankfurter, ECB data) — only a date range is sent.
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>We use only the cookies needed for signing in and remembering your language. There are no advertising or third-party tracking cookies.</p>

      <h2>Your rights</h2>
      <ul>
        <li>
          <b>View and download:</b> <Link href="/settings">Settings</Link> → download all data (JSON), at any time.
        </li>
        <li>
          <b>Correct:</b> edit or delete any entry yourself in the app.
        </li>
        <li>
          <b>Delete your account:</b> <Link href="/settings">Settings</Link> → delete account removes the account and all its data immediately and permanently (the database provider&apos;s backups may keep a copy for a short time until their backup cycle removes it).
        </li>
        <li>
          <b>Object, ask or complain:</b> contact the administrator using the channel below. You have rights under Thailand&apos;s Personal Data Protection Act B.E. 2562 (2019).
        </li>
      </ul>

      <h2>Retention</h2>
      <p>We keep your data for as long as your account exists. When you delete the account, the data is removed as described above.</p>

      <h2>Security</h2>
      <p>All connections use HTTPS and database access is restricted per account. Still, no system is 100% secure, so please use a password you do not use anywhere else.</p>

      <h2>Changes to this policy</h2>
      <p>If we make an important change, we will announce it on the site and update the date above.</p>

      <h2>Contact</h2>
      <p>
        Contact the Stocksme administrator through{" "}
        <a href={CONTACT_URL} className="underline underline-offset-2" target="_blank" rel="noreferrer">
          GitHub Issues
        </a>
      </p>
    </>
  );
}
