import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoader } from './helpers/load-typescript.mjs';

const key = '@flexbreak:entitlements:v1';
const verified = (extra = {}) => ({ productId: 'flexbreak_monthly_4.99', purchaseDate: '2026-09-01T12:00:00Z', expiryDate: '2026-10-01T12:00:00Z', isActive: true, autoRenewing: true, platform: 'ios', purchaseToken: 'signed-token', verificationSource: 'server', ...extra });
function harness(entries = {}, { dev = false, backend } = {}) {
  const values = new Map(Object.entries(entries));
  let failedKey;
  const native = {
    getItem: async name => values.get(name) ?? null,
    setItem: async (name, value) => { if (name === failedKey) throw Error('disk unavailable'); values.set(name, value); },
    multiSet: async pairs => { for (const [name, value] of pairs) await native.setItem(name, value); },
    removeItem: async name => values.delete(name),
    multiRemove: async names => names.forEach(name => values.delete(name)),
  };
  const load = createLoader({ globals: { __DEV__: dev }, mocks: {
    'src/utils/progress/modules/streakManager': { streakEvents: { emit() {} } },
    'src/utils/clearAllNotifications': {},
    'src/services/security/backendClient': { callBackend: backend ?? (async () => { throw Error('network unavailable'); }) },
  }, externalMocks: { '@react-native-async-storage/async-storage': native, 'react-native': { Platform: { OS: 'ios' } } } });
  return { storage: load('src/services/storageService.ts'), code: () => load('src/services/oneTimeCodeService.ts').oneTimeCodeService, values, fail: name => { failedKey = name; } };
}

test('old paid users retain legacy access despite past synthetic expiry, until definitive store response', async () => {
  const h = harness({ '@user_premium': 'true', '@user_subscription_details': JSON.stringify({ ...verified({ expiryDate: '2026-01-01T00:00:00Z' }), verificationSource: undefined }) });
  assert.equal(await h.storage.getIsPremium(), true);
  assert.equal((await h.storage.getEntitlementSnapshot()).source, 'legacy-paid');
  assert.equal(await h.storage.getIsPremium(), true);
  await h.storage.clearVerifiedPaidEntitlement();
  assert.equal(await h.storage.getIsPremium(), false);
  assert.equal(h.values.get('@user_premium'), 'true'); // provenance retained, no longer authoritative
});

test('expired legacy promo cannot turn its old paid boolean into perpetual access', async () => {
  const h = harness({ '@user_premium': 'true', '@flexbreak:premium_status': 'true', '@flexbreak:premium_type': 'free_code', '@flexbreak:premium_expiry_date': '2026-09-01T00:00:00Z' });
  assert.equal(await h.storage.getIsPremium(), false);
  assert.equal(JSON.parse(h.values.get(key)).paid, undefined);
  assert.equal(h.values.get('@flexbreak:premium_expiry_date'), '2026-09-01T00:00:00Z');
});

test('unexpired legacy promo is preserved separately and paid revocation cannot remove it', async () => {
  const h = harness({ '@user_premium': 'true', '@flexbreak:premium_status': 'true', '@flexbreak:premium_expiry_date': '2026-10-01T00:00:00Z' });
  assert.equal((await h.storage.getEntitlementSnapshot()).source, 'promo');
  await h.storage.clearVerifiedPaidEntitlement();
  assert.equal(await h.storage.getIsPremium(), true);
});

test('verified paid expiry is enforced without deleting rewards or history', async () => {
  const h = harness({ [key]: JSON.stringify({ version: 1, paid: { source: 'paid', active: true, details: verified({ expiryDate: '2026-09-01T00:00:00Z' }) } }), progress: '[{"date":"2026-08-01"}]', '@user_progress': '{"totalXP":1000}' });
  assert.equal(await h.storage.getIsPremium(), false);
  assert.equal(h.values.get('progress'), '[{"date":"2026-08-01"}]');
  assert.equal(h.values.get('@user_progress'), '{"totalXP":1000}');
});

