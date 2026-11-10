/**
 * CJS preload: stub `server-only` for Node/tsx unit tests.
 * Next.js production builds still use the real throwing package.
 */
const Module = require("module");
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "server-only") {
    return {};
  }
  return originalLoad(request, parent, isMain);
};
