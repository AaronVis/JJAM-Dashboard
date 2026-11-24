import { runProviderRequest } from './aiProviders.js';

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 64000) throw new Error('Request body is too large.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

export default async function aiHandler(req, res) {
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        res.statusCode = 403;
        res.end(JSON.stringify({ error: 'Cross-origin AI requests are not allowed.' }));
        return;
      }
    } catch {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Invalid request origin.' }));
      return;
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Only POST requests are supported.' }));
    return;
  }

  try {
    const body = await readJsonBody(req);
    if (!['test', 'generate'].includes(body.action)) throw new Error('Unsupported AI action.');
    if (!['gemini', 'nvidia'].includes(body.provider)) throw new Error('Select Google Gemini or NVIDIA as the provider.');
    if (typeof body.systemInstruction !== 'string' || typeof body.promptText !== 'string') {
      if (body.action !== 'test') throw new Error('Missing AI prompt content.');
    }

    const result = await runProviderRequest(body);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(result));
  } catch (error) {
    const status = /request body|unsupported|select google|missing ai prompt/i.test(error.message) ? 400
      : /server is missing/i.test(error.message) ? 503 : 502;
    console.error('AI proxy request failed:', error.message);
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ error: error.message || 'AI provider request failed.' }));
  }
}
