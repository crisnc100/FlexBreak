import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoader } from './helpers/load-typescript.mjs';

const modules = 'src/utils/progress/modules/';
function harness(initial = {}, { realRewards = false, realChallenges = false, storedBestStreak = 0 } = {}) {
  const values = new Map();
  let failure = () => false;
  let storeThenFail = false;
  let achievementFailure = false;
  let finalized = 0;
  const events = [];
  const progress = { totalXP: 0, level: 1, statistics: { totalRoutines: 0, totalMinutes: 0, currentStreak: 0, uniqueAreas: [], routinesByArea: {} }, rewards: {}, challenges: {}, achievements: {}, hasReceivedWelcomeBonus: false, ...initial };
  values.set('@user_progress', JSON.stringify(progress));
  const storage = {
    getItem: async key => { if (failure('read', key)) throw Error('disk read failure'); return values.get(key) ?? null; },
    setItem: async (key, value) => {
      if (failure('write', key, JSON.parse(value))) {
        if (storeThenFail) values.set(key, value);
        throw Error('disk write failure');
      }
      values.set(key, value);
    },
    removeItem: async key => values.delete(key),
  };
  const mocks = {
    'src/utils/clearAllNotifications': {},
    'src/utils/generators/routineGenerator': {},
    'src/hooks/progress/useGamification': { gamificationEvents: { emit: (...args) => events.push(args) } },
    [modules + 'rewardManager']: { updateRewards: async value => value },
    [modules + 'flexSaveManager']: { refillMonthlyFlexSaves: async () => {} },
    [modules + 'streakManager']: { completeRoutine: async () => { if (storedBestStreak) { const saved = JSON.parse(values.get('@user_progress')); saved.statistics.bestStreak = storedBestStreak; values.set('@user_progress', JSON.stringify(saved)); } }, updateStoredStreak: async () => {}, getStreakStatus: async () => ({ currentStreak: 1 }), checkStreakStatus: async () => ({ hasTodayActivity: true }), streakEvents: { emit() {} } },
    [modules + 'challengeManager']: { updateUserChallenges: async () => { if (achievementFailure) throw Error('finalization unavailable'); finalized++; return []; } },
    'src/utils/soundEffects': {},
  };
  if (realRewards) delete mocks[modules + 'rewardManager'];
  if (realChallenges) delete mocks[modules + 'challengeManager'];
  const load = () => createLoader({ mocks, externalMocks: { '@react-native-async-storage/async-storage': storage, 'react-native': { Platform: { OS: 'ios' } } }, globals: { setTimeout: fn => { fn(); return 0; } } });
  let loader = load();
  return {
    engine: () => loader('src/utils/progress/gameEngine.ts'),
    storage: () => loader('src/services/storageService.ts'),
    restart() { loader = load(); },
    fail(predicate, ambiguous = false) { failure = predicate; storeThenFail = ambiguous; },
    failFinalize(value) { achievementFailure = value; },
    finalized: () => finalized,
    progress: () => JSON.parse(values.get('@user_progress')),
    history: key => JSON.parse(values.get(key) || '[]'),
    values, events,
  };
}
const routine = (id = 'one', date = '2026-09-09T09:00:00') => ({ id, date, area: 'Neck', duration: '5' });

