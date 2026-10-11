const { cors, limited, readBody } = require('./_lib');
module.exports = async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'POST') { res.statusCode = 405; return res.end('{"error":"method"}'); }
  const lim = limited(req);
  if (lim) { res.statusCode = 429; return res.end(JSON.stringify({ error: lim === 'daily' ? 'daily limit khatam - kal reset hoga' : 'thoda slow - 1 min baad try karo' })); }
  let text = '';
  try { text = String(JSON.parse(await readBody(req)).text || '').slice(0, 1200); } catch (e) {}
  if (!text) { res.statusCode = 400; return res.end('{"error":"no text"}'); }
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_KEY },
      body: JSON.stringify({
        model: 'gemini-3.8-flash-tts',
        input: [{ type: 'user_input', content: [{ type: 'text', text, annotations: [{ type: 'speech_metadata', style: 'warm, friendly and natural, like a caring elder sister speaking Hinglish' }] }] }],
        response_format: { type: 'audio' },
        generation_config: { speech_config: [{ voice: 'Sulafat' }] }
      })
    });
    if (!r.ok) { res.statusCode = r.status === 429 ? 429 : 502; return res.end(JSON.stringify({ error: 'upstream ' + r.status })); }
    const j = await r.json();
    let b64 = null;
    for (const st of (j.steps || [])) { if (st.type !== 'model_output') continue; for (const c of (st.content || [])) { if (c.type === 'audio' && c.data) b64 = c.data; } }
    if (!b64) { res.statusCode = 502; return res.end('{"error":"no audio"}'); }
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ audio: b64 }));
  } catch (e) { res.statusCode = 502; return res.end('{"error":"upstream fail"}'); }
};
