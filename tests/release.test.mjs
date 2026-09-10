import test from 'node:test';
import assert from 'node:assert/strict';
import { main, validateInputs, validateBuildResult, submissionConfig } from '../scripts/release.mjs';
import { assertNativeReady, assertReleaseReady, serviceReadiness, platformServiceReadiness } from '../scripts/release-readiness.mjs';

const projectId = 'e2f2f0ca-229d-4469-9de8-9f69b7f7a724';
const buildId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const sourceSha = 'a'.repeat(40);
const app = { expo: { extra: { eas: { projectId } } } };
const env = {
  GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main',
  GITHUB_SHA: sourceSha, RELEASE_PLATFORM: 'ios', RELEASE_ACTION: 'build-and-submit',
  EXPO_TOKEN: 'test-token', ASC_APP_ID: '1234567890', APPLE_TEAM_ID: 'ABCDEF1234',
};
const ready = { status: 'ready', evidence: 'Reviewed environment, source and device results' };
const platformServices = Object.fromEntries(Object.entries(platformServiceReadiness).map(([platform, records]) => [platform, Object.fromEntries(Object.keys(records).map(key => [key, ready]))]));
const expected = { platform: 'ios', projectId, sourceSha };
const build = {
  id: buildId, status: 'FINISHED', platform: 'IOS', project: { id: projectId },
  gitCommitHash: sourceSha, distribution: 'STORE', buildProfile: 'production',
  isForIosSimulator: false, artifacts: { applicationArchiveUrl: 'https://example.com/app.ipa' },
};

test('only a finished store artifact from the selected project, platform and SHA is accepted', () => {
  assert.equal(validateBuildResult(JSON.stringify([build]), expected), buildId);
  assert.equal(validateBuildResult(JSON.stringify([{ ...build, platform: 'ANDROID' }]), { ...expected, platform: 'android' }), buildId);
});

test('malformed, ambiguous and unsuccessful builds cannot become submissions', () => {
  for (const value of ['garbage', '{}', '[]', '[null]', JSON.stringify([build, build])]) {
    assert.throws(() => validateBuildResult(value, expected));
  }
  for (const change of [
    { status: 'ERRORED' }, { status: 'CANCELED' }, { status: 'IN_PROGRESS' },
    { id: '--latest' }, { platform: 'ANDROID' }, { project: { id: buildId } },
    { gitCommitHash: 'b'.repeat(40) }, { buildProfile: 'preview' },
    { distribution: 'INTERNAL' }, { isForIosSimulator: true }, { artifacts: {} },
  ]) assert.throws(() => validateBuildResult(JSON.stringify([{ ...build, ...change }]), expected));
});

test('inputs enforce trusted source and reject argument/output injection', () => {
  assert.deepEqual(validateInputs(env, app), { ...expected, action: 'build-and-submit' });
  for (const change of [
    { GITHUB_ACTIONS: 'false' }, { GITHUB_EVENT_NAME: 'pull_request' }, { GITHUB_REF: 'refs/heads/staging' },
    { GITHUB_SHA: 'bad\nvalue' }, { RELEASE_PLATFORM: 'ios; echo surprise' },
    { RELEASE_ACTION: '--latest' }, { EXPO_TOKEN: '' }, { ASC_APP_ID: '1\nother=value' },
    { ASC_APP_ID: '$(touch /tmp/bad)' }, { APPLE_TEAM_ID: 'abc' },
  ]) assert.throws(() => validateInputs({ ...env, ...change }, app));
  assert.throws(() => validateInputs(env, {}));
  assert.doesNotThrow(() => validateInputs({ ...env, RELEASE_PLATFORM: 'android', ASC_APP_ID: '', APPLE_TEAM_ID: '' }, app));
  assert.doesNotThrow(() => validateInputs({ ...env, RELEASE_ACTION: 'build-only', ASC_APP_ID: '', APPLE_TEAM_ID: '' }, app));
});

