const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// mobile 디렉토리도 감시 대상에 포함
config.watchFolders = [path.resolve(__dirname, "mobile")];

// mobile/node_modules를 번들링에서 제외 — 루트 node_modules만 사용
// (중복 React 인스턴스 방지: useState 크래시 원인)
config.resolver.blockList = /mobile[/\\]node_modules[/\\].*/;

// 모듈 해석은 루트 node_modules 우선으로 고정 (React 중복 방지)
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];

// Fix for empty path URL issue and nanoid resolution
config.resolver.alias = {
  "@": path.resolve(__dirname, "mobile/src"),
  "nanoid/non-secure": path.resolve(
    __dirname,
    "node_modules/nanoid/non-secure/index.js",
  ),
};

// Ensure proper source extensions including cjs
config.resolver.sourceExts = ["jsx", "js", "ts", "tsx", "json", "svg", "cjs"];

module.exports = config;
