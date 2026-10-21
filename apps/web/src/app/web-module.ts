import type { LucideIcon } from 'lucide-react';
import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router';

/**
 * Puntos de extensión de la web (ADR 0020): cada módulo anfitrión declara los suyos aquí con
 * `declare module`, con las props que da a quien lo llena. El shell no nombra módulos.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- se completa con `declare module` en cada anfitrión
export interface ExtensionPoints {}

/**
 * Lo que un módulo aporta a un punto de otro: el texto del anfitrión (pestaña o columna), el permiso que
 * exige y su componente, que se descarga al mostrarse.
 */
export type ModuleExtension = {
  [P in keyof ExtensionPoints]: {
    point: P;
    label: string;
    permission: string;
    load: () => Promise<ComponentType<ExtensionPoints[P]>>;
  };
}[keyof ExtensionPoints];

/**
 * Descriptor de un módulo en la web (02 §4, paso 6): lo que el shell necesita saber de él sin
 * importar sus páginas. Lo que muestra (páginas y extensiones) se carga diferido, al mostrarse.
 */
export interface WebModule {
  /** Código del manifiesto del módulo. */
  code: string;
  /** Icono del menú y de la tarjeta de Inicio. */
  Icon: LucideIcon;
  /** Marca de agua propia; sin ella se usa `Icon`. */
  Mark?: ComponentType<{ className?: string | undefined }>;
  /** Icono de cada sección del menú, por su `path` del manifiesto; sin entrada, `Icon`. El Resumen lo pone el shell. */
  sectionIcons?: Record<string, LucideIcon>;
  home: {
    /** Cifras de la tarjeta, con claves propias de su resumen (01 §7). */
    counters: Array<{ key: string; label: (n: number) => string }>;
    /**
     * Lo pendiente del módulo, con las mismas palabras que el aviso de su Resumen: quien aprueba
     * ve lo que espera su decisión; quien pidió, lo que espera la de otro.
     */
    pending?: { permission: string; approver: (n: number) => string; requester: (n: number) => string };
    /** Qué cuenta el gráfico del módulo, para la frase que lo acompaña. */
    trendNoun: { one: string; many: string };
  };
  /**
   * Cómo cuenta el módulo en los cuadros de Áreas y Departamentos (ADR 0024): la sección no conoce a los
   * módulos, solo lo que cada uno declara aquí. El icono es el `Icon` del módulo.
   */
  areas?: {
    /** El nombre de lo que se cuenta, según la cifra: «reactivo» o «reactivos». */
    label: (n: number) => string;
    /** Dónde se abre la lista del módulo ya filtrada, desde el espacio y sin barra inicial: `reactivos/inventario?area=…`. */
    href: (filter: AreaFilter) => string;
  };
  /** Lo que aporta a los puntos de extensión de otros módulos. */
  extensions?: ModuleExtension[];
}

/** Lo que filtra una cifra de la sección Áreas: un área o un departamento (ADR 0024). */
export interface AreaFilter {
  kind: 'area' | 'department';
  id: string;
}

/** Rutas de un módulo: hijas de `/e/:workspaceId` y de primer nivel (enlaces que sobreviven al acceso). */
export interface ModuleRoutes {
  workspace: RouteObject[];
  top: RouteObject[];
}
