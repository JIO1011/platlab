import { loadConfig } from '../config.js';
import { publicFiles } from '../platform/storage/public-files.js';

/** Storage local de `pnpm db:start` (ADR 0017), el mismo que usa la API en desarrollo. */
export const localPublicFiles = publicFiles(loadConfig().storage);
