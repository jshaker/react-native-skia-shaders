const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const root = path.resolve(__dirname, '..');
const config = getDefaultConfig(__dirname);

// Resolve the library from ../src, but every dependency from example/node_modules
// so React and Skia are single instances.
config.watchFolders = [root];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];
config.resolver.blockList = [new RegExp(`${root}/node_modules/.*`), new RegExp(`${root}/dist/.*`)];
config.resolver.extraNodeModules = {
  'react-native-skia-shaders': path.resolve(root, 'src'),
};
module.exports = config;
