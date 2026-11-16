<p align="center">
  <img src="src/app/icon.svg" width="88" alt="">
</p>

<h1 align="center">Stocks<em>me</em></h1>

<p align="center">
  สมุดบันทึกการเทรดหุ้น US ส่วนตัว — กำไรขาดทุนจริงทั้ง USD และบาท<br>
  <a href="https://github.com/peeraphas-p/Stocksme/actions/workflows/ci.yml"><img src="https://github.com/peeraphas-p/Stocksme/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

---

## ทำอะไรได้

- **ภาพรวม:** กำไร/ขาดทุนสุทธิหลังหักค่าธรรมเนียม, กราฟกำไรสะสม, Win rate, Profit factor, กำไรเฉลี่ยต่อขาดทุนเฉลี่ย, ปฏิทินกำไรรายวัน, ผลตามหุ้น
- **รายการซื้อขาย:** ไม้ที่ปิดแล้ว (จับคู่ FIFO), หุ้นที่ถืออยู่, รายการทั้งหมด พร้อมโลโก้หุ้น
- **รายงาน:** แยกผลตามกลยุทธ์ (playbook), อารมณ์ตอนเทรด, วันในสัปดาห์, ชั่วโมงที่เข้า (เวลานิวยอร์ก), ระยะเวลาถือ
- **สมุดบันทึก:** แผน เหตุผลเข้า-ออก บทเรียน และคะแนนวินัยของแต่ละวัน
- **นำเข้าไฟล์:** Dime (ชีตรายการซื้อ + รายการขายในไฟล์เดียว), Webull, CSV/Excel ทั่วไปที่จับคู่คอลัมน์เองได้; ข้ามรายการซ้ำอัตโนมัติ และย้อนการนำเข้าได้
- **ออปชัน:** อ่านสัญลักษณ์แบบ OCC (เช่น `AMZN250919C00247500`) และปิดให้อัตโนมัติที่ $0 เมื่อหมดอายุโดยไม่มีรายการขาย
- **ใช้บนมือถือได้:** ติดตั้งลงหน้าจอโฮมได้ (PWA), ธีมสว่าง/มืด, ปรับกระจก/พื้นหลังได้

## เทคโนโลยี

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres + Auth + Row Level Security) · Recharts · decimal.js · lucide-react · Vitest · Netlify

## เริ่มใช้งานบนเครื่อง

ต้องมี Node.js 22 ขึ้นไป (ดู `.nvmrc`)

1. สร้างโปรเจกต์ฟรีที่ [supabase.com](https://supabase.com)
2. Supabase → **SQL Editor** → วางไฟล์ [`supabase/schema.sql`](supabase/schema.sql) → **Run** (รันซ้ำได้ ใช้ตอนอัปเดต schema ด้วย)
3. Supabase → **Authentication → Sign In / Providers → Email**: เปิด Email provider, ปิด *Confirm email* (ถ้าใช้คนเดียว)
4. Supabase → **Project Settings → API Keys** → คัดลอก Project URL และคีย์ **Publishable** (หรือ anon) — ห้ามใช้คีย์ Secret
5. คัดลอก `.env.local.example` เป็น `.env.local` แล้วใส่ค่าทั้งสอง
6. รัน แล้วเปิด http://localhost:3000 → สมัครสมาชิก

   ```bash
   npm install
   npm run dev
   ```

## ขึ้นออนไลน์ด้วย Netlify

1. Netlify → **Add new project → Import from GitHub** → เลือก repo นี้ (ค่า build อ่านจาก [`netlify.toml`](netlify.toml))
2. **Project configuration → Environment variables** → เพิ่ม `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ค่าเดียวกับ `.env.local`)
3. **Deploys → Trigger deploy → Deploy site** — ค่า `NEXT_PUBLIC_` ถูกฝังตอน build จึงต้อง deploy ใหม่ทุกครั้งที่แก้
4. Supabase → **Authentication → URL Configuration**
   - **Site URL:** `https://<ชื่อเว็บ>.netlify.app`
   - **Redirect URLs:** `https://<ชื่อเว็บ>.netlify.app/**` และ `http://localhost:3000/**`

push ขึ้น `main` = deploy ใหม่อัตโนมัติ, pull request = ได้ deploy preview

## การคำนวณ

- **FIFO แยกตามหุ้น:** ขายแล้วจับคู่กับล็อตที่ซื้อก่อนสุด รองรับหุ้นเศษส่วน (คำนวณทศนิยมด้วย decimal.js) เศษหุ้นที่ต่ำกว่า 0.000001 จากการปัดของโบรกไม่นับ
- **ค่าธรรมเนียม:** ฝั่งซื้อรวมในทุน ฝั่งขายหักจากรายรับ
- **กำไรเป็นบาท** = รายรับ × อัตรา ฿/$ วันขาย − ทุน × อัตรา ฿/$ วันซื้อ จึงรวมผลจากค่าเงินด้วย
- **อัตรา ฿/$:** ใช้อัตราจริงจากไฟล์โบรกถ้ามี (เช่น Dime) ไม่อย่างนั้นดึงอัตรารายวันจาก [Frankfurter](https://frankfurter.dev) (ข้อมูล ECB)
- **ไฟล์ที่มีแต่วันที่ (ไม่มีเวลา):** วางรายการไว้ 10:00 น. เวลานิวยอร์กของวันนั้น และเรียงไม้ในวันเดียวกันด้วยเลขที่คำสั่งของ Dime
- **Win rate:** นับการขาย 1 ครั้งเป็น 1 เทรด

## ความเป็นส่วนตัว

- ข้อมูลทุกตารางเปิด Row Level Security — แต่ละบัญชีเห็นเฉพาะข้อมูลของตัวเอง
- โลโก้หุ้นและอัตราแลกเปลี่ยนถูกดึงจากฝั่ง server (`/api/logo`, `/api/fx`) แล้วแคชไว้ เบราว์เซอร์ไม่ได้ส่งรายชื่อหุ้นที่ถือไปให้เว็บภายนอกโดยตรง
- อย่า commit ไฟล์ statement จริง — วางไว้ใน `samples/` ซึ่งอยู่ใน `.gitignore`

## โครงสร้างโปรเจกต์

```
src/
  app/(app)/        หน้าในแอป: ภาพรวม, รายการ, บันทึก, รายงาน, นำเข้า, ตั้งค่า
  app/api/          fx (อัตราแลกเปลี่ยน), logo (โลโก้หุ้น)
  components/       AppShell (top bar + dock), Charts, PnlCalendar, Ticker, Brand, ui
  lib/pnl.ts        เครื่องคำนวณ FIFO + ออปชันหมดอายุ
  lib/importers/    ตัวอ่านไฟล์โบรก
  lib/stats.ts      สถิติ, กราฟ, การจัดกลุ่ม
supabase/schema.sql ตาราง + RLS
```

## คำสั่ง

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | รันบนเครื่องตัวเอง |
| `npm test` | ทดสอบการคำนวณ P/L, ตัวอ่านไฟล์, ออปชัน, โลโก้ |
| `npm run typecheck` | ตรวจ TypeScript |
| `npm run lint` | ตรวจโค้ดด้วย ESLint |
| `npm run build` | build สำหรับ production |

ทุก push และ pull request จะรันทั้งหมดนี้บน GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) โดยทดสอบทั้งเวลา UTC และเวลาไทย
