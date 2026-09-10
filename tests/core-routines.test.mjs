import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoader } from './helpers/load-typescript.mjs';

test('generated routines honor premium access, demos, area, position and time budget', async () => {
  const stretch = (id, extra = {}) => ({ id, name: id, description: 'Hold gently.', duration: 30, tags: ['Neck'], position: 'Sitting', hasDemo: true, premium: false, ...extra });
  const catalog = [
    stretch('free-a'), stretch('free-b'), stretch('free-c'),
    stretch('premium', { premium: true }),
    stretch('no-demo', { hasDemo: false }),
    stretch('wrong-area', { tags: ['Hips & Legs'] }),
    stretch('wrong-position', { position: 'Lying' }),
  ];
  for (const premium of [false, true]) {
    const load = createLoader({ mocks: {
      'src/data/stretches': catalog,
      'src/utils/progress/modules/rewardManager': { isRewardUnlocked: async reward => { assert.equal(reward, 'premium_stretches'); return premium; } },
    } });
    const routine = await load('src/utils/generators/routineGenerator.ts').generateRoutine('Neck', '5', 'Sitting', undefined, 5);
    const moves = routine.filter(item => !item.isTransition);
    // The generator may repeat an eligible move to fill its four-stretch target.
    assert.equal(moves.length, 4);
    assert.deepEqual([...new Set(moves.map(item => item.id))].sort(), premium ? ['free-a', 'free-b', 'free-c', 'premium'] : ['free-a', 'free-b', 'free-c']);
    assert.equal(routine.at(-1).isTransition, undefined);
    assert.ok(routine.every(item => item.duration > 0));
    assert.ok(routine.reduce((total, item) => total + item.duration, 0) <= 300);
  }
});
