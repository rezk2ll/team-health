# GitHub integration

Every byte of data comes from GitHub's GraphQL API. There is no use of the REST
API. This document covers what is queried, how the client stays inside GitHub's
rate limits, how pagination works, and how the raw nodes become metrics.

The relevant code lives in `src/lib/server/github/`:
`client.ts` (transport, rate limiting, retries), `limits.ts` (concurrency),
`metrics.ts` (queries and aggregation), `stats.ts` (bug matching and stats helpers).

## Why GraphQL only

A single team view needs PR counts, code volume, reviews, comments, issues and
releases across many repos and months. With REST that would be hundreds of round
trips. GraphQL lets the app ask for exactly the fields it needs and, crucially,
pack several searches into one HTTP request using aliases. The client batches
`ALIASES_PER_QUERY` (3) searches per call, so a year of one repo's monthly
metrics collapses into far fewer requests.

## What is queried

The app issues GitHub `search` queries scoped to a single repo and a date range,
then selects only the fields each metric needs. The main searches:

- Merged PRs in a month: `repo:o/r type:pr is:merged merged:START..END`, selecting
  additions, deletions, created and merged timestamps, comment and review counts.
- Created and closed PR counts over the month.
- Opened and closed issues, with labels, to derive bugs and resolution times.
- Open-PR snapshot for the live attention view: number, title, draft state,
  timestamps, review decision, size, author and author type.
- Reviews and comments on PRs updated in the month, to attribute review load.
- The PR flow query (`FLOW_PR_NODE_FIELDS`) pulls each merged PR's reviews with
  submission time, state, author login, author `__typename` and avatar, which
  powers both cycle-time math and bot detection.
- Releases (`first: 100`, paginated), excluding drafts and prereleases.
- Default-branch commit history, to attribute commits to members by linked GitHub
  identity (preferred) or commit email (fallback).

Organization discovery (`discovery.ts`) separately lists non-archived repos and
members across the allowed orgs, paginated and cached for 6 hours.

## Rate limiting

`client.ts` treats GitHub's limits as a first-class concern with several
overlapping defenses.

**Concurrency semaphore.** No more than `GITHUB_MAX_CONCURRENCY` (default 8, hard
cap 32) GraphQL calls run at once. The cap can be changed at runtime by admins
through `setMaxConcurrency`. This is the steady-state throttle that keeps bursts
from spiking the secondary limit.

**Primary rate-limit circuit breaker.** When GitHub reports the hourly quota is
exhausted (HTTP 403 matching `api rate limit exceeded`, or a GraphQL
`RATE_LIMIT` error in a 200 response), the client records the reset time from the
`x-ratelimit-reset` header into a shared `rateLimitedUntil`. Any call, before and
after acquiring a semaphore slot, fails fast with a `RateLimitError` until that
time passes. One trip backs off the whole process instead of letting queued calls
fire into a closed door.

**Secondary (abuse) limit.** A 403 matching `abuse` or `secondary` honors the
`Retry-After` header, falling back to a 20-second cooldown, and feeds the same
shared breaker so the burst self-throttles.

**Transient retries.** HTTP 502/503/504, network errors, and GraphQL
`resource limit` or `timeout` errors with no data are retried with backoff delays
of 0, 1, 3 and 8 seconds (four attempts total).

**Partial-data tolerance.** A 200 response that carries `data` alongside `errors`
is accepted as long as `data` is non-empty, so one inaccessible repo or field does
not sink the whole report. A bad alias in a batched query defaults to an empty
result rather than throwing.

Errors surface as `GitHubError`, or `RateLimitError` (which carries `resetAt`) so
callers can decide whether to serve stale data or report unavailability.

## Pagination

GitHub search caps at 1000 results and connections page in chunks of up to 100.
Two helpers in `metrics.ts` drain them:

- `drainConnection<T>(firstPage, fetchPage, maxPages = 20)` is the generic
  paginator. It starts from an already-fetched first page, follows the relay-style
  `endCursor` while `hasNextPage` is true, and stops at the cursor running out or
  the `maxPages` cap (20 by default), which guards against runaway loops.
- `drainSearchNodes(gql, query, fields, firstPage)` wraps it for the search API,
  building the `search(query, type: ISSUE, first: 100, after)` calls.

These back the cases where a repo has more than 100 merged PRs, opened issues,
commits or releases in a single month.

## How metrics are computed

Most per-PR figures are reported as **medians**, not means, so a single 10,000-line
refactor does not distort a team's typical PR size or time to merge.

- **Throughput and volume** (`prStatsForMonth`): created, merged and closed PR
  counts; total additions and deletions; and the median additions, deletions,
  days-to-merge, comments and reviews per merged PR.
- **Issues and bugs** (`issueStatsForMonth`): opened and closed counts, the number
  of opened issues that are bugs, the median resolution time for bugs, and the
  share of this month's bugs that are already closed.
- **Cycle time** (`fetchPrFlow`): per merged PR, the first review time, the last
  approval at or before merge (so an early approval followed by rework does not
  count), and distinct human reviewers. Reported as median time to first review,
  review-to-merge time, total merge time, and post-approval wait.
- **Review load** (`reviewCountsFromNodes`): reviews and comments per reviewer,
  excluding self-reviews, pending reviews, and submissions outside the window.
- **Releases**: count per month, excluding drafts and prereleases.
- **Commit attribution** (`pickCommitMember`): a commit is credited to a member by
  linked GitHub identity first, then by commit email; emails shared by multiple
  members are dropped to avoid mis-crediting.

### Bug detection

`makeBugMatcher(configured)` in `stats.ts` builds the predicate that decides
whether an issue is a bug. If admins have configured a `bugLabels` list, it matches
those labels case-insensitively. Otherwise it falls back to a heuristic that
matches `bug` or `bugs` as whole words (so `debug` and `bugfix` do not count).

### Bots

Review authors whose GraphQL `__typename` is `Bot` (CodeRabbit, CodeScene, Copilot
and the like) are tallied separately and excluded from human cycle-time and
review-load stats. The Bots page surfaces their review and comment activity; the
attention view uses the same flag to filter automated PRs out of the human
worklist.
