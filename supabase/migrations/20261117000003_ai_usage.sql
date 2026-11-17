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
