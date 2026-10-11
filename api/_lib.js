// Shared helpers: CORS lock + best-effort abuse limits (per serverless instance).
const ALLOWED = new Set(['https://akash991833.github.io', 'null']); // site + APK WebView (file:// origin)
const ipHits = new Map();
let day = new Date().toDateString(), dayCount = 0;
const DAILY_CAP = 400;   // total proxy calls per instance-day (TTS chunks + tips)
const PER_MIN = 8;       // per-IP requests per minute
function cors(req, res) {
  const o = req.headers.origin;
  if (o && ALLOWED.has(o)) res.setHeader('Access-Control-Allow-Origin', o);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function limited(req) {
  const d = new Date().toDateString();
  if (d !== day) { day = d; dayCount = 0; ipHits.clear(); }
  if (dayCount >= DAILY_CAP) return 'daily';
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const arr = (ipHits.get(ip) || []).filter(t => now - t < 60000);
  if (arr.length >= PER_MIN) { ipHits.set(ip, arr); return 'rate'; }
  arr.push(now); ipHits.set(ip, arr); dayCount++;
  return null;
}
function readBody(req) {
  return new Promise((res) => { let s = ''; req.on('data', c => s += c); req.on('end', () => res(s)); });
}
module.exports = { cors, limited, readBody };
