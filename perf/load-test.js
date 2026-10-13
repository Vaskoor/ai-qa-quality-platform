/**
 * k6 load test for the QA Demo API.
 * Run:  k6 run perf/load-test.js
 * Env:  K6_BASE_URL, K6_VUS, K6_DURATION
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('qa_errors');
const listLatency = new Trend('qa_list_latency', true);
const createLatency = new Trend('qa_create_latency', true);

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3000';
const VUS = parseInt(__ENV.K6_VUS || '10', 10);
const DURATION = __ENV.K6_DURATION || '30s';

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: Math.max(1, Math.floor(VUS / 2)),
      duration: DURATION,
      tags: { scenario: 'smoke' },
    },
    ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: VUS },
        { duration: '20s', target: VUS },
        { duration: '10s', target: 0 },
      ],
      tags: { scenario: 'ramp' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    http_req_failed: ['rate<0.01'],
    qa_errors: ['rate<0.01'],
    checks: ['rate>0.98'],
  },
};

export default function () {
  group('list pets', () => {
    const res = http.get(`${BASE_URL}/pets`);
    listLatency.add(res.timings.duration);
    const ok = check(res, {
      'list status 200': (r) => r.status === 200,
      'list is array': (r) => Array.isArray(r.json()),
    });
    errorRate.add(!ok);
  });

  sleep(0.5);

  group('create + fetch pet', () => {
    const payload = JSON.stringify({
      name: `k6-pet-${__VU}-${__ITER}`,
      tag: 'perf',
      status: 'available',
    });
    const params = { headers: { 'Content-Type': 'application/json' } };

    const createRes = http.post(`${BASE_URL}/pets`, payload, params);
    createLatency.add(createRes.timings.duration);
    const created = check(createRes, {
      'create status 201': (r) => r.status === 201,
      'create returns id': (r) => r.json('id') !== undefined,
    });
    errorRate.add(!created);

    if (created) {
      const id = createRes.json('id');
      const getRes = http.get(`${BASE_URL}/pets/${id}`);
      const fetched = check(getRes, {
        'get status 200': (r) => r.status === 200,
        'get matches id': (r) => r.json('id') === id,
      });
      errorRate.add(!fetched);
    }
  });

  sleep(0.5);

  group('inventory', () => {
    const res = http.get(`${BASE_URL}/store/inventory`);
    const ok = check(res, { 'inventory status 200': (r) => r.status === 200 });
    errorRate.add(!ok);
  });

  sleep(0.5);
}

export function handleSummary(data) {
  return {
    'perf/results/summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  const m = data.metrics;
  const lines = [
    '\n=== k6 Performance Summary ===',
    `http_reqs:        ${m.http_reqs?.values?.count ?? 0}`,
    `http_req_failed:  ${((m.http_req_failed?.values?.rate ?? 0) * 100).toFixed(2)}%`,
    `p95 duration:     ${(m.http_req_duration?.values?.['p(95)'] ?? 0).toFixed(2)} ms`,
    `p99 duration:     ${(m.http_req_duration?.values?.['p(99)'] ?? 0).toFixed(2)} ms`,
    `checks passed:    ${((m.checks?.values?.rate ?? 0) * 100).toFixed(2)}%`,
    '==============================\n',
  ];
  return lines.join('\n');
}