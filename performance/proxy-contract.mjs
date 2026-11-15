// An ephemeral protocol test double, not the RedGreen API or a second backend stack.
// Run this performance-image command with network alias "backend" on the test network.
import http from 'node:http';
import assert from 'node:assert/strict';

const base = process.env.PERF_BASE_URL || 'http://redgreen-frontend:8080';
const server = http.createServer(async (request, response) => {
  let body = '';
  for await (const chunk of request) body += chunk;
  response.writeHead(401, {
    'Content-Type': 'application/json',
    'X-Proxy-Probe': 'preserved',
    'Set-Cookie': 'probe=synthetic; Path=/; SameSite=Strict',
  });
  response.end(
    JSON.stringify({
      method: request.method,
      url: request.url,
      authorization: request.headers.authorization,
      contentType: request.headers['content-type'],
      custom: request.headers['x-probe'],
      body,
    })
  );
});

await new Promise((resolve) => server.listen(3000, '0.0.0.0', resolve));
try {
  // Allow Nginx's negative DNS cache from an earlier unavailable API to expire.
  let available = false;
  for (let i = 0; i < 25; i++) {
    const response = await fetch(base + '/api/auth/login', {
      signal: AbortSignal.timeout(6000),
    });
    if (response.status === 401) {
      available = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert.ok(available, 'Proxy did not resolve the runtime backend alias');
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const body = JSON.stringify({ probe: 'synthetic-no-credentials' });
    const response = await fetch(base + '/api/auth/login?probe=a%2Fb', {
      method,
      headers: {
        Authorization: 'Bearer synthetic-probe',
        'Content-Type': 'application/json',
        'X-Probe': 'preserved',
      },
      body,
      signal: AbortSignal.timeout(6000),
    });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('x-proxy-probe'), 'preserved');
    assert.match(response.headers.get('set-cookie'), /^probe=synthetic;/);
    assert.deepEqual(await response.json(), {
      method,
      url: '/auth/login?probe=a%2Fb',
      authorization: 'Bearer synthetic-probe',
      contentType: 'application/json',
      custom: 'preserved',
      body,
    });
  }
  const redirect = await fetch(base + '/api?probe=1', { redirect: 'manual' });
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get('location'), '/api/?probe=1');
  console.log(
    'PASS: runtime DNS, /api rewrite, query, POST/PUT/PATCH/DELETE, body, Authorization, Content-Type, custom headers, Set-Cookie, 401 and 308'
  );
} finally {
  await new Promise((resolve) => server.close(resolve));
}
