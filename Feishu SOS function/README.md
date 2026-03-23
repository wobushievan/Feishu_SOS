# Feishu SOS function

## Environment Variables

This repository currently reads the following environment variables directly in application code, frontend runtime config, or local development scripts.

### Feishu

| Variable | Required | Default | Purpose | Code location |
| --- | --- | --- | --- | --- |
| `FEISHU_APP_ID` | Yes | None | Feishu self-built app ID used to initialize Feishu SDK clients. Server startup fails if missing. | [feishu-env.ts](/Users/evan/Project/Feishu%20SOS%20function/server/common/config/feishu-env.ts#L20), [feishu.service.ts](/Users/evan/Project/Feishu%20SOS%20function/server/modules/safety-check/feishu.service.ts#L11), [feishu-event.service.ts](/Users/evan/Project/Feishu%20SOS%20function/server/modules/safety-check/feishu-event.service.ts#L19) |
| `FEISHU_APP_SECRET` | Yes | None | Feishu self-built app secret used to initialize Feishu SDK clients. Server startup fails if missing. | [feishu-env.ts](/Users/evan/Project/Feishu%20SOS%20function/server/common/config/feishu-env.ts#L20), [feishu.service.ts](/Users/evan/Project/Feishu%20SOS%20function/server/modules/safety-check/feishu.service.ts#L11), [feishu-event.service.ts](/Users/evan/Project/Feishu%20SOS%20function/server/modules/safety-check/feishu-event.service.ts#L19) |

### App URLs / Routing

| Variable | Required | Default | Purpose | Code location |
| --- | --- | --- | --- | --- |
| `APP_BASE_URL` | No | None | Fallback base URL for building employee feedback H5 links when the incoming request cannot provide a base URL. | [safety-check.service.ts](/Users/evan/Project/Feishu%20SOS%20function/server/modules/safety-check/safety-check.service.ts#L699) |
| `PLATFORM_API_URL` | No | `http://localhost:3000` | Base URL for platform user API calls inside `getUserEmailsByIds()`. | [safety-check.service.ts](/Users/evan/Project/Feishu%20SOS%20function/server/modules/safety-check/safety-check.service.ts#L1023) |
| `CLIENT_BASE_PATH` | No | `/` | Frontend router basename used by the browser app. | [index.tsx](/Users/evan/Project/Feishu%20SOS%20function/client/src/index.tsx#L14), [app.tsx](/Users/evan/Project/Feishu%20SOS%20function/client/src/app.tsx#L23) |

### Server Runtime

| Variable | Required | Default | Purpose | Code location |
| --- | --- | --- | --- | --- |
| `NODE_ENV` | No | Process-dependent | Controls bootstrap abort behavior and is also set by npm scripts for build/dev/prod entrypoints. | [main.ts](/Users/evan/Project/Feishu%20SOS%20function/server/main.ts#L12), [package.json](/Users/evan/Project/Feishu%20SOS%20function/package.json#L13), [run.sh](/Users/evan/Project/Feishu%20SOS%20function/scripts/run.sh#L8) |
| `SERVER_HOST` | No | `localhost` | Nest server listen host. | [main.ts](/Users/evan/Project/Feishu%20SOS%20function/server/main.ts#L18) |
| `SERVER_PORT` | No | `3000` | Nest server listen port. Also used by the local dev supervisor for port cleanup. | [main.ts](/Users/evan/Project/Feishu%20SOS%20function/server/main.ts#L19), [dev.js](/Users/evan/Project/Feishu%20SOS%20function/scripts/dev.js#L37) |

### Platform Runtime

| Variable | Required | Default | Purpose | Code location |
| --- | --- | --- | --- | --- |
| `FORCE_AUTHN_INNERAPI_DOMAIN` | Yes for local backend startup | None | Base domain used by the `@lark-apaas/http-client` platform plugin. Backend startup fails before business modules load if missing. | `@lark-apaas/http-client` runtime, startup error observed during `npm run dev:server` |
| `FORCE_AUTHN_ACCESS_KEY` | Runtime-dependent | None | Access key used by the platform inner API client when local backend code calls platform APIs. | `@lark-apaas/http-client` runtime |
| `FORCE_AUTHN_ACCESS_SECRET` | Runtime-dependent | None | Access secret used by the platform inner API client when local backend code calls platform APIs. | `@lark-apaas/http-client` runtime |

### Local Dev Script

| Variable | Required | Default | Purpose | Code location |
| --- | --- | --- | --- | --- |
| `LOG_DIR` | No | `logs` | Output directory for `scripts/dev.js` log files. | [dev.js](/Users/evan/Project/Feishu%20SOS%20function/scripts/dev.js#L33) |
| `MAX_RESTART_COUNT` | No | `10` | Maximum restart attempts per process in `scripts/dev.js`. | [dev.js](/Users/evan/Project/Feishu%20SOS%20function/scripts/dev.js#L34) |
| `RESTART_DELAY` | No | `2` | Initial restart backoff in seconds in `scripts/dev.js`. | [dev.js](/Users/evan/Project/Feishu%20SOS%20function/scripts/dev.js#L35) |
| `CLIENT_DEV_PORT` | No | `8080` | Frontend dev server port tracked by `scripts/dev.js` for cleanup and supervision. | [dev.js](/Users/evan/Project/Feishu%20SOS%20function/scripts/dev.js#L38) |

### Database

The business modules in this repository do not read database credentials directly, but local backend startup still depends on a platform database connection string.

- `@lark-apaas/fullstack-nestjs-core` reads `SUDA_DATABASE_URL` into `app.databaseUrl` before `PlatformModule.forRoot()` initializes the database layer.
- `@lark-apaas/nestjs-datapaas` then parses that connection string and provides `DRIZZLE_DATABASE` to application modules.
- Practical implication: local backend startup requires a valid `SUDA_DATABASE_URL`, even though the business code in this repository does not reference it directly.

## Local Startup Checklist

### Package Manager

- Package manager: `npm`
- Lockfile: [package-lock.json](/Users/evan/Project/Feishu%20SOS%20function/package-lock.json)
- Runtime requirement: `node >= 22.0.0`, `npm >= 10.0.0`
- Source of truth: [package.json](/Users/evan/Project/Feishu%20SOS%20function/package.json)

### Install Dependencies

- Recommended: `npm ci`
- Alternative: `npm install`
- Note: `postinstall` runs `npx -y @lark-apaas/fullstack-cli action-plugin init`

### Prepare Environment

1. Copy `.env.example` to `.env`
2. Fill the required Feishu credentials before starting the backend:
   - `FEISHU_APP_ID`
   - `FEISHU_APP_SECRET`
3. Recommended local defaults:
   - `NODE_ENV=development`
   - `SERVER_HOST=localhost`
   - `SERVER_PORT=3000`
   - `CLIENT_DEV_PORT=8080`
   - `APP_BASE_URL=http://localhost:3000`
4. Required platform runtime values for local backend startup:
   - `FORCE_AUTHN_INNERAPI_DOMAIN`
   - `SUDA_DATABASE_URL`
5. Add `FORCE_AUTHN_ACCESS_KEY` and `FORCE_AUTHN_ACCESS_SECRET` if your local backend needs to call protected platform APIs

Reference files:

- [.env.example](/Users/evan/Project/Feishu%20SOS%20function/.env.example)
- [feishu-env.ts](/Users/evan/Project/Feishu%20SOS%20function/server/common/config/feishu-env.ts)

### Start Commands

- Frontend only: `npm run dev:client`
- Backend only: `npm run dev:server`
- Frontend + backend together: `npm run dev`

The combined `dev` entrypoint uses [scripts/dev.js](/Users/evan/Project/Feishu%20SOS%20function/scripts/dev.js) to:

- initialize action plugins
- start backend and frontend together
- clean up occupied dev ports
- restart child processes on failure

### Database Initialization

- This repository does not include local migration files, seed files, or SQL bootstrap scripts.
- Local backend startup requires a valid `SUDA_DATABASE_URL`.
- Database access is injected into business modules as `DRIZZLE_DATABASE` after the platform runtime initializes successfully.
- [schema.ts](/Users/evan/Project/Feishu%20SOS%20function/server/database/schema.ts) is the generated schema mapping, not a database initialization script.
- `npm run gen:db-schema` reverse-generates schema definitions from an existing database. It does not create tables.
- Practical implication: if you want event list, event detail, feedback list, or export to work locally, you need an already available runtime environment with the expected tables.

### Local URLs

- Browser entry and backend service: `http://localhost:3000`
- Backend API base: `http://localhost:3000/api`
- Vite dev asset server: `http://localhost:8080`

Source of truth:

- [main.ts](/Users/evan/Project/Feishu%20SOS%20function/server/main.ts)
- [dev.js](/Users/evan/Project/Feishu%20SOS%20function/scripts/dev.js)

### What You Can Verify Before Feishu Integration

#### Browser-only / route shell checks

- `/events`
- `/events/:eventId`
- `/feedback/events/:eventId`
- `/translations`

These can verify route mounting, page rendering, CSS loading, and basic layout behavior.

Open these routes through `http://localhost:3000`, not `http://localhost:8080`. The backend serves the HTML shell and injects the Vite runtime during local development.

#### Frontend interaction checks

- event creation dialog opens and closes
- required field validation works
- `eventType` and `sendType` switching works
- detail page filters, search box, copy button, and export button interactions work
- feedback page loading state, missing `userId` state, and status button rendering work

#### Can be verified locally with backend + database, without Feishu callback wiring

- event list loading
- event detail loading
- statistics loading
- employee feedback list loading
- feedback page submission through `/api/feedback/events/:eventId/submit?userId=...`
- Excel export

Prerequisite: backend is running and the runtime database is available with usable data.

### What Not To Treat As Local Browser-Only Acceptance

- Feishu chat search
- chat member expansion
- Feishu card message sending
- `card.action.trigger` callback handling
- remind unreplied flow

These depend on Feishu Open Platform credentials, permissions, callback connectivity, or message delivery.

### Recommended Local Flow

1. `npm ci`
2. Create and fill `.env`
3. Run `npm run dev`
4. Open `/events`, `/feedback/events/:eventId`, and `/translations` first
5. If you need a non-Feishu business path, validate H5 feedback submission before testing callback-driven flows
