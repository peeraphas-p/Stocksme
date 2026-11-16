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
