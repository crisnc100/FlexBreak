import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { main } from '../scripts/iphone-testflight.mjs';
import { assertReleaseReady } from '../scripts/release-readiness.mjs';

const source = 'a'.repeat(40);
const app = JSON.parse(readFileSync('app.json', 'utf8'));
const config = readFileSync('eas.json', 'utf8');
const env = {
  GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main',
  GITHUB_REPOSITORY: 'crisnc100/FlexBreak', GITHUB_RUN_ATTEMPT: '1', GITHUB_SHA: source,
  EXPO_TOKEN: 'private-token', ASC_APP_ID: '6743581671', APPLE_TEAM_ID: '7LHNAAUJQ6',
};
const build = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', status: 'FINISHED', platform: 'IOS',
  app: { id: app.expo.extra.eas.projectId, slug: 'flexbreak', ownerAccount: { name: 'crisnc100' } },
  gitCommitHash: source, buildProfile: 'production', distribution: 'STORE', isForIosSimulator: false,
  artifacts: { applicationArchiveUrl: 'https://example.com/private-signed-artifact' },
};
const buildResult = { status: 0, stdout: JSON.stringify([build]) };

async function exercise(overrides = {}) {
  const folder = mkdtempSync(join(tmpdir(), 'flexbreak-testflight-'));
  const path = join(folder, 'eas.json');
  const original = overrides.original ?? config;
  writeFileSync(path, original);
  const events = [], summaries = [];
  let error;
  try {
    await main({ env, app, cliVersion: '24.0.0',
      configIO: { read: () => readFileSync(path, 'utf8'), write: value => writeFileSync(path, value) },
      checkMain: async () => { events.push('fresh'); await overrides.checkMain?.(events); },
      run: async (args, actualEnv) => {
        events.push(args);
        assert.equal(actualEnv.EXPO_TOKEN, env.EXPO_TOKEN);
        if (args[0] === 'submit') {
          assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')).submit, { production: { ios: { ascAppId: env.ASC_APP_ID, appleTeamId: env.APPLE_TEAM_ID } } });
        }
        return overrides.run ? overrides.run(args) : args[0] === 'build' ? buildResult : { status: 0, stdout: 'private-token' };
      }, summary: text => summaries.push(text), ...overrides.inputs,
    });
  } catch (caught) { error = caught; }
  const restored = readFileSync(path, 'utf8');
  rmSync(folder, { recursive: true, force: true });
  assert.equal(restored, original, 'restore exact config bytes');
  assert.doesNotMatch(summaries.join('\n'), /private-token|private-signed-artifact/);
  return { events, summaries, error };
}

test('fresh checks bracket a production build and exact-ID submission with config restored', async () => {
  const result = await exercise();
  assert.equal(result.error, undefined);
  assert.deepEqual(result.events, ['fresh', ['build', '--platform', 'ios', '--profile', 'production', '--wait', '--json', '--non-interactive'], 'fresh', ['submit', '--platform', 'ios', '--profile', 'production', '--id', build.id, '--wait', '--non-interactive']]);
  assert.match(result.summaries[0], /TestFlight upload completed/);
  assert.match(result.summaries[0], /Apple processing is still required/);
  assert.match(result.summaries[0], /No App Review submission/);
});

test('configuration rejection happens before any remote operation', async () => {
  for (const change of [
    { GITHUB_ACTIONS: 'false' }, { GITHUB_EVENT_NAME: 'push' }, { GITHUB_REF: 'refs/heads/staging' },
    { GITHUB_RUN_ATTEMPT: '2' }, { GITHUB_REPOSITORY: 'other/FlexBreak' }, { GITHUB_SHA: 'bad' },
    { EXPO_TOKEN: '' }, { ASC_APP_ID: '' }, { ASC_APP_ID: '1234567' }, { APPLE_TEAM_ID: 'AAAAAAAAAA' },
  ]) {
    const result = await exercise({ inputs: { env: { ...env, ...change } } });
    assert.ok(result.error);
    assert.deepEqual(result.events, []);
    assert.match(result.summaries[0], /failed at configuration/);
  }
  for (const inputs of [
    { cliVersion: '25.0.0' }, { app: { expo: { ...app.expo, owner: 'other' } } },
    { app: { expo: { ...app.expo, ios: { bundleIdentifier: 'other.app' } } } },
  ]) assert.deepEqual((await exercise({ inputs })).events, []);
  for (const mutate of [
    c => { c.cli.version = 'latest'; }, c => { c.cli.appVersionSource = 'local'; },
    c => { c.build.production.distribution = 'internal'; }, c => { c.build.production.environment = 'preview'; },
    c => { c.build.production.ios.simulator = true; }, c => { c.build.production.autoIncrement = false; },
  ]) {
    const changed = JSON.parse(config); mutate(changed);
    const result = await exercise({ original: JSON.stringify(changed) });
    assert.ok(result.error);
    assert.deepEqual(result.events, []);
  }
});

test('stale main prevents build or submission at the relevant boundary', async () => {
  for (const boundary of [1, 2]) {
    const result = await exercise({ checkMain: events => {
      if (events.filter(item => item === 'fresh').length === boundary) throw new Error('private-token');
    } });
    assert.ok(result.error);
    assert.equal(result.events.filter(Array.isArray).length, boundary - 1);
    assert.match(result.summaries[0], /current-main check/);
  }
});