test('temporary submission configuration replaces conflicting targets without mutating original', () => {
  const config = { build: { production: { autoIncrement: true } }, submit: { production: { ios: { ascAppId: 'old' } } } };
  const before = structuredClone(config);
  assert.deepEqual(submissionConfig(config, 'ios', env).submit.production, { ios: { ascAppId: env.ASC_APP_ID, appleTeamId: env.APPLE_TEAM_ID } });
  assert.deepEqual(submissionConfig(config, 'android', env).submit.production, { android: { track: 'internal' } });
  assert.deepEqual(config, before);
});

test('known native blockers cannot be overridden by process environment', () => {
  for (const platform of ['ios', 'android']) assert.throws(() => assertNativeReady(platform), /Native release blocked/);
  assert.throws(() => assertNativeReady('ios', { ios: { status: 'ready', evidence: '' } }));
  assert.doesNotThrow(() => assertNativeReady('ios', { ios: { status: 'ready', evidence: 'Reviewed native build and physical-device report' } }));
});

test('candidate releases require every backend/account integration plus selected native evidence', () => {
  const native = { ios: { status: 'ready', evidence: 'Signed archive and device report' } };
  const services = Object.fromEntries(Object.keys(serviceReadiness).map(key => [key, {
    status: 'ready', evidence: 'Reviewed staging integration report with tested build and environment',
  }]));
  assert.throws(() => assertReleaseReady('ios', native), /Service release blocked/);
  assert.doesNotThrow(() => assertReleaseReady('ios', native, services, platformServices));
  for (const key of Object.keys(services)) {
    const missing = structuredClone(services);
    delete missing[key];
    assert.throws(() => assertReleaseReady('ios', native, missing), /Service release blocked/);
    missing[key] = { status: 'ready', evidence: ' ' };
    assert.throws(() => assertReleaseReady('ios', native, missing), /Service release blocked/);
  }
  assert.throws(() => assertReleaseReady('android', native, services, platformServices), /Native release blocked/);
});

test('trusted main push uses the same exact store submission validation', () => {
  assert.deepEqual(validateInputs({ ...env, GITHUB_EVENT_NAME: 'push' }, app), { ...expected, action: 'build-and-submit' });
});

test('working accounts and native builds cannot bypass the confirmed public privacy disclosure blocker', () => {
  const ready = { status: 'ready', evidence: 'Verified account or integration report' };
  const services = { anonymousAuth: ready, authenticatedBackend: ready, productionAccounts: ready };
  assert.throws(() => assertReleaseReady('ios', { ios: ready }, services), /privacyDisclosure/);
});


test('platform evidence is isolated and missing required platform keys fail closed', () => {
  const native = { ios: ready, android: ready };
  const services = Object.fromEntries(Object.keys(serviceReadiness).map(key => [key, ready]));
  const appleOnly = { ios: platformServices.ios };
  assert.doesNotThrow(() => assertReleaseReady('ios', native, services, appleOnly));
  assert.throws(() => assertReleaseReady('android', native, services, appleOnly), /android\/storeVerification/);
  for (const platform of ['ios', 'android']) {
    for (const key of Object.keys(platformServiceReadiness[platform])) {
      const missing = structuredClone(platformServices);
      delete missing[platform][key];
      assert.throws(() => assertReleaseReady(platform, native, services, missing), /Platform service release blocked/);
      missing[platform][key] = { status: 'ready', evidence: ' ' };
      assert.throws(() => assertReleaseReady(platform, native, services, missing), /Platform service release blocked/);
    }
  }
});

test('release main rejects Android before readiness or remote work even with ready evidence', () => {
  const services = Object.fromEntries(Object.keys(serviceReadiness).map(key => [key, ready]));
  assert.doesNotThrow(() => assertReleaseReady('android', { android: ready }, services, platformServices));
  const previous = { ...process.env };
  let checked = false;
  try {
    Object.assign(process.env, env, { RELEASE_PLATFORM: 'android' });
    assert.throws(() => main(platform => {
      checked = true;
      assertReleaseReady(platform, { android: ready }, services, platformServices);
    }), /Release policy blocks android/);
    assert.equal(checked, false);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  }
});
