import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChartNoAxesCombined,
  Coins,
  FileSpreadsheet,
  Lock,
  NotebookPen,
  Smartphone,
  Upload,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { BrandMark, Wordmark } from "@/components/Brand";
import { EquityChart } from "@/components/Charts";

export const metadata: Metadata = {
  title: "Stocksme — สมุดบันทึกการเทรดหุ้น US",
  description: "นำเข้าไฟล์จาก Dime หรือ Webull แล้วดูกำไรขาดทุนสุทธิหลังหักค่าธรรมเนียม ทั้งดอลลาร์และบาท",
};

// ข้อมูลตัวอย่างสำหรับภาพตัวอย่างหน้าแรกเท่านั้น (ไม่ใช่ข้อมูลของใคร)
const SAMPLE = [12, 30, 18, 46, 61, 40, 72, 95, 88, 120, 104, 141, 168, 150, 186, 210, 197, 236, 262, 248].map((cum, i, a) => ({
  day: `2026-10-${String(i + 6).padStart(2, "0")}`,
  cum,
  pnl: cum - (a[i - 1] ?? 0),
}));

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: FileSpreadsheet, title: "นำเข้าไฟล์จากโบรก", body: "Dime (ชีตซื้อ + ขายในไฟล์เดียว), Webull และ CSV/Excel ทั่วไป รายการซ้ำข้ามให้เอง" },
  { icon: Coins, title: "กำไรสุทธิจริง", body: "จับคู่ซื้อ-ขายแบบ FIFO หักค่าธรรมเนียมทั้งสองขา รองรับหุ้นเศษส่วนและออปชัน" },
  { icon: ChartNoAxesCombined, title: "ทั้งดอลลาร์และบาท", body: "ใช้อัตราแลกเปลี่ยนจริงของวันซื้อและวันขาย จึงเห็นผลจากค่าเงินด้วย" },
  { icon: CalendarDays, title: "ปฏิทินกำไรรายวัน", body: "เห็นทันทีว่าวันไหนบวก วันไหนลบ พร้อม win rate และ profit factor" },
  { icon: NotebookPen, title: "สมุดบันทึกและรายงาน", body: "จดเหตุผล อารมณ์ บทเรียน แล้วดูว่ากลยุทธ์ไหนทำเงิน อารมณ์ไหนพาเสีย" },
  { icon: Smartphone, title: "ใช้บนมือถือได้", body: "ติดตั้งลงหน้าจอโฮมได้เหมือนแอป มีธีมสว่างและมืด" },
];

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: UserPlus, title: "สมัครด้วยอีเมล", body: "ฟรี ใช้เวลาไม่ถึงนาที" },
  { icon: Upload, title: "นำเข้าไฟล์", body: "เลือกโบรก แล้วอัปโหลดไฟล์ที่ส่งออกมา" },
  { icon: ChartNoAxesCombined, title: "ดูผลการเทรด", body: "ภาพรวม ปฏิทิน และรายงาน พร้อมใช้ทันที" },
];

