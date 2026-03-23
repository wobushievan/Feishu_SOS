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

### Local Dev Script

| Variable | Required | Default | Purpose | Code location |
| --- | --- | --- | --- | --- |
| `LOG_DIR` | No | `logs` | Output directory for `scripts/dev.js` log files. | [dev.js](/Users/evan/Project/Feishu%20SOS%20function/scripts/dev.js#L33) |
| `MAX_RESTART_COUNT` | No | `10` | Maximum restart attempts per process in `scripts/dev.js`. | [dev.js](/Users/evan/Project/Feishu%20SOS%20function/scripts/dev.js#L34) |
| `RESTART_DELAY` | No | `2` | Initial restart backoff in seconds in `scripts/dev.js`. | [dev.js](/Users/evan/Project/Feishu%20SOS%20function/scripts/dev.js#L35) |
| `CLIENT_DEV_PORT` | No | `8080` | Frontend dev server port tracked by `scripts/dev.js` for cleanup and supervision. | [dev.js](/Users/evan/Project/Feishu%20SOS%20function/scripts/dev.js#L38) |

### Database

This repository does not currently read any database environment variables directly.

- Database access is injected by `@lark-apaas/fullstack-nestjs-core` through `DRIZZLE_DATABASE`.
- No `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, or similar keys are consumed by the code in this repository today.
- For that reason, `.env.example` intentionally does not invent database credential variables that are not used here.
