// Metro loads its configuration through CommonJS.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getDefaultConfig } = require("expo/metro-config");

const workspaceRoot = path.resolve(__dirname, "../..");
const rootNodeModules = path.join(workspaceRoot, "node_modules");

const config = getDefaultConfig(__dirname);
const defaultResolveRequest = config.resolver.resolveRequest;

config.watchFolders = Array.from(
  new Set([...(config.watchFolders ?? []), workspaceRoot])
);
config.resolver.nodeModulesPaths = [
  path.join(__dirname, "node_modules"),
  rootNodeModules
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react" || moduleName.startsWith("react/")) {
    return {
      type: "sourceFile",
      filePath: require.resolve(moduleName, { paths: [rootNodeModules] })
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
