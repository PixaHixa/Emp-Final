import { useEffect, useState } from 'react'
import { isSupabaseConfigured } from '@/lib/supabase'
import { checkSupabaseSchema } from '@/lib/checkSupabaseSchema'

export function ConfigBanner() {
  const [schemaMissing, setSchemaMissing] = useState<string[] | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    void checkSupabaseSchema().then(({ ok, missingTables }) => {
      setSchemaMissing(ok ? null : missingTables)
    })
  }, [])

  if (!isSupabaseConfigured()) {
    return (
      <div
        className="border-b border-amber-200 bg-amber-50 px-3 py-3 text-center text-sm text-amber-950 sm:px-6"
        dir="rtl"
      >
        أضف المتغيرات <span className="font-mono-nums">VITE_SUPABASE_URL</span> و{' '}
        <span className="font-mono-nums">VITE_SUPABASE_ANON_KEY</span> في متغيرات البيئة على
        الاستضافة (أو ملف <span className="font-mono-nums">.env</span> محلياً) ثم أعد التشغيل.
      </div>
    )
  }

  if (!schemaMissing?.length) return null

  return (
    <div
      className="border-b border-red-200 bg-red-50 px-3 py-3 text-center text-sm text-red-950 sm:px-6"
      dir="rtl"
    >
      <p className="font-semibold">قاعدة البيانات تحتاج إعداداً قبل النشر</p>
      <p className="mt-1 text-xs leading-relaxed">
        شغّل ملف{' '}
        <span className="font-mono-nums font-semibold">supabase/migrations/00_deploy_all.sql</span>{' '}
        في Supabase → SQL Editor. جداول ناقصة:{' '}
        <span className="font-mono-nums">{schemaMissing.join('، ')}</span>
      </p>
      <p className="mt-1 text-xs text-red-800">
        بدونها الترحيل والساعات اليدوية تُحفظ على المتصفح فقط ولا تظهر على أجهزة أخرى.
      </p>
    </div>
  )
}
