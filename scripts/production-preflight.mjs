import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateInputs } from './release.mjs';
import { deploymentPlan, cliVersion } from './deploy-backend.mjs';
import { assertReleaseReady } from './release-readiness.mjs';

export function preflightProduction(plan, env, config, checkReady = assertReleaseReady) {
  if (plan.backend) {
    if (env.HAS_SUPABASE_TOKEN !== 'true') throw new Error('Supabase deployment token missing.');
    deploymentPlan({ ...env, BACKEND_SELECTION: 'v2', SUPABASE_ACCESS_TOKEN: 'presence-checked' }, config.backend, env.GITHUB_SHA);
    if (config.supabaseVersion !== cliVersion) throw new Error('Unexpected Supabase CLI version.');
  }
  if (plan.mobile) {
    if (env.HAS_EXPO_TOKEN !== 'true') throw new Error('Expo deployment token missing.');
    if (config.easVersion !== '24.0.0' || config.eas.cli?.version !== '24.0.0' || config.eas.build?.production?.distribution !== 'store' || config.eas.build.production.environment !== 'production') throw new Error('Unexpected EAS production configuration/version.');
    for (const platform of ['ios', 'android']) {
      validateInputs({ ...env, RELEASE_PLATFORM: platform, RELEASE_ACTION: 'build-and-submit', EXPO_TOKEN: 'presence-checked' }, config.app);
      checkReady(platform);
    }
  }
}
export async function runMobile(run) {
  await run('ios');
  await run('android');
}
function main() {
  const plan = { backend: process.env.PLAN_BACKEND === 'true', mobile: process.env.PLAN_MOBILE === 'true' };
  const config = {};
  if (plan.backend) {
    config.backend = readFileSync('supabase/config.toml', 'utf8');
    const cli = spawnSync('supabase', ['--version'], { encoding: 'utf8' });
    if (cli.status !== 0) throw new Error('Cannot verify Supabase CLI version.');
    config.supabaseVersion = cli.stdout.trim();
  }
  if (plan.mobile) {
    config.app = JSON.parse(readFileSync('app.json', 'utf8'));
    config.eas = JSON.parse(readFileSync('eas.json', 'utf8'));
    config.easVersion = JSON.parse(readFileSync('node_modules/eas-cli/package.json', 'utf8')).version;
  }
  preflightProduction(plan, process.env, config);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
