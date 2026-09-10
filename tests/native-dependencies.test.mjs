import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { patchDependencies } from '../scripts/patch-native-dependencies.mjs';
const require = createRequire(import.meta.url);

test('dependency patches are idempotent and query parsing handles malformed escapes', () => {
  patchDependencies();
  patchDependencies();
  const query = require('query-string');
  assert.equal(query.parse('message=hello%20world').message, 'hello world');
  const malformed = '%E0%A4%A'.repeat(3000);
  const before = performance.now();
  assert.equal(typeof query.parse(`value=${malformed}`).value, 'string');
  assert.ok(performance.now() - before < 1000, 'malformed decoding must remain bounded');
  assert.equal(query.parse(query.stringify({ message: 'café + stretch' })).message, 'café + stretch');
});

test('actual EAS config generator preserves existing nested app data with patched merge', async () => {
  const root = mkdtempSync(join(tmpdir(), 'flexbreak-eas-merge-'));
  try {
    writeFileSync(join(root, 'app.json'), JSON.stringify({ expo: { version: '2.0.1', ios: { supportsTablet: true }, plugins: ['custom-plugin'] } }));
    const { generateAppConfigAsync } = require('eas-cli/build/commandUtils/new/projectFiles.js');
    await generateAppConfigAsync(root, { id: 'e2f2f0ca-229d-4469-9de8-9f69b7f7a724', slug: 'flexbreak', name: 'FlexBreak', ownerAccount: { name: 'crisnc100' } });
    const result = JSON.parse(readFileSync(join(root, 'app.json'))).expo;
    assert.equal(result.version, '2.0.1');
    assert.equal(result.ios.supportsTablet, true);
    assert.equal(result.ios.bundleIdentifier, 'com.crisnc100.flexbreak');
    assert.deepEqual(result.plugins, ['custom-plugin']);
    assert.equal(result.extra.eas.projectId, 'e2f2f0ca-229d-4469-9de8-9f69b7f7a724');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
