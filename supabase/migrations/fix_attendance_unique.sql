-- إصلاح قيد فريد يسمح بصف «سهرة الأربعاء» لنفس التقويم مع week_start_date مختلف
-- شغّل الملف في SQL Editor في Supabase بعد مراجعة أسماء القيود لديك (Database → Constraints)

-- احذف فهرس/قيد قديم على (employee_id, date) فقط إن وُجد (الاسم قد يختلف)
DROP INDEX IF EXISTS attendance_employee_id_date_key;
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_employee_id_date_key;

-- القيد الصحيح حسب الـ PRD
CREATE UNIQUE INDEX IF NOT EXISTS attendance_employee_week_date_uidx
  ON attendance (employee_id, week_start_date, date);
