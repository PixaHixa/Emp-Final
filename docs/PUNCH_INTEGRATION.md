# ربط موقع بصمة الحضور والمغادرة

موقع البصمة **منفصل** عن هذا المشروع، لكنه يجب أن يكتب في **نفس** قاعدة Supabase.

## الإعداد

1. نفس القيم:
   - `SUPABASE_URL` = `VITE_SUPABASE_URL` في نظام الإدارة
   - `SUPABASE_ANON_KEY` = `VITE_SUPABASE_ANON_KEY`
2. شغّل `supabase/migrations/00_deploy_all.sql` على المشروع (للحساب التلقائي والترحيل).

## الجدول: `attendance`

| العمود | مطلوب | ملاحظة |
|--------|--------|--------|
| `employee_id` | نعم | UUID من جدول `employees` |
| `date` | نعم | تاريخ اليوم `YYYY-MM-DD` |
| `week_start_date` | نعم | تاريخ **خميس** ذلك الأسبوع |
| `day_of_week` | نعم | عربي: `الخميس` … `الأربعاء` |
| `check_in` | عند الحضور | `HH:MM:SS` — ليس `00:00:00` |
| `check_out` | عند المغادرة | `HH:MM:SS` |
| `is_carried_over` | لا | `false` للدوام العادي |
| `is_carried_over` | سهرة فقط | `true` — يُنشأ تلقائياً من النظام |

لا حاجة لإرسال `hours_worked` أو `daily_wage` يدوياً إذا الـ trigger مفعّل — تُحسب تلقائياً عند اكتمال الحضور والمغادرة.

## حساب `week_start_date`

الأسبوع من **الخميس إلى الأربعاء**.

مثال: يوم الأحد 2026-05-31 → `week_start_date` = `2026-05-28` (الخميس).

## تدفق البصمة

### حضور

```text
INSERT أو UPDATE صف اليوم:
  check_in = وقت الحضور
  check_out = null (أو فارغ)
```

### مغادرة

```text
UPDATE نفس الصف:
  check_out = وقت المغادرة
```

بعد المغادرة يعمل trigger `attendance_finalize_punch_trg` ويملأ:

- `hours_worked`, `overtime_hours`, `daily_wage`
- ترحيل **سهرة الأربعاء** للأسبوع التالي إن وُجد إضافي يوم الأربعاء

## مثال منطقي (JavaScript)

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

function getThursdayWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay() // 0=أحد … 4=خميس
  const daysFromThursday = (day + 3) % 7
  d.setDate(d.getDate() - daysFromThursday)
  return d.toISOString().slice(0, 10)
}

const arabicDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

async function punchCheckIn(employeeId, when = new Date()) {
  const date = when.toISOString().slice(0, 10)
  const week_start_date = getThursdayWeekStart(when)
  const day_of_week = arabicDays[when.getDay()]

  await supabase.from('attendance').upsert(
    {
      employee_id: employeeId,
      date,
      week_start_date,
      day_of_week,
      check_in: formatTime(when), // "09:15:00"
      is_carried_over: false,
    },
    { onConflict: 'employee_id,week_start_date,date' }
  )
}

async function punchCheckOut(employeeId, when = new Date()) {
  const date = when.toISOString().slice(0, 10)
  const week_start_date = getThursdayWeekStart(when)

  await supabase
    .from('attendance')
    .update({ check_out: formatTime(when) })
    .eq('employee_id', employeeId)
    .eq('date', date)
    .eq('week_start_date', week_start_date)
    .eq('is_carried_over', false)
}
```

## التحقق

1. بصمة تجريبية من الهاتف
2. افتح لوحة التحكم → نفس الأسبوع
3. يجب أن يظهر: حضور/مغادرة، راتب اليوم، ومجاميع الأسبوع صحيحة

إن لم يُحسب الراتب فوراً: تأكد من تشغيل `00_deploy_all.sql` أو افتح لوحة التحكم (مزامنة احتياطية).
