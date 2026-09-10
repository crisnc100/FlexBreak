import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoader } from './helpers/load-typescript.mjs';

const modules = 'src/utils/progress/modules/';
function harness({ challenge, boost, isolateChallenges = false } = {}) {
  let progress = { totalXP: 0, level: 1, statistics: { totalRoutines: 0, totalMinutes: 0, uniqueAreas: [], routinesByArea: {} }, rewards: boost ? { xp_boost: boost } : {}, challenges: challenge ? { example: challenge } : {}, achievements: {}, hasReceivedWelcomeBonus: false };
  const routines = [];
  const mocks = {
    'src/services/storageService': {
      getUserProgress: async () => structuredClone(progress),
      getAllRoutines: async () => structuredClone(routines),
      saveUserProgress: async value => { progress = structuredClone(value); return true; },
      saveRoutineProgress: async value => { routines.push(structuredClone(value)); return true; },
    },
    [modules + 'rewardManager']: { updateRewards: async value => value },
    [modules + 'flexSaveManager']: { refillMonthlyFlexSaves: async () => {} },
    [modules + 'achievementManager']: { updateAchievements: async () => {}, emitAchievementCompletions() {} },
    [modules + 'streakManager']: { completeRoutine: async () => {}, updateStoredStreak: async () => {}, streakEvents: { emit() {} } },
    [modules + 'progressTracker']: { calculateStreak: () => 1 },
    [modules + 'utils/cacheUtils']: { invalidateRoutineCache() {}, getCachedRoutines: async () => structuredClone(routines), invalidateChallengeCache() {} },
    'src/utils/soundEffects': { playXpBoostSound: async () => {} },
  };
  if (isolateChallenges) mocks[modules + 'challengeManager'] = { updateUserChallenges: async () => [] };
  return { load: createLoader({ mocks }), progress: () => progress, routines };
}

test('completion awards first and second daily XP, caps third, and grants welcome only once', async () => {
  const h = harness({ isolateChallenges: true });
  const engine = h.load('src/utils/progress/gameEngine.ts');
  const expected = [80, 140, 140, 230];
  const dates = ['2026-09-09T09:00:00', '2026-09-09T10:00:00', '2026-09-09T11:00:00', '2026-09-10T09:00:00'];
  const durations = ['5', '10', '15', '15'];
  for (let i = 0; i < dates.length; i++) {
    const result = await engine.processCompletedRoutine({ date: dates[i], duration: durations[i], area: 'Neck' });
    assert.equal(result.userProgress.totalXP, expected[i]);
    assert.equal(result.xpBreakdown.some(item => item.source === 'first_ever'), i === 0);
  }
  assert.equal(h.routines.length, 4);
  assert.equal(h.progress().statistics.totalRoutines, 4);
  assert.equal(h.progress().statistics.totalMinutes, 45);
  assert.equal(h.progress().hasReceivedWelcomeBonus, true);
});

test('active boost doubles routine XP while welcome remains 50 XP', async () => {
  const h = harness({ isolateChallenges: true, boost: { unlocked: true, uses: 0, xpBoostExpiry: '2026-09-10T12:00:00Z', xpBoostMultiplier: 2 } });
  const result = await h.load('src/utils/progress/gameEngine.ts').processCompletedRoutine({ date: '2026-09-09T09:00:00', duration: '10', area: 'Neck' });
  assert.equal(result.userProgress.totalXP, 170);
  assert.equal(result.xpBreakdown.find(item => item.source === 'first_ever').amount, 50);
});

test('level boundary changes only at threshold and reports intermediate progress', () => {
  const levels = harness().load(modules + 'levelManager.ts');
  assert.equal(levels.calculateLevel(249).level, 1);
  assert.equal(levels.calculateLevel(250).level, 2);
  assert.equal(levels.calculateLevel(375).progress, 0.5);
  assert.equal(levels.calculateLevel(1800).level, 6);
});

test('boost activation requires unlock and inventory; consumes one use for 36 hours', async () => {
  for (const boost of [{ unlocked: false, uses: 2 }, { unlocked: true, uses: 0 }]) {
    const h = harness({ boost });
    assert.equal((await h.load(modules + 'xpBoostManager.ts').activateXpBoost()).success, false);
    assert.equal(h.progress().rewards.xp_boost.uses, boost.uses);
  }
  const h = harness({ boost: { unlocked: true, uses: 1 } });
  const manager = h.load(modules + 'xpBoostManager.ts');
  assert.equal((await manager.activateXpBoost()).success, true);
  assert.equal(h.progress().rewards.xp_boost.uses, 0);
  assert.equal(h.progress().rewards.xp_boost.xpBoostExpiry, '2026-09-11T00:00:00.000Z');
  assert.equal(await manager.getCurrentXpMultiplier(), 2);
  assert.equal((await manager.activateXpBoost()).success, false);
});

test('challenge claim awards once and preserves the challenge until its cycle ends', async () => {
  const h = harness({ challenge: { id: 'example', category: 'daily', completed: true, claimed: false, xp: 40, expiryDate: '2026-09-10T12:00:00Z' } });
  const manager = h.load(modules + 'challengeManager.ts');
  assert.equal((await manager.claimChallenge('example')).xpEarned, 40);
  const second = await manager.claimChallenge('example');
  assert.equal(second.success, false);
  assert.equal(second.xpEarned, 0);
  assert.equal(h.progress().totalXP, 40);
  assert.equal(h.progress().challenges.example.history.length, 1);
  assert.deepEqual(Object.keys(h.progress().challenges), ['example']);
});

test('expired challenge halves XP before applying active boost', async () => {
  const h = harness({ challenge: { id: 'example', category: 'daily', completed: true, xp: 41, expiryDate: '2026-09-08T12:00:00Z' }, boost: { unlocked: true, uses: 0, xpBoostExpiry: '2026-09-10T12:00:00Z', xpBoostMultiplier: 2 } });
  const result = await h.load(modules + 'challengeManager.ts').claimChallenge('example');
  assert.equal(result.originalXp, 20);
  assert.equal(result.xpEarned, 40);
  assert.equal(h.progress().totalXP, 40);
});
