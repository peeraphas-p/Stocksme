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
- **รายการซื้อขาย:** ไม้ที่ปิดแล้ว (จับคู่ FIFO), หุ้นที่ถืออยู่พร้อมราคาล่าสุดและกำไร/ขาดทุนที่ยังไม่ได้ขาย, รายการทั้งหมด พร้อมโลโก้หุ้น
- **บัญชีเงิน:** ฝาก/ถอน (พร้อมยอดบาทจริง), ปันผล, ภาษีหัก ณ ที่จ่าย, ดอกเบี้ย → เงินฝากสุทธิ, ผลตอบแทนรวม, เงินสดคงเหลือ
- **แผนความเสี่ยง:** ตั้ง stop-loss / เป้าหมายตอนซื้อ แล้วดูผลเป็น R-multiple และวินัยตามแผน
- **รายงาน:** แยกผลตามกลยุทธ์ (playbook), อารมณ์ตอนเทรด, วันในสัปดาห์, ชั่วโมงที่เข้า (เวลานิวยอร์ก), ระยะเวลาถือ, R-multiple และสรุปรายปีเป็นบาทพร้อม CSV ต่อปี
- **บัญชีผู้ใช้:** สมัคร/ล็อกอิน, ลืมรหัสผ่าน, เปลี่ยนรหัสผ่าน, ดาวน์โหลดข้อมูลทั้งหมด (JSON), ลบบัญชีถาวร; มีหน้าแรก นโยบายความเป็นส่วนตัว และเงื่อนไขการใช้งาน
- **สมุดบันทึก:** แผน เหตุผลเข้า-ออก บทเรียน และคะแนนวินัยของแต่ละวัน
- **นำเข้าไฟล์:** Dime (ชีตรายการซื้อ + รายการขายในไฟล์เดียว), Webull, CSV/Excel ทั่วไปที่จับคู่คอลัมน์เองได้; ข้ามรายการซ้ำอัตโนมัติ และย้อนการนำเข้าได้
- **ออปชัน:** อ่านสัญลักษณ์แบบ OCC (เช่น `AMZN250919C00247500`) และปิดให้อัตโนมัติที่ $0 เมื่อหมดอายุโดยไม่มีรายการขาย
- **ใช้บนมือถือได้:** ติดตั้งลงหน้าจอโฮมได้ (PWA), ธีมสว่าง/มืด, ปรับกระจก/พื้นหลังได้

## เทคโนโลยี

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres + Auth + Row Level Security) · Recharts · decimal.js · lucide-react · Vitest · Netlify

## เริ่มใช้งานบนเครื่อง

ต้องมี Node.js 22 ขึ้นไป (ดู `.nvmrc`)

1. สร้างโปรเจกต์ฟรีที่ [supabase.com](https://supabase.com)
2. Supabase → **SQL Editor** → วางไฟล์ [`supabase/schema.sql`](supabase/schema.sql) → **Run** (รันซ้ำได้)
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

## อัปเดตฐานข้อมูล

การเปลี่ยน schema อยู่ใน [`supabase/migrations/`](supabase/migrations) เรียงตามเลขไฟล์ ทุกไฟล์รันซ้ำได้โดยไม่ลบข้อมูล

- โปรเจกต์ที่มีอยู่แล้ว: รันเฉพาะไฟล์ที่ยังไม่เคยรันใน SQL Editor
- โปรเจกต์ใหม่: รัน `supabase/schema.sql` ไฟล์เดียว (= ทุก migration ต่อกัน มีเทสต์ตรวจว่าตรงกัน)

| ไฟล์ | เพิ่มอะไร |
|---|---|
| `20261116000001_init.sql` | ตารางหลัก + Row Level Security |
| `20261116000002_accounts_cash_risk.sql` | บัญชีเงิน, stop/target, ฟังก์ชันลบบัญชีตัวเอง |

## อีเมล (ลืมรหัสผ่าน / ยืนยันอีเมล)

ระบบส่งอีเมลในตัวของ Supabase จำกัดมาก ถ้าเปิดให้คนอื่นใช้ ควรตั้ง SMTP ของตัวเองที่ Supabase → **Authentication → Emails → SMTP Settings** (เช่น Resend) แล้วค่อยเปิด *Confirm email*

## การคำนวณ

- **FIFO แยกตามหุ้น:** ขายแล้วจับคู่กับล็อตที่ซื้อก่อนสุด รองรับหุ้นเศษส่วน (คำนวณทศนิยมด้วย decimal.js) เศษหุ้นที่ต่ำกว่า 0.000001 จากการปัดของโบรกไม่นับ
- **ค่าธรรมเนียม:** ฝั่งซื้อรวมในทุน ฝั่งขายหักจากรายรับ
- **กำไรเป็นบาท** = รายรับ × อัตรา ฿/$ วันขาย − ทุน × อัตรา ฿/$ วันซื้อ จึงรวมผลจากค่าเงินด้วย
- **อัตรา ฿/$:** ใช้อัตราจริงจากไฟล์โบรกถ้ามี (เช่น Dime) ไม่อย่างนั้นดึงอัตรารายวันจาก [Frankfurter](https://frankfurter.dev) (ข้อมูล ECB)
- **ไฟล์ที่มีแต่วันที่ (ไม่มีเวลา):** วางรายการไว้ 10:00 น. เวลานิวยอร์กของวันนั้น และเรียงไม้ในวันเดียวกันด้วยเลขที่คำสั่งของ Dime
- **Win rate:** นับการขาย 1 ครั้งเป็น 1 เทรด
- **R-multiple:** กำไร/ขาดทุนของไม้ ÷ (ราคาซื้อ − stop) × จำนวน ใช้ stop ที่ตั้งตอนซื้อ
- **หุ้นที่ยังถือ:** มูลค่าตามราคาล่าสุด (Yahoo Finance ผ่าน server, แคช 5 นาที) เทียบกับทุน; เป็นบาทใช้อัตราวันนี้เทียบทุนบาทตอนซื้อ
- **เงินสดคงเหลือ (ประมาณ):** ฝากสุทธิ + ปันผล/ดอกเบี้ยสุทธิ − เงินซื้อ + เงินขาย — แม่นเมื่อบันทึกเงินฝากครบ

## ความเป็นส่วนตัว

- ข้อมูลทุกตารางเปิด Row Level Security — แต่ละบัญชีเห็นเฉพาะข้อมูลของตัวเอง
- โลโก้หุ้น ราคาล่าสุด และอัตราแลกเปลี่ยนถูกดึงจากฝั่ง server (`/api/logo`, `/api/prices`, `/api/fx`) แล้วแคชไว้ เบราว์เซอร์ไม่ได้ส่งรายชื่อหุ้นที่ถือไปให้เว็บภายนอกโดยตรง
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
supabase/migrations/ การเปลี่ยน schema ทีละขั้น
supabase/schema.sql ทุก migration รวมกัน (สำหรับโปรเจกต์ใหม่)
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
