import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

/** Compile local modules in memory so the tests need no build folder or tsx runner. */
export function loadTs(path, mocks = {}, cache = new Map()) {
  const filename = resolve(path);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} };
  cache.set(filename, module);
  const require = createRequire(filename);
  const localRequire = (specifier) => {
    if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
    if (specifier.startsWith("@/") || specifier.startsWith(".")) {
      const base = specifier.startsWith("@/") ? resolve(specifier.slice(2)) : resolve(dirname(filename), specifier);
      const target = [base, `${base}.ts`, `${base}.tsx`].find(file => existsSync(file));
      if (target) return loadTs(target, mocks, cache);
    }
    return require(specifier);
  };
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: filename,
  });
  new Function("require", "module", "exports", outputText)(localRequire, module, module.exports);
  return module.exports;
}
