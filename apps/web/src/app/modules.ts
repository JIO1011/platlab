import { reagentsWebModule } from '../features/reagents/module';
import type { WebModule } from './web-module';

/** Los módulos de la web. Añadir uno es una línea aquí y otra en el router. */
const webModules: WebModule[] = [reagentsWebModule];

export const webModule = (code: string): WebModule | undefined => webModules.find((entry) => entry.code === code);
