import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoader } from './helpers/load-typescript.mjs';

function harness(discountType = 'office') {
  const products = [{ productId: 'monthly', price: '$5' }, { productId: 'yearly', price: '$45' }, { productId: 'discount-monthly', price: '$3' }];
  const slots = [products, false, null, null, true, true, false, 'CODE'];
  let index = 0; const alerts = []; const timers = new Map(); let removed = 0; const writes = []; const selections = [];
  const react = { useState: value => { const i = index++; if (!(i in slots)) slots[i] = value; return [slots[i], next => { slots[i] = next; }]; }, useEffect() {} };
  const native = Object.fromEntries(['View','Text','TouchableOpacity','Modal','SafeAreaView','FlatList','ScrollView','ActivityIndicator','TextInput'].map(key => [key, key]));
  const load = createLoader({ globals: { __DEV__: false, setTimeout: (fn, delay) => { timers.set(delay, fn); return delay; }, clearTimeout: id => timers.delete(id) }, mocks: {
    'src/services/iapService': { PRODUCTS: { MONTHLY_SUB: 'monthly', YEARLY_SUB: 'yearly' }, getProductsForUser: type => { selections.push(type); return { monthly: type ? 'discount-monthly' : 'monthly', yearly: 'yearly' }; }, purchaseSubscription: async () => ({ success: false, error: 'cancelled' }), restorePurchases: async () => ({ success: false }) },
    'src/utils/soundEffects': {}, 'src/services/storageService': {},
    'src/context/PremiumContext': { usePremium: () => ({ isPremium: false, updateSubscription: async () => {} }) },
    'src/hooks/progress/useFeatureAccess': { useFeatureAccess: () => ({}) },
    'src/hooks/progress/useGamification': { useGamification: () => ({}), gamificationEvents: { emit() {} } },
    'src/context/ThemeContext': { useTheme: () => ({}) },
    'src/services/oneTimeCodeService': { oneTimeCodeService: { redeemCode: async () => ({ success: true, codeType: 'discount', discountType, message: 'Discount ready' }) } },
  }, externalMocks: {
    react, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': { ...native, StyleSheet: { create: value => value }, AppState: { addEventListener: () => ({ remove() { removed++; } }) }, Alert: { alert: (...args) => alerts.push(args) }, Linking: {} },
    '@expo/vector-icons': { Ionicons: 'Icon' },
    '@react-native-async-storage/async-storage': { setItem: async (...args) => writes.push(args) },
  } });
  const modal = load('src/components/SubscriptionModal.tsx').default;
  const render = () => { index = 0; return modal({ visible: true, onClose() {} }); };
  function nodes(value) { if (!value || typeof value !== 'object') return []; if (Array.isArray(value)) return value.flatMap(nodes); return [value, ...nodes(value.props?.children)]; }
  return { render, nodes, slots, alerts, timers, writes, selections, removed: () => removed, products };
}

for (const type of ['office', 'student']) test(`${type} code updates discounted product selection without overwriting service-owned verification cache`, async () => {
  const h = harness(type);
  const submit = h.nodes(h.render()).find(node => node.type === 'TouchableOpacity' && h.nodes(node).some(child => child.props?.children === 'Apply Code'));
  await submit.props.onPress(); await h.alerts[0][2][0].onPress();
  h.slots[0] = h.products; h.render();
  assert.equal(h.selections.at(-1), type); assert.equal(h.slots[2], 'verified'); assert.equal(h.slots[3], type);
  assert.deepEqual(h.writes, []);
});

test('failed purchase fallback clears busy state and listener even though click render was not busy', async () => {
  const h = harness();
  const plan = h.nodes(h.render()).find(node => typeof node.type === 'function' && node.props?.item?.productId === 'monthly');
  await plan.type(plan.props).props.onPress();
  assert.equal(h.slots[1], true); assert.ok(h.timers.has(10000));
  h.timers.get(10000)();
  assert.equal(h.slots[1], false); assert.equal(h.removed(), 1);
  assert.equal(h.alerts.at(-1)[0], 'Purchase Failed'); assert.equal(h.timers.size, 0);
});
