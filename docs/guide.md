# Guide

A practical walkthrough: get it running, point it at your org, and use the views.
For the reasoning behind the design see [architecture.md](./architecture.md); for
every knob see [configuration.md](./configuration.md).

## Run it with Docker

```sh
cp .env.example .env     # set GITHUB_TOKEN and ALLOWED_ORGS at minimum
docker compose up -d
```

The compose stack brings up the app, Postgres and Redis. The app listens on
http://localhost:3000 and applies database migrations on start. For a first look
you can set `AUTH_DISABLED=true` to skip OIDC and run as a dev admin.

## Run it for development

```sh
pnpm install
pnpm dev      # http://localhost:5173
pnpm check    # type-check
pnpm test     # unit tests
```

You still need Postgres and Redis reachable via `DATABASE_URL` and `REDIS_URL`, or
omit both to run live with no persistence (slower, hits GitHub on every request).

## Mint the GitHub token

Every query uses one read-only token, set as `GITHUB_TOKEN`. Either kind works.

**Fine-grained token (preferred).** Open GitHub, Settings, Developer settings,
Personal access tokens, Fine-grained tokens, Generate new token. Set the resource
owner to your organization, choose the repositories it may read (all, or a
selected set), and grant read-only access to these permissions:

- Repository: Metadata (read, mandatory), Contents (read), Pull requests (read),
  Issues (read).
- Organization: Members (read), so member and repo discovery works.

**Classic token.** Settings, Developer settings, Personal access tokens, Tokens
(classic), Generate new token. Select the `repo` scope (or `public_repo` if you
only track public repos) and `read:org`. Classic tokens are broader than
fine-grained ones, so prefer fine-grained when you can.

A few notes: set an expiry you are comfortable rotating, the token only needs read
access (never grant write), and if your org enforces SAML SSO you must authorize
the token for that org after creating it. Keep it in the environment, never in
git.

## Point it at your organization

1. Mint the token as above and set `GITHUB_TOKEN`.
2. Set `ALLOWED_ORGS` to the orgs you want selectable. This is the boundary: only
   repos in these orgs can be added to a team.
3. Define `DEFAULT_TEAMS` with the rosters everyone should see. Keep real rosters
   in the environment, not in code.
4. Optionally set `GLOBAL_REPOS` for the org-wide view and `ORG_NAME` for the
   sidebar brand.

The first time someone opens a team, its completed months are fetched and stored;
later visits are served from Postgres and only the current month is refreshed.
Expect the first load of a large team to take a moment while history fills in.

## Turn on auth for production

Set `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `AUTH_SECRET` and
`ORIGIN`, and leave `AUTH_DISABLED` unset. Register
`{ORIGIN}/auth/callback/oidc` as the redirect URI with your provider. Grant admin
rights by listing emails or subjects in `ADMINS`. See
[oidc.md](./oidc.md) for provider setup and a local test flow.

## Keep it warm

Set `CRON_SECRET` and have a scheduler call the warmer on an interval (every few
hours suits the 6-hour current-month freshness):

```sh
curl -X POST https://your-host/api/cron/warm \
  -H "Authorization: Bearer $CRON_SECRET"
```

It precomputes the preset teams, the global view and the attention worklist so the
first real visitor gets a warm cache. Without the secret the endpoint stays off.

## Using the dashboard

- **Pick a scope.** The bar at the top selects the team and the month range. Your
  choice is saved and written into the URL, so a link reproduces the exact view.
- **Overview (`/`)** is the headline: velocity, top contributors and repos, awards,
  PR cadence.
- **Attention (`/attention`)** is the daily worklist of open PRs that need action:
  changes requested, unreviewed, stale (`ATTENTION_STALE_DAYS`) and aging
  (`ATTENTION_AGING_DAYS`). Bot PRs are filtered out.
- **Flow (`/flow`)** shows how long work takes: time to first review, review to
  merge, and review coverage.
- **Signals (`/signals`)** distills flow, attention and metrics into pass, warn and
  fail health checks. Tune the thresholds in Settings.
- **Charts (`/charts`)** is the deep dive per member and per repo.
- **Global (`/global`) and Breakdown (`/breakdown`)** show org-wide trends and let
  you slice them by team or repo.
- **Teams (`/teams`)** lets each signed-in user build private teams that nobody else
  sees.
- **Bots (`/bots`)** reports automated review activity (CodeRabbit, CodeScene and
  similar).
- **People (`/people/[login]`)** is one contributor's profile.

## Admin settings

Admins get `/settings` and `/logs`. Settings overrides a subset of the environment
config at runtime (global repos, month windows, signal targets, attention
thresholds, GitHub concurrency, org name, and which labels count as bugs). The
trust boundary (allowed orgs, token, auth) stays environment only. The activity log
is the audit trail of requests and actions.

## Operating notes

- Run several replicas behind a load balancer; they coordinate through Redis, and a
  cold cache produces one GitHub fetch rather than one per user.
- If you see rate-limit errors, lower `GITHUB_MAX_CONCURRENCY` or lean harder on
  the warmer and longer TTLs.
- Nothing is written to local disk; durable state is Postgres and Redis, both
  optional but recommended for production.
