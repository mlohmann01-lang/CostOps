import React from 'react'
import { type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { DemoBanner } from './DemoBanner'
import { TopBar } from './TopBar'
import { CommandBar } from './CommandBar'

interface ShellProps { children: ReactNode }

export function Shell({ children }: ShellProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-page)', overflow: 'hidden' }}>
      <DemoBanner />
      <TopBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>
          <CommandBar />
        </main>
      </div>
    </div>
  )
}
