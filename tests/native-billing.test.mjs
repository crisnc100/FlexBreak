import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoader } from './helpers/load-typescript.mjs';

const productId = 'flexbreak_monthly_4.99';
const purchase = { productId, id: 'transaction-1', purchaseState: 'purchased', purchaseToken: 'signed-store-proof', transactionDate: 1788955200000 };
const verified = { productId, platform: 'android', purchaseToken: purchase.purchaseToken, isActive: true, expiryDate: '2026-10-09T12:00:00Z', autoRenewing: true };
function harness({ response = verified, failUpdate = false, pendingState = false, verificationFailure = false, platform = 'android' } = {}) {
  const events = [];
  let listener;
  let request;
  const store = {
    initConnection: async () => true, endConnection: async () => {},
    purchaseUpdatedListener: callback => { listener = callback; return { remove() {} }; },
    purchaseErrorListener: () => ({ remove() {} }),
    fetchProducts: async () => [{ id: productId, title: 'Monthly', displayPrice: '$4.99', currency: 'USD', price: 4.99, subscriptionOffers: [{ offerTokenAndroid: 'eligible-offer' }] }],
    requestPurchase: async options => { request = options; queueMicrotask(() => listener({ ...purchase, purchaseState: pendingState ? 'pending' : 'purchased' })); return null; },
    getAvailablePurchases: async () => [purchase],
    finishTransaction: async options => { assert.equal(options.isConsumable, false); events.push('finish'); },
  };
  const load = createLoader({ mocks: {
    'src/services/storageService': { saveSubscriptionDetails: async () => { events.push('default-update'); return true; } },
    'src/services/security/backendClient': { callBackend: async (endpoint, body) => {
      events.push('verify'); assert.equal(endpoint, 'verify-purchase-v2'); assert.equal(body.purchaseToken, purchase.purchaseToken);
      if (verificationFailure) throw new Error('offline');
      return response;
    } },
  }, externalMocks: { 'expo-iap': store, 'react-native': { Platform: { OS: platform } } } });
  return { service: load('src/services/iapService.ts'), events, request: () => request, emit: value => listener(value), update: async () => {
    events.push('update'); if (failUpdate) throw new Error('storage failed');
  } };
}

test('subscription purchase uses eligible offer and persists verified access before acknowledgment', async () => {
  const h = harness();
  const result = await h.service.purchaseSubscription(productId, h.update);
  assert.equal(result.success, true);
  assert.deepEqual(h.events, ['verify', 'update', 'finish']);
  assert.equal(h.request().request.google.subscriptionOffers[0].offerToken, 'eligible-offer');
  assert.equal(result.subscriptionDetails.expiryDate, verified.expiryDate);
  await h.service.disconnectIAP();
});

test('pending store event and null request result cannot grant premium', async () => {
  const h = harness({ pendingState: true });
  const result = h.service.purchaseSubscription(productId, h.update);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(h.events, []);
  h.emit(purchase);
  assert.equal((await result).success, true);
  await h.service.disconnectIAP();
});

test('restore rejects expired, mismatched and unverifiable evidence without granting or finishing', async () => {
  for (const options of [
    { response: { ...verified, expiryDate: '2020-01-01T00:00:00Z' } },
    { response: { ...verified, productId: 'unrelated-product' } },
    { response: { ...verified, isActive: false } },
    { verificationFailure: true },
  ]) {
    const h = harness(options);
    const result = await h.service.restorePurchases(h.update);
    assert.equal(result.hasPurchases, false);
    assert.deepEqual(h.events, ['verify']);
    await h.service.disconnectIAP();
  }
});

test('failed entitlement persistence never acknowledges transaction', async () => {
  const h = harness({ failUpdate: true });
  assert.equal((await h.service.purchaseSubscription(productId, h.update)).success, false);
  assert.deepEqual(h.events, ['verify', 'update']);
  await h.service.disconnectIAP();
});

test('office and student users retain verified product selection and unknown SKUs are rejected', async () => {
  const h = harness();
  assert.equal(h.service.getProductsForUser('office').monthly, 'flexbreak_monthly_verified');
  assert.equal(h.service.getProductsForUser('student').yearly, 'flexbreak_yearly_verified');
  assert.equal(h.service.getProductsForUser(null).monthly, productId);
  assert.equal((await h.service.purchaseSubscription('fake', h.update)).success, false);
  assert.deepEqual(h.events, []);
});

test('malformed subscription answers fail restore instead of reporting definitive revocation', async () => {
  for (const patch of [{ isActive: undefined }, { isActive: 'false' }, { expiryDate: undefined }, { expiryDate: 'invalid' }, { purchaseDate: 'invalid' }]) {
    const h = harness({ response: { ...verified, ...patch } });
    const result = await h.service.restorePurchases(h.update);
    assert.equal(result.success, false); assert.equal(result.hasPurchases, false);
    assert.deepEqual(h.events, ['verify']); await h.service.disconnectIAP();
  }
});

test('Apple current allowlisted SKU can differ from proof SKU while proof token remains bound', async () => {
  const h = harness({ platform: 'ios', response: { ...verified, platform: 'ios', productId: 'flexbreak_yearly_44.99' } });
  const result = await h.service.restorePurchases(h.update);
  assert.equal(result.success, true);
  assert.equal(result.subscriptionDetails.productId, 'flexbreak_yearly_44.99');
  await h.service.disconnectIAP();
  const mismatch = harness({ response: { ...verified, purchaseToken: 'other-proof' } });
  assert.equal((await mismatch.service.restorePurchases(mismatch.update)).success, false);
  await mismatch.service.disconnectIAP();
});

test('background transaction uses durable default updater before a UI callback is installed', async () => {
  const h = harness(); await h.service.initializeIAP(); h.emit(purchase);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(h.events, ['verify', 'default-update', 'finish']);
  await h.service.disconnectIAP();
});

test('explicit user restores always verify again rather than sharing the automatic provider cooldown', async () => {
  const h = harness();
  assert.equal((await h.service.restorePurchases(h.update)).success, true);
  assert.equal((await h.service.restorePurchases(h.update)).success, true);
  assert.equal(h.events.filter(event => event === 'verify').length, 2);
  assert.equal(h.events.filter(event => event === 'finish').length, 1);
  await h.service.disconnectIAP();
});
