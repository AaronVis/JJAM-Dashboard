const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

function parseJson(raw) {
  const text = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
  throw new Error('The AI provider returned an invalid JSON response.');
}

async function fetchText(url, options, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return { response, text: await response.text() };
  } catch (error) {
    if (error.name === 'AbortError') throw new Error(`Provider request timed out after ${Math.ceil(timeoutMs / 1000)} seconds.`);
    const networkCause = error.cause;
    const networkDetail = [
      networkCause?.code,
      networkCause?.syscall,
      networkCause?.address,
      networkCause?.port,
      networkCause?.message,
    ].filter(Boolean).join(' ');
    throw new Error(`Could not reach AI provider: ${networkDetail || error.message}`);
  } finally {
    clearTimeout(timer);
  }
}

function responseError(response, text) {
  let body = {};
  try { body = JSON.parse(text); } catch { /* use status fallback */ }
  return new Error(body.error?.message || body.message || `Provider returned HTTP ${response.status}.`);
}

async function generateGemini(apiKey, systemInstruction, promptText) {
  const { response: listResponse, text: listText } = await fetchText(`${GEMINI_BASE}/models?pageSize=1000`, {
    headers: { 'x-goog-api-key': apiKey },
  });
  if (!listResponse.ok) throw responseError(listResponse, listText);
  const catalog = JSON.parse(listText);
  const models = (catalog.models || [])
    .filter((model) => model.supportedGenerationMethods?.includes('generateContent'))
    .filter((model) => /^models\/gemini-[a-z0-9.-]*flash(?:-lite)?$/i.test(model.name || ''))
    .sort((a, b) => (b.name || '').localeCompare(a.name || '', undefined, { numeric: true }));
  if (!models.length) throw new Error('No available Gemini Flash model was found for this key.');

  let lastError;
  for (const model of models) {
    const modelName = model.name.replace(/^models\//, '');
    const { response, text } = await fetchText(`${GEMINI_BASE}/models/${modelName}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    });
    if (!response.ok) {
      lastError = responseError(response, text);
      if (/not available|not found|no longer available|does not exist|not supported/i.test(lastError.message)) continue;
      throw lastError;
    }
    const data = JSON.parse(text);
    const output = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!output) throw new Error('Gemini returned an empty response.');
    return { result: parseJson(output), model: modelName };
  }
  throw lastError || new Error('No available Gemini Flash model could generate a response.');
}

async function pollNvidia(requestId, apiKey) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    const { response, text } = await fetchText(`${NVIDIA_BASE}/status/${encodeURIComponent(requestId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    }, Math.min(5000, deadline - Date.now()));
    if (response.status === 202) continue;
    if (!response.ok) throw responseError(response, text);
    return JSON.parse(text);
  }
  throw new Error('NVIDIA is still processing after 20 seconds. Try again shortly.');
}

async function generateNvidia(apiKey, systemInstruction, promptText, maxTokens) {
  const { response: listResponse, text: listText } = await fetchText(`${NVIDIA_BASE}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!listResponse.ok) throw responseError(listResponse, listText);
  const catalog = JSON.parse(listText);
  const models = (catalog.data || catalog.models || [])
    .map((entry) => entry.id || entry.name?.replace(/^models\//, ''))
    .filter((id) => typeof id === 'string' && id.length)
    .filter((id) => !/(embed|rerank|tts|image|audio|transcri|guard|safety|classif|moderation|diffusion|vision|deplot)/i.test(id))
    .sort((a, b) => {
      const rank = (id) => {
        const sizeMatch = id.match(/(?:^|[-/])(\d+(?:\.\d+)?|e\d+)b(?:[-/]|$)/i);
        const size = sizeMatch ? Number(sizeMatch[1].replace(/^e/i, '')) : 40;
        const providerPreference = id.startsWith('nvidia/') ? -8 : 0;
        const chatPreference = /(instruct|bolt|reason|chat|it(?:-|$))/i.test(id) ? -4 : 0;
        return providerPreference + chatPreference + size;
      };
      return rank(a) - rank(b) || a.localeCompare(b);
    })
    .slice(0, 2);
  if (!models.length) throw new Error('NVIDIA returned no chat models for this API key.');

  let lastError;
  for (const model of models) {
    let { response, text } = await fetchText(`${NVIDIA_BASE}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: `${systemInstruction} Return only valid JSON. No markdown fences.` },
          { role: 'user', content: promptText },
        ],
        temperature: 0.2,
        max_tokens: maxTokens,
        stream: false,
      }),
    }, 50000);
    if (response.status === 202) {
      let pending = {};
      try { pending = JSON.parse(text); } catch { /* request ID may be returned in a header */ }
      const requestId = pending.requestId || pending.request_id || response.headers.get('nvcf-reqid');
      if (!requestId) throw new Error('NVIDIA accepted the request without a polling ID.');
      const data = await pollNvidia(requestId, apiKey);
      text = JSON.stringify(data);
      response = { ok: true, status: 200 };
    }
    if (!response.ok) {
      lastError = responseError(response, text);
      if ([400, 404, 422].includes(response.status)) continue;
      throw lastError;
    }
    const data = JSON.parse(text);
    const content = data.choices?.[0]?.message?.content;
    if (!content) { lastError = new Error(`NVIDIA model ${model} returned an empty response.`); continue; }
    try { return { result: parseJson(content), model }; } catch (error) { lastError = error; }
  }
  throw lastError || new Error('No available NVIDIA chat model returned a usable response.');
}

export async function runProviderRequest({ provider, action, systemInstruction = '', promptText = '' }) {
  const normalizedProvider = provider === 'nvidia' ? 'nvidia' : 'gemini';
  const key = process.env[normalizedProvider === 'nvidia' ? 'NVIDIA_API_KEY' : 'GEMINI_API_KEY'];
  if (!key) {
    const envName = normalizedProvider === 'nvidia' ? 'NVIDIA_API_KEY' : 'GEMINI_API_KEY';
    throw new Error(`Server is missing ${envName}. Add it to .env.local and restart the dev server.`);
  }
  const prompt = action === 'test' ? 'Return exactly this JSON object: {"connected":true}' : promptText;
  const system = action === 'test' ? 'Reply only with the requested JSON object.' : systemInstruction;
  if (!prompt || prompt.length > 40000) throw new Error('Request prompt is empty or exceeds the allowed size.');
  const output = normalizedProvider === 'nvidia'
    ? await generateNvidia(key, system, prompt, action === 'test' ? 96 : 2048)
    : await generateGemini(key, system, prompt);
  if (action === 'test' && output.result?.connected !== true) throw new Error('Provider returned an unexpected connection-test response.');
  return output;
}
