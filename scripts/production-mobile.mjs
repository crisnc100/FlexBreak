import { spawnSync } from 'node:child_process';
import { runMobile } from './production-preflight.mjs';
await runMobile(platform => {
  const result = spawnSync(process.execPath, ['scripts/release.mjs'], { stdio: 'inherit', env: { ...process.env, RELEASE_PLATFORM: platform, RELEASE_ACTION: 'build-and-submit' } });
  if (result.status !== 0) throw new Error(`${platform} build/upload failed; subsequent operations stopped. Retry with a fresh Run workflow after inspecting partial remote results.`);
});
