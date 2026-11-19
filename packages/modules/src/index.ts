export {
  defineModule,
  type ModuleManifest,
  type ModuleStage,
  type NavEntry,
  type RoleCode,
  roleCodes,
} from './define-module.js';
export { equipmentModule } from './equipment.js';
export { labsModule } from './labs.js';
export { maintenanceModule } from './maintenance.js';
export { materialsModule } from './materials.js';
export { reagentsModule } from './reagents.js';

import { equipmentModule } from './equipment.js';
import { labsModule } from './labs.js';
import { maintenanceModule } from './maintenance.js';
import { materialsModule } from './materials.js';
import { reagentsModule } from './reagents.js';

/** Registro único de módulos (02 §4). */
export const moduleRegistry = [reagentsModule, equipmentModule, maintenanceModule, labsModule, materialsModule] as const;
