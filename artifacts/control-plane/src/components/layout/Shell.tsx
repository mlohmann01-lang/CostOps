import { type ReactNode } from 'react'
import { Sidebar } from './Sidebar'

interface ShellProps {
  children: ReactNode
}

export function Shell({ children }: ShellProps) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--surface-1)' }}>
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  )
}
