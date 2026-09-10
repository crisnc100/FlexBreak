import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../../', import.meta.url));

// Run real app modules in memory. Native/network dependencies must be explicitly
// mocked; never fall through to Node require or the user's persistent storage.
export function createLoader({ mocks = {}, externalMocks = {}, globals = {}, now = '2026-09-09T12:00:00Z' } = {}) {
  const cache = new Map();
  const replacements = new Map(Object.entries(mocks).map(([file, value]) => [path.resolve(root, file), value]));
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return new Date(now).getTime(); }
  }
  const context = vm.createContext({ Date: FixedDate, setTimeout, clearTimeout, console: { log() {}, warn() {}, error() {} }, ...globals });
  function load(file) {
    const absolute = path.resolve(root, file);
    if (replacements.has(absolute)) return replacements.get(absolute);
    const resolved = [absolute, `${absolute}.ts`, `${absolute}.json`].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (!resolved) throw new Error(`Cannot resolve test module: ${file}`);
    if (cache.has(resolved)) return cache.get(resolved).exports;
    const module = { exports: {} };
    cache.set(resolved, module);
    if (resolved.endsWith('.json')) {
      module.exports = JSON.parse(fs.readFileSync(resolved, 'utf8'));
      return module.exports;
    }
    const code = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
      fileName: resolved,
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const requireMock = specifier => {
      if (Object.hasOwn(externalMocks, specifier)) return externalMocks[specifier];
      if (!specifier.startsWith('.')) throw new Error(`Unmocked external dependency: ${specifier}`);
      return load(path.resolve(path.dirname(resolved), specifier));
    };
    const run = vm.runInContext(`(function(require, module, exports) {\n${code}\n})`, context, { filename: resolved });
    run(requireMock, module, module.exports);
    return module.exports;
  }
  return load;
}
