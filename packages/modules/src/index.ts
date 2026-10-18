export {
  defineModule,
  type ModuleManifest,
  type ModuleStage,
  type NavEntry,
  type RoleCode,
  roleCodes,
} from './define-module.js';
export { equipmentModule } from './equipment.js';
export { maintenanceModule } from './maintenance.js';
export { reagentsModule } from './reagents.js';

import { equipmentModule } from './equipment.js';
import { maintenanceModule } from './maintenance.js';
import { reagentsModule } from './reagents.js';

/** Registro único de módulos (02 §4). */
export const moduleRegistry = [reagentsModule, equipmentModule, maintenanceModule] as const;
