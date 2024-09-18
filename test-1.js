import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 10, // Number of virtual users
  duration: '30s', // Duration of the test
};

export default function () {
  // Simulate a user logging in
  let loginRes = http.post('https://example.com/api/login', {
    username: 'testuser',
    password: 'testpass',
  });

  // Check if login was successful
  check(loginRes, { 'logged in successfully': (r) => r.status === 200 });

  // Simulate browsing a page
  let browseRes = http.get('https://example.com/api/products');
  check(browseRes, { 'browsed products successfully': (r) => r.status === 200 });

  // Simulate submitting a form
  let formRes = http.post('https://example.com/api/submit', {
    field1: 'value1',
    field2: 'value2',
  });
  check(formRes, { 'form submitted successfully': (r) => r.status === 200 });

  sleep(1); // Simulate think time between actions
}
