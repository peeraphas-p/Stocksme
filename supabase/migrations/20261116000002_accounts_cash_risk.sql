-- Stocksme migration 2 — ลบบัญชีด้วยตัวเอง, บัญชีเงินเข้า-ออก, แผนความเสี่ยงต่อไม้
-- รันใน Supabase > SQL Editor (รันซ้ำได้ ไม่ลบข้อมูลเดิม)

-- 1) แผนความเสี่ยงต่อไม้ (ใส่ตอนซื้อ)
alter table public.trades add column if not exists stop_price numeric(20, 6) check (stop_price is null or stop_price >= 0);
alter table public.trades add column if not exists target_price numeric(20, 6) check (target_price is null or target_price >= 0);

-- 2) บัญชีเงินเข้า-ออก: ฝาก / ถอน / ปันผล / ภาษีหัก ณ ที่จ่าย / ดอกเบี้ย / ค่าธรรมเนียมอื่น
create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('DEPOSIT', 'WITHDRAW', 'DIVIDEND', 'TAX', 'INTEREST', 'FEE')),
  occurred_on date not null default current_date,
  amount_usd numeric(20, 6) not null check (amount_usd >= 0), -- ใส่เป็นบวกเสมอ ทิศทางดูจาก kind
  amount_thb numeric(20, 2) check (amount_thb is null or amount_thb >= 0), -- ยอดเงินบาทจริง (ฝาก/ถอน) ถ้ามี
  symbol text,
  broker text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists cash_user_date_idx on public.cash_movements (user_id, occurred_on);
alter table public.cash_movements enable row level security;
drop policy if exists "own rows" on public.cash_movements;
create policy "own rows" on public.cash_movements for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3) ลบบัญชีตัวเอง: ลบผู้ใช้ใน auth.users แล้วข้อมูลทุกตารางถูกลบตาม (on delete cascade)
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
