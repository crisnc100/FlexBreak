import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoader } from './helpers/load-typescript.mjs';

process.env.TZ = 'America/New_York';
const modules = 'src/utils/progress/modules/';
for (const [now, yesterday, oldest, excluded] of [
  ['2026-03-09T12:00:00-04:00', '2026-03-08T12:00:00-04:00', '2026-02-08T12:00:00-05:00', '2026-02-07T12:00:00-05:00'],
  ['2026-11-02T12:00:00-05:00', '2026-11-01T12:00:00-05:00', '2026-10-04T12:00:00-04:00', '2026-10-03T12:00:00-04:00'],
]) {
  test(`calendar activity crosses DST correctly at ${now.slice(0, 10)}`, () => {
    const tracker = createLoader({ now })(modules + 'progressTracker.ts');
    assert.deepEqual(Array.from(tracker.calculateWeeklyActivity([{ date: yesterday }])), [0, 0, 0, 0, 0, 1, 0]);
    assert.equal(tracker.calculateActiveDays([{ date: oldest }, { date: oldest }, { date: excluded }, { date: now }]), 2);
  });
}
function flexHarness(now, reward) {
  let progress = { level: 6, rewards: { flex_saves: { unlocked: true, ...reward } } };
  const saved = [];
  const load = createLoader({ now, mocks: {
    'src/services/storageService': { getAllRoutines: async () => [], getUserProgress: async () => structuredClone(progress), saveUserProgress: async value => { progress = structuredClone(value); saved.push(value); return true; } },
    [modules + 'utils']: { saveUserProgressWithVersionCheck: async value => { progress = structuredClone(value); saved.push(value); return true; } },
    'src/utils/soundEffects': {},
    'src/utils/featureAccessUtils': { canAccessFeature: async () => true },
  } });
  return { load, progress: () => progress, saved };
}

test('exhausted monthly saves stay exhausted across initialization and both refill APIs', async () => {
  const h = flexHarness('2026-09-09T12:00:00-04:00', { uses: 0, appliedDates: ['2026-09-03', '2026-09-05'], lastRefill: '2026-09-01T12:00:00-04:00' });
  const streak = h.load(modules + 'streakManager.ts');
  await streak.initializeStreak();
  assert.equal(streak.streakCache.flexSavesAvailable, 0);
  assert.equal(await streak.refillFlexSaves(), false);
  assert.equal(await h.load(modules + 'flexSaveManager.ts').refillMonthlyFlexSaves(), false);
  assert.equal(h.progress().rewards.flex_saves.uses, 0);
});
test('missing refill timestamp cannot override two recorded saves this month', async () => {
  const h = flexHarness('2026-09-09T12:00:00-04:00', { uses: 0, appliedDates: ['2026-09-03', '2026-09-05'] });
  assert.equal(await h.load(modules + 'flexSaveManager.ts').refillMonthlyFlexSaves(), false);
  assert.equal(h.progress().rewards.flex_saves.uses, 0);
});
test('new calendar month replenishes exactly two and repeated initialization does not add more', async () => {
  const h = flexHarness('2026-10-01T12:00:00-04:00', { uses: 0, appliedDates: ['2026-09-03', '2026-09-05'], lastRefill: '2026-09-01T12:00:00-04:00' });
  const streak = h.load(modules + 'streakManager.ts');
  await streak.initializeStreak();
  assert.equal(h.progress().rewards.flex_saves.uses, 2);
  await streak.initializeStreak();
  assert.equal(h.progress().rewards.flex_saves.uses, 2);
  assert.equal(await h.load(modules + 'flexSaveManager.ts').refillMonthlyFlexSaves(), false);
});
