export {
  defineModule,
  type ModuleManifest,
  type ModuleStage,
  type NavEntry,
  type RoleCode,
} from './define-module.js';
export { reagentsModule } from './reagents.js';

import { reagentsModule } from './reagents.js';

/** Registro único de módulos (02 §4). */
export const moduleRegistry = [reagentsModule] as const;