export default function WelcomePage() {
  return (
    <div className="min-h-dvh px-2.5 pt-3 pb-10 sm:px-5 sm:pt-6 lg:px-7 lg:pt-8">
      <div className="mx-auto w-full max-w-[1180px] space-y-4">
        <header className="glass flex h-14 items-center justify-between gap-3 rounded-[18px] px-3 sm:h-[62px] sm:rounded-[20px] sm:px-5">
          <Link href="/welcome" className="flex items-center gap-2.5">
            <BrandMark size={28} className="-my-1" />
            <Wordmark className="text-[17px]" />
          </Link>
          <nav className="flex items-center gap-1.5 sm:gap-2">
            <Link href="/login" className="rounded-[9px] px-3 py-2 text-[13px] hover:bg-[var(--hover)]">
              เข้าสู่ระบบ
            </Link>
            <Link href="/login?mode=signup" className="btn btn-primary">
              เริ่มใช้ฟรี
            </Link>
          </nav>
        </header>

        <main className="glass space-y-12 rounded-[22px] px-4 py-10 sm:space-y-16 sm:rounded-[27px] sm:px-10 sm:py-14">
          {/* Hero */}
          <section className="grid items-center gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
            <div>
              <p className="mb-3 text-[13px] text-muted">สมุดบันทึกการเทรดหุ้น US</p>
              <h1 className="text-[34px] leading-[1.12] font-medium tracking-[-0.04em] sm:text-[46px]">
                รู้จริงว่าเทรดแล้ว
                <br />
                ได้หรือเสียเท่าไหร่
              </h1>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">
                นำเข้าไฟล์จาก Dime หรือ Webull แล้วดูกำไรขาดทุนสุทธิหลังหักค่าธรรมเนียม ทั้งดอลลาร์และบาท ในไม่กี่วินาที
              </p>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <Link href="/login?mode=signup" className="btn btn-primary px-5 py-2.5 text-sm">
                  เริ่มใช้ฟรี <ArrowRight size={15} aria-hidden="true" />
                </Link>
                <Link href="/login" className="btn px-5 py-2.5 text-sm">
                  มีบัญชีแล้ว
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                <span className="mr-1">นำเข้าได้จาก</span>
                {["Dime!", "Webull", "CSV / Excel"].map((b) => (
                  <span key={b} className="tag bg-bg text-fg">
                    {b}
                  </span>
                ))}
              </div>
            </div>

            {/* ภาพตัวอย่าง (ข้อมูลสมมติ) */}
            <div className="card !p-5" aria-label="ภาพตัวอย่างหน้าภาพรวม (ข้อมูลตัวอย่าง)">
              <div className="panel-title">
                <span>กำไร/ขาดทุนสุทธิ · เดือนนี้</span>
                <span className="tag bg-bg">ข้อมูลตัวอย่าง</span>
              </div>
              <strong className="big-number text-[36px] text-gain">+$248.00</strong>
              <p className="mt-2 mb-4 text-[11px] text-muted">
                <span className="tag mr-1.5 bg-gain-soft text-gain">+3.10%</span>
                ของทุนที่ใช้ · หักค่าธรรมเนียมแล้ว · 32 เทรด
              </p>
              <EquityChart data={SAMPLE} currency="USD" />
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
                {[
                  ["Win rate", "56.3%"],
                  ["Profit factor", "1.42"],
                  ["ค่าธรรมเนียม", "$18.40"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="text-[11px] text-muted">{k}</div>
                    <div className="big-number text-lg">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Features */}
          <section>
            <h2 className="mb-5 text-[22px] font-medium tracking-[-0.03em] sm:text-[26px]">ทุกอย่างที่คนเทรดสั้นต้องรู้ ในที่เดียว</h2>
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div key={title} className="card">
                  <span className="mb-3 grid h-9 w-9 place-items-center rounded-[10px]" style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)" }}>
                    <Icon size={18} strokeWidth={1.7} aria-hidden="true" />
                  </span>
                  <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* How it works */}
          <section>
            <h2 className="mb-5 text-[22px] font-medium tracking-[-0.03em] sm:text-[26px]">เริ่มได้ใน 3 ขั้นตอน</h2>
            <ol className="grid gap-3 sm:grid-cols-3 sm:gap-4">
              {STEPS.map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="card flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold text-brand-ink">{i + 1}</span>
                  <div>
                    <h3 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
                      <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
                      {title}
                    </h3>
                    <p className="mt-1 text-[13px] text-muted">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Privacy */}
          <section className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6 sm:!p-7">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full" style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)" }}>
              <Lock size={24} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <div className="flex-1">
              <h2 className="text-base font-semibold tracking-tight">ข้อมูลการเทรดเป็นของคุณ</h2>
              <ul className="mt-2 space-y-1 text-[13px] text-muted">
                <li>แต่ละบัญชีเห็นได้เฉพาะข้อมูลของตัวเอง ล็อกไว้ที่ระดับฐานข้อมูล</li>
                <li>ไม่ต้องให้รหัสผ่านหรือเชื่อมบัญชีโบรก แค่อัปโหลดไฟล์ที่ส่งออกมาเอง</li>
                <li>ดาวน์โหลดรายการทั้งหมดเป็น CSV ได้ทุกเมื่อ</li>
              </ul>
            </div>
            <Link href="/login?mode=signup" className="btn btn-primary self-start sm:self-center">
              เริ่มใช้ฟรี <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </section>
        </main>

        <footer className="glass flex flex-col items-center justify-between gap-1.5 rounded-[16px] px-4 py-3 text-center text-[11px] text-muted sm:flex-row sm:text-left">
          <span>Stocksme · เครื่องมือบันทึกและคำนวณผลการเทรด ไม่ใช่คำแนะนำการลงทุน</span>
          <span>ตัวเลขบนหน้านี้เป็นข้อมูลตัวอย่าง</span>
        </footer>
      </div>
    </div>
  );
}
