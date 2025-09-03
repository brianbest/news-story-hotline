// Vercel webhook: routes based on gathered digit to the latest show URL per language.
// Expects PUBLIC_BASE_URL to point at a server that implements GET /shows/latest-url/:lang

export default async function handler(req, res) {
  try {
    const langs = (process.env.LANGUAGES || 'en,fr')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const body = await readBody(req);
    const digit = (body.Digits || req.query?.Digits || '').toString().trim();
    const lang = ({ '1': langs[0] || 'en', '2': langs[1] || 'fr', '3': langs[2], '4': langs[3] })[digit] || 'en';

    const base = process.env.PUBLIC_BASE_URL;
    if (!base) throw new Error('Missing PUBLIC_BASE_URL');
    const endpoint = new URL(`/shows/latest-url/${lang}`, base).toString();

    let url;
    try {
      const r = await fetch(endpoint);
      if (r.ok) ({ url } = await r.json());
    } catch {}

    const twiml = url
      ? `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Play>${url}</Play>\n</Response>`
      : fallbackXml(lang);

    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(twiml);
  } catch (e) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Say>Sorry, an error occurred. Please try again later.</Say>\n</Response>`;
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(twiml);
  }
}

function fallbackXml(lang) {
  if (lang === 'fr') {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Say language=\"fr-CA\">Aucun épisode n'est disponible pour le moment. Veuillez rappeler plus tard.</Say>\n</Response>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Say>No episode is available right now. Please call back later.</Say>\n</Response>`;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  const type = req.headers['content-type'] || '';
  if (type.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(raw);
    return Object.fromEntries(params.entries());
  }
  try { return JSON.parse(raw); } catch { return {}; }
}

