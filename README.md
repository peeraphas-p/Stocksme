# 📈 Stocksme

เว็บแอปบันทึกการเทรดหุ้น US (แนว trading journal) — กำไรขาดทุนแบบ FIFO ทั้ง USD และบาท, Dashboard, ปฏิทินกำไรรายวัน, รายงานตามกลยุทธ์/อารมณ์/เวลา, สมุดบันทึก และนำเข้าไฟล์จาก Webull / Dime / Liberator

ใช้ได้ทั้งคอมและมือถือ (ติดตั้งเป็นแอปบนหน้าจอได้: เปิดเว็บใน Safari/Chrome → "เพิ่มลงหน้าจอโฮม")

## เริ่มใช้งาน

1. สร้างโปรเจกต์ฟรีที่ [supabase.com](https://supabase.com)
2. Supabase → **SQL Editor** → วางไฟล์ [`supabase/schema.sql`](supabase/schema.sql) → **Run**
3. Supabase → **Project Settings → API** → คัดลอก Project URL และ anon public key
4. คัดลอก `.env.local.example` เป็น `.env.local` แล้วใส่ค่าทั้งสอง
5. รัน
   ```bash
   npm install
   npm run dev
   ```
   เปิด http://localhost:3000 → สมัครสมาชิก

> ถ้าเปิดยืนยันอีเมลไว้ (ค่าเริ่มต้นของ Supabase) ให้ตั้ง **Authentication → URL Configuration → Site URL** เป็น URL ของเว็บ (เช่น `http://localhost:3000` หรือ URL บน Vercel) เพื่อให้ลิงก์ในอีเมลกลับมาที่แอปได้

## ขึ้นออนไลน์ (ใช้จากมือถือได้ทุกที่)

1. push โค้ดขึ้น GitHub
2. [vercel.com](https://vercel.com) → Import โปรเจกต์ → ใส่ Environment Variables 2 ตัวเดียวกับ `.env.local` → Deploy
3. เอา URL ของ Vercel ไปใส่ใน Supabase Site URL

## การคำนวณ

- **FIFO** แยกตามหุ้น: ขายแล้วจับคู่กับล็อตที่ซื้อก่อนสุด, รองรับหุ้นเศษส่วน (คำนวณด้วย decimal.js)
- ค่าธรรมเนียมซื้อรวมในทุน, ค่าธรรมเนียมขายหักจากรายรับ
- **กำไรเป็นบาท** = รายรับ × อัตรา ฿/$ วันขาย − ทุน × อัตรา ฿/$ วันซื้อ (จึงรวมผลจากค่าเงินด้วย)
- อัตรา ฿/$ ดึงอัตโนมัติจาก Frankfurter (ข้อมูล ECB) ตามวันที่ของรายการ แก้เองได้ในแต่ละรายการ
- Win rate นับ "การขาย 1 ครั้ง" เป็น 1 เทรด

## คำสั่ง

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | รันเครื่องตัวเอง |
| `npm test` | ทดสอบการคำนวณ P/L และตัวอ่านไฟล์ |
| `npm run build` | build สำหรับ production |
