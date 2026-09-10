import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, updateDoc, deleteDoc, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore';

if (!process.env.FIRESTORE_EMULATOR_HOST?.startsWith('127.0.0.1:')) throw new Error('Tests require an explicit loopback Firestore emulator; never run against production.');
const root = new URL('../../', import.meta.url);
let phase0; let strict;
before(async () => {
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  phase0 = await initializeTestEnvironment({ projectId: 'demo-flexbreak-phase0', firestore: { host, port: Number(port), rules: readFileSync(new URL('firestore.phase0.rules', root), 'utf8') } });
  strict = await initializeTestEnvironment({ projectId: 'demo-flexbreak-strict', firestore: { host, port: Number(port), rules: readFileSync(new URL('firestore.rules', root), 'utf8') } });
});
after(async () => { await phase0?.cleanup(); await strict?.cleanup(); });
beforeEach(async () => { await phase0.clearFirestore(); await strict.clearFirestore(); });
const codeId = 'FLEX-ABCD2345';
const email = 'issued@example.com';
const codeData = (extra = {}) => ({ code: codeId, email, createdAt: '2026-09-01T00:00:00Z', createdBy: 'operator', expiresAt: '2030-01-01T00:00:00Z', expiresAtTimestamp: Timestamp.fromDate(new Date('2030-01-01')), used: false, type: 'discount', ...extra });
const token = uid => ({ token: 'ExponentPushToken[device-token]', device: 'ios', userId: uid, createdAt: serverTimestamp() });
const reminder = uid => ({ userId: uid, token: 'ExponentPushToken[device-token]', enabled: true, time: '09:00', frequency: 'weekdays', days: ['mon', 'tue'], message: 'Time to stretch', timeZoneOffset: 300, isPremium: false, premiumLevel: 0, updatedAt: serverTimestamp() });
const consume = () => ({ used: true, usedBy: email, usedAt: new Date().toISOString(), usedAtTimestamp: serverTimestamp() });
const verification = () => ({ email, verifiedAt: serverTimestamp(), verificationMethod: 'one_time_code', codeUsed: codeId, userType: 'office' });
async function seed(environment, path, value) {
  await environment.withSecurityRulesDisabled(async context => { await setDoc(doc(context.firestore(), path), value); });
}

test('phase0 denies collection enumeration and all direct email/premium/token reads', async () => {
  const db = phase0.unauthenticatedContext().firestore();
  for (const name of ['fcm_tokens', 'user_reminders', 'verifiedEmails', 'premiumUsers', 'oneTimeCodes']) {
    await assertFails(getDocs(collection(db, name)));
  }
  for (const name of ['fcm_tokens', 'user_reminders', 'verifiedEmails', 'premiumUsers']) await assertFails(getDoc(doc(db, name, 'known-id')));
  await seed(phase0, `oneTimeCodes/${codeId}`, codeData());
  assert.equal((await assertSucceeds(getDoc(doc(db, 'oneTimeCodes', codeId)))).exists(), true);
});

test('phase0 cannot mint/delete codes or alter immutable fields during redemption', async () => {
  const db = phase0.unauthenticatedContext().firestore();
  const ref = doc(db, 'oneTimeCodes', codeId);
  await assertFails(setDoc(ref, codeData()));
  await seed(phase0, `oneTimeCodes/${codeId}`, codeData());
  for (const field of [{ type: 'free_premium' }, { duration: 365000 }, { email: 'attacker@example.com' }, { expiresAtTimestamp: Timestamp.fromDate(new Date('2040-01-01')) }, { createdBy: 'attacker' }]) {
    await assertFails(updateDoc(ref, { ...consume(), ...field }));
  }
  await assertFails(updateDoc(ref, { ...consume(), usedBy: 'attacker@example.com' }));
  await assertFails(deleteDoc(ref));
  await assertSucceeds(updateDoc(ref, consume()));
  await assertFails(updateDoc(ref, consume()));
  await assertFails(updateDoc(ref, { used: false }));
});

