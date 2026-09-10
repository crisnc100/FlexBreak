import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoader } from './helpers/load-typescript.mjs';

function harness({ token = 'token', remoteFails = false, localFails = false, premiumLevel = 0, scheduleFailsAt = Infinity } = {}) {
  const values = new Map([['@flexbreak:device_id', 'existing-device']]);
  let scheduled = [
    { identifier: 'old-reminder', content: { data: { type: 'scheduled_reminder' } } },
    { identifier: 'old-premium', content: { data: { type: 'premium_reminder' } } },
    { identifier: 'ai', content: { data: { type: 'ai_wellness_checkin' } } },
    { identifier: 'weather', content: { data: { type: 'weather_motivational' } } },
  ];
  const remote = [];
  const firestore = () => ({ collection: name => ({ doc: id => ({ set: async (value, options) => { if (remoteFails) throw Error('network'); remote.push({ name, id, value, options }); } }) }) });
  firestore.FieldValue = { serverTimestamp: () => 'server-time' };
  const notifications = {
    SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval', WEEKLY: 'weekly' },
    getAllScheduledNotificationsAsync: async () => scheduled,
    cancelScheduledNotificationAsync: async id => { if (localFails) throw Error('OS cancellation'); scheduled = scheduled.filter(n => n.identifier !== id); },
    scheduleNotificationAsync: async request => { if (scheduled.filter(n => n.identifier.startsWith('new-')).length === scheduleFailsAt) throw Error('OS scheduling'); const id = `new-${scheduled.length}`; scheduled.push({ ...request, identifier: id }); return id; },
  };
  const loader = createLoader({ now: '2026-09-09T12:00:00Z', mocks: {
    'src/services/security/authSession': { getAuthenticatedUser: async () => ({ uid: 'authenticated-user' }) },
    'src/services/storageService': { getIsPremium: async () => premiumLevel > 0, getUserProgress: async () => ({ level: premiumLevel || 1 }) },
    'src/services/fcmTokenService': { getFCMToken: async () => token },
    'src/services/locationService': {},
    'src/services/weatherService': {},
    'src/utils/weatherUtils': {},
  }, externalMocks: {
    'firebase/compat/app': { firestore }, 'firebase/compat/firestore': {},
    '@react-native-async-storage/async-storage': { getItem: async key => values.get(key) ?? null, setItem: async (key, value) => values.set(key, value) },
    'expo-notifications': notifications,
  } });
  return { service: loader('src/services/reminderService.ts'), scheduled: () => scheduled, remote, values };
}
const settings = { enabled: true, time: '15:30', frequency: 'custom', days: ['mon', 'thu'], message: 'Stretch' };

test('disabling works offline and removes only reminder types without publishing a push token', async () => {
  const h = harness({ token: null });
  assert.equal(await h.service.saveReminderSettings({ ...settings, enabled: false }), true);
  assert.deepEqual(h.scheduled().map(n => n.identifier), ['ai', 'weather']);
  assert.equal(h.remote.length, 0);
});
for (const options of [{ token: null }, { remoteFails: true }]) {
  test(`real scheduler creates requested future local reminders independently of ${options.token === null ? 'missing token' : 'network error'}`, async () => {
    const h = harness(options);
    assert.equal(await h.service.saveReminderSettings(settings), true);
    const reminders = h.scheduled().filter(n => n.content.data.type === 'scheduled_reminder');
    assert.equal(reminders.length, 2);
    assert.deepEqual(reminders.map(n => n.content.data.dayOfWeek).sort(), [1, 4]);
    for (const notification of reminders) {
      const date = new Date(notification.content.data.scheduledFor);
      assert.equal(date.getHours(), 15);
      assert.equal(date.getMinutes(), 30);
      assert.ok(date > new Date('2026-09-09T12:00:00Z'));
      assert.equal(notification.trigger.type, 'weekly');
      assert.equal(notification.trigger.weekday, notification.content.data.dayOfWeek + 1);
      assert.equal(notification.trigger.hour, 15);
      assert.equal(notification.trigger.minute, 30);
    }
    assert.ok(h.scheduled().some(n => n.identifier === 'ai'));
    assert.ok(h.scheduled().some(n => n.identifier === 'weather'));
  });
}
test('OS cancellation error cannot report successful reminder disable', async () => {
  const h = harness({ localFails: true });
  h.values.set('firebase_reminder_enabled', 'true');
  assert.equal(await h.service.saveReminderSettings({ ...settings, enabled: false }), false);
  assert.ok(h.scheduled().some(n => n.identifier === 'old-reminder'));
  assert.equal(h.values.get('firebase_reminder_enabled'), 'true');
});

test('premium reminder repeats two hours later with correct day rollover', async () => {
  const h = harness({ premiumLevel: 3 });
  assert.equal(await h.service.saveReminderSettings({ ...settings, time: '23:30', days: ['sat'] }), true);
  const primary = h.scheduled().find(n => n.content.data.type === 'scheduled_reminder');
  const extra = h.scheduled().find(n => n.content.data.type === 'premium_reminder');
  assert.deepEqual(JSON.parse(JSON.stringify(primary.trigger)), { type: 'weekly', weekday: 7, hour: 23, minute: 30 });
  assert.deepEqual(JSON.parse(JSON.stringify(extra.trigger)), { type: 'weekly', weekday: 1, hour: 1, minute: 30 });
  assert.equal(h.remote.length, 0);
});
test('OS scheduling failure rolls back partial reminders and reports failure', async () => {
  const h = harness({ scheduleFailsAt: 1 });
  assert.equal(await h.service.saveReminderSettings(settings), false);
  assert.equal(h.values.get('firebase_reminder_enabled'), 'false');
  assert.deepEqual(h.scheduled().map(n => n.identifier), ['ai', 'weather']);
});
