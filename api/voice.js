// Vercel webhook: initial Twilio Voice handler.
// Responds with TwiML <Gather> to collect a single digit for language.

export default async function handler(req, res) {
  const greetingText = process.env.GREETING_TEXT ||
    'Welcome to the Canadian-run Digg news hotline! For English, press 1. Pour le français, appuyez sur 2.';
  const action = '/api/route'; // relative path to this Vercel project

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="dtmf" timeout="5" numDigits="1" action="${action}" method="POST">
    <Say>${escapeXml(greetingText)}</Say>
  </Gather>
  <Say>No input received. Goodbye.</Say>
</Response>`;

  res.setHeader('Content-Type', 'text/xml');
  res.status(200).send(twiml);
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

