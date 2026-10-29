// Shared helpers. Files starting with "_" are not exposed as API routes by Vercel.
import crypto from 'node:crypto';

export const FREE_LIMIT = 10;
const DAY = 24 * 60 * 60;

// ---------- signed cookies (so users can't just edit their own counter) ----------
function sign(value) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function pack(value) {
  return `${value}.${sign(value)}`;
}

function unpack(packed) {
  if (!packed) return null;
  const i = packed.lastIndexOf('.');
  if (i < 0) return null;
  const value = packed.slice(0, i);
  const a = Buffer.from(packed.slice(i + 1));
  const b = Buffer.from(sign(value));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return value;
}

function readCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

function writeCookie(res, name, value, maxAgeSeconds) {
  const cookie = `${name}=${value}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=Lax`;
  const prev = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', prev ? [].concat(prev, cookie) : cookie);
}

// ---------- free question counter ----------
export function getFreeUsed(req) {
  const v = unpack(readCookies(req).sai_free);
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function setFreeUsed(res, n) {
  writeCookie(res, 'sai_free', pack(String(n)), 365 * DAY);
}

// ---------- Stripe (plain REST, no npm package needed) ----------
export async function stripe(path, { method = 'GET', form } = {}) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {})
    },
    body: form ? new URLSearchParams(form).toString() : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Stripe error');
  return data;
}

const ACTIVE = new Set(['active', 'trialing']);

// ---------- premium cookie ----------
// Cookie value is "<subscriptionId>:<checkedAtUnixSeconds>", signed.
// Every 24h we re-check with Stripe so cancelled subscriptions lose access.
export function grantPremium(res, subscriptionId) {
  const now = Math.floor(Date.now() / 1000);
  writeCookie(res, 'sai_pro', pack(`${subscriptionId}:${now}`), 40 * DAY);
}

export async function isPremium(req, res) {
  let v;
  try { v = unpack(readCookies(req).sai_pro); } catch { return false; }
  if (!v) return false;
  const [subId, checkedAt] = v.split(':');
  const age = Math.floor(Date.now() / 1000) - parseInt(checkedAt, 10);
  if (!subId || !Number.isFinite(age)) return false;
  if (age < DAY) return true;

  try {
    const sub = await stripe(`subscriptions/${encodeURIComponent(subId)}`);
    if (ACTIVE.has(sub.status)) {
      grantPremium(res, subId);
      return true;
    }
    writeCookie(res, 'sai_pro', '', 0);
    return false;
  } catch {
    // Stripe unreachable: be kind for up to a week rather than locking out a paying user.
    return age < 7 * DAY;
  }
}

export function siteUrl(req) {
  return (process.env.SITE_URL || `https://${req.headers.host}`).replace(/\/$/, '');
}

export { ACTIVE };
