# Architecture

Twake Team Health turns a selection of GitHub repositories and members into
delivery metrics: PR throughput, review depth, code volume, cycle time, bugs and
release cadence. This document explains how the pieces fit together and, more
importantly, why they are built the way they are.

## The shape of the problem

GitHub is the only source of truth, and querying it is expensive: rate limits are
tight, history is large, and a single team view can touch dozens of repositories
across a year. A naive dashboard would re-query everything on every page load,
exhaust the rate limit in minutes, and feel slow.

Two facts make the problem tractable:

1. **History does not change.** Once a month is over, the merged PRs, reviews and
   commits inside it are final. They never need to be fetched twice.
2. **Only the current month moves.** Activity today only affects the month in
   progress, so that is the only window that needs refreshing.

Almost every design decision below follows from those two facts.

## High-level layers

```
Browser (Svelte 5 runes)
   |  fetch POST /api/{metrics,flow,attention,discovery}
   v
SvelteKit endpoints  ──>  Auth + audit (hooks.server.ts)
   |
   v
Report cache (Redis or in-memory, single-flight)
   |  miss
   v
Report builder (report.ts)
   |          |
   |          +── persisted months ──> Postgres (Drizzle)
   |
   +── stale / current month ──> GitHub GraphQL client
                                    (concurrency cap + rate-limit breaker)
```

Each layer has one job and degrades independently: lose Redis and it falls back
to in-memory, lose Postgres and it fetches live, hit the rate limit and it serves
whatever is already persisted.

## Request lifecycle

A team overview request walks through the stack like this:

1. The browser POSTs a **selection** (repos, members, month windows) to
   `/api/metrics`.
2. `hooks.server.ts` resolves the user (OIDC session or the dev bypass), records
   an audit event, and rejects unauthenticated API calls with `401`.
3. The endpoint calls `getMetrics(selection)`, which is a cache wrapper. The cache
   key is the canonicalized selection plus a schema version.
4. On a cache hit, the assembled report comes straight back as JSON.
5. On a miss, the report builder reads persisted rows from Postgres, decides which
   months are stale, and fetches only those from GitHub. Completed months are
   upserted; the current month is fetched live and not frozen.
6. The assembled result is written back to the cache with a TTL and returned.

The same pattern (cache wrapper over a builder over Postgres plus GitHub) is used
for the flow and attention views.

## Design decisions worth knowing

### Incremental persistence instead of a full sync

There is no background job that mirrors GitHub into the database. Instead, data is
persisted as a side effect of being requested, one (repo, month) at a time.
Completed months are written once and then considered permanent; the in-progress
month carries a short freshness window (`CURRENT_MONTH_TTL_MS`, default 6 hours).
This keeps GitHub traffic proportional to what people actually look at, and it
means a brand new deployment warms up gradually rather than needing a giant
initial import. See [data-and-caching.md](./data-and-caching.md).

### Two-tier cache with cross-replica single-flight

Assembled reports are cached in Redis when `REDIS_URL` is set, otherwise in
process memory. The Redis layer is not just a key-value store: it uses a fenced
lock so that when many users (or many replicas) request the same uncached report
at once, exactly one of them computes it and the rest wait for the result. This is
what stops a cold cache from turning into a stampede of duplicate GitHub fetches.
See [data-and-caching.md](./data-and-caching.md).

### A GraphQL client that respects the platform

All GitHub access goes through one client that batches multiple searches per
query (via aliases), caps in-flight requests with a semaphore, retries transient
failures with backoff, and trips a circuit breaker on primary and secondary rate
limits so the whole process backs off together instead of hammering a closed
door. Partial results are tolerated: one inaccessible repo or field does not fail
the whole report. See [github-integration.md](./github-integration.md).

### Stateless by design

Nothing is written to local disk. All durable state lives in Postgres and Redis,
both optional. The Node server (adapter-node) runs migrations on boot and then
serves; you can run several replicas behind a load balancer and they coordinate
through Redis. Sessions are encrypted JWT cookies, so there is no server-side
session store to share.

### Why there is no streaming

Responses are complete JSON, not streamed or chunked. This is deliberate: the
expensive work (GitHub fetches) is hidden behind the cache and the single-flight
lock, so the common path is a fast cache read where streaming would add
complexity for no benefit. On a cold miss the client shows a loading state from
the reactive resource store, and charts mount lazily as they scroll into view
(an `IntersectionObserver` in `MetricChart.svelte`), which gives progressive
rendering without a streaming protocol. If sub-report progressive delivery is ever
needed, the resource store on the client is the natural place to add it.

## The technology stack

| Concern | Choice |
| --- | --- |
| Framework | SvelteKit 2 with Svelte 5 runes |
| Runtime / deploy | Node via `@sveltejs/adapter-node` (port 3000) |
| Styling | Tailwind CSS 4, bits-ui primitives |
| Charts | layerchart with d3-shape curves |
| Database | Postgres via Drizzle ORM (postgres-js driver) |
| Cache / coordination | Redis via ioredis, in-memory fallback |
| Auth | Auth.js (`@auth/sveltekit`) OIDC |
| GitHub | GraphQL API only, custom client |
| Package manager | pnpm |
| Tests | Vitest |

## Where to read next

- [configuration.md](./configuration.md): every environment variable and admin setting.
- [github-integration.md](./github-integration.md): GraphQL queries, rate limiting, metrics math.
- [data-and-caching.md](./data-and-caching.md): schema, incremental persistence, Redis.
- [frontend.md](./frontend.md): pages, runes, resource stores, charts.
- [guide.md](./guide.md): a practical setup and usage walkthrough.
- [local-oidc.md](./local-oidc.md): running an OIDC provider locally.
