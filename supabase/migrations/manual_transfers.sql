-- ترحيل يدوي للمبالغ بين الأسابيع
-- شغّل الملف في Supabase SQL Editor

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

ALTER TABLE manual_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow all" ON manual_transfers;
CREATE POLICY "allow all" ON manual_transfers FOR ALL USING (true) WITH CHECK (true);
