export default function SetupPage() {
  return (
    <main className="min-h-dvh grid place-items-center px-4 py-10">
      <div className="card max-w-lg space-y-3 text-sm leading-relaxed">
        <h1 className="text-xl font-bold">ตั้งค่าฐานข้อมูลก่อนใช้งาน</h1>
        <ol className="list-decimal pl-5 space-y-2">
          <li>สมัคร/เข้าสู่ระบบที่ supabase.com แล้วสร้าง Project ใหม่ (ฟรี)</li>
          <li>
            ไปที่ <b>SQL Editor</b> วางเนื้อหาไฟล์ <code>supabase/schema.sql</code> แล้วกด Run
          </li>
          <li>
            ไปที่ <b>Project Settings → API</b> คัดลอก Project URL และ anon public key
          </li>
          <li>
            คัดลอกไฟล์ <code>.env.local.example</code> เป็น <code>.env.local</code> แล้วใส่ค่าทั้งสอง
          </li>
          <li>
            หยุดแล้วรัน <code>npm run dev</code> ใหม่
          </li>
        </ol>
      </div>
    </main>
  );
}
