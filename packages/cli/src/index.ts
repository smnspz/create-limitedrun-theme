// Public library surface.
export { ThemeRenderer, type RendererOptions } from './renderer/engine.js';
export { resolveRoute, type RouteMatch } from './renderer/routes.js';
export { loadGlobals, THEME_DIRS, type ThemeGlobals } from './renderer/assigns.js';
export { loadStore, StoreValidationError } from './store/load.js';
export { createDevApp, runDev, type DevServerOptions } from './commands/dev.js';
export { build, type BuildResult } from './commands/build.js';
export {
  applyTransforms,
  transforms,
  type AssetTransform,
  type AssetContext,
} from './assets/transform.js';
