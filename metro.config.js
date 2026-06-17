const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withRorkMetro } = require("@rork-ai/toolkit-sdk/metro");

const config = getDefaultConfig(__dirname);
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  "physiq-watch-connectivity": path.resolve(__dirname, "modules/physiq-watch-connectivity"),
};

module.exports = withRorkMetro(config);
