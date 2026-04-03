const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// client 디렉토리도 감시 대상에 포함
config.watchFolders = [path.resolve(__dirname, "client")];

// 모듈 해석은 루트 node_modules 우선으로 고정 (React 중복 방지)
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
];

module.exports = config;
