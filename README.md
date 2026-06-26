# Twake Team Health

Engineering-delivery metrics for any GitHub team: PR throughput, review depth, code volume, and release cadence, pulled live from GitHub and rendered as charts.

## Why

Engineering managers need an honest, current read on how a team is shipping without spreadsheets or one-off scripts. Twake Team Health turns a selection of repositories and members into live charts (merged PRs, review load, lines changed per person, time to merge, bugs, releases), plus an organization-wide trend view and a before/after period comparison. Completed months are stored so GitHub is queried only for what changed.

## Quick start

Bring up the full stack (app, Postgres, Redis) with Docker:

```sh
cp .env.example .env     # set GITHUB_TOKEN, and OIDC for production
docker compose up -d
```

The app listens on http://localhost:3000 and runs database migrations on start.

## Configuration

All configuration is environment-based (wired in `docker-compose.yml`):

- `GITHUB_TOKEN`: read-only token used for every GitHub query.
- `ALLOWED_ORGS`: comma-separated organizations that members and repos may belong to.
- `DEFAULT_TEAMS`: JSON array of preset teams shared with everyone (example below).
- `DATABASE_URL`: Postgres connection string.
- `REDIS_URL`: Redis connection string.
- `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`: SSO, required in production.
- `AUTH_SECRET`: secret used to sign sessions.
- `ORIGIN`: public URL of the deployment.

`DEFAULT_TEAMS` looks like:

```json
[
  {
    "name": "Platform",
    "members": [{ "login": "octocat", "name": "The Octocat" }],
    "repos": [{ "owner": "octocat", "repo": "Hello-World" }]
  }
]
```

Each signed-in user can also build private teams of their own, which are never shared with others.

## How it works

Completed months are computed once and persisted in Postgres; the in-progress month is fetched live on each request, so reports reflect today's activity without re-querying history. Redis caches assembled reports and coordinates concurrent users across replicas. Access is gated by OIDC. Nothing is written to disk.

## Development

```sh
pnpm install
pnpm dev      # http://localhost:5173
pnpm check    # type-check
pnpm test     # unit tests
```
