import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertReleaseSigning } from '../scripts/check-android-signing.mjs';
import { addSigningGuard, signingGuard } from '../plugins/withReleaseSigningGuard.mjs';
const signed = { ready: true, name: 'release', keyAlias: 'verified-upload', storeFile: '/private/upload.jks' };
const fixture = new URL('./fixtures/android-public-debug.keystore', import.meta.url);

test('release validation rejects incomplete and debug credentials, including renamed public bytes', () => {
  for (const config of [null, { ...signed, ready: false }, { ...signed, storeFile: '' }, { ...signed, name: 'debug' }, { ...signed, keyAlias: 'androiddebugkey' }, { ...signed, storeFile: '/elsewhere/debug.keystore' }]) {
    assert.throws(() => assertReleaseSigning(config, () => Buffer.from('private fixture')));
  }
  assert.throws(() => assertReleaseSigning(signed, () => readFileSync(fixture)), /even renamed/);
  assert.throws(() => assertReleaseSigning(signed, () => { throw new Error('missing keystore'); }), /missing keystore/);
});

test('resolved custom/EAS credentials pass independently of runner environment', () => {
  assert.doesNotThrow(() => assertReleaseSigning(signed, () => Buffer.from('nonpublic signed-ready keystore fixture')));
});

test('plugin preserves custom Gradle and EAS include in either order and is idempotent', () => {
  const base = 'apply plugin: "com.android.application"\nandroid { buildTypes { release { signingConfig signingConfigs.debug } } }\n';
  const include = 'apply from: "./eas-build.gradle"\n';
  for (const source of [include + base, base + include]) {
    const generated = addSigningGuard(source);
    assert.equal(generated.slice(0, source.trimEnd().length), source.trimEnd());
    assert.equal(addSigningGuard(generated), generated);
  }
  // EAS may append its script after prebuild; a second prebuild must preserve it.
  const withLateInclude = addSigningGuard(base) + include;
  assert.equal(addSigningGuard(withLateInclude), withLateInclude);
  assert.throws(() => addSigningGuard(base + signingGuard.replace('whenReady', 'whenChanged')), /Unexpected/);
  assert.throws(() => addSigningGuard('plugins { id("com.android.application") }'), /Unsupported/);
});
