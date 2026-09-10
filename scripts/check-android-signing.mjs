import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const publicDebugKeystore = '221e0a3106aa4c3ccc154e0a418b55020b3f9ea6e84f92e8749cd9e2f39f5e58';
export function assertReleaseSigning(config, read = readFileSync) {
  if (!config || config.ready !== true || !config.storeFile || !config.keyAlias || !config.name) {
    throw new Error('Android release packaging requires a complete signing configuration.');
  }
  if (config.name.toLowerCase() === 'debug' || config.keyAlias.toLowerCase() === 'androiddebugkey' || basename(config.storeFile).toLowerCase() === 'debug.keystore') {
    throw new Error('Android release packaging cannot use debug signing.');
  }
  const bytes = read(config.storeFile);
  if (!bytes.length) throw new Error('Android release keystore is empty.');
  if (createHash('sha256').update(bytes).digest('hex') === publicDebugKeystore) {
    throw new Error('Android release packaging cannot use the public template keystore, even renamed.');
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { assertReleaseSigning(JSON.parse(process.env.FLEXBREAK_SIGNING_METADATA ?? 'null')); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
