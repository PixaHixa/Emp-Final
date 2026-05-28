import type { ReactNode } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

type LayoutProps = {
  children: ReactNode
  weekReference: Date
}

export function Layout({ children, weekReference }: LayoutProps) {
  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-app-bg" dir="rtl">
      <Header weekReference={weekReference} />
      {/* عمود معكوس على الشاشات الصغيرة: الشريط الجانبي يظهر فوق المحتوى؛ على lg يبقى صفاً */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col-reverse lg:flex-row" dir="ltr">
        <main
          className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-4 sm:px-5 sm:py-6 md:px-6 md:py-8 lg:px-8 animate-fade-in"
          dir="rtl"
        >
          {children}
        </main>
        <Sidebar weekStart={weekReference} />
      </div>
    </div>
  )
}
