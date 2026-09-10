import { appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const repository = 'crisnc100/FlexBreak';
export const workflowPath = '.github/workflows/auto-production.yml';
export const bootstrap = '2adf4b6a70812507bcd3fe7165239661ebedff7d';
const shaPattern = /^[a-f0-9]{40}$/;

export function validateProductionSource(env, tip, checkedOutSha) {
  if (env.GITHUB_ACTIONS !== 'true' || !['push', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME) || env.GITHUB_REF !== 'refs/heads/main' || env.GITHUB_REPOSITORY !== repository) throw new Error('Production requires this repository and main push or dispatch.');
  if (env.GITHUB_RUN_ATTEMPT !== '1') throw new Error('Retry with Run workflow, never Re-run.');
  if (!shaPattern.test(env.GITHUB_SHA ?? '') || tip !== env.GITHUB_SHA || checkedOutSha !== env.GITHUB_SHA) throw new Error('Stale or mismatched source: dispatch a fresh run from current main.');
}

export function selectCheckpoint(runs, current, workflowId, isAncestor) {
  if (!Array.isArray(runs) || !runs.length || !Number.isSafeInteger(workflowId)) throw new Error('Missing workflow history.');
  const numbers = new Set(), ids = new Set();
  for (const run of runs) {
    if (!Number.isSafeInteger(run.id) || !Number.isSafeInteger(run.run_number) || run.run_number < 1 || ids.has(run.id) || numbers.has(run.run_number) || run.workflow_id !== workflowId || run.path !== workflowPath || run.repository?.full_name !== repository || run.head_repository?.full_name !== repository || !shaPattern.test(run.head_sha ?? '')) throw new Error('Invalid workflow history metadata.');
    ids.add(run.id); numbers.add(run.run_number);
  }
  if (!ids.has(current.id)) throw new Error('Missing current run metadata.');
  const ownRun = runs.find(run => run.id === current.id);
  if (ownRun.head_sha !== current.sha || ownRun.head_branch !== 'main' || !['push', 'workflow_dispatch'].includes(ownRun.event)) throw new Error('Current run metadata mismatch.');
  const candidates = runs.filter(run => run.id !== current.id && run.head_branch === 'main' && ['push', 'workflow_dispatch'].includes(run.event) && run.status === 'completed' && run.conclusion === 'success');
  candidates.sort((a, b) => b.run_number - a.run_number);
  const selected = candidates[0];
  // Only the window newer than the chosen checkpoint must be complete.
  // Older deleted runs cannot hide changes already covered by that checkpoint.
  if (selected) {
    const requiredNumbers = [...numbers].filter(number => number >= selected.run_number);
    if (Math.max(...numbers) - selected.run_number + 1 !== requiredNumbers.length) throw new Error('Incomplete/deleted relevant workflow history; reviewed recovery required.');
  }
  // Without a success, the reviewed bootstrap replays all touched paths conservatively.

  if (selected && selected.run_attempt !== 1) throw new Error('Rerun success cannot checkpoint production.');
  const checkpoint = selected?.head_sha ?? bootstrap;
  if (!isAncestor(bootstrap, checkpoint) || !isAncestor(checkpoint, current.sha)) throw new Error('Checkpoint ancestry invalid; refusing rollback or pre-bootstrap history.');
  return checkpoint;
}

export function classifyPaths(paths) {
  let backend = false, mobile = false;
  for (const path of paths) {
    if (typeof path !== 'string' || !path || path.startsWith('/') || path.split('/').includes('..') || /[\r\n\0]/.test(path)) throw new Error('Invalid changed path.');
    if (/^\.github\/(README\.md|PULL_REQUEST_TEMPLATE\.md)$/i.test(path) || /^\.github\/(ISSUE_TEMPLATE|PULL_REQUEST_TEMPLATE)\/[^/]+\.(md|ya?ml)$/i.test(path)) continue;
    if (path.startsWith('.github/')) { backend = mobile = true; continue; }
    if (/^(docs|builds|tests|security-tests|\.vscode|\.idea)\//.test(path) || /\.md$/i.test(path) || /^(firestore(?:\.[\w-]+)?\.(rules|json)|firebase(?:\.[\w-]+)?\.json)$/.test(path)) continue;
    if (path.startsWith('supabase/')) { backend = true; continue; }
    if (/^(src|assets|plugins)\//.test(path) || /^(App\.[jt]sx?|index\.[jt]s|app\.json|eas\.json|package(?:-lock)?\.json|babel\.config\.[cm]?js|metro\.config\.[cm]?js|tsconfig\.json|firebase\.config\.js|\.easignore)$/.test(path)) { mobile = true; continue; }
    if (path.startsWith('scripts/') && !/(production|deploy-backend|release)/.test(path)) { mobile = true; continue; }
    backend = mobile = true;
  }
  return { backend, mobile };
}

export async function github(path, env = process.env) {
  if (!env.GITHUB_TOKEN?.trim()) throw new Error('Missing GitHub metadata token.');
  const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, { headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`GitHub metadata failed (${response.status}); refusing deployment.`);
  return response.json();
}
function git(args, cwd) {
  const r = spawnSync('git', args, { encoding: 'utf8', cwd });
  if (r.status !== 0) throw new Error('Git history operation failed.');
  return r.stdout;
}
export function collectTouchedPaths(checkpoint, head, cwd) {
  if (!shaPattern.test(checkpoint) || !shaPattern.test(head)) throw new Error('Invalid touched-path source SHA.');
  const commits = git(['rev-list', '--first-parent', `${checkpoint}..${head}`], cwd).trim();
  const paths = new Set();
  for (const commit of commits ? commits.split('\n') : []) {
    // Union each mainline transition: endpoint equality must not hide a partial deploy then revert.
    const changed = git(['diff-tree', '--no-commit-id', '--name-only', '--no-renames', '-r', '-z', `${commit}^`, commit], cwd);
    for (const path of changed.split('\0').filter(Boolean)) paths.add(path);
  }
  return [...paths];
}
export async function assertCurrentMain(env = process.env) {
  const ref = await github('git/ref/heads/main', env);
  validateProductionSource(env, ref.object?.sha, git(['rev-parse', 'HEAD']).trim());
}
export function assertCurrentMainSync() {
  const result = spawnSync(process.execPath, [resolve('scripts/production-plan.mjs'), '--check-tip'], { stdio: 'inherit', env: process.env });
  if (result.status !== 0) throw new Error('Current-main precondition failed before remote mutation.');
}
export async function main() {
  await assertCurrentMain();
  if (process.argv[2] === '--check-tip') return;
  const env = process.env;
  const workflow = await github('actions/workflows/auto-production.yml');
  if (workflow.path !== workflowPath || !Number.isSafeInteger(workflow.id)) throw new Error('Unexpected production workflow.');
  const currentRun = await github(`actions/runs/${env.GITHUB_RUN_ID}`);
  const runs = [];
  let complete = false;
  for (let page = 1; page <= 100; page++) {
    const data = await github(`actions/workflows/${workflow.id}/runs?per_page=100&page=${page}`);
    if (!Number.isSafeInteger(data.total_count) || !Array.isArray(data.workflow_runs)) throw new Error('Malformed workflow history.');
    runs.push(...data.workflow_runs);
    const found = runs.some(run => run.id !== Number(env.GITHUB_RUN_ID) && run.head_branch === 'main' && ['push', 'workflow_dispatch'].includes(run.event) && run.status === 'completed' && run.conclusion === 'success');
    if (found || runs.length === data.total_count) { complete = true; break; }
    if (!data.workflow_runs.length || runs.length > data.total_count) throw new Error('Incomplete workflow history.');
  }
  if (!complete) throw new Error('Workflow history limit exceeded; reviewed recovery required.');
  if (!runs.some(run => run.id === currentRun.id)) runs.push(currentRun);
  const current = { id: Number(env.GITHUB_RUN_ID), sha: env.GITHUB_SHA };
  const checkpoint = selectCheckpoint(runs, current, workflow.id, (a, b) => {
    const r = spawnSync('git', ['merge-base', '--is-ancestor', a, b]);
    if (r.status !== 0 && r.status !== 1) throw new Error('Missing ancestry history.');
    return r.status === 0;
  });
  const plan = classifyPaths(collectTouchedPaths(checkpoint, env.GITHUB_SHA));
  appendFileSync(env.GITHUB_OUTPUT, `backend=${plan.backend}\nmobile=${plan.mobile}\n`);
  appendFileSync(env.GITHUB_STEP_SUMMARY, `Checkpoint ${checkpoint}; source ${env.GITHUB_SHA}; planned: ${plan.backend ? 'v2 backend ' : ''}${plan.mobile ? 'iOS upload for TestFlight processing' : ''}${!plan.backend && !plan.mobile ? 'none' : ''}.\n`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
