import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';

const staged = process.argv.includes('--staged');
if (process.argv.slice(2).some(arg => arg !== '--staged')) {
  console.error('Usage: node scripts/check-public.mjs [--staged]');
  process.exit(1);
}
const git = (args, encoding = 'utf8') =>
  execFileSync('git', args, { encoding, maxBuffer: 128 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
let root;
try {
  root = git(['rev-parse', '--show-toplevel']).trim();
} catch {
  console.error('Run this check inside a Git working tree.');
  process.exit(1);
}
const list = git(staged
  ? ['ls-files', '-z']
  : ['ls-files', '--cached', '--others', '--exclude-standard', '-z']);
const files = [...new Set(list.split('\0').filter(Boolean))].sort();
const candidates = new Set(files);
const issues = [];
const report = (file, reason) => issues.push({ file, reason });
const content = new Map();
const symlinks = new Set();
if (staged) {
  for (const row of git(['ls-files', '--stage', '-z']).split('\0').filter(Boolean)) {
    const tab = row.indexOf('\t');
    if (row.startsWith('120000 ')) symlinks.add(row.slice(tab + 1));
  }
}
const privateFile = /(^|\/)(\.local|\.private|\.scratch)(\/|$)|^assets\/(source|restricted|incoming)(\/|$)|(^|\/)\.env(?!\.example$)(\.|$)|\.(pem|key|p12|pfx|har|pcap|pcapng|dump|sqlite3?|db|zip|7z|tar|gz)$/i;
const sourceAsset = /\.(blend\d*|fbx|obj|mtl|step|stp|3ds|max|c4d|psd|psb|ai|exr|hdr)$/i;
const visualAsset = /\.(glb|gltf|stl|usd|usda|usdc|usdz|bin|png|jpe?g|webp|gif|svg|avif|ktx2?|basis|tga|tiff?|mp[34]|wav|ogg|webm|mov|ttf|otf|woff2?|geojson|topojson)$/i;
const localPath = /\/(?:Users|home)\/[^/\s]+|[A-Za-z]:[\\/]Users[\\/][^\\/\s]+/i;
let patterns = [];
const policyPath = join(root, '.local', 'publish-policy.json');
if (existsSync(policyPath)) {
  try {
    const policy = JSON.parse(readFileSync(policyPath, 'utf8'));
    if (!Array.isArray(policy.forbiddenPatterns)) throw Error('Invalid policy');
    patterns = policy.forbiddenPatterns.map(value => {
      if (typeof value !== 'string' || !value.trim()) throw Error('Invalid pattern');
      return new RegExp(value, 'iu');
    });
  } catch {
    report('.local/publish-policy.json', 'local-policy');
  }
}
for (const file of files) {
  if (privateFile.test(file)) {
    report(file, 'private-file');
    continue;
  }
  try {
    if (staged ? symlinks.has(file) : lstatSync(join(root, file)).isSymbolicLink()) {
      report(file, 'symlink');
      continue;
    }
    const data = staged ? git(['show', ':' + file], null) : readFileSync(join(root, file));
    content.set(file, data);
    if (localPath.test(file) || localPath.test(data.toString('utf8'))) report(file, 'local-path');
    if (patterns.some(pattern => pattern.test(file) || pattern.test(data.toString('utf8')))) {
      report(file, 'private-reference');
    }
  } catch {
    report(file, 'unreadable-file');
  }
}

const manifestPath = 'assets/manifest.json';
let assets = [];
try {
  const manifest = JSON.parse(content.get(manifestPath)?.toString('utf8') ?? '');
  if (manifest.schemaVersion !== '1.0.0' || !Array.isArray(manifest.assets)) throw Error('Invalid manifest');
  assets = manifest.assets;
} catch {
  report(manifestPath, 'asset-manifest');
}
const assetsByPath = new Map();
const assetIds = new Set();
for (const asset of assets) {
  if (!asset || typeof asset !== 'object' || Array.isArray(asset)) {
    report(manifestPath, 'asset-record');
    continue;
  }
  const validPath = typeof asset.path === 'string'
    && asset.path.length > 0 && !asset.path.includes('\\')
    && !posix.isAbsolute(asset.path) && !asset.path.split('/').includes('..')
    && posix.normalize(asset.path) === asset.path;
  const fields = ['id', 'kind', 'rightsHolder', 'source', 'license', 'licenseFile', 'sha256'];
  if (!validPath || fields.some(key => typeof asset[key] !== 'string' || !asset[key].trim())
    || asset.publicationApproved !== true || !/^[a-f0-9]{64}$/i.test(asset.sha256)
    || assetsByPath.has(asset.path) || assetIds.has(asset.id)) {
    report(manifestPath, 'asset-record');
    continue;
  }
  assetsByPath.set(asset.path, asset);
  assetIds.add(asset.id);
  if (!['CC-BY-NC-4.0', 'CC0-1.0'].includes(asset.license)) {
    report(manifestPath, 'asset-license-policy');
  }
  if (!candidates.has(asset.path) || !content.has(asset.path)) report(manifestPath, 'missing-asset');
  if (!candidates.has(asset.licenseFile) || !content.get(asset.licenseFile)?.length) {
    report(manifestPath, 'asset-license');
  }
}
for (const [file, data] of content) {
  const record = assetsByPath.get(file);
  const publicAsset = file.startsWith('assets/public/')
    && !/\.md$/i.test(file) && !/\/(LICENSE[^/]*|NOTICE[^/]*)$/i.test(file);
  if (record || sourceAsset.test(file) || visualAsset.test(file) || publicAsset || data.includes(0)) {
    if (!record) report(file, sourceAsset.test(file) ? 'source-asset' : 'unregistered-asset');
    else if (!file.startsWith('assets/public/')) report(file, 'asset-location');
    else if (createHash('sha256').update(data).digest('hex') !== record.sha256.toLowerCase()) {
      report(file, 'asset-hash');
    }
  }
}
if (issues.length) {
  for (const { file, reason } of issues) console.log(file + ': ' + reason);
  console.log('Public check failed. Review the reported files; matched private content is not printed.');
  process.exit(1);
}
console.log('Public check passed: ' + files.length + ' candidate files (' + (staged ? 'Git index' : 'working tree') + ').');
