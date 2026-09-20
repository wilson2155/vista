#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

const cliPath = path.resolve(__dirname, '../packages/create-vista-app/bin/cli.js');
const cases = [
  ['engine before name', ['--engine', 'flashpack', 'requested-app'], 'requested-app', 'flashpack', 'npm'],
  ['package manager before name', ['--package-manager', 'pnpm', 'requested-app'], 'requested-app', 'default', 'pnpm'],
  ['both options before name', ['--engine', 'flashpack', '--package-manager', 'yarn', 'requested-app'], 'requested-app', 'flashpack', 'yarn'],
  ['name between options', ['--engine', 'flashpack', 'requested-app', '--package-manager', 'bun'], 'requested-app', 'flashpack', 'bun'],
  ['name first', ['requested-app', '--engine', 'flashpack', '--package-manager', 'pnpm'], 'requested-app', 'flashpack', 'pnpm'],
  ['inline options', ['--engine=flashpack', '--package-manager=pnpm', 'requested-app'], 'requested-app', 'flashpack', 'pnpm'],
  ['engine without name', ['--engine', 'flashpack'], 'my-vista-app', 'flashpack', 'npm'],
  ['package manager without name', ['--package-manager', 'pnpm'], 'my-vista-app', 'default', 'pnpm'],
  ['boolean flags before name', ['--src-dir', '--typed-api', 'requested-app'], 'requested-app', 'default', 'npm'],
];

for (const [label, args, name, engine, manager] of cases) {
  test(label, () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vista-cli-arguments-'));
    try {
      const result = spawnSync(process.execPath, [cliPath, ...args, '--skip-install', '--no-git', '--yes'], {
        cwd: tempRoot,
        encoding: 'utf8',
        env: { ...process.env, npm_config_user_agent: 'npm/11.0.0' },
        timeout: 15000,
      });
      assert.equal(result.status, 0, result.error?.message || result.stderr);
      assert.deepEqual(fs.readdirSync(tempRoot), [name], result.stdout);
      const projectDir = path.join(tempRoot, name);
      assert.equal(JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8')).name, name);
      assert.ok(fs.readFileSync(path.join(projectDir, 'vista.config.ts'), 'utf8').includes(`variant: '${engine}'`));
      assert.ok(result.stdout.includes(`Package manager: ${manager}`));
    } finally {
      const resolvedRoot = path.resolve(tempRoot);
      assert.equal(path.dirname(resolvedRoot), path.resolve(os.tmpdir()));
      assert.ok(path.basename(resolvedRoot).startsWith('vista-cli-arguments-'));
      fs.rmSync(resolvedRoot, { recursive: true, force: true });
    }
  });
}
