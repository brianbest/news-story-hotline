// Vercel serverless function to run daily via Vercel Cron.
// It checks if the latest show exists and is fresh (< 24h). If missing or stale, it
// triggers generation by calling the server's /admin/generate endpoint with ADMIN_API_KEY.

export default async function handler(req, res) {
  try {
    const base = process.env.PUBLIC_BASE_URL;
    const adminKey = process.env.ADMIN_API_KEY;
    const languages = (process.env.LANGUAGES || 'en,fr')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!base) throw new Error('PUBLIC_BASE_URL is required');
    if (!adminKey) throw new Error('ADMIN_API_KEY is required');

    const results = [];
    let shouldGenerate = false;
    let newestTime = 0;

    for (const lang of languages) {
      const latestUrlEndpoint = new URL(`/shows/latest-url/${lang}`, base).toString();
      let url;
      try {
        const r = await fetch(latestUrlEndpoint);
        if (r.ok) ({ url } = await r.json());
      } catch {}

      if (!url) {
        results.push({ lang, status: 'missing' });
        shouldGenerate = true;
        continue;
      }
      const ts = extractTimestamp(url);
      if (ts) {
        newestTime = Math.max(newestTime, ts.getTime());
      }
      results.push({ lang, status: 'ok', url });
    }

    // If no shows are present or the newest is older than 24h, generate
    const dayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const stale = newestTime > 0 ? now - newestTime > dayMs : true;
    if (stale) shouldGenerate = true;

    let generateResponse = null;
    if (shouldGenerate) {
      const genUrl = new URL('/admin/generate', base).toString();
      const r = await fetch(genUrl, { method: 'POST', headers: { 'x-admin-key': adminKey } });
      const body = await r.text();
      generateResponse = { status: r.status, body: safeJson(body) };
    }

    res.status(200).json({ ok: true, shouldGenerate, results, generateResponse });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

function extractTimestamp(url) {
  // Expect filenames like: show-YYYYMMDDHHMMSS-en.mp3
  const m = url.match(/show-(\d{14})/);
  if (!m) return null;
  const s = m[1];
  const year = Number(s.slice(0, 4));
  const mon = Number(s.slice(4, 6)) - 1;
  const day = Number(s.slice(6, 8));
  const hour = Number(s.slice(8, 10));
  const min = Number(s.slice(10, 12));
  const sec = Number(s.slice(12, 14));
  return new Date(Date.UTC(year, mon, day, hour, min, sec));
}

function safeJson(text) {
  try { return JSON.parse(text); } catch { return text; }
}

