import { supabase } from '@/lib/supabase'

export type SchemaCheckResult = {
  ok: boolean
  missingTables: string[]
}

const REQUIRED_TABLES = ['employees', 'attendance', 'manual_transfers', 'week_hour_adjustments'] as const

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const msg = (error.message ?? '').toLowerCase()
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('schema cache')
  )
}

/** يتحقق أن جداول النشر موجودة على Supabase */
export async function checkSupabaseSchema(): Promise<SchemaCheckResult> {
  const missingTables: string[] = []

  for (const table of REQUIRED_TABLES) {
    const { error } = await supabase.from(table).select('id').limit(1)
    if (error && isMissingTableError(error)) {
      missingTables.push(table)
    }
  }

  return { ok: missingTables.length === 0, missingTables }
}
