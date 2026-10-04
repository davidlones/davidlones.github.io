# Sol-37 Public API Quickstart

Updated: July 18, 2026

Public base URL: `https://sol.system42.one`

Machine-readable contracts:

- [Combined chat and knowledge OpenAPI](https://sol.system42.one/chat-openapi.json)
- [Knowledge-only OpenAPI](https://sol.system42.one/knowledge-openapi.json)
- [David-GPT-2 continuation OpenAPI](https://sol.system42.one/downloads/david-gpt2-gemma/david-continuation-openapi.json)
- [Neoriris Clock Tower OpenAPI](https://sol.system42.one/neoriris-clock-tower-openapi.json)
- [Privacy policy](https://sol.system42.one/privacy.html)

## Chat

Check readiness:

```bash
curl 'https://sol.system42.one/api/chat/health'
```

Simple text-only GET:

```bash
curl -G 'https://sol.system42.one/api/chat/query' \
  --data-urlencode 'query=What is Sol-37?' \
  --data-urlencode 'persist=0'
```

Full JSON chat turn:

```bash
curl 'https://sol.system42.one/api/chat' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Explain the Neoriris Clock Tower project using archive evidence.",
    "session": "api-quickstart",
    "persist": false,
    "stream": false,
    "profile": "reasoning",
    "allow_fallback_answer": true,
    "allow_response_cache": true
  }'
```

`GET /api/chat` is not a conversation call. Use `POST /api/chat` with JSON, or use `GET /api/chat/query` for a query-string request. Multimodal POST turns may include up to three image data URLs and should select `vision` or `vision_fast`.

Set `allow_fallback_answer` to `false` for conversational clients that prefer the model's direct answer over an extractive retrieval fallback when strict entity validation is inconclusive. Retrieval context is still prepared and supplied to the model; this flag only disables replacement of the generated answer.

Set `allow_response_cache` to `false` when the answer depends on volatile request context, such as live machine state. This bypasses both cache reads and writes for that turn.

## Knowledge Search

The default mode is hybrid: semantic cosine similarity is reranked with lexical, title/path, heading, exact-term, and source-tag evidence. Set `mode=semantic` to inspect the original embedding order.

```bash
curl -G 'https://sol.system42.one/api/knowledge/query' \
  --data-urlencode 'query=SolBridge recent changes' \
  --data-urlencode 'top_k=5' \
  --data-urlencode 'mode=hybrid'
```

Exact version entry in one source family:

```bash
curl -G 'https://sol.system42.one/api/knowledge/query' \
  --data-urlencode 'query=0.4.0' \
  --data-urlencode 'path=solbridge-changelog' \
  --data-urlencode 'exact=true'
```

Every hit keeps `score` as the raw semantic score and also returns `semantic_score`, `keyword_score`, `lexical_bonus`, `title_path_bonus`, `heading_bonus`, `exact_term_bonus`, `tag_bonus`, and `rank_score`.

Index health and freshness:

```bash
curl 'https://sol.system42.one/api/knowledge/health'
```

`docs` is the backward-compatible chunk count. `indexed_sources` is the source-file count. The nested `index` object reports logical roots, indexed time, exclusions, and new/changed/removed/stale counts.

## David-GPT-2 Text Continuation

David-GPT-2 has a dedicated causal text-continuation API. It is not a
conventional assistant, does not manage chat sessions, and is separate from the
sitewide SOL chat API above.

```bash
curl 'https://sol.system42.one/api/david-continuation/v1/continuations' \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "An engineer from Orbital Control enters the room.",
    "prefix": "OLD SOL (V.O.)",
    "mode": "screenplay",
    "knowledge": {
      "enabled": true,
      "query": "Orbital Control and Old Sol",
      "top_k": 3
    },
    "max_tokens": 200,
    "seed": 37
  }'
```

`continuation` is the newly generated suffix; `text` combines the optional
prefix with that suffix. The response also includes stop reason, token count,
target-role semantics, retrieval metadata, and source citations. Knowledge mode
can search the complete configured index, but only bounded top-ranked passages
are supplied to GPT-2's finite context.

Readiness and interactive schema:

```text
GET /api/david-continuation/health
GET /api/david-continuation/docs
GET /api/david-continuation/openapi.json
```

## Neoriris Clock Tower

Discover routes:

```bash
curl 'https://sol.system42.one/api/neoriris-clock-tower'
```

Read API and Minecraft health:

```bash
curl 'https://sol.system42.one/api/neoriris-clock-tower/health'
```

Read the live seven-segment face and server state:

```bash
curl 'https://sol.system42.one/api/neoriris-clock-tower/status'
```

Discovery, health, and status are public. `POST /api/neoriris-clock-tower/authorize` requires a recognized online player to complete a short-lived code delivered in Minecraft. `POST /api/neoriris-clock-tower/set` then requires the issued bearer or `X-Neoriris-Access-Token` token. The write route validates modes, actions, and seven-bit patterns before sending controls to the server.

## Other Public Surfaces

- `GET|POST /api/logbook/messages`: public IRC-backed logbook feed and rate-limited append route.
- `GET /api/state/health`, `GET /api/state`, `GET|POST /api/state/redblue/vote`: shared runtime state and red/blue vote.
- `/api/radio/*`: SDR status, events, transcripts, decoder hits, audio, and waterfall streams.
- `/api/crime/*`: Parker County incident, report, source, aircraft, search, and ingest surfaces.
- `/api/zip-drive/list` and `/api/zip-drive/file`: read-only ZIP directory and member streaming.
- `/api/dashboard/*`: public telemetry and selected dashboard data; operator actions remain locally gated.
- `/api/mcp/sol`: read-only Sol MCP connector.
- `/push/api/*`, `/push.rss.xml`, and `/feed/public-push-rss`: public push status, subscriptions, activity, and feeds.
- `/unified-clock/*`: public Unified Clock application gateway.

UI routes such as `/chat`, `/dashboard`, `/crime`, and `/gui` are applications rather than API contracts.
