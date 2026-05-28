-- Emp-Final consolidated schema
-- This merges old schema + all supabase migrations

create extension if not exists pgcrypto;

create table if not exists employees (
  id                  uuid default gen_random_uuid() primary key,
  employee_id         varchar(3) unique not null,
  name                varchar not null,
  hourly_rate         decimal(10,6) not null,
  transport_allowance decimal(10,6) default 0,
  daily_rate          decimal(10,6),
  weekly_rate         decimal(10,6),
  created_at          timestamp default now()
);

create table if not exists attendance (
  id                  uuid default gen_random_uuid() primary key,
  employee_id         uuid references employees(id) on delete cascade,
  date                date not null,
  day_of_week         varchar not null,
  check_in            time,
  check_out           time,
  hours_worked        decimal(10,6),
  overtime_hours      decimal(10,6) default 0,
  daily_wage          decimal(10,6),
  is_carried_over     boolean default false,
  carried_over_amount decimal(10,6) default 0,
  week_start_date     date not null,
  created_at          timestamp default now(),
  unique (employee_id, week_start_date, date)
);

drop index if exists attendance_employee_id_date_key;
alter table attendance drop constraint if exists attendance_employee_id_date_key;
create unique index if not exists attendance_employee_week_date_uidx
  on attendance (employee_id, week_start_date, date);

create table if not exists week_hour_adjustments (
  id              uuid default gen_random_uuid() primary key,
  employee_id     uuid not null references employees(id) on delete cascade,
  week_start_date date not null,
  kind            varchar(16) not null check (kind in ('standard', 'overtime')),
  hours           decimal(10,6) not null check (hours > 0),
  note            text,
  created_at      timestamp default now()
);

create index if not exists week_hour_adjustments_emp_week_idx
  on week_hour_adjustments (employee_id, week_start_date);

create table if not exists manual_transfers (
  id                uuid default gen_random_uuid() primary key,
  employee_id       uuid not null references employees(id) on delete cascade,
  source_week_start date not null,
  target_week_start date not null,
  amount            decimal(10,6) not null check (amount > 0),
  note              text,
  created_at        timestamp default now()
);

create index if not exists manual_transfers_employee_target_idx
  on manual_transfers (employee_id, target_week_start);
create index if not exists manual_transfers_employee_source_idx
  on manual_transfers (employee_id, source_week_start);

alter table employees enable row level security;
alter table attendance enable row level security;
alter table week_hour_adjustments enable row level security;
alter table manual_transfers enable row level security;

drop policy if exists "allow all" on employees;
create policy "allow all" on employees for all using (true) with check (true);

drop policy if exists "allow all" on attendance;
create policy "allow all" on attendance for all using (true) with check (true);

drop policy if exists "allow all" on week_hour_adjustments;
create policy "allow all" on week_hour_adjustments for all using (true) with check (true);

drop policy if exists "allow all" on manual_transfers;
create policy "allow all" on manual_transfers for all using (true) with check (true);

create or replace function public.attendance_is_meaningful_punch(t time)
returns boolean
language sql
immutable
as $$
  select t is not null
    and not (extract(hour from t)::int = 0 and extract(minute from t)::int = 0);
$$;

create or replace function public.attendance_hours_between(t_in time, t_out time)
returns numeric
language plpgsql
immutable
as $$
declare
  in_min numeric;
  out_min numeric;
  diff_min numeric;
begin
  if t_in is null or t_out is null then
    return 0;
  end if;
  in_min := extract(hour from t_in) * 60 + extract(minute from t_in);
  out_min := extract(hour from t_out) * 60 + extract(minute from t_out);
  if out_min >= in_min then
    diff_min := out_min - in_min;
  else
    diff_min := 24 * 60 - in_min + out_min;
  end if;
  return round((diff_min / 60.0)::numeric, 6);
end;
$$;

