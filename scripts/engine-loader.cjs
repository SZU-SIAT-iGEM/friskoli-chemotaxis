const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
function load(file) {
  file = path.resolve(__dirname, '../src/game', file);
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} }; cache.set(file, mod);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  new Function('require', 'module', 'exports', code)(name => load(name + '.ts'), mod, mod.exports);
  return mod.exports;
}
module.exports = load('engine.ts');
module.exports.loadGameModule = load;