test('production ignores development and generic boolean grants', async () => {
  const h = harness({ '@flexbreak:testing_premium_access': 'true', '@premium': 'true', isPremium: 'true' });
  assert.equal(await h.storage.getIsPremium(), false);
  assert.equal(await h.storage.saveIsPremium(true), false);
  assert.equal(await h.storage.getIsPremium(), false);
  const dev = harness({}, { dev: true });
  assert.equal(await dev.storage.saveIsPremium(true), true);
  assert.equal((await dev.storage.getEntitlementSnapshot()).source, 'dev');
});

for (const extra of [{ verificationSource: undefined }, { expiryDate: undefined }, { expiryDate: 'invalid' }, { expiryDate: '2026-09-01T00:00:00Z' }, { purchaseToken: '' }]) {
  test(`malformed/unverified subscription is rejected: ${JSON.stringify(extra)}`, async () => {
    const h = harness();
    await assert.rejects(h.storage.saveSubscriptionDetails(verified(extra)));
    assert.equal(await h.storage.getIsPremium(), false);
  });
}

test('failed entitlement persistence rejects purchase callback; a retry saves verified access', async () => {
  const h = harness({ [key]: JSON.stringify({ version: 1 }) });
  h.fail(key);
  await assert.rejects(h.storage.saveSubscriptionDetails(verified()), /disk unavailable/);
  assert.equal(await h.storage.getIsPremium(), false);
  h.fail(undefined);
  assert.equal(await h.storage.saveSubscriptionDetails(verified()), true);
  assert.equal((await h.storage.getEntitlementSnapshot()).source, 'paid');
  await assert.rejects(h.storage.saveSubscriptionDetails(verified({ productId: 'another-product', isActive: false })), /does not match/);
  assert.equal(await h.storage.getIsPremium(), true);
});

test('format-valid/family codes never grant access when backend is unavailable', async () => {
  for (const code of ['FLEX-ABCDEFGH', 'FAMILY-1234', 'TEST-PREMIUM']) {
    const h = harness();
    assert.equal((await h.code().redeemCode(code)).success, false);
    assert.equal(await h.storage.getIsPremium(), false);
    assert.equal(h.values.has('@flexbreak:verification_status'), false);
  }
});

test('server promo uses original expiry, never writes paid flag, and same-code retry repairs failed cache write', async () => {
  const calls = [];
  const h = harness({}, { backend: async (fn, payload) => {
    calls.push([fn, payload]);
    return { codeType: 'free_premium', premiumDuration: 30, expiryDate: '2026-10-01T00:00:00Z', message: 'Granted' };
  } });
  h.fail('@flexbreak:premium_expiry_date');
  assert.equal((await h.code().redeemCode(' flex-abcdefgh ')).success, false);
  h.fail(undefined);
  assert.equal((await h.code().redeemCode(' flex-abcdefgh ')).success, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], 'redeem-code-v2');
  assert.equal(calls[0][1].code, 'FLEX-ABCDEFGH');
  assert.equal(h.values.get('@user_premium'), undefined);
  assert.equal(h.values.get('@flexbreak:premium_expiry_date'), '2026-10-01T00:00:00Z');
  assert.equal((await h.storage.getEntitlementSnapshot()).source, 'promo');
});

test('server discount preserves verification cache without granting premium', async () => {
  const h = harness({}, { backend: async () => ({ codeType: 'discount', discountType: 'office', message: 'Discount' }) });
  const result = await h.code().redeemCode('FLEX-ABCDEFGH', 'PERSON@EXAMPLE.COM');
  assert.equal(result.success, true);
  assert.equal(h.values.get('@flexbreak:verification_status'), 'verified');
  assert.equal(h.values.get('@flexbreak:user_type'), 'office');
  assert.equal(await h.storage.getIsPremium(), false);
});
