import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertCurrentMain } from './production-plan.mjs';
import { submissionConfig, validateBuildResult } from './release.mjs';

const project = { projectId: 'e2f2f0ca-229d-4469-9de8-9f69b7f7a724', owner: 'crisnc100', slug: 'flexbreak' };
const dashboard = 'https://expo.dev/accounts/crisnc100/projects/flexbreak/builds';
const testflight = 'https://appstoreconnect.apple.com/apps/6743581671/testflight/ios';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function testflightInputs(env, app, config, cliVersion) {
  if (env.GITHUB_ACTIONS !== 'true' || !['push', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME) || env.GITHUB_REF !== 'refs/heads/main' || env.GITHUB_RUN_ATTEMPT !== '1' || env.GITHUB_REPOSITORY !== 'crisnc100/FlexBreak' || !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '')) {
    throw new Error('Requires a main push or fresh Run workflow in this repository.');
  }
  if (!env.EXPO_TOKEN?.trim() || env.ASC_APP_ID !== '6743581671' || env.APPLE_TEAM_ID !== '7LHNAAUJQ6') throw new Error('Missing or incorrect production account configuration.');
  if (app?.expo?.owner !== project.owner || app?.expo?.slug !== project.slug || app?.expo?.extra?.eas?.projectId !== project.projectId || app?.expo?.ios?.bundleIdentifier !== 'com.cristianortega.flexbreak') throw new Error('Unexpected app configuration.');
  const profile = config?.build?.production;
  if (cliVersion !== '24.0.0' || config?.cli?.version !== cliVersion || config?.cli?.appVersionSource !== 'remote' || profile?.distribution !== 'store' || profile?.environment !== 'production' || profile?.autoIncrement !== true || profile?.ios?.buildConfiguration !== 'Release' || profile?.ios?.simulator === true || profile?.developmentClient === true || profile?.extends) throw new Error('Unexpected production EAS configuration.');
  return { ...project, platform: 'ios', sourceSha: env.GITHUB_SHA };
}

// Establish identity before exposing even a failed build's dashboard link.
export function testflightBuildLink(build, expected) {
  if (!uuid.test(build?.id ?? '') || build?.app?.id !== expected.projectId || build?.app?.ownerAccount?.name !== expected.owner || build?.app?.slug !== expected.slug || build?.platform !== 'IOS' || build?.gitCommitHash !== expected.sourceSha || build?.buildProfile !== 'production' || build?.distribution !== 'STORE' || build?.isForIosSimulator !== false) throw new Error('Untrusted store build metadata.');
  return `${dashboard}/${build.id}`;
}

function eas(args, env) {
  // Never send signed artifact URLs, credentials or remote error text to Actions logs.
  return spawnSync(resolve('node_modules/.bin/eas'), args, {
    env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 20 * 1024 * 1024, timeout: 340 * 60 * 1000,
  });
}

export async function main({
  env = process.env, run = eas, checkMain = assertCurrentMain,
  app, cliVersion,
  configIO = { read: () => readFileSync('eas.json', 'utf8'), write: value => writeFileSync('eas.json', value) },
  summary = text => appendFileSync(env.GITHUB_STEP_SUMMARY, text),
} = {}) {
  let buildUrl;
  let stage = 'configuration (main push or fresh dispatch, app, production accounts and pinned CLI)';
  try {
    const original = configIO.read();
    const config = JSON.parse(original);
    const expected = testflightInputs(env, app ?? JSON.parse(readFileSync('app.json', 'utf8')), config, cliVersion ?? JSON.parse(readFileSync('node_modules/eas-cli/package.json', 'utf8')).version);
    stage = 'current-main check before build';
    await checkMain(env);
    stage = 'EAS production build';
    const built = await run(['build', '--platform', 'ios', '--profile', 'production', '--wait', '--json', '--non-interactive'], env);
    stage = 'EAS build metadata validation';
    const builds = JSON.parse(built.stdout);
    if (!Array.isArray(builds) || builds.length !== 1) throw new Error('Expected exactly one build.');
    buildUrl = testflightBuildLink(builds[0], expected);
    stage = 'EAS build completion';
    if (built.error || built.status !== 0) throw new Error('Build failed.');
    stage = 'finished store artifact validation';
    const buildId = validateBuildResult(built.stdout, expected);
    stage = 'current-main check before submission';
    await checkMain(env);
    try {
      stage = 'temporary submission configuration';
      configIO.write(JSON.stringify(submissionConfig(config, 'ios', env), null, 2) + '\n');
      stage = 'App Store Connect submission';
      const submitted = await run(['submit', '--platform', 'ios', '--profile', 'production', '--id', buildId, '--wait', '--non-interactive'], env);
      if (submitted.error || submitted.status !== 0) throw new Error('Submission failed.');
    } finally {
      // Restore exact bytes, including when the configuration write or submission throws.
      configIO.write(original);
    }
    summary(`TestFlight upload completed from ${expected.sourceSha}. [EAS build](${buildUrl}) · [Open TestFlight](${testflight}).\n\nApple processing is still required; existing tester groups and compliance setup may need attention in App Store Connect. This consumes an iOS build number. No App Review submission, public release, backend deployment or readiness change was performed.\n`);
  } catch {
    summary(`TestFlight qualification failed at ${stage}. ${buildUrl ? `[Inspect this EAS build](${buildUrl})` : `[Inspect the FlexBreak EAS build dashboard](${dashboard}); no trustworthy build link was returned`}. [Check App Store Connect](${testflight}) before a fresh Run workflow on main; do not use Re-run jobs. A remote build or upload may still be running.\n`);
    throw new Error('TestFlight qualification failed; inspect the summary and remote dashboards before retrying.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
