"use strict";

// eslint-disable-next-line node/no-unpublished-require
const { buildEngine } = require("ember-engines/lib/engine-addon");

const name = require("./package").name;

const ioniconAssets = [
  ...require.resolve("ionicons").split("/").slice(0, -1),
  "svg",
].join("/");

const publicAssets = [
  ...require.resolve(name).split("/").slice(0, -1),
  "public",
  "assets",
].join("/");

module.exports = buildEngine({
  name,
  lazyLoading: { enabled: false },
  svgJar: { sourceDirs: [ioniconAssets, publicAssets] },
});
