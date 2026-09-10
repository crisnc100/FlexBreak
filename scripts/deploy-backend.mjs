import { appendFileSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertCurrentMainSync } from './production-plan.mjs';
import { spawnSync } from 'node:child_process';

export const projectRef = 'tkudukjujfztyiqijvjn';
export const cliVersion = '2.117.0';
export const selections = Object.freeze({
  v2: Object.freeze(['ai-chat-v2', 'transcribe-audio-v2', 'verify-email-v2', 'redeem-code-v2', 'verify-purchase-v2', 'weather-v2']),
  'legacy-containment': Object.freeze(['ai-chat-firebase', 'ai-chat', 'transcribe-audio', 'verify-email']),
});

export function deploymentPlan(env, config, checkedOutSha) {
  if (env.GITHUB_ACTIONS !== 'true' || !['push', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME) || env.GITHUB_REF !== 'refs/heads/main') {
    throw new Error('Backend deployment requires main push or manual dispatch.');
  }
  if (!/^[a-f0-9]{40}$/i.test(env.GITHUB_SHA ?? '') || checkedOutSha !== env.GITHUB_SHA) throw new Error('Source SHA mismatch.');
  if (!Object.hasOwn(selections, env.BACKEND_SELECTION ?? '')) throw new Error('Unknown deployment selection.');
  if (env.BACKEND_SELECTION === 'legacy-containment' && env.GITHUB_EVENT_NAME !== 'workflow_dispatch') throw new Error('Legacy containment is manual only.');
  if (!env.SUPABASE_ACCESS_TOKEN?.trim()) throw new Error('Missing deployment token.');
  // Deliberately accept only this small reviewed TOML manifest, not arbitrary CLI overrides.
  const known = new Set(Object.values(selections).flat());
  const seen = new Set();
  let section;
  let projectSeen = false;
  for (const raw of config.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    if (line === `project_id = "${projectRef}"` && !projectSeen && section === undefined) { projectSeen = true; continue; }
    const match = /^\[functions\.([a-z0-9-]+)\]$/.exec(line);
    if (match && projectSeen && known.has(match[1]) && !seen.has(match[1]) && section === undefined) { section = match[1]; continue; }
    if (line === 'verify_jwt = false' && section !== undefined) { seen.add(section); section = undefined; continue; }
    throw new Error('Unexpected backend manifest entry or JWT configuration.');
  }
  if (!projectSeen || section !== undefined || seen.size !== known.size) throw new Error('Incomplete backend manifest.');
  return selections[env.BACKEND_SELECTION].map(name => ({ name, args: ['functions', 'deploy', name, '--project-ref', projectRef, '--use-api', '--import-map', 'supabase/deno.json'] }));
}

export function executePlan(plan, run, report) {
  for (const { name, args } of plan) {
    run(args); // A failure stops subsequent deploys; prior successful deploys are not rolled back.
    report(name);
  }
}

function command(binary, args, capture = false) {
  const result = spawnSync(binary, args, { encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${binary} failed (${result.status ?? result.signal}); deployment may be partial. Inspect remote state before retrying.`);
  return result.stdout?.trim();
}

export function main() {
  const env = process.env;
  const plan = deploymentPlan(env, readFileSync('supabase/config.toml', 'utf8'), command('git', ['rev-parse', 'HEAD'], true));
  for (const { name } of plan) {
    if (!statSync(resolve('supabase/functions', name, 'index.ts')).isFile()) throw new Error(`Missing entrypoint: ${name}`);
  }
  if (command('supabase', ['--version'], true) !== cliVersion) throw new Error('Unexpected Supabase CLI version.');
  executePlan(plan, args => { assertCurrentMainSync(); command('supabase', args); }, name => {
    appendFileSync(env.GITHUB_STEP_SUMMARY, `Deployment command succeeded: ${name}, project ${projectRef}, source ${env.GITHUB_SHA}. Runtime health and secret correctness remain unverified.\n`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
