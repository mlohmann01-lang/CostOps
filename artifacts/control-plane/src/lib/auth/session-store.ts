const KEY='govops_session';
export function saveSession(s: unknown){ localStorage.setItem(KEY, JSON.stringify(s)); }
export function loadSession(){ const v=localStorage.getItem(KEY); return v?JSON.parse(v):null; }
export function clearSession(){ localStorage.removeItem(KEY); }
