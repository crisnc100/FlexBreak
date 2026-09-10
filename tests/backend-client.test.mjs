import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoader } from './helpers/load-typescript.mjs';

function backendHarness(fetch) {
  const refreshes = [];
  const load = createLoader({
    globals: { fetch, AbortController },
    mocks: {
      'src/config/supabase': { SUPABASE_PROJECT_URL: 'https://backend.example', SUPABASE_ANON_KEY: 'public-key' },
      'src/services/security/authSession': { getBackendToken: async refresh => { refreshes.push(refresh); return refresh ? 'fresh-id-token' : 'id-token'; } },
    },
  });
  return { ...load('src/services/security/backendClient.ts'), refreshes };
}

test('backend sends authenticated identity and device timezone, refreshing only after one 401', async () => {
  const requests = [];
  const h = backendHarness(async (url, options) => {
    requests.push({ url, ...options });
    return requests.length === 1
      ? { status: 401, ok: false }
      : { status: 200, ok: true, json: async () => ({ success: true, data: { active: true } }) };
  });
  assert.equal((await h.callBackend('verify-purchase-v2', { productId: 'monthly', timeZone: 'spoofed' })).active, true);
  assert.deepEqual(h.refreshes, [false, true]);
  assert.equal(requests[0].headers.Authorization, 'Bearer id-token');
  assert.equal(requests[1].headers.Authorization, 'Bearer fresh-id-token');
  assert.equal(requests[0].headers.apikey, 'public-key');
  assert.equal(JSON.parse(requests[0].body).timeZone, Intl.DateTimeFormat().resolvedOptions().timeZone);
  assert.equal(requests[0].url, 'https://backend.example/functions/v1/verify-purchase-v2');
});

test('backend never retries provider failures or unsuccessful envelopes', async () => {
  for (const response of [
    { status: 503, ok: false, json: async () => ({ success: false, error: 'Unavailable', code: 'provider' }) },
    { status: 200, ok: true, json: async () => ({ success: false, error: 'Denied' }) },
    { status: 200, ok: true, json: async () => ({ success: true }) },
  ]) {
    let calls = 0;
    const h = backendHarness(async () => { calls++; return response; });
    await assert.rejects(h.callBackend('redeem-code-v2', { code: 'FLEX-EXAMPLE' }));
    assert.equal(calls, 1);
  }
});

test('backend rejects unknown endpoints and malformed payloads without accessing credentials or network', async () => {
  const h = backendHarness(async () => assert.fail('network must not run'));
  await assert.rejects(h.callBackend('https://elsewhere.example', {}));
  for (const value of [null, 'body', [], 2]) await assert.rejects(h.callBackend('ai-chat-v2', value));
  assert.equal(h.refreshes.length, 0);
});

test('concurrent authentication uses one anonymous signup and recovers from failed signup', async () => {
  let calls = 0;
  let finish;
  const nativeAuth = { authStateReady: async () => {}, currentUser: null };
  const user = { uid: 'persisted-user', getIdToken: async refresh => refresh ? 'fresh' : 'cached' };
  const load = createLoader({
    mocks: { 'src/config/firebase': { nativeAuth } },
    externalMocks: { 'firebase/auth': { signInAnonymously: () => {
      calls++;
      return new Promise((resolve, reject) => { finish = calls === 1 ? reject : resolve; });
    } } },
  });
  const auth = load('src/services/security/authSession.ts');
  const first = auth.getAuthenticatedUser();
  const second = auth.getAuthenticatedUser();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 1);
  finish(new Error('offline'));
  await Promise.all([assert.rejects(first, /offline/), assert.rejects(second, /offline/)]);
  const retry = auth.getAuthenticatedUser();
  await new Promise(resolve => setImmediate(resolve));
  finish({ user });
  assert.equal(await retry, user);
  nativeAuth.currentUser = user;
  assert.equal(await auth.getBackendToken(true), 'fresh');
  assert.equal(calls, 2);
});

test('backend stops after a second unauthorized response', async () => {
  let calls = 0;
  const h = backendHarness(async () => { calls++; return { status: 401, ok: false, json: async () => ({ error: 'Unauthorized' }) }; });
  await assert.rejects(h.callBackend('ai-chat-v2', {}), error => error.status === 401);
  assert.equal(calls, 2);
});

test('backend times out a stalled request and always clears its timer', async () => {
  const cleared = [];
  const load = createLoader({
    globals: {
      AbortController,
      setTimeout: (callback, delay) => { assert.equal(delay, 90000); queueMicrotask(callback); return 42; },
      clearTimeout: id => cleared.push(id),
      fetch: async (_url, { signal }) => new Promise((_resolve, reject) => {
        if (signal.aborted) reject(Error('aborted'));
        else signal.addEventListener('abort', () => reject(Error('aborted')));
      }),
    },
    mocks: {
      'src/config/supabase': { SUPABASE_PROJECT_URL: 'https://backend.example', SUPABASE_ANON_KEY: 'public' },
      'src/services/security/authSession': { getBackendToken: async () => 'token' },
    },
  });
  await assert.rejects(load('src/services/security/backendClient.ts').callBackend('verify-purchase-v2', {}), /aborted/);
  assert.deepEqual(cleared, [42]);
});

test('AI proxy makes one authenticated call and leaves model selection to server', async () => {
  const calls = [];
  const load = createLoader({ mocks: {
    'src/services/security/backendClient': { callBackend: async (...args) => { calls.push(args); throw Error('provider unavailable'); } },
  } });
  const ai = load('src/services/ai/integrations/secureAIService.ts').default;
  await assert.rejects(ai.chat([{ role: 'user', content: 'Hello' }], { model: 'expensive-caller-model', maxTokens: 300 }), /unavailable/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'ai-chat-v2');
  assert.equal(Object.hasOwn(calls[0][1].options, 'model'), false);
});
