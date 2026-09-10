import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deploymentPlan, executePlan, selections, projectRef } from '../scripts/deploy-backend.mjs';
const config = readFileSync(new URL('../supabase/config.toml', import.meta.url), 'utf8');
const sha = 'a'.repeat(40);
const env = { GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main', GITHUB_SHA: sha, SUPABASE_ACCESS_TOKEN: 'fixture', BACKEND_SELECTION: 'v2' };

test('deployment selects only named functions with fixed project and no auth override', () => {
  for (const selection of Object.keys(selections)) {
    const plan = deploymentPlan({ ...env, BACKEND_SELECTION: selection }, config, sha);
    assert.deepEqual(plan.map(p => p.name), selections[selection]);
    for (const item of plan) assert.deepEqual(item.args, ['functions', 'deploy', item.name, '--project-ref', projectRef, '--use-api', '--import-map', 'supabase/deno.json']);
  }
});

test('deployment rejects untrusted source, missing token and argument injection', () => {
  for (const change of [{ GITHUB_REF: 'refs/heads/dev' }, { GITHUB_EVENT_NAME: 'pull_request' }, { GITHUB_ACTIONS: 'false' }, { GITHUB_SHA: '--all' }, { SUPABASE_ACCESS_TOKEN: '' }, { BACKEND_SELECTION: 'v2; echo bad' }, { BACKEND_SELECTION: '__proto__' }]) {
    assert.throws(() => deploymentPlan({ ...env, ...change }, config, sha));
  }
  assert.throws(() => deploymentPlan(env, config, 'b'.repeat(40)));
});

test('manifest rejects project drift, JWT drift, unknown/missing/duplicate functions and custom entrypoints', () => {
  for (const changed of [config.replace(projectRef, 'other'), config.replace('verify_jwt = false', 'verify_jwt = true'), config.replace('[functions.weather-v2]\nverify_jwt = false', ''), config + '\n[functions.unknown]\nverify_jwt = false', config + '\n[functions.ai-chat-v2]\nverify_jwt = false', config + '\nentrypoint = "other.ts"']) {
    assert.throws(() => deploymentPlan(env, changed, sha));
  }
});

test('partial deployment fails immediately and reports only completed commands', () => {
  const plan = deploymentPlan(env, config, sha);
  const calls = [], reports = [];
  assert.throws(() => executePlan(plan, args => { calls.push(args); if (calls.length === 2) throw new Error('remote failed'); }, name => reports.push(name)), /remote failed/);
  assert.equal(calls.length, 2);
  assert.deepEqual(reports, [plan[0].name]);
});

test('push permits v2 but never legacy containment', () => {
  assert.equal(deploymentPlan({ ...env, GITHUB_EVENT_NAME: 'push' }, config, sha).length, 6);
  assert.throws(() => deploymentPlan({ ...env, GITHUB_EVENT_NAME: 'push', BACKEND_SELECTION: 'legacy-containment' }, config, sha), /manual only/);
});
