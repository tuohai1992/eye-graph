// EyeUtility Graph – Ask backend. Keeps the API key server-side.

const DATA_URL = 'https://eye-graph.pages.dev/data/eye-graph.json';
const MODEL = 'claude-haiku-5-5';
const MAX_Q = 600;

let cache = { at: 0, ctx: null };

function cls(i) {
  if (/VFQ|HUG|VisQoL/.test(i)) return 'Vision-specific';
  if (/EQ-5D|HUI|CHU|AQoL|SF-6D|15D/.test(i)) return 'Generic instrument';
  if (/not stated/.test(i)) return 'Method not stated';
  return 'Direct elicitation';
}

async function context() {
  if (cache.ctx && Date.now() - cache.at < 3600e3) return cache.ctx;
  const d = await (await fetch(DATA_URL, { cf: { cacheTtl: 3600 } })).json();
  const S = Object.fromEntries(d.studies.map(s => [s.id, s]));
  const lab = Object.fromEntries(d.conditions.map(c => [c.k, c.label]));
  const st = d.studies.map(s => `PMID ${s.id} | ${s.author} ${s.year} | ${lab[s.ind]} | ${s.country || 'country not stated'} | n=${s.n ?? 'not stated'} | ${s.design} | ${s.population}`).join('\n');
  const vs = d.values.map((v, i) => `V${i} | PMID ${v.sid} | ${lab[S[v.sid].ind]} | ${v.state} | ${v.inst} (${cls(v.inst)}) | ${v.vtype} ${v.value}${v.disp ? ' (' + v.disp + ')' : ''} | respondents: ${v.resp || S[v.sid].respondent}${v.derived ? ' | derived' : ''}${v.note ? ' | ' + v.note : ''}`).join('\n');
  const ctx = `You are a health economics research assistant for ophthalmology. Answer questions using ONLY the extracted health-state utility data below (abstract-level extraction from Europe PMC; ${d.studies.length} studies).
Rules:
- Cite every number with its PMID as a bare 8-digit number in square brackets, e.g. [24648717].
- Never write value ids (V…) in the answer text; they belong only in chart rows.
- Name the instrument and respondent type for each value. Flag when values are not comparable (different instruments, anchors, tariffs, respondents).
- If the data cannot answer, or the question is not about this data, say so plainly in one sentence.
- "answer": under 220 words, short paragraphs or "- " bullets, no headings or tables.
- "chart": when a chart helps, pick 2–20 value ids (V…) from the data; give only ids and short labels. Use "dot" for levels, "bar" for decrements/gains. Otherwise null.
- "followups": two short follow-up questions this data can answer.
Reply with only JSON: {"answer": string, "chart": null | {"type": "dot"|"bar", "title": string, "rows": [{"id": "V12", "label": "short label"}]}, "followups": [string, string]}

STUDIES
${st}

VALUES (id | study | condition | health state | instrument | type value | respondents)
${vs}`;
  cache = { at: Date.now(), ctx };
  return ctx;
}

function cors(env, origin) {
  const allowed = (env.ALLOWED_ORIGINS || 'https://eye-graph.pages.dev').split(',').map(s => s.trim());
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

const json = (body, status, h) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...h } });

function parseJSON(text) {
  try { return JSON.parse(text); } catch (e) {}
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(text.slice(a, b + 1)); } catch (e) {} }
  return { answer: text, chart: null, followups: [] };
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const h = cors(env, origin);
    if (req.method === 'OPTIONS') return new Response(null, { headers: h });
    if (req.method !== 'POST') return json({ error: 'Use POST' }, 405, h);
    if (!h['Access-Control-Allow-Origin'] || origin !== h['Access-Control-Allow-Origin']) return json({ error: 'Origin not allowed' }, 403, h);

    const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
    if (env.LIMITER) {
      const { success } = await env.LIMITER.limit({ key: ip });
      if (!success) return json({ error: 'rate_limited' }, 429, h);
    }

    let body;
    try { body = await req.json(); } catch (e) { return json({ error: 'Bad request' }, 400, h); }
    const q = String(body.question || '').trim();
    if (!q || q.length > MAX_Q) return json({ error: 'Question must be 1–600 characters' }, 400, h);
    const prior = Array.isArray(body.prior) ? body.prior.slice(-2).map(t => ({ q: String(t.q || '').slice(0, MAX_Q), a: String(t.a || '').slice(0, 1500) })) : [];

    const messages = [];
    prior.forEach(t => { messages.push({ role: 'user', content: t.q }); messages.push({ role: 'assistant', content: t.a }); });
    messages.push({ role: 'user', content: q });

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: env.MODEL || MODEL,
        max_tokens: 4000,
        system: [{ type: 'text', text: await context(), cache_control: { type: 'ephemeral' } }],
        messages
      })
    });
    if (!r.ok) return json({ error: 'upstream_error', status: r.status }, 502, h);
    const out = await r.json();
    const text = (out.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    if (!text.trim()) return json({ error: 'empty_answer', stop_reason: out.stop_reason || null }, 502, h);
    return json(parseJSON(text), 200, h);
  }
};
