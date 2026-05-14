import { loadSession } from './session-store';
export function requireSession(){ const s=loadSession(); if(!s) throw new Error('SESSION_REQUIRED'); return s; }
