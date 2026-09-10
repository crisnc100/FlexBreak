import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { collectTouchedPaths, classifyPaths } from '../scripts/production-plan.mjs';

test('reverted partial deployment still replays backend from checkpoint, including bootstrap', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'flexbreak-production-revert-'));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const commit = () => { git('add', '.'); git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-m', 'fixture'); return git('rev-parse', 'HEAD'); };
  try {
    git('init'); mkdirSync(join(cwd, 'supabase/functions/weather-v2'), { recursive: true });
    const file = join(cwd, 'supabase/functions/weather-v2/index.ts');
    writeFileSync(file, 'version A\n'); const checkpoint = commit();
    writeFileSync(file, 'version B partially deployed\n'); commit();
    writeFileSync(file, 'version A\n'); const head = commit();
    assert.equal(git('diff', '--name-only', checkpoint, head), '', 'endpoint diff loses the failed deployment');
    assert.deepEqual(classifyPaths(collectTouchedPaths(checkpoint, head, cwd)), { backend: true, mobile: false });
    assert.deepEqual(collectTouchedPaths(head, head, cwd), []);
    const mainBranch = git('branch', '--show-current');
    git('checkout', '-b', 'fixture-feature');
    mkdirSync(join(cwd, 'src'));
    git('mv', 'supabase/functions/weather-v2/index.ts', 'src/moved.ts'); commit();
    git('checkout', mainBranch);
    writeFileSync(join(cwd, 'README.md'), 'mainline documentation\n'); commit();
    git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'merge', '--no-ff', 'fixture-feature', '-m', 'fixture merge');
    const touched = collectTouchedPaths(head, git('rev-parse', 'HEAD'), cwd);
    assert.ok(touched.includes('supabase/functions/weather-v2/index.ts'));
    assert.ok(touched.includes('src/moved.ts'));
    assert.deepEqual(classifyPaths(touched), { backend: true, mobile: true });
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});
