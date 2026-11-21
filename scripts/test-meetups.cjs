// Compile the pure TypeScript modules with the project's pinned compiler, then
// run Node's built-in tests. No simulator or additional test library is needed.
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const output = mkdtempSync(path.join(tmpdir(), 'hokie-trade-tests-'));

// Only pure modules are compiled here. Rendering .tsx components would require
// the React Native preset, which the prototype deliberately does not install.
const modules = ['model', 'meetingView', 'viewState'];

try {
  const program = ts.createProgram(
    modules.map(name => path.join(root, `src/meetups/${name}.ts`)),
    {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      strict: true,
      skipLibCheck: true,
      types: [],
      outDir: output,
    },
  );
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
    const result = spawnSync(
      process.execPath,
      ['--test', 'tests/meetups.test.cjs', 'tests/meeting-tab.test.cjs'],
      {
        cwd: root,
        stdio: 'inherit',
        env: {
          ...process.env,
          HOKIE_MEETUP_MODEL: path.join(output, 'model.js'),
          HOKIE_MEETING_VIEW: path.join(output, 'meetingView.js'),
          HOKIE_VIEW_STATE: path.join(output, 'viewState.js'),
        },
      },
    );
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  }
} finally {
  rmSync(output, { recursive: true, force: true });
}
