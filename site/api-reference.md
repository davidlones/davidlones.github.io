# Sol-37 Public API Quickstart

Updated November 26, 2026

Public base URL: `https://sol.system42.one`

Machine-readable contracts:

- [Combined chat and knowledge OpenAPI](https://sol.system42.one/chat-openapi.json)
- [Public ESP messaging OpenAPI](https://sol.system42.one/esp-messaging-openapi.json)
- [Knowledge-only OpenAPI](https://sol.system42.one/knowledge-openapi.json)
- [David-GPT-2 continuation OpenAPI](https://sol.system42.one/downloads/david-gpt2-gemma/david-continuation-openapi.json)
- [Neoriris Clock Tower OpenAPI](https://sol.system42.one/neoriris-clock-tower-openapi.json)
- [Privacy policy](https://sol.system42.one/privacy.html)

## Live retrieval diagnostics

Use GET or HEAD on `/api/diagnostics/echo`. Each execution generates a request ID and UTC timestamp. GET returns the decoded query and parameters. The default representation is JSON. Select `format=text` for plain text. Only `q` and `format` are accepted once each. Use harmless text. Addressing syntax on the echo route is inert. A repeated ID can identify a previously retrieved representation. Search clients may reuse content despite the server’s no-store policy.

- [Echo spaces and punctuation](https://sol.system42.one/api/diagnostics/echo?q=Hello%2C+SOL%21)
- [Echo Unicode and a literal plus](https://sol.system42.one/api/diagnostics/echo?q=caf%C3%A9+%2B+%CE%94%3F&format=text)
- [Echo an addressed message as text](https://sol.system42.one/api/diagnostics/echo?q=%40esp%2Fpocket-display+FROM+ChatGPT%3A+Hello%2C+SOL.)
- [Search Knowledge for the Universal Node](https://sol.system42.one/api/knowledge/query?query=What+is+the+SOL+Universal+Node%3F&top_k=1)
- [Knowledge health](https://sol.system42.one/api/knowledge/health)
- [Chat health](https://sol.system42.one/api/chat/health)
- [Public system health](https://sol.system42.one/api/state/health)
- [Continuation health](https://sol.system42.one/api/david-continuation/health)
- [Latest D20 archive entry](https://sol.system42.one/unified-clock/esp/api/history/rolls?limit=1)
- [Public notification archive](https://sol.system42.one/unified-clock/esp/api/history/notifications?limit=1)
- [Diagnostic OpenAPI](https://sol.system42.one/diagnostics-openapi.json)

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

## Public ESP messaging

The account-free ESP Device portal sends messages to the enrolled pocket display
(`sol-dongle-f2339c`). The LCD shows `@handle` and the message together. A handle
is self-declared and the sender and message are visible in the node's public
history. Public Logbook remains its own guestbook and IRC channel.

- [Public ESP Device portal](https://sol.system42.one/e)
- [Public ESP OpenAPI](https://sol.system42.one/esp-messaging-openapi.json)
- [Live public state](https://sol.system42.one/unified-clock/esp/api/state)
- [Public notification history](https://sol.system42.one/unified-clock/esp/api/history/notifications?node=sol-dongle-f2339c&limit=20)
- [D20 roll history](https://sol.system42.one/unified-clock/esp/api/history/rolls?node=sol-dongle-f2339c&limit=20)

### Direct JSON submission

```bash
curl -sS 'https://sol.system42.one/unified-clock/esp/api/messages' \
  -H 'Content-Type: application/json' \
  --data '{"sender":"WebTest37","message":"Direct API check","severity":"success","duration":10,"ack":false}'
```

`sender` is a 1–12 character ASCII handle starting with a letter or digit.
Dots, underscores and hyphens may follow. `message` is 1–50 printable ASCII
characters containing at least one non-space character. The server collapses
consecutive spaces. `severity` is `info` (default), `success`, `warning` or
`critical`. `duration` is a whole number of seconds from 1 through 30, with
a default of 10. `ack` defaults to false. True requests correlation when a
person dismisses the notification with the hardware button. The firmware
delivery acknowledgment is returned regardless of this option.

The legacy `POST /unified-clock/esp/api/command` notification retains
`{"deviceId":"sol-dongle-f2339c","command":"notification","payload":{...}}`.
Use `payload.sender` or the existing `payload.title` as the handle,
`payload.body` as the message, and keep `severity`, `timeout` and `ack` in
the payload. Public validation and limits apply. Its successful response
retains HTTP 200 and `result.type`, `result.ok` and `result.id`.

### Retrieval-only client and explicit Knowledge dispatch

Use the indexable [public messaging guide](https://sol.system42.one/esp-messaging.html)
or its [service discovery JSON](https://sol.system42.one/esp-messaging-service.json).
A direct GET to `/api/knowledge/query` with
`@esp/pocket-display FROM ChatGPT: Hello, SOL.` returns a human-readable
preparation. A second deliberate GET to the same endpoint with
`@esp/pocket-display CONFIRM TOKEN` sends through the validated redemption
handler. URL-encode each query. Keep the live token inside the direct HTTPS
client. Other Knowledge queries continue to search. The prepared review is
read-only and offers a browser POST form. Public receipts are available in
both HTML and JSON.

1. Open this exact preparation URL using an ordinary GET client. It returns
   `submissionToken` and `expiresIn` with `accepted: false`.
   [Prepare a URI smoke test](https://sol.system42.one/unified-clock/esp/api/messages/prepare?sender=WebTest37&message=URI%20interop%20check&duration=10)
2. When you intend to send, put the returned token in
   `https://sol.system42.one/unified-clock/esp/api/messages/redeem?confirm=send&token=TOKEN_FROM_STEP_1`
   and fetch that exact URL within 120 seconds. A replay within the token
   lifetime returns the same receipt. Keep the redemption URL within the
   requesting client. An unmarked client that fetches a complete, live
   redemption URL can consume it.
3. Fetch `receiptUrl` from the returned JSON or open the linked history above.

For a Knowledge dispatch test, open the following preparation URL and use the
same redemption step. [Prepare an explicitly addressed query](https://sol.system42.one/api/knowledge/dispatch/prepare?sender=WebTest37&query=%40esp%2Fpocket-display%20Knowledge%20dispatch%20check&duration=10)

A JSON client can send to `POST /api/knowledge/dispatch` with
`{"sender":"WebTest37","query":"@esp/pocket-display Knowledge dispatch check"}`.
The gateway requires the exact address plus a space before the message. It
routes the message directly to the notification handler. Search and model
output have no dispatch authority. Informational `/api/knowledge/query` inputs continue to use search and semantic ranking. The two exact addressed forms above are handled before retrieval. Use a browser or a user-initiated web retrieval tool that can make
both GETs. Availability of a particular chat product's fetch tool can vary.

The gateway rejects HEAD, recognized crawler and prefetch requests on
preparation and redemption. Responses are marked no-store and noindex.
Preparations, redemptions, and JSON submissions use the same validated
payload and target. Same normalized sender, message and options within
120 seconds resolve to the original receipt across all submission methods.
New messages are limited to three per client and five across the node per
minute, with a single delivery in flight. Preparation is limited to eight
per client and 60 across the node per minute. HTTP 429 includes Retry-After.

### Receipts and device controls

HTTP 201 means a new message was accepted and the firmware replied. HTTP 200
returns an acknowledged duplicate or legacy acceptance. HTTP 202 means the
submission is accepted and delivery is in progress. HTTP 502 reports firmware
rejection. HTTP 503 with `accepted: true` means that delivery is unconfirmed.
Read the receipt to check `delivery.status` and `delivery.firmwareAck`. The
read-only receipt URL returns HTTP 200 for an existing receipt even if delivery
failed. The firmware ACK ID matches the notification history
`notification_id`. The gateway's `submissionId` matches `submission_id` in
history. A firmware reply and a physical observation are separate evidence.

The public portal uses `GET /unified-clock/esp/api/state` for refresh and the
two history URLs for browsing. Pass the returned `nextBefore` as `before`
with the same node to page backward. Notification history contains submissions
made through the public message handler.

`POST /unified-clock/esp/api/controls` accepts the existing `deviceId`,
`command` and `payload` envelope for public display, LED, animation and D20
commands. Public state exposes their names in `supportedCommands`. Use
`POST /unified-clock/esp/api/controls/frame` with `deviceId` and
`frameBase64` for a 25,600-byte RGB565LE frame at up to 4 FPS. The original
`command` and `frame` URLs remain available. Reboot, power configuration
and external-port operations use the signed-in Unified Clock. The node
daemon authenticates the transport for every command.

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
