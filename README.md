<p align="center">
  <img src="src/app/icon.svg" width="88" alt="">
</p>

<h1 align="center">Stocks<em>me</em></h1>

<p align="center">
  A personal journal for US stock trading — real profit and loss in both USD and Thai baht.<br>
  <a href="https://github.com/peeraphas-p/Stocksme/actions/workflows/ci.yml"><img src="https://github.com/peeraphas-p/Stocksme/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<p align="center">English · <a href="#ภาษาไทย">ภาษาไทย</a></p>

---

## Features

- **Overview:** net P/L after fees, cumulative P/L chart, win rate, profit factor, average win vs. average loss, daily P/L calendar, results per stock
- **Trades:** closed trades (FIFO matching), open positions with latest price and unrealized P/L, and every buy and sell, with stock logos
- **Cash:** deposits and withdrawals (with the actual baht amount), dividends, withholding tax and interest → net deposits, total return, estimated cash left
- **Risk plan:** set a stop-loss and target when you buy, then see each trade as an R-multiple and how well you kept to the plan
- **Reports:** results by strategy (playbook), emotion, weekday, entry hour (New York time), holding time and R-multiple, plus a yearly summary in baht with a CSV per year
- **Journal:** plan, reasons for entry and exit, lessons and a discipline rating for each day
- **Import:** Dime (buy and sell sheets in one file), Webull, and any CSV/Excel file with column mapping; duplicates are skipped automatically and imports can be undone
- **Options:** reads OCC symbols (e.g. `AMZN250919C00247500`) and closes them at $0 automatically when they expire without a sale
- **Ask AI:** a chat assistant that answers questions about your own account — monthly summaries, best and worst stocks, which strategies or emotions cost money, cash and dividends. Each user brings their own API key for **Claude** (Anthropic), **ChatGPT** (OpenAI) or **Gemini** (Google); the site owner pays nothing. It works from a summary the app builds of your results and never gives buy/sell advice
- **Accounts:** sign up and sign in, password reset and change, download all data (JSON), delete the account permanently; landing page, privacy policy and terms
- **Languages:** English and Thai, switchable from the top bar or Settings (flag beside each language). On a first visit, people in Thailand see Thai and everyone else sees English
- **Mobile:** install to the home screen (PWA), light and dark themes, adjustable glass and backgrounds

## Tech stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Claude API (`@anthropic-ai/sdk`), OpenAI and Gemini REST (bring your own key) · Supabase (Postgres + Auth + Row Level Security) · Recharts · decimal.js · lucide-react · Vitest · Netlify

## Run locally

Requires Node.js 22 or newer (see `.nvmrc`).

1. Create a free project at [supabase.com](https://supabase.com).
2. Supabase → **SQL Editor** → paste [`supabase/schema.sql`](supabase/schema.sql) → **Run** (safe to run again).
3. Supabase → **Authentication → Sign In / Providers → Email**: turn on the Email provider and, for a single user, turn off *Confirm email*.
4. Supabase → **Project Settings → API Keys** → copy the Project URL and the **Publishable** (or anon) key. Never use the Secret key.
5. Copy `.env.local.example` to `.env.local` and fill in both values.
6. Start it and open http://localhost:3000 → sign up.

   ```bash
   npm install
   npm run dev
   ```

## Deploy on Netlify

1. Netlify → **Add new project → Import from GitHub** → choose this repo (build settings come from [`netlify.toml`](netlify.toml)).
2. **Project configuration → Environment variables** → add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same values as `.env.local`). Ask AI needs no server setting — each user enters their own key on the Ask AI page.
3. **Deploys → Trigger deploy → Deploy site**. `NEXT_PUBLIC_` values are baked in at build time, so redeploy after every change.
4. Supabase → **Authentication → URL Configuration**
   - **Site URL:** `https://<your-site>.netlify.app`
   - **Redirect URLs:** `https://<your-site>.netlify.app/**` and `http://localhost:3000/**`

Pushing to `main` deploys automatically; pull requests get a deploy preview.

## Database updates

Schema changes live in [`supabase/migrations/`](supabase/migrations), in file-number order. Every file can be re-run without losing data.

- Existing project: run only the files you have not run yet, in the SQL Editor.
- New project: run `supabase/schema.sql` alone (it is every migration joined together; a test checks they match).

| File | Adds |
|---|---|
| `20261116000001_init.sql` | Core tables + Row Level Security |
| `20261116000002_accounts_cash_risk.sql` | Cash ledger, stop/target, self-service account deletion |

## Email (password reset / confirmation)

