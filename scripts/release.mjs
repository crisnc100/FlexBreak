import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { assertCurrentMainSync } from './production-plan.mjs';
import { assertReleaseReady } from './release-readiness.mjs';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sha = /^[0-9a-f]{40}$/i;

export function validateInputs(env, app) {
  if (env.GITHUB_ACTIONS !== 'true' || !['push', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME) || env.GITHUB_REF !== 'refs/heads/main') {
    throw new Error('Release requires a GitHub Actions push or manual dispatch on main.');
  }
  if (!['ios', 'android'].includes(env.RELEASE_PLATFORM)) throw new Error('Invalid platform.');
  if (!['build-only', 'build-and-submit'].includes(env.RELEASE_ACTION)) throw new Error('Invalid release action.');
  if (!sha.test(env.GITHUB_SHA ?? '')) throw new Error('Invalid source SHA.');
  const projectId = app?.expo?.extra?.eas?.projectId;
  if (!uuid.test(projectId ?? '')) throw new Error('Invalid EAS project ID in app.json.');
  if (!env.EXPO_TOKEN?.trim()) throw new Error('EXPO_TOKEN is required.');
  if (env.RELEASE_PLATFORM === 'ios' && env.RELEASE_ACTION === 'build-and-submit') {
    if (!/^[0-9]+$/.test(env.ASC_APP_ID ?? '')) throw new Error('ASC_APP_ID must be the verified numeric App Store Connect ID.');
    if (!/^[A-Z0-9]{10}$/.test(env.APPLE_TEAM_ID ?? '')) throw new Error('APPLE_TEAM_ID must be the verified ten-character Apple team ID.');
  }
  return { platform: env.RELEASE_PLATFORM, action: env.RELEASE_ACTION, projectId, sourceSha: env.GITHUB_SHA };
}

export function validateBuildResult(json, { platform, projectId, sourceSha }) {
  const builds = JSON.parse(json);
  if (!Array.isArray(builds) || builds.length !== 1) throw new Error('Expected exactly one EAS build.');
  const build = builds[0];
  if (!build || !uuid.test(build.id ?? '')) throw new Error('Invalid build ID.');
  if (build.status !== 'FINISHED') throw new Error('EAS build did not finish successfully.');
  if (build.platform !== platform.toUpperCase()) throw new Error('Build platform mismatch.');
  if (build.project?.id !== projectId) throw new Error('Build project mismatch.');
  if (build.gitCommitHash !== sourceSha) throw new Error('Build source SHA mismatch.');
  if (build.buildProfile !== 'production' || build.distribution !== 'STORE' || build.isForIosSimulator === true) {
    throw new Error('Build is not a production store binary.');
  }
  if (!/^https:\/\//.test(build.artifacts?.applicationArchiveUrl ?? '')) throw new Error('Missing build artifact.');
  return build.id;
}

export function submissionConfig(config, platform, env) {
  const result = structuredClone(config);
  result.submit = {
    production: platform === 'ios'
      ? { ios: { ascAppId: env.ASC_APP_ID, appleTeamId: env.APPLE_TEAM_ID } }
      : { android: { track: 'internal' } },
  };
  return result;
}

function eas(args, capture = false) {
  assertCurrentMainSync();
  const result = spawnSync(resolve('node_modules/.bin/eas'), args, {
    env: process.env,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (capture && process.env.RUNNER_TEMP) writeFileSync(join(process.env.RUNNER_TEMP, 'flexbreak-build.json'), result.stdout ?? '');
  if (result.status !== 0) throw new Error(`EAS ${args[0]} failed (exit ${result.status}, signal ${result.signal}). Inspect EAS before retrying.`);
  return result.stdout;
}

export function main() {
  const env = process.env;
  const app = JSON.parse(readFileSync('app.json', 'utf8'));
  const inputs = validateInputs(env, app);
  assertReleaseReady(inputs.platform);
  const json = eas(['build', '--platform', inputs.platform, '--profile', 'production', '--wait', '--json', '--non-interactive'], true);
  const buildId = validateBuildResult(json, inputs);
  appendFileSync(env.GITHUB_STEP_SUMMARY, `Built ${inputs.platform} from ${inputs.sourceSha}. EAS build ID: ${buildId}.\n`);
  if (inputs.action === 'build-only') return;
  const originalConfig = readFileSync('eas.json', 'utf8');
  try {
    // EAS CLI reads eas.json from the project; this change exists only on the runner,
    // after the build, and is restored even when submission fails.
    writeFileSync('eas.json', JSON.stringify(submissionConfig(JSON.parse(originalConfig), inputs.platform, env), null, 2) + '\n');
    eas(['submit', '--platform', inputs.platform, '--profile', 'production', '--id', buildId, '--wait', '--non-interactive']);
    appendFileSync(env.GITHUB_STEP_SUMMARY, `EAS submission completed for ${buildId}: ${inputs.platform === 'ios' ? 'App Store Connect upload for TestFlight processing' : 'Google Play internal testing upload'}. Store processing, review and public release remain store-console steps.\n`);
  } finally {
    writeFileSync('eas.json', originalConfig);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
