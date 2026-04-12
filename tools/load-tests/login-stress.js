// k6 load test — /auth/login stress ramp.
// Run with: k6 run tools/load-tests/login-stress.js
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const errorRate = new Rate("errors");

export const options = {
  stages: [
    { duration: "30s", target: 5 },
    { duration: "30s", target: 10 },
    { duration: "30s", target: 20 },
    { duration: "30s", target: 0 }
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],
    errors: ["rate<0.01"]
  }
};

const BASE_URL = __ENV.K6_BASE_URL || "http://localhost:3001";
const EMAIL = __ENV.K6_EMAIL || "admin@agrogest.pe";
const PASSWORD = __ENV.K6_PASSWORD || "changeme";

export default function () {
  const payload = JSON.stringify({ email: EMAIL, password: PASSWORD });
  const params = { headers: { "Content-Type": "application/json" } };

  const res = http.post(`${BASE_URL}/auth/login`, payload, params);

  const ok = check(res, {
    "status is 200 or 201": (r) => r.status === 200 || r.status === 201,
    "response has accessToken": (r) => {
      try {
        const body = r.json();
        return Boolean(body && body.data && body.data.accessToken);
      } catch {
        return false;
      }
    }
  });

  if (!ok) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }

  sleep(1);
}
