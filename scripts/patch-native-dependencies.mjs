import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Remove each patch when the parent package ships support for the patched API.
// Fail closed on an unexpected upstream release rather than silently rewriting it.
const patches = [
  {
    package: 'query-string', version: '7.1.3', file: 'index.js',
    sha256: 'caa3f2c8b45dfe1e91db22ae10743af68de8d96f26515132bb52485ec0f037fa',
    before: "const decodeComponent = require('decode-uri-component');",
    after: "const decodeComponent = require('decode-uri-component').default;",
  },
  {
    package: 'eas-cli', version: '24.0.0', file: 'build/commandUtils/new/projectFiles.js',
    sha256: 'b61e6791d125d548662d8bd142adde7f2966d58f5bbcdc43346e710d2e02740d',
    before: 'const ts_deepmerge_1 = tslib_1.__importDefault(require("ts-deepmerge"));',
    after: 'const ts_deepmerge_1 = { default: require("ts-deepmerge").merge };',
  },
];
const hash = source => createHash('sha256').update(source).digest('hex');
export function patchDependencies(root = process.cwd()) {
  for (const patch of patches) {
    const directory = resolve(root, 'node_modules', patch.package);
    const manifest = JSON.parse(readFileSync(resolve(directory, 'package.json'), 'utf8'));
    if (manifest.version !== patch.version) throw new Error(`Review compatibility patch for ${patch.package}@${manifest.version}`);
    const file = resolve(directory, patch.file);
    const source = readFileSync(file, 'utf8');
    // Reconstruct the upstream text to recognize exactly the already-patched file.
    if (source.includes(patch.after) && hash(source.replace(patch.after, patch.before)) === patch.sha256) continue;
    if (hash(source) !== patch.sha256 || !source.includes(patch.before)) throw new Error(`Unexpected upstream source in ${file}`);
    writeFileSync(file, source.replace(patch.before, patch.after));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) patchDependencies();
