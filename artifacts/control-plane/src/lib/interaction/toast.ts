export type ToastLevel = 'success' | 'error' | 'info' | 'warning'
export interface ToastMessage { id: string; level: ToastLevel; message: string }

let listener: ((toast: ToastMessage) => void) | null = null
export function bindToastListener(fn: (toast: ToastMessage) => void) { listener = fn }
export function emitToast(level: ToastLevel, message: string) { listener?.({ id: `${Date.now()}-${Math.random()}`, level, message }) }
