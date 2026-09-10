import { appendFileSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertCurrentMain } from './production-plan.mjs';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pathPart = /^[a-zA-Z0-9_-]+$/;

export function previewInputs(env, app) {
  const { owner, slug, extra } = app?.expo ?? {};
  const projectId = extra?.eas?.projectId;
  if (env.GITHUB_ACTIONS !== 'true' || env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || env.GITHUB_REF !== 'refs/heads/main' || env.GITHUB_RUN_ATTEMPT !== '1') {
    throw new Error('Use a fresh Run workflow on main.');
  }
  if (!/^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '') || !uuid.test(projectId ?? '') || !pathPart.test(owner ?? '') || !pathPart.test(slug ?? '')) {
    throw new Error('Invalid preview source or project configuration.');
  }
  if (!env.EXPO_TOKEN?.trim()) throw new Error('Configure EXPO_TOKEN in the production environment.');
  return { projectId, owner, slug, sourceSha: env.GITHUB_SHA };
}

// EAS CLI 24 returns GraphQL BuildFragment: project identity is under app.
export function validatePreviewBuild(build, expected, { finished = true } = {}) {
  if (!build || !uuid.test(build.id ?? '') || (expected.buildId && build.id !== expected.buildId)) throw new Error('Preview build ID mismatch.');
  if (build.app?.id !== expected.projectId || build.app?.ownerAccount?.name !== expected.owner || build.app?.slug !== expected.slug) throw new Error('Preview project mismatch.');
  if (build.platform !== 'IOS' || build.gitCommitHash !== expected.sourceSha || build.buildProfile !== 'preview' || build.distribution !== 'INTERNAL' || build.isForIosSimulator !== false) {
    throw new Error('Preview source, platform or profile mismatch.');
  }
  if (finished && build.status !== 'FINISHED') throw new Error('Preview build did not finish successfully.');
  if (finished && !/^https:\/\//.test(build.artifacts?.applicationArchiveUrl ?? '')) throw new Error('Missing preview artifact.');
  return `https://expo.dev/accounts/${expected.owner}/projects/${expected.slug}/builds/${build.id}`;
}

function eas(args) {
  // EAS output may contain signed download URLs, so neither stream is published.
  return spawnSync(resolve('node_modules/.bin/eas'), args, {
    env: process.env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 20 * 1024 * 1024, timeout: 340 * 60 * 1000,
  });
}

export async function main({ env = process.env, run = eas, checkMain = assertCurrentMain, app = JSON.parse(readFileSync('app.json', 'utf8')), summary = text => appendFileSync(env.GITHUB_STEP_SUMMARY, text) } = {}) {
  let buildUrl;
  let stage = 'configuration (fresh main dispatch, project settings and EXPO_TOKEN)';
  try {
    const expected = previewInputs(env, app);
    stage = 'current-main check (source must still match the main tip)';
    await checkMain(env);
    stage = 'EAS build';
    const result = run(['build', '--platform', 'ios', '--profile', 'preview', '--wait', '--json', '--non-interactive']);
    stage = 'EAS build metadata validation';
    let builds;
    try { builds = JSON.parse(result.stdout); } catch { throw new Error('EAS returned no readable preview metadata.'); }
    if (!Array.isArray(builds) || builds.length !== 1) throw new Error('Expected one preview build.');
    buildUrl = validatePreviewBuild(builds[0], expected, { finished: false });
    stage = 'EAS build completion';
    if (result.error || result.status !== 0) throw new Error('EAS preview build failed.');
    stage = 'finished preview artifact validation';
    validatePreviewBuild(builds[0], expected);
    summary(`iPhone preview finished from ${expected.sourceSha}. [Open build and install on a registered iPhone](${buildUrl}).\n\nThis uses the production runtime environment and consumes a remote iOS build number. No store submission or release gate change was performed.\n`);
  } catch {
    summary(`iPhone preview failed at ${stage}. ${buildUrl ? `[Inspect this EAS build](${buildUrl})` : 'Inspect this workflow’s logs and the [FlexBreak EAS build dashboard](https://expo.dev/accounts/crisnc100/projects/flexbreak/builds); no trustworthy build link was returned'}. Inspect prior EAS builds before a fresh Run workflow on main; do not use Re-run jobs. A remote build may still be running.\n`);
    // Never interpolate remote errors or JSON into Actions annotations or summaries.
    throw new Error('Preview failed; inspect the workflow summary and EAS dashboard before retrying.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
