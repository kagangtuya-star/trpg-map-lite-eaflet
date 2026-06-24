import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('dev server watcher is scoped to source files', async () => {
  const packageConfig = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));

  assert.equal(packageConfig.scripts['dev:server'], 'node --watch-path=server/src server/src/server.js');
});
