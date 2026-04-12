# Load tests — AgroGest VSM API

k6 scripts for baseline load testing of the AgroGest VSM API.
These are artifacts: k6 is **not** a repo dependency. Install it separately:

- macOS: `brew install k6`
- Windows: `choco install k6`
- Linux: see https://k6.io/docs/getting-started/installation/

## Required environment variables

| Variable | Default | Meaning |
|---|---|---|
| `K6_BASE_URL` | `http://localhost:3001` | API root |
| `K6_EMAIL` | `admin@agrogest.pe` | Seed user email |
| `K6_PASSWORD` | `changeme` | Seed user password |

## Scripts

### `login-stress.js`
Ramps from 0 → 20 concurrent virtual users over 2 minutes hitting `/auth/login`.
Succeeds if p(95) < 500 ms and error rate < 1 %. If the endpoint has no rate
limiting, this also acts as a canary for brute-force tolerance.

```bash
k6 run tools/load-tests/login-stress.js
```

### `list-parcelas.js`
Authenticates once, then hits `/parcelas?activo=true&page=1&limit=50` from
50 concurrent VUs for 3 minutes. Measures p(95) of the list endpoint and
checks that the response envelope is well-formed.

```bash
k6 run tools/load-tests/list-parcelas.js
```

## What to look for

- **p(95) < 500 ms** on list endpoints at 50 VUs is the minimum floor for a
  decent user experience.
- **Error rate should be 0** under expected load. Any 5xx counts as a
  regression.
- **Rate limit canary**: if `login-stress.js` succeeds with 20 concurrent VUs
  without any 429 responses, the API has **no rate limiting** — that is a
  production blocker, not a performance finding.
