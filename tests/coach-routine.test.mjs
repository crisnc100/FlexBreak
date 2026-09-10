import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoader } from './helpers/load-typescript.mjs';

function coachHarness({ seed, premium = false, transitionDuration = 10 }) {
  let state = seed;
  const math = Object.create(Math);
  math.random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const load = createLoader({
    globals: { Math: math },
    externalMocks: { '@react-native-async-storage/async-storage': {} },
    mocks: {
      'src/services/storageService': { getTransitionDuration: async () => transitionDuration },
      'src/utils/progress/modules/rewardManager': { isRewardUnlocked: async () => premium },
      'src/services/ai/aiDataLifecycle': {},
      'src/services/ai/integrations/secureAIService': {},
      'src/services/ai/contextBuilder': {},
      'src/services/ai/core/promptManager': {},
      'src/config/aiConfig': {},
      'src/services/ai/memory/memoryService': {},
      'src/services/ai/utils/costMonitor': {},
      'src/services/security/configValidator': {},
      'src/services/ai/utils/reliabilityService': {},
      'src/services/ai/core/conversationManager': {},
    },
  });
  // Real coach builder, parser, configuration, catalog, selector and postprocessor.
  // Only unrelated coach services and persistent premium/settings state are mocked.
  return load('src/services/ai/core/aiWellnessService.ts').default;
}

function assertPlayable(params, { premium, transitionDuration }) {
  assert.ok(params, 'coach must return a usable routine');
  assert.equal(params.includePremiumStretches, premium);
  assert.equal(params.transitionDuration, transitionDuration);
  const items = params.customStretches;
  const stretches = items.filter(item => !('isTransition' in item) && !('isRest' in item));
  assert.ok(stretches.length >= 3, 'routine must contain actual stretches');
  for (const stretch of stretches) {
    assert.ok(stretch.hasDemo && stretch.demoVideo && stretch.image, 'stretch must have curated media metadata');
    assert.ok(premium || !stretch.premium, 'free routines must contain only accessible stretches');
    assert.ok(stretch.duration > 0);
  }
  for (let index = 0; index < items.length; index++) {
    if (!('isTransition' in items[index])) continue;
    assert.ok(transitionDuration > 0);
    assert.equal(items[index].duration, transitionDuration);
    assert.ok(index > 0 && !('isTransition' in items[index - 1]), 'transition must follow a stretch');
    assert.ok(index < items.length - 1 && !('isTransition' in items[index + 1]), 'transition must lead to a stretch preview');
  }
  if (!transitionDuration) assert.equal(items.length, stretches.length);
}

test('free coach desk routines do not retain transitions around removed premium stretches', async () => {
  // Previously seed 1 started with a transition; seed 3 contained adjacent transitions.
  for (const seed of [1, 3]) {
    const options = { seed, premium: false, transitionDuration: 10 };
    const params = await coachHarness(options).buildRoutineFromInput('Give me one quick desk stretch');
    assertPlayable(params, options);
    assert.equal(params.duration, '5');
    assert.equal(params.area, 'Full Body');
    assert.equal(params.position, 'Sitting');
  }
});

test('coach retains transition settings and accessible premium routine generation', async () => {
  for (const premium of [false, true]) {
    for (const transitionDuration of [0, 10, 20]) {
      const options = { seed: 3, premium, transitionDuration };
      const params = await coachHarness(options).buildRoutineFromInput('Give me one quick desk stretch');
      assertPlayable(params, options);
      // This diagnosed seed includes a premium stretch at this transition length;
      // other duration settings can legitimately select only free stretches.
      if (premium && transitionDuration === 10) assert.ok(params.customStretches.some(item => item.premium), 'premium catalog must remain available');
    }
  }
});
