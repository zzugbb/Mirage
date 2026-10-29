import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const script = new URL('./check-public.mjs', import.meta.url).pathname;
const fixtures = [];
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'mirage-public-check-'));
  fixtures.push(dir);
  execFileSync('git', ['init', '-q', dir]);
  mkdirSync(join(dir, 'assets'));
  writeFileSync(join(dir, 'assets/manifest.json'), JSON.stringify({ schemaVersion: '1.0.0', assets: [] }));
  return dir;
}
function put(dir, name, content) {
  mkdirSync(join(dir, name, '..'), { recursive: true });
  writeFileSync(join(dir, name), content);
}
function run(dir, args = []) {
  return spawnSync(process.execPath, [script, ...args], { cwd: dir, encoding: 'utf8' });
}
function denied(result, reason) {
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, new RegExp(reason));
}
process.on('exit', () => fixtures.forEach(dir => rmSync(dir, { recursive: true, force: true })));

test('allows public documentation and excludes ignored local notes', () => {
  const dir = fixture();
  put(dir, '.gitignore', '.local/\n');
  put(dir, '.local/notes.md', ['/', 'Users', '/example/private'].join(''));
  put(dir, 'README.md', '# Public project\n');
  assert.equal(run(dir).status, 0);
});
test('rejects an absolute home directory in a candidate file', () => {
  const dir = fixture();
  put(dir, 'README.md', ['/', 'Users', '/example/private-project'].join(''));
  denied(run(dir), 'local-path');
});
test('rejects local reference markers without echoing private content', () => {
  const dir = fixture();
  const marker = ['CONFIDENTIAL', 'PROJECT'].join('_');
  put(dir, '.gitignore', '.local/\n');
  put(dir, '.local/publish-policy.json', JSON.stringify({ forbiddenPatterns: [marker] }));
  put(dir, 'README.md', marker);
  const result = run(dir);
  denied(result, 'private-reference');
  assert.ok(!result.stdout.includes(marker));
});
test('rejects local-only files force-added to the index', () => {
  const dir = fixture();
  put(dir, '.gitignore', '.local/\n');
  put(dir, '.local/note.md', 'private');
  execFileSync('git', ['add', '-f', '.local/note.md'], { cwd: dir });
  denied(run(dir, ['--staged']), 'private-file');
});
test('checks staged content even when the working copy was sanitized', () => {
  const dir = fixture();
  put(dir, 'README.md', ['/', 'home', '/example/private'].join(''));
  execFileSync('git', ['add', 'README.md'], { cwd: dir });
  put(dir, 'README.md', '# Now clean');
  denied(run(dir, ['--staged']), 'local-path');
});
test('rejects unregistered exported model bytes', () => {
  const dir = fixture();
  put(dir, 'device.glb', Buffer.from([0x67, 0x6c, 0x54, 0x46, 0, 0]));
  denied(run(dir), 'unregistered-asset');
});
test('rejects unapproved editable source models', () => {
  const dir = fixture();
  put(dir, 'source.blend', 'source');
  denied(run(dir), 'source-asset');
});
test('permits an explicitly approved asset with a matching digest and license', async () => {
  const { createHash } = await import('node:crypto');
  const dir = fixture();
  const data = Buffer.from('independently authored public demo');
  put(dir, 'assets/public/demo.glb', data);
  put(dir, 'LICENSE-ASSET-DEMO', 'Public demo license');
  put(dir, 'assets/manifest.json', JSON.stringify({
    schemaVersion: '1.0.0',
    assets: [{
      id: 'demo', path: 'assets/public/demo.glb', kind: 'model',
      rightsHolder: 'Example Author', source: 'Original public demonstration',
      license: 'CC0-1.0', licenseFile: 'LICENSE-ASSET-DEMO',
      sha256: createHash('sha256').update(data).digest('hex'),
      publicationApproved: true,
    }],
  }));
  assert.equal(run(dir).status, 0);
  put(dir, 'assets/public/demo.glb', 'changed');
  denied(run(dir), 'asset-hash');
});
test('rejects a symlink that would expose another file', async () => {
  const { symlinkSync } = await import('node:fs');
  const dir = fixture();
  put(dir, 'README.md', 'public');
  symlinkSync('README.md', join(dir, 'linked.md'));
  denied(run(dir), 'symlink');
});
test('fails closed on a malformed local policy', () => {
  const dir = fixture();
  put(dir, '.gitignore', '.local/\n');
  put(dir, '.local/publish-policy.json', '{');
  denied(run(dir), 'local-policy');
});
test('rejects a Windows home directory in documentation', () => {
  const dir = fixture();
  put(dir, 'README.md', ['C:', '\\', 'Users', '\\', 'example', '\\', 'private'].join(''));
  denied(run(dir), 'local-path');
});
test('requires the staged asset license, not an unstaged working copy', async () => {
  const { createHash } = await import('node:crypto');
  const dir = fixture();
  const data = Buffer.from('public model');
  put(dir, 'assets/public/demo.glb', data);
  put(dir, 'LICENSE-ASSET-DEMO', 'public license');
  put(dir, 'assets/manifest.json', JSON.stringify({
    schemaVersion: '1.0.0',
    assets: [{
      id: 'demo', path: 'assets/public/demo.glb', kind: 'model',
      rightsHolder: 'Example Author', source: 'Original demonstration',
      license: 'CC0-1.0', licenseFile: 'LICENSE-ASSET-DEMO',
      sha256: createHash('sha256').update(data).digest('hex'),
      publicationApproved: true,
    }],
  }));
  execFileSync('git', ['add', 'assets'], { cwd: dir });
  denied(run(dir, ['--staged']), 'asset-license');
  execFileSync('git', ['add', 'LICENSE-ASSET-DEMO'], { cwd: dir });
  assert.equal(run(dir, ['--staged']).status, 0);
  put(dir, 'assets/public/demo.glb', 'unstaged edit');
  assert.equal(run(dir, ['--staged']).status, 0);
});
test('rejects asset paths escaping the repository', () => {
  const dir = fixture();
  put(dir, 'assets/manifest.json', JSON.stringify({
    schemaVersion: '1.0.0',
    assets: [{ id: 'escape', path: '../outside.glb', kind: 'model' }],
  }));
  denied(run(dir), 'asset-record');
});
test('rejects unregistered visual media', () => {
  const dir = fixture();
  put(dir, 'preview.png', Buffer.from([137, 80, 78, 71]));
  denied(run(dir), 'unregistered-asset');
});