Supabase's built-in email sender is heavily rate-limited. If other people will use the site, set up your own SMTP in Supabase → **Authentication → Emails → SMTP Settings** (for example Resend), then turn on *Confirm email*.

## How the numbers are calculated

- **FIFO per stock:** each sale is matched with the earliest lots bought. Fractional shares are supported (decimal math with decimal.js); dust under 0.000001 shares from broker rounding is ignored.
- **Fees:** buy fees are added to cost; sell fees are taken from proceeds.
- **P/L in baht** = proceeds × ฿/$ rate on the sell date − cost × ฿/$ rate on the buy date, so currency moves are included.
- **฿/$ rate:** the real rate from the broker file when it has one (e.g. Dime); otherwise the daily rate from [Frankfurter](https://frankfurter.dev) (ECB data).
- **Date-only files:** trades are placed at 10:00 New York time on that day, and same-day trades are ordered by Dime's order number.
- **Win rate:** each sale counts as one trade.
- **R-multiple:** the trade's P/L ÷ ((buy price − stop) × quantity), using the stop set at purchase.
- **Open positions:** valued at the latest price (Yahoo Finance via the server, cached 5 minutes) against cost; in baht, today's rate against the baht cost at purchase.
- **Estimated cash left:** net deposits + net dividends/interest − money spent on buys + money from sells. It is accurate once all deposits are recorded.

## Privacy

- Every table uses Row Level Security, so each account sees only its own data.
- Stock logos, latest prices and exchange rates are fetched by the server (`/api/logo`, `/api/prices`, `/api/fx`) and cached. The browser never sends your holdings to outside sites directly.
- **Ask AI** is bring-your-own-key. The key is stored only in that browser's `localStorage` (`stocksme-ai`) and is never sent to Stocksme's server or database. When the user asks, the browser sends the question, the chat so far and a text summary of the account (results, stock names, open positions, cash totals, ten latest journal notes) straight to the chosen provider: Claude through the official `@anthropic-ai/sdk` (browser mode), OpenAI and Gemini through their REST APIs. No email or password is sent.
- The first-visit language is chosen from the visitor's country header that Netlify adds to each request; the choice is then stored in a `stocksme-lang` cookie. No location is saved.
- Never commit real statements — put them in `samples/`, which is in `.gitignore`.

## Project layout

```
src/
  app/(app)/        In-app pages: overview, trades, cash, journal, reports, import, ask (AI chat), settings
  app/api/          fx (exchange rates), logo (stock logos), prices (latest prices)
  components/       AppShell (top bar + navigation), LanguagePicker, Charts, PnlCalendar, Ticker, Brand, ui
  i18n/             Languages: config, server/client helpers, messages/en.ts and messages/th.ts
  lib/pnl.ts        FIFO engine + expired options
  lib/importers/    Broker file readers
  lib/stats.ts      Statistics, charts, grouping
  lib/ai-context.ts Account summary sent with Ask AI questions
  lib/ai/           Ask AI: provider clients (Claude, OpenAI, Gemini), prompt, key storage
supabase/migrations/ Step-by-step schema changes
supabase/schema.sql  All migrations combined (for new projects)
```

### Adding or changing text

All interface text lives in `src/i18n/messages/`. `th.ts` defines the structure and `en.ts` must have every key with the same `{placeholders}`; `npm test` checks this. Server components use `getI18n()` and client components use `useI18n()`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Run locally |
| `npm test` | Test P/L maths, file importers, options, logos and translations |
| `npm run typecheck` | Check TypeScript |
| `npm run lint` | Lint with ESLint |
| `npm run build` | Production build |

Every push and pull request runs all of these on GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)), with tests in both UTC and Thailand time.

---

## ภาษาไทย

Stocksme คือสมุดบันทึกการเทรดหุ้น US ส่วนตัว นำเข้าไฟล์จาก Dime หรือ Webull แล้วดูกำไรขาดทุนสุทธิหลังหักค่าธรรมเนียม ทั้งดอลลาร์และบาท พร้อมสมุดบันทึก รายงาน และบัญชีเงิน

- เว็บมีภาษาอังกฤษ (หลัก) และภาษาไทย เปลี่ยนได้ที่ปุ่มธงบน top bar หรือหน้าตั้งค่า — เข้าเว็บครั้งแรกจากในไทยจะเป็นภาษาไทยให้อัตโนมัติ
- วิธีติดตั้งและ deploy อยู่ในหัวข้อ [Run locally](#run-locally) และ [Deploy on Netlify](#deploy-on-netlify) ด้านบน
- ตัวเลขทั้งหมดใช้ทบทวนการเทรดของตัวเอง ไม่ใช่คำแนะนำการลงทุน
