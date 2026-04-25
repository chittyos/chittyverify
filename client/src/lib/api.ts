/// <reference types="vite/client" />

export const API_BASE = import.meta.env.VITE_API_BASE || 'https://evidence.chitty.cc';
export const AUTH_BASE = import.meta.env.VITE_AUTH_BASE || 'https://auth.chitty.cc';
export const CHITTYID_BASE = import.meta.env.VITE_CHITTYID_BASE || 'https://id.chitty.cc';
export const BEACON_BASE = import.meta.env.VITE_BEACON_BASE || 'https://beacon.chitty.cc';

export function apiUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}
