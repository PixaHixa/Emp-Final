import { useCallback, useEffect, useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { EmployeeForm } from '@/components/employees/EmployeeForm'
import { EmployeeTable } from '@/components/employees/EmployeeTable'
import { ConfirmModal } from '@/components/ui/Modal'
import { getWeekStart } from '@/lib/weekUtils'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { parseEmployee, type Employee } from '@/types'
import { useToast } from '@/contexts/ToastContext'

export function EmployeesPage() {
  const toast = useToast()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [deleting, setDeleting] = useState<Employee | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setEmployees([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.from('employees').select('*').order('employee_id')
      if (error) throw error
      setEmployees((data ?? []).map(parseEmployee))
    } catch (e) {
      console.error(e)
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const existingIds = employees.map((e) => e.employee_id)

  async function confirmDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      const { error } = await supabase.from('employees').delete().eq('id', deleting.id)
      if (error) throw error
      if (editing?.id === deleting.id) setEditing(null)
      toast.success('تم حذف الموظف')
      setDeleting(null)
      void load()
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message.slice(0, 200) : 'تعذّر الحذف')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <Layout weekReference={getWeekStart(new Date())}>
      <div className="mx-auto w-full max-w-[min(100rem,100%)]">
        <h2 className="mb-6 text-right text-2xl font-bold tracking-tight text-[var(--color-text-primary)] sm:mb-8">
          الموظفون
        </h2>
        <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <EmployeeTable
            employees={employees}
            loading={loading}
            onEdit={setEditing}
            onDeleteRequest={setDeleting}
          />
          <EmployeeForm
            editing={editing}
            existingIds={existingIds}
            onDone={() => {
              setEditing(null)
              void load()
            }}
          />
        </div>
      </div>

      <ConfirmModal
        open={!!deleting}
        onClose={() => !deleteBusy && setDeleting(null)}
        title="تأكيد حذف الموظف"
        message={
          deleting
            ? `هل تريد حذف الموظف «${deleting.name}» (المعرف ${deleting.employee_id})؟ سيتم حذف كل دوامه المرتبط به نهائياً.`
            : ''
        }
        danger
        confirmLabel="حذف نهائي"
        onConfirm={confirmDelete}
      />
    </Layout>
  )
}
