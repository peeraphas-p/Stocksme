-- Stocksme schema ทั้งหมด (= ทุกไฟล์ใน supabase/migrations ต่อกัน)
-- โปรเจกต์ใหม่: วางทั้งไฟล์นี้ใน Supabase > SQL Editor แล้วกด Run (รันซ้ำได้)
-- โปรเจกต์เดิม: รันเฉพาะไฟล์ migration ใหม่ที่ยังไม่เคยรัน

-- Stocksme migration 1 — ตารางหลัก + RLS

create extension if not exists pgcrypto;

-- ตั้งค่าผู้ใช้ (ซิงก์ข้ามอุปกรณ์)
create table if not exists public.profiles (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  default_currency text not null default 'USD' check (default_currency in ('USD', 'THB')),
  strategy_tags text[] not null default array['Breakout', 'Pullback', 'Gap', 'Momentum', 'News']::text[],
  updated_at timestamptz not null default now()
);

-- ประวัติการนำเข้าไฟล์ (ลบ batch = ลบรายการที่นำเข้ามาด้วย)
create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  broker text not null,
  filename text,
  row_count int not null default 0,
  created_at timestamptz not null default now()
);

-- รายการซื้อขาย
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  symbol text not null,
  side text not null check (side in ('BUY', 'SELL')),
  qty numeric(24, 8) not null check (qty > 0),
  price_usd numeric(20, 6) not null check (price_usd >= 0),
  fee_usd numeric(20, 6) not null default 0 check (fee_usd >= 0),
  executed_at timestamptz not null,
  broker text,
  fx_rate numeric(12, 6),             -- THB ต่อ 1 USD ณ วันที่ทำรายการ
  strategy_tag text,
  emotion text,
  note text,
  import_batch_id uuid references public.import_batches on delete cascade,
  external_key text,                  -- กันนำเข้าซ้ำ
  seq bigint,                         -- เลขลำดับสำหรับเรียงรายการที่เวลาเดียวกัน (เช่น เลขที่คำสั่ง Dime)
  seq_cycle bigint,                   -- ถ้ามีค่า: seq วนกลับไป 0 เมื่อถึงค่านี้
  created_at timestamptz not null default now(),
  unique (user_id, external_key)
);
alter table public.trades add column if not exists seq bigint;
alter table public.trades add column if not exists seq_cycle bigint;
create index if not exists trades_user_time_idx on public.trades (user_id, executed_at);

-- สมุดบันทึกการเทรด
create table if not exists public.journal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  entry_date date not null default current_date,
  symbol text,
  strategy_tag text,
  emotion text,
  plan text,          -- แผน / setup / เหตุผลเข้า
  result text,        -- เกิดอะไรขึ้น / เหตุผลออก
  lesson text,        -- บทเรียน
  rating smallint check (rating between 1 and 5),
  created_at timestamptz not null default now()
);
create index if not exists journal_user_date_idx on public.journal (user_id, entry_date desc);

-- Row Level Security: เห็นได้เฉพาะข้อมูลของตัวเอง
alter table public.profiles enable row level security;
alter table public.import_batches enable row level security;
alter table public.trades enable row level security;
alter table public.journal enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'import_batches', 'trades', 'journal'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;

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

-- Stocksme migration 3 — นับจำนวนคำถามที่ถามผู้ช่วย AI ต่อวัน (จำกัดค่าใช้จ่าย API)
-- รันใน Supabase > SQL Editor (รันซ้ำได้ ไม่ลบข้อมูลเดิม)

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  questions integer not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
-- ผู้ใช้อ่านยอดของตัวเองได้ แต่แก้ตรงๆ ไม่ได้ — เพิ่มได้ผ่านฟังก์ชันด้านล่างเท่านั้น
drop policy if exists "read own usage" on public.ai_usage;
create policy "read own usage" on public.ai_usage for select to authenticated using (user_id = auth.uid());

-- ใช้โควตา 1 คำถามของวันนี้ (เวลา UTC); คืนจำนวนที่เหลือ หรือ -1 ถ้าครบโควตาแล้ว (ไม่นับเพิ่ม)
create or replace function public.use_ai_question(daily_limit integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  used integer;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  insert into public.ai_usage (user_id, day, questions)
  values (auth.uid(), (now() at time zone 'utc')::date, 0)
  on conflict (user_id, day) do nothing;
  update public.ai_usage
     set questions = questions + 1
   where user_id = auth.uid() and day = (now() at time zone 'utc')::date and questions < daily_limit
  returning questions into used;
  if used is null then
    return -1;
  end if;
  return daily_limit - used;
end;
$$;
revoke all on function public.use_ai_question(integer) from public, anon;
grant execute on function public.use_ai_question(integer) to authenticated;
