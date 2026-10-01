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
