import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoader } from './helpers/load-typescript.mjs';

test('Posture Patrol initializes action callbacks without accessing an uninitialized callback', () => {
  const load = createLoader({
    externalMocks: {
      react: { useCallback: callback => callback },
      'react-native': { Dimensions: { get: () => ({ width: 390, height: 844 }) } },
    },
    mocks: { 'src/utils/haptics': {}, 'src/utils/soundEffects': {} },
  });
  const { useGameActions } = load('src/components/routine/minigames/PosturePatrol/hooks/useGameActions.ts');
  // Dependencies are evaluated during initialization, even though callbacks are
  // not executed. This caught handlePadFiring depending on handlePadHit before
  // that const was initialized. Native effects and game simulation are separate.
  const actions = useGameActions();
  for (const name of ['handlePadFiring', 'handlePadHit', 'updateGameLoop', 'endGame']) {
    assert.equal(typeof actions[name], 'function', name);
  }
});
