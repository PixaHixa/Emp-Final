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
  FRIDAY_ATTENDANCE_STORAGE_KEY,
  readFridayAttendanceEnabled,
  writeFridayAttendanceEnabled,
} from '@/lib/fridayAttendanceStorage'

type Value = {
  fridayAttendanceEnabled: boolean
  setFridayAttendanceEnabled: (v: boolean) => void
}

const Ctx = createContext<Value | null>(null)

export function FridayAttendanceProvider({ children }: { children: ReactNode }) {
  const [fridayAttendanceEnabled, setState] = useState(readFridayAttendanceEnabled)

  const setFridayAttendanceEnabled = useCallback((v: boolean) => {
    setState(v)
    writeFridayAttendanceEnabled(v)
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === FRIDAY_ATTENDANCE_STORAGE_KEY) setState(e.newValue === '1')
    }
    globalThis.addEventListener('storage', onStorage)
    return () => globalThis.removeEventListener('storage', onStorage)
  }, [])

  const value = useMemo(
    () => ({ fridayAttendanceEnabled, setFridayAttendanceEnabled }),
    [fridayAttendanceEnabled, setFridayAttendanceEnabled]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook مع المزود
export function useFridayAttendance() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useFridayAttendance must be used within FridayAttendanceProvider')
  return v
}
