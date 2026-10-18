import { equipmentWebModule } from '../features/equipment/module';
import { maintenanceWebModule } from '../features/maintenance/module';
import { reagentsWebModule } from '../features/reagents/module';
import type { WebModule } from './web-module';

/** Los módulos de la web. Añadir uno es una línea aquí y otra en el router. */
export const webModules: WebModule[] = [reagentsWebModule, equipmentWebModule, maintenanceWebModule];

export const webModule = (code: string): WebModule | undefined => webModules.find((entry) => entry.code === code);
