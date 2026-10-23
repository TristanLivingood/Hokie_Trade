// Compile the pure TypeScript model with the project's pinned compiler, then
// run Node's built-in tests. No simulator or additional test library is needed.
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const output = mkdtempSync(path.join(tmpdir(), 'hokie-trade-tests-'));

try {
  const program = ts.createProgram([path.join(root, 'src/meetups/model.ts')], {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    strict: true,
    skipLibCheck: true,
    types: [],
    outDir: output,
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) {
    console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (file) => file,
      getCurrentDirectory: () => root,
      getNewLine: () => '\n',
    }));
    process.exitCode = 1;
  } else {
    assert.equal(program.emit().emitSkipped, false);
    const result = spawnSync(process.execPath, ['--test', 'tests/meetups.test.cjs'], {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, HOKIE_MEETUP_MODEL: path.join(output, 'model.js') },
    });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  }
} finally {
  rmSync(output, { recursive: true, force: true });
}
