# Implementation plan

## Module DAG

```
contracts
    ↓
 server ──────────────┐
    ↓                 ↓
 runtime ←── config   client
    ↓                 ↓
   cli              studio
    ↓
 parties (example)
```

## Modules (order)

1. **contracts** — types + URL parse + tag policy  
   *Acceptance:* unit tests for route parse and tag validation.
2. **server** — `Server`, `Connection`, in-memory storage interface  
   *Acceptance:* unit tests for broadcast exclusion and tag filtering.
3. **runtime** — HTTP/WS host, room registry, SQLite storage  
   *Acceptance:* e2e two-client broadcast + storage round-trip + lobby 401.
4. **config** — load `sinkd.json`, emit wrangler bindings  
   *Acceptance:* fixture config → expected wrangler.jsonc.
5. **client** — host helpers for partysocket  
   *Acceptance:* builds URL for party/room/`_pk`.
6. **cli** — init/dev/deploy  
   *Acceptance:* `sinkd init` creates project; `sinkd dev` serves healthz.
7. **parties** — Chat example  
   *Acceptance:* chat party responds to HTTP ping and WS chat frames.
8. **studio** — UI  
   *Acceptance:* two browser contexts can chat in one room (manual + Playwright when available).

## Final confidence

```
Confidence: high
Residual risks:
  - celld live-verified tag deferred (platform unavailable on this host)
Known gaps:
  - Playwright e2e optional if browsers not installed
```
