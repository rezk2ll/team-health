# OIDC authentication

Authentication is OIDC via Auth.js (`@auth/sveltekit`). Any standard OpenID
Connect provider works (Keycloak, Auth0, Okta, Azure AD, Google, your corporate
SSO). This doc covers the provider-agnostic setup, then a concrete Keycloak
walkthrough for local testing.

## How it works

- The provider id is `oidc`, so the callback (redirect) URI is
  `{ORIGIN}/auth/callback/oidc`.
- The flow is authorization code with PKCE against a confidential client.
- Sessions are stored in an encrypted JWT cookie signed with `AUTH_SECRET`; there
  is no server-side session store.
- The user's `sub` claim is the stable identity. Private teams are keyed by it, and
  admin matching uses it (or `email`). The `email` claim should be present for the
  admin allowlist and the audit log to be readable.

## Configure any provider

1. Register a confidential client with your provider.
2. Set its redirect URI to `{ORIGIN}/auth/callback/oidc` (for example
   `https://team-health.example.com/auth/callback/oidc`).
3. Make sure the issued ID token includes the `sub` and `email` claims.
4. Set these environment variables and leave `AUTH_DISABLED` unset:

   - `OIDC_ISSUER`: the provider's issuer URL (its `.well-known/openid-configuration`
     lives under it).
   - `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`: the client credentials.
   - `AUTH_SECRET`: any 32+ character random string that signs the session cookie.
   - `ORIGIN`: the app's public URL, used to build the callback.

5. Grant admins by listing their emails or subjects in `ADMINS`.

In a production build, a missing `OIDC_ISSUER` does not disable auth: the app fails
closed and stays locked until SSO is configured. The `AUTH_DISABLED=true` bypass is
for development only.

## Local testing with Keycloak

A concrete end-to-end example (sign-in, identity, per-user team persistence,
sign-out). In dev with no `OIDC_ISSUER` the app auto-bypasses auth; these steps
exercise the real flow.

### 1. Start Keycloak

```sh
docker run -d --name keycloak -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:24.0 start-dev
```

### 2. Create a realm, client, and user

The client is confidential (authorization code plus PKCE) and its redirect URI
must match the app's callback. Below assumes the app on `http://localhost:5170`.

```sh
kc() { docker exec keycloak /opt/keycloak/bin/kcadm.sh "$@"; }

kc config credentials --server http://localhost:8080 --realm master \
  --user admin --password admin

kc create realms -s realm=teamhealth -s enabled=true

kc create clients -r teamhealth \
  -s clientId=team-health -s enabled=true -s protocol=openid-connect \
  -s publicClient=false -s standardFlowEnabled=true \
  -s 'redirectUris=["http://localhost:5170/auth/callback/oidc"]' \
  -s 'webOrigins=["http://localhost:5170"]'

# Copy the "value" from this into OIDC_CLIENT_SECRET:
CID=$(kc get clients -r teamhealth -q clientId=team-health --fields id --format csv --noquotes | tail -1)
kc get clients/$CID/client-secret -r teamhealth

kc create users -r teamhealth -s username=alice -s enabled=true \
  -s email=alice@example.com -s emailVerified=true -s firstName=Alice -s lastName=Tester
kc set-password -r teamhealth --username alice --new-password alice123
```

### 3. Run the app with auth enabled

`AUTH_DISABLED` must be unset (a non-`true` value is fine), and a fixed port is
needed so the redirect URI matches.

```sh
AUTH_DISABLED= \
OIDC_ISSUER=http://localhost:8080/realms/teamhealth \
OIDC_CLIENT_ID=team-health \
OIDC_CLIENT_SECRET=<secret from step 2> \
AUTH_SECRET=<any 32+ char string> \
ORIGIN=http://localhost:5170 \
  pnpm dev --port 5170 --strictPort
```

Open http://localhost:5170 and sign in as `alice` / `alice123`. Custom teams are
then persisted per user (keyed by the OIDC subject) when `DATABASE_URL` is set.

## Notes

- `/auth/csrf` returns 404 by design: Auth.js v5 uses SvelteKit's origin-based
  CSRF, so the `[auth][warn][csrf-disabled]` log line is expected, not an error.
