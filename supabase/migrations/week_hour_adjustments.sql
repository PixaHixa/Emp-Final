-- إضافة ساعات أساسية أو إضافية يدوياً لكل موظف/أسبوع
-- شغّل الملف في Supabase SQL Editor

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

ALTER TABLE week_hour_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow all" ON week_hour_adjustments;
CREATE POLICY "allow all" ON week_hour_adjustments FOR ALL USING (true) WITH CHECK (true);