test('phase0 requires genuine unexpired server timestamp and only one concurrent redemption wins', async () => {
  const db = phase0.unauthenticatedContext().firestore();
  const ref = doc(db, 'oneTimeCodes', codeId);
  const missing = codeData(); delete missing.expiresAtTimestamp;
  await seed(phase0, `oneTimeCodes/${codeId}`, missing);
  await assertFails(updateDoc(ref, consume()));
  await seed(phase0, `oneTimeCodes/${codeId}`, codeData({ expiresAtTimestamp: Timestamp.fromDate(new Date('2020-01-01')) }));
  await assertFails(updateDoc(ref, consume()));
  await seed(phase0, `oneTimeCodes/${codeId}`, codeData());
  const second = phase0.unauthenticatedContext().firestore();
  const results = await Promise.allSettled([updateDoc(ref, consume()), updateDoc(doc(second, 'oneTimeCodes', codeId), consume())]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
});

test('phase0 permits only intended-email, consumed-code-backed discount creation; no premium or overwrite', async () => {
  const db = phase0.unauthenticatedContext().firestore();
  const verifiedRef = doc(db, 'verifiedEmails', email);
  await assertFails(setDoc(verifiedRef, verification()));
  await seed(phase0, `oneTimeCodes/${codeId}`, codeData());
  await assertFails(setDoc(verifiedRef, verification()));
  const batch = writeBatch(db);
  batch.update(doc(db, 'oneTimeCodes', codeId), consume());
  batch.set(verifiedRef, verification());
  await assertSucceeds(batch.commit());
  await assertFails(setDoc(verifiedRef, verification()));
  await assertFails(setDoc(doc(db, 'verifiedEmails', 'attacker@example.com'), { ...verification(), email: 'attacker@example.com' }));
  await assertFails(setDoc(doc(db, 'premiumUsers', email), { email, isPremium: true, codeUsed: codeId }));
});

test('phase0 accepts bounded legacy writes but rejects malformed payload and cross-UID writes', async () => {
  const legacy = phase0.unauthenticatedContext().firestore();
  const legacyId = 'device_1789010000000_abc123';
  const legacyTokenId = 'device_ios_1789010000000';
  const legacyToken = { token: 'ExponentPushToken[legacy]', device: 'ios', anonymous: true, createdAt: serverTimestamp() };
  await assertSucceeds(setDoc(doc(legacy, 'fcm_tokens', legacyTokenId), legacyToken));
  await assertSucceeds(setDoc(doc(legacy, 'user_reminders', legacyId), reminder(legacyId)));
  await assertFails(setDoc(doc(legacy, 'fcm_tokens', legacyTokenId), { ...legacyToken, token: 'x'.repeat(4097) }));
  await assertFails(setDoc(doc(legacy, 'user_reminders', legacyId), { ...reminder(legacyId), message: 'x'.repeat(501) }));
  await assertFails(setDoc(doc(legacy, 'user_reminders', legacyId), { ...reminder(legacyId), time: '29:00' }));
  await assertFails(setDoc(doc(legacy, 'user_reminders', legacyId), { ...reminder(legacyId), days: ['mon', 'mon'] }));
  const alice = phase0.authenticatedContext('alice').firestore();
  await assertSucceeds(setDoc(doc(alice, 'fcm_tokens', 'alice'), token('alice')));
  await assertFails(setDoc(doc(alice, 'fcm_tokens', 'bob'), token('bob')));
  await assertFails(setDoc(doc(alice, 'user_reminders', 'bob'), reminder('bob')));
  await assertFails(setDoc(doc(legacy, 'fcm_tokens', 'alice'), token('alice')));
});

test('strict denies all client collections including authenticated former owners', async () => {
  const alice = strict.authenticatedContext('alice').firestore();
  const anonymous = strict.unauthenticatedContext().firestore();
  for (const db of [alice, anonymous]) {
    for (const name of ['fcm_tokens', 'user_reminders', 'oneTimeCodes', 'verifiedEmails', 'premiumUsers', 'serverEntitlements', 'quotas', 'unrecognized']) {
      await assertFails(getDoc(doc(db, name, 'alice')));
      await assertFails(getDocs(collection(db, name)));
      await assertFails(setDoc(doc(db, name, 'alice'), { userId: 'alice' }));
      await assertFails(deleteDoc(doc(db, name, 'alice')));
    }
  }
  await assertFails(setDoc(doc(alice, 'fcm_tokens', 'alice'), token('alice')));
  await assertFails(setDoc(doc(alice, 'user_reminders', 'alice'), reminder('alice')));
});
