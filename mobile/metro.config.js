const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../');

const config = getDefaultConfig(projectRoot);

// Watch all files within the monorepo so Metro picks up changes to @votr/shared
config.watchFolders = [monorepoRoot];

// Resolve packages from the project first, then the monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Prevent Metro from resolving symlinked packages from parent directories
// which can cause duplicate module errors in pnpm workspaces
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