create or replace function public.attendance_sync_wednesday_carry(
  p_employee_id uuid,
  p_wednesday_date date,
  p_week_start date,
  p_carried numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  next_ws date;
  carry_amt numeric;
begin
  next_ws := p_week_start + 7;
  carry_amt := round(greatest(p_carried, 0)::numeric, 6);

  delete from attendance
  where employee_id = p_employee_id
    and week_start_date = next_ws
    and is_carried_over = true
    and date = p_wednesday_date;

  if carry_amt > 0.00001 then
    insert into attendance (
      employee_id,
      date,
      day_of_week,
      check_in,
      check_out,
      hours_worked,
      overtime_hours,
      daily_wage,
      is_carried_over,
      carried_over_amount,
      week_start_date
    ) values (
      p_employee_id,
      p_wednesday_date,
      'سهرة الأربعاء',
      '00:00:00',
      '00:00:00',
      0,
      0,
      carry_amt,
      true,
      carry_amt,
      next_ws
    )
    on conflict (employee_id, week_start_date, date)
    do update set
      day_of_week = excluded.day_of_week,
      daily_wage = excluded.daily_wage,
      carried_over_amount = excluded.carried_over_amount,
      is_carried_over = true,
      hours_worked = 0,
      overtime_hours = 0,
      check_in = '00:00:00',
      check_out = '00:00:00';
  end if;
end;
$$;

create or replace function public.attendance_finalize_punch_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rate numeric;
  transport numeric;
  hrs numeric;
  ot_hrs numeric;
  base_wage numeric;
  total_wage numeric;
  daily numeric;
  carried numeric;
  base_daily numeric;
  should_run boolean;
begin
  if new.is_carried_over or new.day_of_week = 'سهرة الأربعاء' then
    return new;
  end if;

  if not public.attendance_is_meaningful_punch(new.check_in)
     or not public.attendance_is_meaningful_punch(new.check_out) then
    return new;
  end if;

  should_run := false;
  if tg_op = 'INSERT' then
    should_run := true;
  elsif tg_op = 'UPDATE' then
    should_run := new.check_out is distinct from old.check_out
      or new.check_in is distinct from old.check_in
      or new.hours_worked is null
      or new.daily_wage is null;
  end if;
  if not should_run then
    return new;
  end if;

  select e.hourly_rate, coalesce(e.transport_allowance, 0)
  into rate, transport
  from employees e
  where e.id = new.employee_id;
  if rate is null then
    return new;
  end if;

  hrs := public.attendance_hours_between(new.check_in, new.check_out);

  if new.day_of_week = 'الجمعة' then
    base_wage := hrs * rate * 1.5;
    ot_hrs := 0;
  elsif hrs <= 9 then
    base_wage := hrs * rate;
    ot_hrs := 0;
  else
    ot_hrs := hrs - 9;
    base_wage := 9 * rate + ot_hrs * rate * 1.25;
  end if;

  total_wage := base_wage + transport;
  carried := 0;
  if new.day_of_week = 'الأربعاء' then
    base_daily := 9 * rate + transport;
    if total_wage > base_daily then
      daily := base_daily;
      carried := total_wage - base_daily;
    else
      daily := total_wage;
    end if;
  else
    daily := total_wage;
  end if;

  new.hours_worked := round(hrs::numeric, 6);
  new.overtime_hours := round(ot_hrs::numeric, 6);
  new.daily_wage := round(daily::numeric, 6);
  new.carried_over_amount := 0;
  new.is_carried_over := false;

  if new.day_of_week = 'الأربعاء' then
    perform public.attendance_sync_wednesday_carry(
      new.employee_id,
      new.date,
      new.week_start_date,
      carried
    );
  end if;
  return new;
end;
$$;

drop trigger if exists attendance_finalize_punch_trg on attendance;
create trigger attendance_finalize_punch_trg
  before insert or update on attendance
  for each row
  execute function public.attendance_finalize_punch_row();

-- seed employees (same names used in current system)
insert into employees (employee_id, name, hourly_rate, transport_allowance, daily_rate, weekly_rate)
values
  ('101', 'ابراهيم', 4.166667, 0, null, null),
  ('102', 'خالدون', 4.166667, 0, null, null),
  ('103', 'اسامه', 4.166667, 0, null, null),
  ('104', 'اسود', 4.166667, 0, null, null),
  ('105', 'ماجد', 4.166667, 0, null, null),
  ('106', 'عبدالزين', 4.166667, 0, null, null),
  ('107', 'شاكر', 4.166667, 0, null, null),
  ('108', 'عبدالمجيد', 4.166667, 0, null, null),
  ('109', 'فؤاد', 4.166667, 0, null, null),
  ('110', 'Samer Joudeh', 4.166667, 0, null, null),
  ('111', 'ابو انس', 4.166667, 0, null, null)
on conflict (employee_id) do nothing;
