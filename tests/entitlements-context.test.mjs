import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoader } from './helpers/load-typescript.mjs';

function harness({ premium = false, source = null, nextExpiry = null, restoreResult = { success: false, hasPurchases: false }, failSave = false, reconcileCache = null } = {}) {
  let now = Date.parse('2026-09-09T12:00:00Z');
  class ClockDate extends Date { static now() { return now; } }
  let persistedReconcile = reconcileCache;
  const slots = [];
  let index = 0;
  const effects = [];
  let value;
  let activeListener;
  let snapshot = { isPremium: premium, source, nextExpiry, subscriptionDetails: null };
  const calls = { ads: [], events: [], saves: [], restore: 0, clear: 0, refill: 0, rewards: 0, ai: [], booleanWrites: [] };
  const timers = new Map();
  let timerId = 0;
  const react = {
    createContext: () => ({ Provider: 'PremiumProvider' }),
    createElement: (type, props) => { if (type === 'PremiumProvider') value = props.value; return {}; },
    useState: initial => { const i = index++; if (!(i in slots)) slots[i] = initial; return [slots[i], next => { slots[i] = next; }]; },
    useRef: initial => { const i = index++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useCallback: (fn, deps) => { const i = index++; const prior = slots[i]; if (!prior || deps.some((d, j) => d !== prior.deps[j])) slots[i] = { fn, deps }; return slots[i].fn; },
    useEffect: (fn, deps) => { const i = index++; const prior = slots[i]; if (!prior || deps.some((d, j) => d !== prior.deps[j])) { slots[i] = { deps }; effects.push(fn); } },
    useContext: () => value,
  };
  const storage = {
    getEntitlementSnapshot: async () => ({ ...snapshot }),
    saveIsPremium: async status => { calls.booleanWrites.push(status); return false; },
    saveSubscriptionDetails: async details => {
      calls.saves.push(details);
      if (failSave) throw Error('disk failure');
      if (details.verificationSource !== 'server' || !(Date.parse(details.expiryDate) > Date.parse('2026-09-09T12:00:00Z'))) throw Error('invalid subscription');
      snapshot = { ...snapshot, isPremium: details.isActive, source: 'paid', subscriptionDetails: details, nextExpiry: details.expiryDate };
      return true;
    },
    clearVerifiedPaidEntitlement: async () => { calls.clear++; snapshot = { ...snapshot, isPremium: false, source: null }; },
    getUserProgress: async () => ({ level: 6, rewards: { flex_saves: { uses: 0 } } }),
  };
  const load = createLoader({ globals: {
    __DEV__: false, Date: ClockDate,
    setTimeout: (fn, delay) => { timers.set(++timerId, { fn, delay }); return timerId; },
    clearTimeout: id => timers.delete(id),
  }, mocks: {
    'src/services/storageService': storage,
    'src/hooks/progress/useGamification': { gamificationEvents: { emit: name => calls.events.push(name) } },
    'src/hooks/progress/useFeatureAccess': { PREMIUM_STATUS_CHANGED: 'premium_changed' },
    'src/utils/progress/modules/rewardManager': { updateRewards: async value => { calls.rewards++; return value; } },
    'src/utils/progress/modules/flexSaveManager': { refillMonthlyFlexSaves: async () => { calls.refill++; } },
    'src/services/adService': { setPremiumStatus: value => calls.ads.push(value) },
    'src/services/iapService': { restorePurchases: async () => { calls.restore++; return restoreResult; } },
    'src/services/ai/scheduling/notificationScheduler': { scheduleAIWellnessV2: async action => calls.ai.push(action) },
  }, externalMocks: {
    '@react-native-async-storage/async-storage': { getItem: async () => persistedReconcile, setItem: async (_key, value) => { persistedReconcile = value; } },
    react,
    'react/jsx-runtime': { jsx: react.createElement, jsxs: react.createElement },
    'react-native': { ActivityIndicator: 'spinner', Text: 'text', View: 'view', AppState: { addEventListener: (_name, fn) => { activeListener = fn; return { remove() {} }; } } },
  } });
  const provider = load('src/context/PremiumContext.tsx').PremiumProvider;
  const render = () => { index = 0; provider({ children: 'app' }); };
  const flush = async () => { await new Promise(resolve => setImmediate(resolve)); render(); };
  return {
    async mount() { render(); for (const effect of effects.splice(0)) effect(); await flush(); },
    value: () => value, calls, timers, flush,
    advance: milliseconds => { now += milliseconds; },
    persisted: () => persistedReconcile,
    foreground: () => activeListener('active'),
    setSnapshot: next => { snapshot = { ...snapshot, ...next }; },
  };
}
const details = { productId: 'monthly', purchaseDate: '2026-09-01T00:00:00Z', expiryDate: '2026-10-01T00:00:00Z', isActive: true, platform: 'ios', purchaseToken: 'signed', verificationSource: 'server' };

test('startup and foreground network failure retain legacy paid access without replaying upgrade side effects', async () => {
  const h = harness({ premium: true, source: 'legacy-paid' });
  await h.mount();
  assert.equal(h.value().isPremium, true);
  assert.equal(h.calls.clear, 0);
  assert.equal(h.calls.ai.length, 0);
  h.foreground();
  await h.flush();
  assert.equal(h.value().isPremium, true);
  assert.equal(h.calls.clear, 0);
  assert.ok(h.calls.restore >= 1);
});

test('verified callback persistence failure rejects; production boolean setters cannot grant access', async () => {
  const h = harness({ failSave: true });
  await h.mount();
  await assert.rejects(h.value().updateSubscription(details), /disk failure/);
  assert.equal(h.calls.events.length, 0);
  await h.value().setPremiumStatus(true);
  await h.flush();
  assert.equal(h.value().isPremium, false);
  assert.deepEqual(h.calls.booleanWrites, []);
});

test('verified callback applies ads/theme/reward/AI transitions once and only uses shared monthly refill', async () => {
  const h = harness();
  await h.mount();
  await h.value().updateSubscription(details);
  await h.flush();
  assert.equal(h.value().isPremium, true);
  assert.equal(h.calls.ads.at(-1), true);
  assert.equal(h.calls.events.filter(e => e === 'premium_changed').length, 1);
  assert.deepEqual(h.calls.ai, ['upgrade']);
  assert.equal(h.calls.rewards, 1);
  assert.equal(h.calls.refill, 1);
  await h.value().refreshPremiumStatus();
  assert.equal(h.calls.events.filter(e => e === 'premium_changed').length, 1);
  assert.equal(h.calls.rewards, 1);
});

test('expiry timer recomputes access and emits downgrade, without touching earned progress', async () => {
  const h = harness({ premium: true, source: 'promo', nextExpiry: '2026-09-09T12:00:01Z' });
  await h.mount();
  const expiry = [...h.timers.values()].find(timer => timer.delay === 1050);
  assert.ok(expiry);
  h.setSnapshot({ isPremium: false, source: null, nextExpiry: null });
  expiry.fn();
  await h.flush();
  assert.equal(h.value().isPremium, false);
  assert.equal(h.calls.ads.at(-1), false);
  assert.deepEqual(h.calls.ai, ['preference_change']);
  assert.equal(h.calls.rewards, 0);
});

test('successful definitive empty store response clears paid entitlement', async () => {
  const h = harness({ premium: true, source: 'legacy-paid', restoreResult: { success: true, hasPurchases: false } });
  await h.mount();
  await h.flush();
  assert.equal(h.calls.clear, 1);
  assert.equal(h.value().isPremium, false);
});

test('automatic foreground reconciliation waits fifteen minutes while local expiry still refreshes', async () => {
  const h = harness({ premium: true, source: 'paid', restoreResult: { success: true, hasPurchases: true } });
  await h.mount(); assert.equal(h.calls.restore, 1);
  for (let i = 0; i < 5; i++) { h.foreground(); await h.flush(); }
  assert.equal(h.calls.restore, 1);
  h.setSnapshot({ isPremium: false, source: null, nextExpiry: null });
  h.foreground(); await h.flush();
  assert.equal(h.value().isPremium, false); assert.equal(h.calls.restore, 1);
  h.advance(15 * 60 * 1000); h.foreground(); await h.flush();
  assert.equal(h.calls.restore, 2);
});

test('successful cooldown survives restart and explicit cancellation reconciliation bypasses it', async () => {
  const first = harness({ restoreResult: { success: true, hasPurchases: true } });
  await first.mount();
  const restarted = harness({ reconcileCache: first.persisted(), restoreResult: { success: true, hasPurchases: true } });
  await restarted.mount(); assert.equal(restarted.calls.restore, 0);
  await restarted.value().cancelSubscription(); assert.equal(restarted.calls.restore, 1);
});

test('failed automatic verification retains access with a short bounded retry backoff', async () => {
  const h = harness({ premium: true, source: 'legacy-paid' });
  await h.mount(); h.foreground(); await h.flush();
  assert.equal(h.calls.restore, 1); assert.equal(h.value().isPremium, true);
  h.advance(60 * 1000); h.foreground(); await h.flush();
  assert.equal(h.calls.restore, 2); assert.equal(h.calls.clear, 0);
  assert.equal(h.value().isPremium, true);
});
