# MannaBooks Web

Next.js frontend for MannaBooks. It shows the UI only: every rule, schedule and integration lives in the
API (`mannabooks-api`).

## Run it locally

Start the API first (see its README), then:

```bash
npm install
cp .env.example .env.local     # set NEXTAUTH_SECRET; API_URL defaults to http://localhost:8000
npm run dev                    # http://localhost:3000
```

## How it talks to the API

- **Sign-in** uses next-auth: email and password (Credentials) and Google. Both exchange for the API's
  JWTs, which next-auth keeps in its encrypted, HttpOnly session cookie. Browser JavaScript never sees
  the tokens.
- **`src/proxy.ts`** runs before every request: it refreshes the access token shortly before it
  expires and protects app pages.
- **`/api/backend/...`** forwards browser calls to the API with the user's token attached.
- **Types** come from the API's OpenAPI schema. After any API change, regenerate them:

```bash
npm run api:types            # from ../mannabooks-api/schema.yml (run `pipenv run schema` there first)
API_URL=https://api.example.com npm run api:types:remote
```

`src/lib/api/client.ts` exports the typed client (`api.GET("/api/v1/...")`) and `unwrap`, which turns
the API's error shape (`{code, message, errors}`) into an `ApiError` with field errors.

## Layout

```
src/
  app/(auth)/            sign in, sign up, password reset, invitation links
  app/workspaces/        the user's workspaces
  app/w/[slug]/          one workspace: overview and each module's screens
  app/guide/             in-app user guides (markdown in src/content/guides)
  app/api/               next-auth, the API gateway, sign-out
  components/            shared UI
  lib/                   API client and types, auth, workspace context and permissions
  proxy.ts               token refresh and route protection
```

## User guides

Every module ships a guide: add a markdown file to `src/content/guides/`, list it in
`src/content/guides/index.ts`, and point the page header's `guide` prop at it.

## Deploy (Vercel)

Set `API_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, and for Google sign-in `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET`. In the Google Cloud console, add
`https://<your-domain>/api/auth/callback/google` as an authorised redirect URI, and add the same
client id to the API's `GOOGLE_CLIENT_IDS`.
