import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';
import { main, previewInputs, validatePreviewBuild } from '../scripts/iphone-preview.mjs';

const expected = {
  projectId: 'e2f2f0ca-229d-4469-9de8-9f69b7f7a724', owner: 'crisnc100', slug: 'flexbreak', sourceSha: 'a'.repeat(40),
};
const build = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', status: 'FINISHED', platform: 'IOS',
  app: { id: expected.projectId, slug: expected.slug, ownerAccount: { name: expected.owner } },
  gitCommitHash: expected.sourceSha, buildProfile: 'preview', distribution: 'INTERNAL',
  isForIosSimulator: false, artifacts: { applicationArchiveUrl: 'https://example.com/signed-private-artifact' },
};
const app = { expo: { owner: expected.owner, slug: expected.slug, extra: { eas: { projectId: expected.projectId } } } };
const env = {
  GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main',
  GITHUB_RUN_ATTEMPT: '1', GITHUB_SHA: expected.sourceSha, EXPO_TOKEN: 'secret-token',
};
const url = `https://expo.dev/accounts/crisnc100/projects/flexbreak/builds/${build.id}`;

test('accepts the EAS 24 app schema and returns only the stable build page', () => {
  assert.equal(validatePreviewBuild(build, expected), url);
  assert.equal(validatePreviewBuild(build, { ...expected, buildId: build.id }), url);
  assert.throws(() => validatePreviewBuild(build, { ...expected, buildId: expected.projectId }));
});

test('rejects foreign, missing, unfinished, simulator and non-preview artifacts', () => {
  for (const change of [
    { id: '--latest' }, { id: 'x\nspoof' }, { app: undefined }, { app: { id: build.id } },
    { app: { ...build.app, slug: 'other' } }, { app: { ...build.app, ownerAccount: { name: 'other' } } },
    { gitCommitHash: 'b'.repeat(40) }, { platform: 'ANDROID' }, { buildProfile: 'production' },
    { distribution: 'STORE' }, { isForIosSimulator: true }, { isForIosSimulator: undefined },
    { status: 'IN_PROGRESS' }, { status: 'ERRORED' }, { status: 'CANCELED' }, { artifacts: {} },
  ]) assert.throws(() => validatePreviewBuild({ ...build, ...change }, expected));
});

test('requires fresh manual main dispatch, token and safe project/source inputs', () => {
  assert.deepEqual(previewInputs(env, app), expected);
  for (const change of [
    { GITHUB_ACTIONS: 'false' }, { GITHUB_EVENT_NAME: 'push' }, { GITHUB_REF: 'refs/heads/staging' },
    { GITHUB_RUN_ATTEMPT: '2' }, { GITHUB_SHA: 'bad' }, { EXPO_TOKEN: '' },
  ]) assert.throws(() => previewInputs({ ...env, ...change }, app));
  assert.throws(() => previewInputs(env, { expo: { ...app.expo, owner: 'x/../../injected' } }));
});

test('checks main freshness before exactly one awaited preview build, never submission', async () => {
  const calls = [], summaries = [];
  await main({ env, app, checkMain: async () => calls.push('fresh'), run: args => {
    calls.push(args);
    return { status: 0, stdout: JSON.stringify([build]) };
  }, summary: text => summaries.push(text) });
  assert.deepEqual(calls, ['fresh', ['build', '--platform', 'ios', '--profile', 'preview', '--wait', '--json', '--non-interactive']]);
  assert.match(summaries[0], /preview finished/);
  assert.ok(summaries[0].includes(url));
  assert.ok(!summaries[0].includes(build.artifacts.applicationArchiveUrl));
  assert.match(summaries[0], /production runtime environment.*remote iOS build number/);
  let called = false;
  await assert.rejects(main({ env, app, checkMain: async () => { throw new Error('stale'); }, run: () => { called = true; }, summary: () => {} }));
  assert.equal(called, false);
});

test('safe failure stages distinguish missing configuration from stale main without leaking errors', async () => {
  for (const [change, checkMain, stage] of [
    [{ EXPO_TOKEN: '' }, async () => {}, /failed at configuration/],
    [{}, async () => { throw new Error('secret-token'); }, /failed at current-main check/],
  ]) {
    let summary;
    await assert.rejects(main({ env: { ...env, ...change }, app, checkMain, run: () => assert.fail('must not build'), summary: text => { summary = text; } }));
    assert.match(summary, stage);
    assert.match(summary, /FlexBreak EAS build dashboard/);
    assert.doesNotMatch(summary, /secret-token/);
  }
});

test('failures expose only a verified build page or workflow-log guidance, never raw EAS output', async () => {
  for (const [result, linked] of [
    [{ status: 1, stdout: JSON.stringify([{ ...build, status: 'ERRORED' }]), stderr: 'secret-token' }, true],
    [{ status: 1, stdout: 'secret-token signed-private-artifact', stderr: 'secret-token' }, false],
    [{ status: 0, stdout: JSON.stringify([{ ...build, gitCommitHash: 'b'.repeat(40) }]) }, false],
    [{ status: 0, stdout: JSON.stringify([build, build]) }, false],
  ]) {
    let summary;
    await assert.rejects(main({ env, app, checkMain: async () => {}, run: () => result, summary: text => { summary = text; } }), /Preview failed/);
    assert.equal(summary.includes(url), linked);
    assert.doesNotMatch(summary, /secret-token|signed-private-artifact|preview finished/);
    assert.match(summary, /remote build may still be running/);
    if (!linked) assert.match(summary, /workflow’s logs/);
  }
});

test('workflow retains CI barrier, main restriction, isolated secret and shared non-canceling queue', () => {
  const workflow = yaml.load(readFileSync('.github/workflows/iphone-preview.yml', 'utf8'));
  const production = yaml.load(readFileSync('.github/workflows/auto-production.yml', 'utf8'));
  assert.deepEqual(Object.keys(workflow.on), ['workflow_dispatch']);
  assert.deepEqual(workflow.concurrency, production.concurrency);
  assert.equal(workflow.concurrency['cancel-in-progress'], false);
  assert.equal(workflow.jobs.quality.uses, './.github/workflows/ci.yml');
  assert.equal(workflow.jobs.quality.if, "github.ref == 'refs/heads/main'");
  assert.equal(workflow.jobs.preview.if, "github.ref == 'refs/heads/main'");
  assert.equal(workflow.jobs.preview.needs, 'quality');
  assert.equal(workflow.jobs.preview.environment, 'production');
  const steps = workflow.jobs.preview.steps;
  assert.equal(steps[0].with.ref, '${{ github.sha }}');
  assert.equal(steps[0].with['persist-credentials'], false);
  assert.equal(steps.at(-1).env.EXPO_TOKEN, '${{ secrets.EXPO_TOKEN }}');
});