test('invalid, unfinished and failed build results cannot reach submission', async () => {
  for (const result of [
    { status: 1, stdout: JSON.stringify([build]) }, { ...buildResult, error: new Error('private-token') },
    { status: 0, stdout: 'private-token' }, { status: 0, stdout: '[]' }, { status: 0, stdout: JSON.stringify([build, build]) },
    ...[
      { id: '--latest' }, { app: undefined }, { app: { ...build.app, ownerAccount: { name: 'other' } } },
      { app: { ...build.app, slug: 'other' } }, { app: { ...build.app, id: build.id } },
      { gitCommitHash: 'b'.repeat(40) }, { platform: 'ANDROID' }, { distribution: 'INTERNAL' },
      { buildProfile: 'preview' }, { isForIosSimulator: true }, { isForIosSimulator: undefined },
      { status: 'ERRORED' }, { status: 'IN_PROGRESS' }, { artifacts: {} },
    ].map(change => ({ status: 0, stdout: JSON.stringify([{ ...build, ...change }]) })),
  ]) {
    const actual = await exercise({ run: () => result });
    assert.ok(actual.error);
    assert.equal(actual.events.filter(Array.isArray).length, 1);
    assert.doesNotMatch(actual.summaries[0], /upload completed/);
  }
});

test('failed builds expose only identity-validated links', async () => {
  for (const [change, linked] of [[{ status: 'ERRORED' }, true], [{ app: { ...build.app, slug: 'other' } }, false]]) {
    const result = await exercise({ run: () => ({ status: 1, stdout: JSON.stringify([{ ...build, ...change }]) }) });
    assert.equal(result.summaries[0].includes(`/builds/${build.id}`), linked);
  }
});

test('submission failure, timeout and thrown exceptions restore real config bytes and fail safely', async () => {
  for (const failure of [{ status: 1 }, { status: null, error: new Error('private-token') }, new Error('private-token')]) {
    const result = await exercise({ run: args => {
      if (args[0] === 'build') return buildResult;
      if (failure instanceof Error) throw failure;
      return failure;
    } });
    assert.ok(result.error);
    assert.match(result.summaries[0], /failed at App Store Connect submission/);
    assert.match(result.summaries[0], /remote build or upload may still be running/);
  }
});

test('workflow runs explicit guard and full CI before an isolated TestFlight upload', () => {
  const text = readFileSync('.github/workflows/iphone-testflight.yml', 'utf8');
  const workflow = yaml.load(text);
  const production = yaml.load(readFileSync('.github/workflows/auto-production.yml', 'utf8'));
  assert.deepEqual(Object.keys(workflow.on), ['workflow_dispatch']);
  assert.deepEqual(workflow.concurrency, production.concurrency);
  assert.equal(workflow.concurrency['cancel-in-progress'], false);
  assert.equal(workflow.jobs.dispatch.if, undefined);
  assert.match(workflow.jobs.dispatch.steps[0].run, /GITHUB_REF.*refs\/heads\/main/);
  assert.match(workflow.jobs.dispatch.steps[0].run, /exit 1/);
  assert.equal(workflow.jobs.quality.needs, 'dispatch');
  assert.equal(workflow.jobs.quality.uses, './.github/workflows/ci.yml');
  assert.equal(workflow.jobs.testflight.needs, 'quality');
  assert.equal(workflow.jobs.testflight.environment, 'production');
  assert.equal(workflow.jobs.testflight['timeout-minutes'], 360);
  const steps = workflow.jobs.testflight.steps;
  assert.equal(steps[0].with.ref, '${{ github.sha }}');
  assert.equal(steps[0].with['persist-credentials'], false);
  assert.deepEqual(steps.at(-1).env, { GITHUB_TOKEN: '${{ github.token }}', EXPO_TOKEN: '${{ secrets.EXPO_TOKEN }}', ASC_APP_ID: '${{ vars.ASC_APP_ID }}', APPLE_TEAM_ID: '${{ vars.APPLE_TEAM_ID }}' });
  assert.doesNotMatch(text, /SUPABASE|deploy-backend|release\.mjs|readiness/i);
  assert.throws(() => assertReleaseReady('ios'));
  const helper = readFileSync('scripts/iphone-testflight.mjs', 'utf8');
  assert.match(helper, /import \{ submissionConfig, validateBuildResult \} from '\.\/release.mjs'/);
  assert.match(helper, /stdio: \['ignore', 'pipe', 'pipe'\]/);
  assert.match(helper, /timeout: 340 \* 60 \* 1000/);
});


test('restoration failure cannot produce an upload-success summary', async () => {
  let writes = 0;
  const summaries = [];
  await assert.rejects(main({ env, app, cliVersion: '24.0.0',
    configIO: { read: () => config, write: () => { if (++writes === 2) throw new Error('private-token'); } },
    checkMain: async () => {}, run: args => args[0] === 'build' ? buildResult : { status: 0 },
    summary: text => summaries.push(text),
  }));
  assert.equal(writes, 2);
  assert.match(summaries[0], /qualification failed/);
  assert.doesNotMatch(summaries[0], /upload completed|private-token/);
});
