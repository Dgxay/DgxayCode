'use strict';

const fs = require('fs');
const path = require('path');
const { syncHarnessDependencies } = require('./sync-harness-dependencies');

exports.default = async function afterPack(context) {
  const windowsOrLinuxResources = path.join(context.appOutDir, 'resources');
  const macResources = path.join(context.appOutDir, 'Contents', 'Resources');
  const resourcesDir = fs.existsSync(windowsOrLinuxResources) ? windowsOrLinuxResources : macResources;
  const appDir = path.join(resourcesDir, 'app');

  if (!fs.existsSync(path.join(appDir, 'package.json'))) {
    throw new Error(`Packaged application directory not found: ${appDir}`);
  }

  const projectDir = context.packager.projectDir
    || context.packager.info.projectDir
    || process.cwd();
  syncHarnessDependencies({
    projectDir,
    targetNodeModules: path.join(appDir, 'node_modules')
  });
};