for (const historyKey of ['@progress', 'progress']) {
  test(`failed ${historyKey} write grants no XP; restart repairs partial history and awards once`, async () => {
    const h = harness();
    h.fail((op, key) => op === 'write' && key === historyKey);
    await assert.rejects(h.engine().processCompletedRoutine(routine()), /persist completed routine/);
    assert.equal(h.progress().totalXP, 0);
    assert.equal(h.progress().statistics.totalRoutines, 0);
    assert.equal(h.finalized(), 0);
    h.fail(() => false);
    h.restart();
    await h.engine().recoverPendingCompletions();
    assert.equal(h.progress().totalXP, 80);
    for (const key of ['@progress', 'progress']) assert.equal(h.history(key).length, 1);
    assert.equal(h.progress().statistics.totalRoutines, 1);
    const replay = await h.engine().processCompletedRoutine(routine());
    assert.equal(replay.xpBreakdown.length, 0);
    assert.equal(h.progress().totalXP, 80);
  });
}
for (const phase of ['pending', 'base', 'complete']) {
  for (const ambiguous of [false, true]) {
    test(`${phase} receipt write failure (stored=${ambiguous}) recovers without lost/duplicate awards`, async () => {
      const h = harness();
      h.fail((op, key, value) => op === 'write' && key === '@user_progress' && value.routineCompletions?.['routine:one']?.phase === phase, ambiguous);
      await assert.rejects(h.engine().processCompletedRoutine(routine()));
      h.fail(() => false);
      h.restart();
      // Explicit retry covers a pending intent that failed before ever reaching storage.
      await h.engine().processCompletedRoutine(routine());
      assert.equal(h.progress().totalXP, 80);
      assert.equal(h.progress().statistics.totalRoutines, 1);
      assert.equal(h.history('progress').length, 1);
      assert.equal(h.progress().routineCompletions['routine:one'].phase, 'complete');
    });
  }
}

test('base commit survives failed finalization; startup recovery finalizes and retains welcome/boost amount', async () => {
  const h = harness({ rewards: { xp_boost: { unlocked: true, xpBoostExpiry: '2026-09-10T12:00:00Z', xpBoostMultiplier: 2 } } });
  h.failFinalize(true);
  await assert.rejects(h.engine().processCompletedRoutine(routine()));
  assert.equal(h.progress().totalXP, 110);
  assert.equal(h.progress().routineCompletions['routine:one'].phase, 'base');
  h.failFinalize(false);
  h.restart();
  await h.engine().recoverPendingCompletions();
  assert.equal(h.progress().totalXP, 110);
  assert.equal(h.progress().routineCompletions['routine:one'].phase, 'complete');
});

test('same identity queued twice produces one history entry; distinct IDs at same timestamp obey daily cap', async () => {
  const h = harness();
  await Promise.all([h.engine().processCompletedRoutine(routine()), h.engine().processCompletedRoutine(routine())]);
  await h.engine().processCompletedRoutine(routine('two'));
  await h.engine().processCompletedRoutine(routine('three'));
  assert.equal(h.progress().totalXP, 110);
  assert.equal(h.progress().statistics.totalRoutines, 3);
  assert.equal(h.history('progress').length, 3);
});

test('read failure never overwrites history or grants XP from an empty fallback', async () => {
  const h = harness();
  h.values.set('progress', JSON.stringify([routine('historical')]));
  h.fail((op, key) => op === 'read' && key === 'progress');
  await assert.rejects(h.engine().processCompletedRoutine(routine('new')));
  assert.equal(h.progress().totalXP, 0);
  assert.equal(h.history('progress')[0].id, 'historical');
});

test('legacy timestamp identity does not re-award or unhide existing history', async () => {
  const h = harness({ totalXP: 80, statistics: { totalRoutines: 1, totalMinutes: 5, uniqueAreas: ['Neck'], routinesByArea: { Neck: 1 } } });
  const old = { date: '2026-09-01T09:00:00', area: 'Neck', duration: '5', hidden: true };
  h.values.set('progress', JSON.stringify([old]));
  h.values.set('@progress', JSON.stringify([old]));
  await h.engine().processCompletedRoutine(old);
  assert.equal(h.progress().totalXP, 80);
  assert.equal((await h.storage().getRecentRoutines()).length, 0);
  assert.equal((await h.storage().getAllRoutines()).length, 1);
});

