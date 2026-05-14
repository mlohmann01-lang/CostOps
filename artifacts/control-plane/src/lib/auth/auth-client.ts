export async function getCurrentSession(){ const r=await fetch('/api/auth/me'); return r.json(); }
export function loginRedirect(){ window.location.href='/api/auth/login'; }
export async function logout(){ await fetch('/api/auth/logout',{method:'POST'}); }
