import { Terminal } from 'lucide-react'

export function CommandBar() {
  return (
    <div style={{
      padding: '10px 20px',
      borderTop: '0.5px solid var(--border-subtle)',
      background: 'var(--surface-0)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexShrink: 0,
    }}>
      <Terminal size={15} color="var(--text-tertiary)" />
      <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)' }}>
        Ask Certen, or query via Slack / MCP agent
      </span>
      <kbd style={{
        fontSize: 10, fontFamily: 'IBM Plex Mono, monospace',
        color: 'var(--text-tertiary)',
        background: 'var(--surface-2)',
        border: '0.5px solid var(--border-subtle)',
        borderRadius: 4, padding: '2px 6px',
      }}>⌘K</kbd>
      <kbd style={{
        fontSize: 10, fontFamily: 'IBM Plex Mono, monospace',
        color: 'var(--text-tertiary)',
        background: 'var(--surface-2)',
        border: '0.5px solid var(--border-subtle)',
        borderRadius: 4, padding: '2px 6px',
      }}>?</kbd>
    </div>
  )
}