test('rejects malformed asset entries with a controlled diagnostic', () => {
  const dir = fixture();
  put(dir, 'assets/manifest.json', JSON.stringify({ schemaVersion: '1.0.0', assets: [null] }));
  denied(run(dir), 'asset-record');
});
test('public asset files are not excluded by the repository ignore rules', () => {
  const dir = fixture();
  put(dir, '.gitignore', readFileSync(new URL('../.gitignore', import.meta.url)));
  for (const path of ['assets/public/models/demo.glb', 'assets/public/source/demo.blend', 'assets/public/maps/demo.geojson']) {
    put(dir, path, 'public candidate');
    const result = spawnSync('git', ['check-ignore', '-q', path], { cwd: dir });
    assert.equal(result.status, 1, path + ' should be available for an ordinary git add');
  }
});
test('allows a rights-reviewed editable source in the public asset tree', async () => {
  const { createHash } = await import('node:crypto');
  const dir = fixture();
  const data = Buffer.from('source deliberately approved for publication');
  put(dir, 'assets/public/source/demo.blend', data);
  put(dir, 'ASSET-LICENSE', 'Separately licensed original asset');
  put(dir, 'assets/manifest.json', JSON.stringify({
    schemaVersion: '1.0.0',
    assets: [{
      id: 'public-source', path: 'assets/public/source/demo.blend', kind: 'model-source',
      rightsHolder: 'Example Author', source: 'Original, approved source edition',
      license: 'CC-BY-NC-4.0', licenseFile: 'ASSET-LICENSE',
      sha256: createHash('sha256').update(data).digest('hex'),
      publicationApproved: true,
    }],
  }));
  const result = run(dir);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
test('rejects registered model files outside the public asset tree', async () => {
  const { createHash } = await import('node:crypto');
  const dir = fixture();
  const data = Buffer.from('misplaced public model');
  put(dir, 'assets/demo.glb', data);
  put(dir, 'ASSET-LICENSE', 'Public asset terms');
  put(dir, 'assets/manifest.json', JSON.stringify({
    schemaVersion: '1.0.0',
    assets: [{
      id: 'demo', path: 'assets/demo.glb', kind: 'model',
      rightsHolder: 'Example Author', source: 'Original public demonstration',
      license: 'CC0-1.0', licenseFile: 'ASSET-LICENSE',
      sha256: createHash('sha256').update(data).digest('hex'),
      publicationApproved: true,
    }],
  }));
  denied(run(dir), 'asset-location');
});
test('rejects a private asset directory even if force-added', () => {
  const dir = fixture();
  put(dir, '.gitignore', 'assets/restricted/\n');
  put(dir, 'assets/restricted/private.glb', 'private');
  execFileSync('git', ['add', '-f', 'assets/restricted/private.glb'], { cwd: dir });
  execFileSync('git', ['add', 'assets/manifest.json'], { cwd: dir });
  denied(run(dir, ['--staged']), 'private-file');
});
test('rejects visual asset licenses outside the original-or-CC0 policy', async () => {
  const { createHash } = await import('node:crypto');
  const dir = fixture();
  const data = Buffer.from('external asset with an unwanted license');
  put(dir, 'assets/public/demo.glb', data);
  put(dir, 'ASSET-LICENSE', 'External attribution license');
  put(dir, 'assets/manifest.json', JSON.stringify({
    schemaVersion: '1.0.0',
    assets: [{
      id: 'external-demo', path: 'assets/public/demo.glb', kind: 'model',
      rightsHolder: 'Example Author', source: 'External demonstration',
      license: 'CC-BY-4.0', licenseFile: 'ASSET-LICENSE',
      sha256: createHash('sha256').update(data).digest('hex'),
      publicationApproved: true,
    }],
  }));
  denied(run(dir), 'asset-license-policy');
});