test('achievement XP and completed flag commit together across failed final write', async () => {
  const h = harness({ achievements: { first: { id: 'first', type: 'routine_count', requirement: 1, progress: 0, completed: false, xp: 25 } } });
  h.fail((op, key, value) => op === 'write' && key === '@user_progress' && value.routineCompletions?.['routine:one']?.phase === 'complete');
  await assert.rejects(h.engine().processCompletedRoutine(routine()));
  assert.equal(h.progress().totalXP, 80);
  assert.equal(h.events.length, 0);
  h.fail(() => false);
  h.restart();
  await h.engine().recoverPendingCompletions();
  assert.equal(h.progress().totalXP, 105);
  assert.equal(h.progress().achievements.first.completed, true);
  assert.equal(h.events.length, 1);
  await h.engine().recoverPendingCompletions();
  assert.equal(h.progress().totalXP, 105);
});

test('reward-manager intermediate save includes achievement receipt state so final retry cannot award twice', async () => {
  const h = harness({ totalXP: 230, hasReceivedWelcomeBonus: true, achievements: { first: { id: 'first', type: 'routine_count', requirement: 1, progress: 0, completed: false, xp: 25 } } }, { realRewards: true });
  h.fail((op, key, value) => op === 'write' && key === '@user_progress' && value.routineCompletions?.['routine:one']?.phase === 'complete');
  await assert.rejects(h.engine().processCompletedRoutine(routine()));
  assert.equal(h.progress().totalXP, 285);
  assert.equal(h.progress().achievements.first.completed, true);
  assert.equal(h.progress().rewards.dark_theme.unlocked, true);
  assert.equal(h.progress().routineCompletions['routine:one'].phase, 'base');
  h.fail(() => false);
  h.restart();
  await h.engine().recoverPendingCompletions();
  assert.equal(h.progress().totalXP, 285);
});

test('actual challenge finalization remains claimable across receipt retry and never grants automatic claim XP', async () => {
  const h = harness({ challenges: { first: { id: 'first', category: 'daily', type: 'routine_count', requirement: 1, progress: 0, completed: false, claimed: false, xp: 40, expiryDate: '2026-09-10T12:00:00Z' } } }, { realChallenges: true });
  h.fail((op, key, value) => op === 'write' && key === '@user_progress' && value.routineCompletions?.['routine:one']?.phase === 'complete');
  await assert.rejects(h.engine().processCompletedRoutine(routine()));
  assert.equal(h.progress().challenges.first.completed, true);
  assert.equal(h.progress().challenges.first.claimed, false);
  assert.equal(h.progress().totalXP, 80);
  h.fail(() => false);
  h.restart();
  await h.engine().recoverPendingCompletions();
  assert.equal(h.progress().challenges.first.claimed, false);
  assert.equal(h.progress().totalXP, 80);
});

 test('a failing older receipt remains retryable without dropping a later routine', async () => {
  const h = harness();
  h.failFinalize(true);
  await assert.rejects(h.engine().processCompletedRoutine(routine('older')));
  h.failFinalize(false);
  h.fail((op, key, value) => op === 'write' && key === '@user_progress' && value.routineCompletions?.['routine:older']?.phase === 'complete');
  await h.engine().recoverPendingCompletions();
  await h.engine().processCompletedRoutine(routine('later', '2026-09-09T12:00:00'));
  assert.equal(h.progress().routineCompletions['routine:older'].phase, 'base');
  assert.equal(h.progress().routineCompletions['routine:later'].phase, 'complete');
  assert.equal(h.progress().statistics.totalRoutines, 2);
  const xp = h.progress().totalXP;
  h.fail(() => false); await h.engine().recoverPendingCompletions();
  assert.equal(h.progress().routineCompletions['routine:older'].phase, 'complete');
  assert.equal(h.progress().totalXP, xp);
});

test('final receipt preserves best streak persisted by the streak collaborator', async () => {
  const h = harness({}, { storedBestStreak: 17 });
  await h.engine().processCompletedRoutine(routine());
  assert.equal(h.progress().statistics.bestStreak, 17);
});
