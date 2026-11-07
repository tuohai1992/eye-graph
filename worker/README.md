# Ask backend (Cloudflare Worker)

Lets visitors of the public site use **Ask** without a Claude account. The worker holds the Anthropic API key, builds the prompt from `data/eye-graph.json` on the live site, calls Claude Haiku 5.5 with prompt caching, and returns `{answer, chart, followups}`.

Safeguards: accepts requests only from `ALLOWED_ORIGINS`; 6 questions per minute per visitor IP; questions capped at 600 characters; the model is told to answer only from this dataset. Set a monthly spend limit in the Anthropic Console as the final cap.

## Deploy

1. **Anthropic API key** – in the Claude Console, add credit, create an API key, and set a monthly spend limit.
2. **Cloudflare** – Workers & Pages → Create → Import a repository → `tuohai1992/eye-graph`, root directory `worker`. Deploy.
3. **Secret** – in the worker's Settings → Variables and Secrets, add a **Secret** named `ANTHROPIC_API_KEY` with the key. Redeploy.
4. Enable the `workers.dev` route (Settings → Domains & Routes). Live endpoint: `https://eye-graph-ask.lijieyi1992.workers.dev/ask`, set as `ASK_API` in `index.html`.

## Config (`wrangler.toml`)

| Name | Default | Purpose |
|---|---|---|
| `ALLOWED_ORIGINS` | `https://eye-graph.pages.dev` | Sites allowed to call the worker (comma-separated) |
| `MODEL` | `claude-haiku-5-5` | Claude model |
| `LIMITER` | 6 / 60 s | Per-IP rate limit |
