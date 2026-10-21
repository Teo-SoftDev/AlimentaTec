// src/utils/lockout.js — A07: bloqueo temporal tras 5 intentos fallidos
// consecutivos. Escalada: 5 → 10 → 20 → 30 min. Firebase además aplica su
// propio throttling (auth/too-many-requests) del lado del servidor.

const KEY = "at_login_guard";
export const MAX_ATTEMPTS = 5;
const BASE_LOCK_MS = 5 * 60_000;
const MAX_LOCK_MS = 30 * 60_000;

function read() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && typeof s === "object") return { count: s.count | 0, lockedUntil: +s.lockedUntil || 0, level: s.level | 0 };
  } catch {
    /* ignorar */
  }
  return { count: 0, lockedUntil: 0, level: 0 };
}
const write = (s) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignorar */
  }
};

export const getLockRemainingMs = (now = Date.now()) => Math.max(0, read().lockedUntil - now);
export const attemptsLeft = () => MAX_ATTEMPTS - read().count;

export function registerFailure(now = Date.now()) {
  const s = read();
  if (s.lockedUntil > now) return s;
  s.count += 1;
  if (s.count >= MAX_ATTEMPTS) {
    s.level = Math.min(s.level + 1, 6);
    s.lockedUntil = now + Math.min(BASE_LOCK_MS * 2 ** (s.level - 1), MAX_LOCK_MS);
    s.count = 0;
  }
  write(s);
  return s;
}

export function registerSuccess() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignorar */
  }
}
