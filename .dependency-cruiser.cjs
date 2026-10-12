/**
 * Fronteras del monolito modular (docs/02_arquitectura.md §3).
 * Todas son errores: una advertencia no cuenta como verificación.
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Sin ciclos de dependencias.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'frontends-no-server',
      severity: 'error',
      comment: 'Los frontends no importan código del servidor.',
      from: { path: '^apps/(web|console)/' },
      to: { path: '^apps/server/' },
    },
    {
      name: 'web-no-console',
      severity: 'error',
      comment: 'La aplicación de clientes no incluye la consola del Equipo PlatLab.',
      from: { path: '^apps/web/' },
      to: { path: '^apps/console/' },
    },
    {
      name: 'web-features-isolated',
      severity: 'error',
      comment: 'Una feature de la web no importa otra; lo común vive en app/ o en packages/ui.',
      from: { path: '^apps/web/src/features/([^/]+)/' },
      to: { path: '^apps/web/src/features/', pathNot: '^apps/web/src/features/$1/' },
    },
    {
      name: 'web-shell-no-modules',
      severity: 'error',
      comment: 'app/ conoce las features solo por el router y el registro de módulos (app/modules.ts).',
      from: { path: '^apps/web/src/app/', pathNot: '^apps/web/src/app/(router\\.tsx|modules\\.ts)$' },
      to: { path: '^apps/web/src/features/' },
    },
    {
      name: 'web-registry-descriptors',
      severity: 'error',
      comment: 'El registro solo importa el descriptor de cada módulo, no sus páginas.',
      from: { path: '^apps/web/src/app/modules\\.ts$' },
      to: { path: '^apps/web/src/features/', pathNot: '^apps/web/src/features/[^/]+/module\\.tsx?$' },
    },
    {
      name: 'domain-pure',
      severity: 'error',
      comment: 'domain no importa HTTP ni infraestructura.',
      from: { path: '^apps/server/src/modules/[^/]+/domain/' },
      to: { path: '^apps/server/src/modules/[^/]+/(http|infrastructure)/' },
    },
    {
      name: 'core-no-modules',
      severity: 'error',
      comment: 'Core no importa módulos comerciales.',
      from: { path: '^apps/server/src/modules/core/' },
      to: { path: '^apps/server/src/modules/(?!core/)' },
    },
    {
      name: 'modules-public-interface',
      severity: 'error',
      comment: 'Un módulo usa otro solo mediante su interfaz pública (index.ts).',
      from: { path: '^apps/server/src/modules/([^/]+)/' },
      to: {
        path: '^apps/server/src/modules/[^/]+/(domain|application|infrastructure|http)/',
        pathNot: '^apps/server/src/modules/$1/',
      },
    },
    {
      name: 'capabilities-no-modules',
      severity: 'error',
      comment: 'Una capacidad (inventario, agenda, incidencias) no depende de módulos de negocio; solo de Core.',
      from: { path: '^apps/server/src/capabilities/' },
      to: { path: '^apps/server/src/modules/(?!core/)' },
    },
    {
      name: 'capabilities-public-interface',
      severity: 'error',
      comment: 'Los módulos usan una capacidad solo mediante su interfaz pública (index.ts).',
      from: { path: '^apps/server/src/modules/' },
      to: { path: '^apps/server/src/capabilities/[^/]+/(application|infrastructure)/' },
    },
    {
      name: 'contracts-no-runtime-deps',
      severity: 'error',
      comment: 'contracts no accede a la base ni al servidor.',
      from: { path: '^packages/contracts/' },
      to: { path: '(^apps/|node_modules/(pg|@pgtyped)/)' },
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(\\.queries\\.ts$|/dist/)' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.tsx', '.js', '.json'],
    },
  },
};
