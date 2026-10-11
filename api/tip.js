const { cors, limited, readBody } = require('./_lib');
module.exports = async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'POST') { res.statusCode = 405; return res.end('{"error":"method"}'); }
  const lim = limited(req);
  if (lim) { res.statusCode = 429; return res.end(JSON.stringify({ error: lim === 'daily' ? 'daily limit khatam - kal reset hoga' : 'thoda slow - 1 min baad try karo' })); }
  let b = {};
  try { b = JSON.parse(await readBody(req)) || {}; } catch (e) {}
  const cd = Math.min(45, Math.max(1, parseInt(b.cycleDay) || 14));
  const avg = Math.min(45, Math.max(20, parseInt(b.avg) || 28));
  const dl = Math.min(45, Math.max(0, parseInt(b.daysLeft) || 10));
  const phase = String(b.phase || '').slice(0, 20);
  const sym = (Array.isArray(b.symptoms) ? b.symptoms : []).slice(0, 10).map(x => String(x).slice(0, 20)).join(', ') || 'none';
  const cat = String(b.cat || 'general').slice(0, 20);
  const prompt = "You are a warm, caring women's health assistant inside a period tracker app for a young Indian woman. Give ONE short practical health tip (2-3 sentences) in simple Hinglish (Roman Hindi + English mix). Context: cycle day " + cd + " of ~" + avg + ", next period in " + dl + " days, phase: " + phase + ". Recent symptoms logged: " + sym + ". Focus: " + cat + ". Be encouraging, never medical-diagnosis. No markdown.";
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=' + encodeURIComponent(process.env.GEMINI_KEY), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    if (!r.ok) { res.statusCode = r.status === 429 ? 429 : 502; return res.end(JSON.stringify({ error: 'upstream ' + r.status })); }
    const j = await r.json();
    const t = j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts && j.candidates[0].content.parts[0] && j.candidates[0].content.parts[0].text;
    if (!t) { res.statusCode = 502; return res.end('{"error":"empty"}'); }
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ tip: String(t).trim() }));
  } catch (e) { res.statusCode = 502; return res.end('{"error":"upstream fail"}'); }
};
