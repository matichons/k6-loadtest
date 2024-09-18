import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

export let options = {
  scenarios: {
    my_load_test: {
      executor: 'ramping-vus', // Other executors: 'constant-vus', 'per-vu-iterations', etc.
      startVUs: 1,
      stages: [
        { duration: '1m', target: 10 }, // ramp up to 10 VUs
        { duration: '3m', target: 10 }, // stay at 10 VUs for 3 min
        { duration: '1m', target: 0 },  // scale down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
  },
  noConnectionReuse: false, // Disable reuse of connections; use true to enable keep-alive
};

export default  function () {

  let response = http.get(`http://merz-ph2.duckdns.org/main.php?section=home#home`);

  check(response, {
    'is status 200': (r) => r.status === 200,
    'is response time acceptable': (r) => r.timings.duration < 200,
  });

  sleep(1); // Simulate waiting time between requests
}

// Custom metric example
export let myFailureCount = new Counter('my_failure_count');

export function handleSummary(data) {
  if (data.metrics.http_req_failed.count > 0) {
    myFailureCount.add(1);
  }

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'my-summary.json': JSON.stringify(data),
  };
}
