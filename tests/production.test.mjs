import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bootstrap, repository, workflowPath, validateProductionSource, selectCheckpoint, classifyPaths } from '../scripts/production-plan.mjs';
import { assertReleaseReady, serviceReadiness, platformServiceReadiness } from '../scripts/release-readiness.mjs';
import { preflightProduction, runMobile } from '../scripts/production-preflight.mjs';
const tip = 'a'.repeat(40), previous = 'b'.repeat(40);
const env = { GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/main', GITHUB_REPOSITORY: repository, GITHUB_RUN_ATTEMPT: '1', GITHUB_SHA: tip, HAS_EXPO_TOKEN: 'true', HAS_SUPABASE_TOKEN: 'true', ASC_APP_ID: '6743581671', APPLE_TEAM_ID: 'ABCDEFGHIJ' };
const run = (number, changes = {}) => ({ id: number, run_number: number, run_attempt: 1, workflow_id: 42, path: workflowPath, repository: { full_name: repository }, head_repository: { full_name: repository }, head_sha: tip, head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success', ...changes });
const current = { id: 3, sha: tip };
const history = [run(1, { head_sha: previous }), run(2, { conclusion: 'cancelled' }), run(3, { status: 'in_progress', conclusion: null })];

test('current main push and identical fresh dispatch are accepted; stale source and reruns fail', () => {
  assert.doesNotThrow(() => validateProductionSource(env, tip, tip));
  assert.doesNotThrow(() => validateProductionSource({ ...env, GITHUB_EVENT_NAME: 'workflow_dispatch' }, tip, tip));
  for (const change of [{ GITHUB_RUN_ATTEMPT: '2' }, { GITHUB_REF: 'refs/heads/dev' }, { GITHUB_REPOSITORY: 'other/repo' }, { GITHUB_EVENT_NAME: 'pull_request' }, { GITHUB_ACTIONS: 'false' }]) assert.throws(() => validateProductionSource({ ...env, ...change }, tip, tip));
  assert.throws(() => validateProductionSource(env, previous, tip), /Stale/);
  assert.throws(() => validateProductionSource(env, tip, previous), /Stale/);
});

test('checkpoint spans cancelled/failed runs and accepts identical successful dispatch/noop', () => {
  const pairs = [];
  assert.equal(selectCheckpoint(history, current, 42, (a, b) => { pairs.push([a, b]); return true; }), previous);
  assert.deepEqual(pairs, [[bootstrap, previous], [previous, tip]]);
  const retry = structuredClone(history); retry[1] = run(2, { event: 'workflow_dispatch' });
  assert.equal(selectCheckpoint(retry, current, 42, () => true), tip);
  const failed = structuredClone(history); failed[0].conclusion = 'failure';
  assert.equal(selectCheckpoint(failed, current, 42, () => true), bootstrap);
});

test('history validation rejects gaps/deletion, old workflow, foreign repository, malformed and nonancestor successes', () => {
  for (const change of [{ path: '.github/workflows/production.yml' }, { workflow_id: 9 }, { repository: { full_name: 'other/repo' } }, { head_repository: { full_name: 'fork/repo' } }, { head_sha: 'bad' }, { run_attempt: 2 }]) {
    const altered = structuredClone(history); Object.assign(altered[0], change);
    assert.throws(() => selectCheckpoint(altered, current, 42, () => true));
  }
  assert.equal(selectCheckpoint(history.slice(1), current, 42, () => true), bootstrap);
  const recent = [run(11, { head_sha: previous }), run(12, { status: 'in_progress', conclusion: null })];
  assert.equal(selectCheckpoint(recent, { id: 12, sha: tip }, 42, () => true), previous);
  assert.throws(() => selectCheckpoint([recent[0], run(13)], { id: 13, sha: tip }, 42, () => true));
  assert.throws(() => selectCheckpoint([], current, 42, () => true));
  assert.throws(() => selectCheckpoint(history, current, 42, (a) => a !== bootstrap));
  assert.throws(() => selectCheckpoint(history, current, 42, (a) => a !== previous));
  assert.throws(() => selectCheckpoint(history, { ...current, sha: previous }, 42, () => true));
});

test('cumulative path classification handles documentation, backend, mobile, unknown and rename/delete pairs', () => {
  assert.deepEqual(classifyPaths(['.github/README.md', '.github/PULL_REQUEST_TEMPLATE.md', '.github/ISSUE_TEMPLATE/bug.yml', 'docs/readme.md', 'tests/new.test.mjs', 'firestore.phase0.rules', 'firebase.strict.json']), { backend: false, mobile: false });
  assert.deepEqual(classifyPaths(['supabase/functions/weather-v2/index.ts', 'supabase/functions/ai-chat/index.ts']), { backend: true, mobile: false });
  assert.deepEqual(classifyPaths(['src/deleted.ts', 'scripts/check-android-signing.mjs']), { backend: false, mobile: true });
  assert.deepEqual(classifyPaths(['supabase/old.ts', 'src/moved.ts']), { backend: true, mobile: true });
  for (const path of ['.github/workflows/ci.yml', '.github/ISSUE_TEMPLATE/tool.js', 'unknown.conf', 'scripts/production-plan.mjs', 'scripts/release-platforms.mjs']) assert.deepEqual(classifyPaths([path]), { backend: true, mobile: true });
  for (const path of ['../bad', '/absolute', 'bad\npath']) assert.throws(() => classifyPaths([path]));
});

const config = { backend: readFileSync(new URL('../supabase/config.toml', import.meta.url), 'utf8'), app: JSON.parse(readFileSync(new URL('../app.json', import.meta.url))), eas: JSON.parse(readFileSync(new URL('../eas.json', import.meta.url))), supabaseVersion: '2.117.0', easVersion: '24.0.0' };
test('combined preflight checks iOS before callers can deploy; no-op needs no credentials', () => {
  const calls = [];
  assert.throws(() => { preflightProduction({ backend: true, mobile: true }, env, config, platform => { calls.push(platform); if (platform === 'ios') throw new Error('blocked device'); }); calls.push('deploy'); }, /blocked device/);
  assert.deepEqual(calls, ['ios']);
  assert.throws(() => preflightProduction({ backend: true, mobile: true }, env, config), /release blocked/);
  for (const change of [{ HAS_EXPO_TOKEN: 'false' }, { HAS_SUPABASE_TOKEN: 'false' }, { APPLE_TEAM_ID: '' }, { ASC_APP_ID: '' }]) assert.throws(() => preflightProduction({ backend: true, mobile: true }, { ...env, ...change }, config, () => {}));
  assert.throws(() => preflightProduction({ backend: true, mobile: true }, env, { ...config, easVersion: 'old' }, () => {}));
  assert.doesNotThrow(() => preflightProduction({ backend: true, mobile: false }, { ...env, HAS_EXPO_TOKEN: 'false' }, config));
  assert.doesNotThrow(() => preflightProduction({ backend: false, mobile: false }, {}, {}));
});

test('mobile execution awaits only iOS and propagates failure', async () => {
  const calls = [];
  await runMobile(async platform => { calls.push(platform); });
  assert.deepEqual(calls, ['ios']);
  calls.length = 0;
  await assert.rejects(runMobile(async platform => { calls.push(platform); throw new Error('upload failed'); }), /upload failed/);
  assert.deepEqual(calls, ['ios']);
});

test('actual workflow preflights before backend/mobile and isolates deployment tokens', async () => {
  const { default: yaml } = await import('js-yaml');
  const workflow = yaml.load(readFileSync(new URL('../.github/workflows/auto-production.yml', import.meta.url), 'utf8'));
  assert.equal(workflow.on.workflow_dispatch?.inputs, undefined);
  assert.ok(Object.hasOwn(workflow.on, 'workflow_dispatch'));
  for (const entry of Object.values(workflow.jobs)) {
    assert.equal(entry.env?.RELEASE_PLATFORM, undefined);
    for (const step of entry.steps ?? []) assert.equal(step.env?.RELEASE_PLATFORM, undefined);
  }
  assert.equal(workflow.env?.RELEASE_PLATFORM, undefined);
  const job = workflow.jobs.production;
  assert.equal(job.if, undefined, 'no-op production job must not be skipped');
  const commands = job.steps.filter(step => step.run);
  const preflight = commands.findIndex(step => step.run === 'node scripts/production-preflight.mjs');
  const backend = commands.findIndex(step => step.run === 'node scripts/deploy-backend.mjs');
  const mobile = commands.findIndex(step => step.run === 'node scripts/production-mobile.mjs');
  assert.ok(preflight >= 0 && backend > preflight && mobile > backend);
  assert.equal(commands[preflight].env.EXPO_TOKEN, undefined);
  assert.equal(commands[preflight].env.SUPABASE_ACCESS_TOKEN, undefined);
  assert.equal(commands[backend].env.EXPO_TOKEN, undefined);
  assert.equal(commands[mobile].env.SUPABASE_ACCESS_TOKEN, undefined);
  assert.equal(workflow.jobs.quality.secrets, undefined);
  const legacy = yaml.load(readFileSync(new URL('../.github/workflows/deploy-backend.yml', import.meta.url), 'utf8'));
  assert.notEqual(legacy.concurrency.group, workflow.concurrency.group);
});


test('iOS preflight needs no Google credentials or Android evidence and ignores platform env overrides', () => {
  const ready = { status: 'ready', evidence: 'Reviewed iOS integration and device results' };
  const services = Object.fromEntries(Object.keys(serviceReadiness).map(key => [key, ready]));
  const platformRecords = { ios: Object.fromEntries(Object.keys(platformServiceReadiness.ios).map(key => [key, ready])) };
  const calls = [];
  preflightProduction({ backend: true, mobile: true }, { ...env, RELEASE_PLATFORM: 'android', RELEASE_PLATFORMS: 'ios,android' }, config, platform => {
    calls.push(platform);
    assertReleaseReady(platform, { ios: ready }, services, platformRecords);
  });
  assert.deepEqual(calls, ['ios']);
  for (const key of Object.keys(serviceReadiness)) {
    const missing = { ...services };
    delete missing[key];
    assert.throws(() => preflightProduction({ backend: true, mobile: true }, env, config, platform => assertReleaseReady(platform, { ios: ready }, missing, platformRecords)), /Service release blocked/);
  }
});
