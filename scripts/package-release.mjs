import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const release = join(root, 'output', 'release');
const name = `friskoli-chemotaxis-v${version}`;

function git(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'Git command failed');
  return result.stdout.trim();
}

git(['rev-parse', '--verify', 'HEAD']);
if (git(['status', '--porcelain', '--untracked-files=all'])) {
  throw new Error('Commit the release files first so the HTML and source archive describe the same checkout.');
}
await build({ root });
mkdirSync(release, { recursive: true });
const html = join(release, `${name}.html`);
const source = join(release, `${name}-source.zip`);
copyFileSync(join(root, 'dist', 'index.html'), html);
git(['archive', '--format=zip', '--prefix=friskoli-chemotaxis/', `--output=${source}`, 'HEAD']);
console.log(JSON.stringify({ version, commit: git(['rev-parse', 'HEAD']), html, source }, null, 2));
