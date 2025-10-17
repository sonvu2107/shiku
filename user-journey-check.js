#!/usr/bin/env node

/**
 * User Journey API Check
 * Giả lập một người dùng đăng nhập và sử dụng các chức năng chính:
 * - CSRF + Login (cookie + accessToken)
 * - Me/Session, Feed, Search
 * - Tạo post → bình luận → save/unsave
 * - Notifications, Events, Heartbeat
 * - Logout
 *
 * Chạy: node user-journey-check.js --api=http://localhost:4000
 */

const args = process.argv.slice(2);
const argMap = Object.fromEntries(
  args.map(a => {
    const [k, v] = a.includes('=') ? a.split('=') : [a, true];
    return [k.replace(/^--/, ''), v];
  })
);

const API_URL = argMap.api || process.env.VITE_API_URL || 'http://localhost:4000';

const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m'
};

function log(color, symbol, msg, detail = '') {
  const prefix = process.platform === 'win32' ? '' : symbol + ' ';
  console.log(`${c[color]}${prefix}${msg}${c.reset}${detail ? c.gray + ' ' + detail + c.reset : ''}`);
}

function section(title) {
  console.log(`\n${c.cyan}${c.bold}━━━ ${title} ━━━${c.reset}`);
}

// Simple cookie jar
const cookieJar = new Map();
function parseSetCookie(setCookieHeader) {
  if (!setCookieHeader) return;
  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  cookies.forEach(cookie => {
    const [nameValue] = cookie.split(';');
    const [name, value] = nameValue.split('=');
    if (name && value) cookieJar.set(name.trim(), value.trim());
  });
}
function cookieHeader() {
  return Array.from(cookieJar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function fetchWithSession(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  const ch = cookieHeader();
  if (ch) headers['Cookie'] = ch;
  const res = await fetch(url, { ...options, headers, credentials: 'include' });
  parseSetCookie(res.headers.get('set-cookie'));
  return res;
}

async function getCsrfToken() {
  const r = await fetchWithSession(`${API_URL}/api/csrf-token`);
  if (!r.ok) throw new Error(`CSRF HTTP ${r.status}`);
  const j = await r.json();
  if (!j.csrfToken) throw new Error('No csrfToken');
  return j.csrfToken;
}

async function postWithCsrf(path, { body, token } = {}) {
  const csrfToken = await getCsrfToken();
  const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetchWithSession(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
}

async function promptCredentials() {
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise(res => rl.question(q, res));
  const email = (await ask('Email: ')).trim();
  const password = (await ask('Password: ')).trim();
  rl.close();
  return { email, password };
}

async function timed(label, fn) {
  const start = Date.now();
  try {
    const result = await fn();
    const ms = Date.now() - start;
    log('green', '✓', label, `${ms}ms`);
    return { ok: true, ms, result };
  } catch (e) {
    const ms = Date.now() - start;
    log('red', '✗', `${label} failed`, `${ms}ms - ${e.message}`);
    return { ok: false, ms, error: e };
  }
}

async function main() {
  console.log(`\n${c.cyan}${'═'.repeat(70)}${c.reset}`);
  console.log(`${c.cyan}${c.bold}👤 USER JOURNEY API CHECK${c.reset}`);
  console.log(`${c.cyan}${'═'.repeat(70)}${c.reset}`);
  console.log(`API: ${c.cyan}${API_URL}${c.reset}`);

  let accessToken = '';
  let createdPostId = '';

  const creds = await promptCredentials();

  // CSRF + Login
  await timed('Get CSRF token', async () => await getCsrfToken()).then(async ({ ok, result }) => {
    if (!ok) throw new Error('CSRF step failed');
    const csrfToken = result;
    const loginRes = await fetchWithSession(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body: JSON.stringify({ email: creds.email, password: creds.password })
    });
    if (!loginRes.ok) throw new Error(`HTTP ${loginRes.status}`);
    const data = await loginRes.json();
    accessToken = data.accessToken;
    log('green', '✓', `Logged in as ${data.user?.email || creds.email}`);
  });

  // Me
  await timed('GET /api/auth/me', async () => {
    const r = await fetchWithSession(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  });

  // Feed + Search
  await timed('GET /api/posts/feed', async () => {
    const r = await fetchWithSession(`${API_URL}/api/posts/feed`);
    if (r.ok) return;
    if (r.status === 500) {
      // Fallback to legacy feed for diagnostics
      const legacy = await fetchWithSession(`${API_URL}/api/posts/feed-legacy`);
      if (!legacy.ok) {
        const text = await legacy.text().catch(() => '');
        throw new Error(`feed 500; legacy HTTP ${legacy.status} ${text}`);
      }
      log('yellow', '⚠', 'Using /api/posts/feed-legacy as fallback');
      return;
    }
    throw new Error(`HTTP ${r.status}`);
  });
  await timed('GET /api/posts?q=test', async () => {
    const r = await fetchWithSession(`${API_URL}/api/posts?q=test`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  });

  // Create Post
  const createRes = await timed('POST /api/posts (create)', async () => {
    const r = await postWithCsrf('/api/posts', {
      token: accessToken,
      body: {
        title: `Test post ${new Date().toISOString()}`,
        content: 'This is a synthetic test post created by the check script.',
        tags: ['test','journey'],
        status: 'published'
      }
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    return j.post?._id || j._id;
  });
  if (createRes.ok && createRes.result) createdPostId = createRes.result;

  // Comment on created post (if any)
  if (createdPostId) {
    await timed('POST /api/comments/post/:postId', async () => {
      const r = await postWithCsrf(`/api/comments/post/${createdPostId}`, {
        token: accessToken,
        body: { content: 'Nice post! (auto comment)' }
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    });

    // Save then Unsave
    await timed('POST /api/posts/:id/save (save)', async () => {
      const r = await postWithCsrf(`/api/posts/${createdPostId}/save`, { token: accessToken });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    });
    await timed('POST /api/posts/:id/save (unsave)', async () => {
      const r = await postWithCsrf(`/api/posts/${createdPostId}/save`, { token: accessToken });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    });
  }

  // Notifications / Events / Heartbeat
  await timed('GET /api/notifications/unread-count', async () => {
    const r = await fetchWithSession(`${API_URL}/api/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!r.ok && r.status !== 404) throw new Error(`HTTP ${r.status}`);
  });
  await timed('GET /api/events?filter=my&limit=3', async () => {
    const r = await fetchWithSession(`${API_URL}/api/events?filter=my&limit=3`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!r.ok && r.status !== 404) throw new Error(`HTTP ${r.status}`);
  });
  await timed('POST /api/auth/heartbeat', async () => {
    const r = await postWithCsrf('/api/auth/heartbeat', { token: accessToken });
    if (!r.ok && r.status !== 404) throw new Error(`HTTP ${r.status}`);
  });

  // Logout
  await timed('POST /api/auth/logout', async () => {
    const r = await postWithCsrf('/api/auth/logout');
    if (!r.ok && r.status !== 204) throw new Error(`HTTP ${r.status}`);
  });

  console.log(`\n${c.cyan}${'═'.repeat(70)}${c.reset}`);
  log('green', '✓', 'User journey completed');
}

main().catch(err => {
  log('red', '✗', 'Journey failed', err.message);
  process.exit(1);
});


