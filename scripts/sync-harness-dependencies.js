'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function readNpmLs(projectDir) {
  const args = ['ls', '--omit=dev', '--parseable', '--all'];
  const options = {
    cwd: projectDir,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true
  };

  try {
    if (process.env.npm_execpath && fs.existsSync(process.env.npm_execpath)) {
      return execFileSync(process.execPath, [process.env.npm_execpath, ...args], options);
    }
    if (process.platform === 'win32') {
      return execFileSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `npm ${args.join(' ')}`], options);
    }
    return execFileSync('npm', args, options);
  } catch (error) {
    if (error.stdout) return String(error.stdout);
    throw error;
  }
}

function productionPackages(projectDir) {
  const sourceRoot = path.resolve(projectDir, 'node_modules');
  const prefix = sourceRoot.endsWith(path.sep) ? sourceRoot : `${sourceRoot}${path.sep}`;
  const packages = new Set();

  for (const rawLine of readNpmLs(projectDir).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const resolved = path.resolve(line);
    if (!resolved.startsWith(prefix)) continue;

    const segments = path.relative(sourceRoot, resolved).split(path.sep).filter(Boolean);
    if (segments.length === 0 || segments[0] === '.bin') continue;
    const packagePath = segments[0].startsWith('@')
      ? segments.slice(0, 2).join(path.sep)
      : segments[0];
    if (packagePath) packages.add(packagePath);
  }

  return [...packages].sort();
}

function syncHarnessDependencies({ projectDir, targetNodeModules }) {
  const sourceRoot = path.resolve(projectDir, 'node_modules');
  const targetRoot = path.resolve(targetNodeModules);
  const packages = productionPackages(projectDir);

  if (!packages.includes(path.join('@deepseek-ai', 'dsh'))) {
    throw new Error('Production dependency tree does not contain @deepseek-ai/dsh.');
  }

  fs.mkdirSync(targetRoot, { recursive: true });
  console.log(`[harness-deps] syncing ${packages.length} production packages`);

  packages.forEach((relativePath, index) => {
    const source = path.join(sourceRoot, relativePath);
    const destination = path.join(targetRoot, relativePath);
    if (!fs.existsSync(path.join(source, 'package.json'))) return;

    fs.rmSync(destination, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.cpSync(source, destination, {
      recursive: true,
      force: true,
      dereference: false,
      verbatimSymlinks: true
    });

    if ((index + 1) % 25 === 0) {
      console.log(`[harness-deps] ${index + 1}/${packages.length}`);
    }
  });

  console.log('[harness-deps] complete');
  return packages;
}

module.exports = { productionPackages, syncHarnessDependencies };

if (require.main === module) {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node scripts/sync-harness-dependencies.js <target-node_modules>');
    process.exit(1);
  }
  syncHarnessDependencies({
    projectDir: path.resolve(__dirname, '..'),
    targetNodeModules: target
  });
}
