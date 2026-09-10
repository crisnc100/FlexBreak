import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoader } from './helpers/load-typescript.mjs';

test('opening free coach outside Wednesday does not consume the welcome message', async () => {
  const values = new Map([['enabled', 'true'], ['@user_id', 'user']]);
  const load = createLoader({
    now: '2026-09-10T12:00:00Z',
    mocks: { 'src/services/storageService': { KEYS: { AI_WELLNESS: { ENABLED: 'enabled' } }, getIsPremium: async () => false } },
    externalMocks: {
      'react-native': { Platform: { OS: 'ios' }, Linking: {} },
      '@react-native-async-storage/async-storage': {
        getItem: async key => values.get(key) ?? null,
        setItem: async () => assert.fail('navigation must not consume usage'),
      },
    },
  });
  const { canAccessFlexCoach } = load('src/utils/siriShortcuts.ts');
  assert.equal((await canAccessFlexCoach()).canAccess, true);
  assert.equal((await canAccessFlexCoach()).canAccess, true);
  values.set('@ai_wellness_first_used_user', 'true');
  assert.equal((await canAccessFlexCoach()).canAccess, false);
  values.set('enabled', 'false');
  assert.equal((await canAccessFlexCoach()).canAccess, false);
});
