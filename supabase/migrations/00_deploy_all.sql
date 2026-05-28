-- ═══════════════════════════════════════════════════════════════
-- تشغيل هذا الملف مرة واحدة في Supabase → SQL Editor
-- يجهّز قاعدة البيانات للنشر + البصمة + الترحيل + الساعات اليدوية
-- ═══════════════════════════════════════════════════════════════

-- ─── 1) قيد فريد صحيح على الحضور ───
DROP INDEX IF EXISTS attendance_employee_id_date_key;
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_employee_id_date_key;

CREATE UNIQUE INDEX IF NOT EXISTS attendance_employee_week_date_uidx
  ON attendance (employee_id, week_start_date, date);

-- ─── 2) جداول الترحيل والساعات اليدوية ───
CREATE TABLE IF NOT EXISTS manual_transfers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  source_week_start date NOT NULL,
  target_week_start date NOT NULL,
  amount decimal(10,6) NOT NULL CHECK (amount > 0),
  note text,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS manual_transfers_employee_target_idx
  ON manual_transfers (employee_id, target_week_start);

CREATE INDEX IF NOT EXISTS manual_transfers_employee_source_idx
  ON manual_transfers (employee_id, source_week_start);

CREATE TABLE IF NOT EXISTS week_hour_adjustments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  kind varchar(16) NOT NULL CHECK (kind IN ('standard', 'overtime')),
  hours decimal(10,6) NOT NULL CHECK (hours > 0),
  note text,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS week_hour_adjustments_emp_week_idx
  ON week_hour_adjustments (employee_id, week_start_date);

ALTER TABLE manual_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE week_hour_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow all" ON manual_transfers;
CREATE POLICY "allow all" ON manual_transfers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow all" ON week_hour_adjustments;
CREATE POLICY "allow all" ON week_hour_adjustments FOR ALL USING (true) WITH CHECK (true);

-- ─── 3) حساب تلقائي عند اكتمال البصمة (موقع الهاتف) ───
CREATE OR REPLACE FUNCTION public.attendance_is_meaningful_punch(t time)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT t IS NOT NULL
    AND NOT (EXTRACT(HOUR FROM t)::int = 0 AND EXTRACT(MINUTE FROM t)::int = 0);
$$;

CREATE OR REPLACE FUNCTION public.attendance_hours_between(t_in time, t_out time)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  in_min numeric;
  out_min numeric;
  diff_min numeric;
BEGIN
  IF t_in IS NULL OR t_out IS NULL THEN
    RETURN 0;
  END IF;
  in_min := EXTRACT(HOUR FROM t_in) * 60 + EXTRACT(MINUTE FROM t_in);
  out_min := EXTRACT(HOUR FROM t_out) * 60 + EXTRACT(MINUTE FROM t_out);
  IF out_min >= in_min THEN
    diff_min := out_min - in_min;
  ELSE
    diff_min := 24 * 60 - in_min + out_min;
  END IF;
  RETURN round((diff_min / 60.0)::numeric, 6);
END;
$$;

CREATE OR REPLACE FUNCTION public.attendance_sync_wednesday_carry(
  p_employee_id uuid,
  p_wednesday_date date,
  p_week_start date,
  p_carried numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_ws date;
  carry_amt numeric;
BEGIN
  next_ws := p_week_start + 7;
  carry_amt := round(GREATEST(p_carried, 0)::numeric, 6);

  DELETE FROM attendance
  WHERE employee_id = p_employee_id
    AND week_start_date = next_ws
    AND is_carried_over = true
    AND date = p_wednesday_date;

  IF carry_amt > 0.00001 THEN
    INSERT INTO attendance (
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
    ) VALUES (
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
    ON CONFLICT (employee_id, week_start_date, date)
    DO UPDATE SET
      day_of_week = EXCLUDED.day_of_week,
      daily_wage = EXCLUDED.daily_wage,
      carried_over_amount = EXCLUDED.carried_over_amount,
      is_carried_over = true,
      hours_worked = 0,
      overtime_hours = 0,
      check_in = '00:00:00',
      check_out = '00:00:00';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.attendance_finalize_punch_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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
BEGIN
  IF NEW.is_carried_over OR NEW.day_of_week = 'سهرة الأربعاء' THEN
    RETURN NEW;
  END IF;

  IF NOT public.attendance_is_meaningful_punch(NEW.check_in)
     OR NOT public.attendance_is_meaningful_punch(NEW.check_out) THEN
    RETURN NEW;
  END IF;

  should_run := false;
  IF TG_OP = 'INSERT' THEN
    should_run := true;
  ELSIF TG_OP = 'UPDATE' THEN
    should_run := NEW.check_out IS DISTINCT FROM OLD.check_out
      OR NEW.check_in IS DISTINCT FROM OLD.check_in
      OR NEW.hours_worked IS NULL
      OR NEW.daily_wage IS NULL;
  END IF;

  IF NOT should_run THEN
    RETURN NEW;
  END IF;

  SELECT e.hourly_rate, COALESCE(e.transport_allowance, 0)
  INTO rate, transport
  FROM employees e
  WHERE e.id = NEW.employee_id;

  IF rate IS NULL THEN
    RETURN NEW;
  END IF;

  hrs := public.attendance_hours_between(NEW.check_in, NEW.check_out);

  IF NEW.day_of_week = 'الجمعة' THEN
    base_wage := hrs * rate * 1.5;
    ot_hrs := 0;
  ELSIF hrs <= 9 THEN
    base_wage := hrs * rate;
    ot_hrs := 0;
  ELSE
    ot_hrs := hrs - 9;
    base_wage := 9 * rate + ot_hrs * rate * 1.25;
  END IF;

  total_wage := base_wage + transport;
  carried := 0;

  IF NEW.day_of_week = 'الأربعاء' THEN
    base_daily := 9 * rate + transport;
    IF total_wage > base_daily THEN
      daily := base_daily;
      carried := total_wage - base_daily;
    ELSE
      daily := total_wage;
    END IF;
  ELSE
    daily := total_wage;
  END IF;

  NEW.hours_worked := round(hrs::numeric, 6);
  NEW.overtime_hours := round(ot_hrs::numeric, 6);
  NEW.daily_wage := round(daily::numeric, 6);
  NEW.carried_over_amount := 0;
  NEW.is_carried_over := false;

  IF NEW.day_of_week = 'الأربعاء' THEN
    PERFORM public.attendance_sync_wednesday_carry(
      NEW.employee_id,
      NEW.date,
      NEW.week_start_date,
      carried
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS attendance_finalize_punch_trg ON attendance;

CREATE TRIGGER attendance_finalize_punch_trg
  BEFORE INSERT OR UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.attendance_finalize_punch_row();
