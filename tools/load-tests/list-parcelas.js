// k6 load test — /parcelas list endpoint.
// Run with: k6 run tools/load-tests/list-parcelas.js
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const errorRate = new Rate("errors");

export const options = {
  stages: [
    { duration: "1m", target: 25 },
    { duration: "2m", target: 50 },
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

export function setup() {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { "Content-Type": "application/json" } }
  );

  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Login failed with status ${res.status}`);
  }

  const body = res.json();
  return { token: body.data.accessToken };
}

export default function (data) {
  const params = {
    headers: {
      Authorization: `Bearer ${data.token}`,
      "Content-Type": "application/json"
    }
  };

  const res = http.get(
    `${BASE_URL}/parcelas?activo=true&page=1&limit=50`,
    params
  );

  const ok = check(res, {
    "status is 200": (r) => r.status === 200,
    "envelope is well-formed": (r) => {
      try {
        const body = r.json();
        return Boolean(
          body && body.success === true && Array.isArray(body.data)
        );
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

  sleep(0.5);
}
