interface ConfirmDialogProps { open: boolean; title: string; body: string; confirmText?: string; onConfirm: () => void; onCancel: () => void }
export function ConfirmDialog({ open, title, body, confirmText = 'Confirm', onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null
  return <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }}>
    <div style={{ background:'var(--surface-0)', border:'0.5px solid var(--border-subtle)', borderRadius:12, padding:16, width:420 }}>
      <h3 style={{ fontSize:14, marginBottom:8 }}>{title}</h3>
      <p style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:12 }}>{body}</p>
      <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
        <button onClick={onCancel}>Cancel</button>
        <button onClick={onConfirm}>{confirmText}</button>
      </div>
    </div>
  </div>
}
