import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  dashboardMarkKey,
  readDashboardCellMarks,
  writeDashboardCellMarks,
  type DashboardCellMark,
} from '@/lib/dashboardCellMarks'

import { DASHBOARD_CELL_MARKS_STORAGE_KEY } from '@/lib/dashboardCellMarks'

type CellMarksContextValue = {
  marks: Record<string, DashboardCellMark>
  getMark: (weekStart: string, employeeId: string, date: string) => DashboardCellMark | undefined
  setMark: (key: string, mark: DashboardCellMark | null) => void
}

const CellMarksContext = createContext<CellMarksContextValue | null>(null)

export function CellMarksProvider({ children }: { children: ReactNode }) {
  const [marks, setMarks] = useState<Record<string, DashboardCellMark>>(() => readDashboardCellMarks())

  const reload = useCallback(() => {
    setMarks(readDashboardCellMarks())
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === DASHBOARD_CELL_MARKS_STORAGE_KEY) reload()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [reload])

  const setMark = useCallback((key: string, mark: DashboardCellMark | null) => {
    setMarks((prev) => {
      const next = { ...prev }
      if (mark) next[key] = mark
      else delete next[key]
      writeDashboardCellMarks(next)
      return next
    })
  }, [])

  const getMark = useCallback(
    (weekStart: string, employeeId: string, date: string) => {
      return marks[dashboardMarkKey(weekStart, employeeId, date)]
    },
    [marks]
  )

  const value = useMemo(
    () => ({ marks, getMark, setMark }),
    [marks, getMark, setMark]
  )

  return <CellMarksContext.Provider value={value}>{children}</CellMarksContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook مع المزود
export function useCellMarks() {
  const ctx = useContext(CellMarksContext)
  if (!ctx) throw new Error('useCellMarks must be used within CellMarksProvider')
  return ctx
}
