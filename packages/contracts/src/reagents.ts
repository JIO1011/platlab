import { z } from 'zod';
import { homeActivity, homeTrend } from './access.js';
import { decimalString } from './decimal.js';

/**
 * Contratos de Reactivos (R-00 y R-01A, ADR 0012). Las cantidades viajan como
 * cadenas decimales con la precisión de numeric(24,9) (02 §12) y nunca se operan como number.
 * Los esquemas de entrada son estrictos: no se aceptan campos, filtros ni órdenes arbitrarios.
 */
const code = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/, 'Código inválido');
const text = (max: number) => z.string().trim().min(1).max(max);
const unit = z.string().regex(/^[A-Za-z]{1,10}$/, 'Unidad inválida');

/** Cantidad mayor que cero, con hasta 15 enteros y 9 decimales. */
const positiveQuantity = z
  .string()
  .regex(/^(?!0+(?:\.0+)?$)\d{1,15}(?:\.\d{1,9})?$/, 'Debe ser una cantidad decimal mayor que cero');

/** Ajuste con signo y distinto de cero. */
const adjustmentQuantity = z
  .string()
  .regex(/^-?(?!0+(?:\.0+)?$)\d{1,15}(?:\.\d{1,9})?$/, 'Debe ser una cantidad decimal distinta de cero');

/** «Por vencer»: caduca entre hoy y los próximos días (02 §12, ADR 0012); lo usan el servidor y la web. */
export const EXPIRING_DAYS = 30;

export const physicalState = z.enum(['solid', 'liquid', 'aqueous', 'mixture', 'gas']);
/** Los nueve pictogramas SGA (ADR 0015). */
export const hazard = z.enum(['GHS01', 'GHS02', 'GHS03', 'GHS04', 'GHS05', 'GHS06', 'GHS07', 'GHS08', 'GHS09']);
/** Ficha de seguridad: digital (con enlace), solo en físico o no tiene; null es «sin dato». */
export const sdsKind = z.enum(['digital', 'physical', 'none']);
/** `transfer`: un frasco entero cambia de ubicación en un paso (ADR 0012, entrega 4). */
export const operationType = z.enum(['receipt', 'issue', 'adjustment', 'transfer']);

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

/** Dígito de control del CAS: suma ponderada de los demás dígitos, de derecha a izquierda, módulo 10. */
function casCheckDigitMatches(cas: string): boolean {
  const digits = cas.replace(/-/g, '');
  const body = [...digits.slice(0, -1)].reverse();
  const sum = body.reduce((total, digit, index) => total + Number(digit) * (index + 1), 0);
  return sum % 10 === Number(digits.at(-1));
}

const casNumber = z
  .string()
  .regex(/^\d{2,7}-\d{2}-\d$/, 'CAS inválido')
  .refine(casCheckDigitMatches, 'El dígito de control del CAS no coincide');
/** Unidades de un reactivo (ADR 0015): las que admiten control por peso. */
const productUnit = z.enum(['g', 'kg', 'mL', 'L']);
const hazards = z
  .array(hazard)
  .max(9)
  .refine((values) => new Set(values).size === values.length, 'Cada pictograma va una vez');
const sdsUrl = z.string().trim().max(2000).regex(/^https?:\/\//, 'El enlace empieza por http:// o https://');

interface ProductRuleFields {
  casNumber?: string | null | undefined;
  physicalState?: string | null | undefined;
  sdsKind?: string | null | undefined;
  sdsUrl?: string | null | undefined;
}

/**
 * Reglas de la ficha que cruzan campos (ADR 0015): el CAS es obligatorio salvo en mezclas y el enlace
 * de la ficha de seguridad solo acompaña a una digital. Las aplican el alta y la edición, esta sobre
 * la ficha ya combinada y con la del CAS solo si cambian el CAS o el estado (`cas: false` la omite).
 * Devuelve el primer incumplimiento o null.
 */
export function productRuleViolation(fields: ProductRuleFields, { cas = true } = {}): string | null {
  if (cas && !fields.casNumber && fields.physicalState !== 'mixture') return 'Indica el CAS: solo una mezcla puede no tenerlo';
  if (fields.sdsUrl && fields.sdsKind !== 'digital') return 'El enlace solo acompaña a una ficha de seguridad digital';
  return null;
}

const productRules = (value: ProductRuleFields, context: z.RefinementCtx) => {
  const message = productRuleViolation(value);
  if (message) context.addIssue({ code: 'custom', message });
};

/**
 * Reactivo nuevo (ADR 0015), del catálogo o desde el ingreso. El código es automático a partir del
 * nombre; el mínimo se fija en la ficha.
 */
export const newProduct = z
  .object({
    name: text(200),
    casNumber: casNumber.nullish(),
    physicalState,
    baseUnit: productUnit,
    hazards: hazards.default([]),
    controlled: z.boolean().default(false),
    sdsKind: sdsKind.nullish(),
    sdsUrl: sdsUrl.nullish(),
    /** g/mL, para pesar los frascos que se miden en volumen. */
    density: positiveQuantity.nullish(),
  })
  .strict()
  .superRefine(productRules);

/**
 * PATCH /products/:productId (ADR 0015): cambia solo los campos enviados, al menos uno. La unidad
 * solo cambia mientras el reactivo no tenga movimientos.
 */
export const updateProductRequest = z
  .object({
    name: text(200),
    casNumber: casNumber.nullable(),
    physicalState,
    hazards,
    controlled: z.boolean(),
    sdsKind: sdsKind.nullable(),
    sdsUrl: sdsUrl.nullable(),
    density: positiveQuantity.nullable(),
    baseUnit: productUnit,
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Indica al menos un campo');

export const product = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  baseUnit: z.string(),
  casNumber: z.string().nullable(),
  physicalState: physicalState.nullable(),
  minimum: decimalString.nullable(),
  hazards: z.array(hazard),
  controlled: z.boolean(),
  sdsKind: sdsKind.nullable(),
  sdsUrl: z.string().nullable(),
  density: decimalString.nullable(),
});

/** PUT /products/:productId/minimum: null quita el mínimo. */
export const setMinimumRequest = z.object({ minimum: positiveQuantity.nullable() }).strict();
export const minimumResponse = z.object({ productId: z.uuid(), minimum: decimalString.nullable() });

/** GET /containers/:containerId: de qué reactivo es un frasco (enlace corto de su etiqueta QR). */
export const containerParams = z.object({ workspaceId: z.uuid(), containerId: z.uuid() });
export const containerResponse = z.object({ containerId: z.uuid(), productId: z.uuid() });

export const productParams = z.object({ workspaceId: z.uuid(), productId: z.uuid() });

// ---------------------------------------------------------------------------
// Movimientos
// ---------------------------------------------------------------------------

/**
 * Ingreso en un paso (ADR 0015): un reactivo del catálogo (`productId`) o uno nuevo (`newProduct`,
 * exige el permiso de catálogo), un lote nuevo con código automático y un frasco por código, cada uno
 * de `quantity`. Con `weight`, el peso en g de un frasco lleno: el servidor calcula la tara.
 */
export const receiptRequest = z
  .object({
    productId: z.uuid().optional(),
    newProduct: newProduct.optional(),
    brand: text(200).nullish(),
    expiresOn: z.iso.date().nullish(),
    quantity: positiveQuantity,
    unit,
    codes: z
      .array(code)
      .min(1)
      .max(50)
      .refine(
        (codes) => new Set(codes.map((value) => value.toLowerCase())).size === codes.length,
        'Cada frasco lleva un código distinto',
      ),
    area: text(200).nullish(),
    locationId: z.uuid(),
    weight: z.object({ grossWeight: positiveQuantity, density: positiveQuantity.nullish() }).strict().nullish(),
    reference: text(200).nullish(),
  })
  .strict()
  .refine((value) => (value.productId === undefined) !== (value.newProduct === undefined), {
    message: 'Indica un reactivo del catálogo o los datos de uno nuevo',
    path: ['productId'],
  });

/** Frasco creado por un ingreso, con su posición, su saldo y su tara (null sin control por peso). */
const receivedContainer = z.object({
  containerId: z.uuid(),
  code: z.string(),
  positionId: z.uuid(),
  quantity: decimalString,
  balance: decimalString,
  tare: decimalString.nullable(),
});

export const receiptResponse = z.object({
  operationId: z.uuid(),
  type: z.literal('receipt'),
  product: z.object({ id: z.uuid(), code: z.string(), name: z.string() }),
  lot: z.object({ id: z.uuid(), code: z.string() }),
  unit: z.string(),
  effectiveAt: z.iso.datetime({ offset: true }),
  containers: z.array(receivedContainer).min(1),
});

/** GET /container-codes/suggestion: la serie del reactivo o una nueva a partir del nombre. */
export const containerCodeSuggestionQuery = z
  .object({
    productId: z.uuid().optional(),
    name: text(200).optional(),
    count: z.coerce.number().int().min(1).max(50).default(1),
  })
  .strict()
  .refine((value) => value.productId !== undefined || value.name !== undefined, {
    message: 'Indica el reactivo o su nombre',
    path: ['productId'],
  });
export const containerCodeSuggestion = z.object({ codes: z.array(z.string()).min(1) });

/** GET /brands: marcas ya usadas en los lotes, las más recientes primero. */
export const brandList = z.object({ items: z.array(z.string()) });

export const issueRequest = z
  .object({
    positionId: z.uuid(),
    quantity: positiveQuantity,
    unit,
    reason: text(500),
    destination: text(200),
  })
  .strict();

export const adjustmentRequest = z
  .object({
    positionId: z.uuid(),
    quantity: adjustmentQuantity,
    unit,
    reason: text(500),
  })
  .strict();

/**
 * Ajuste por peso (ADR 0015): con el peso del frasco en la balanza, el servidor calcula el saldo
 * (redondeado a centésimas) y registra un ajuste con motivo «Pesada».
 */
export const weightAdjustmentRequest = z.object({ positionId: z.uuid(), grossWeight: positiveQuantity }).strict();

/** PUT /containers/:containerId/tare: peso en g del frasco con su saldo actual. */
export const setTareRequest = z
  .object({ grossWeight: positiveQuantity, density: positiveQuantity.nullish() })
  .strict();
export const tareResponse = z.object({ containerId: z.uuid(), tare: decimalString, density: decimalString.nullable() });

/** Traslado de un frasco entero a otra ubicación (ADR 0012, entrega 4). */
export const transferRequest = z
  .object({ positionId: z.uuid(), locationId: z.uuid(), reference: text(200).nullish() })
  .strict();

export const transferResponse = z.object({
  operationId: z.uuid(),
  fromPositionId: z.uuid(),
  toPositionId: z.uuid(),
  quantity: decimalString,
  unit: z.string(),
  effectiveAt: z.iso.datetime({ offset: true }),
});

/** Cantidad contada o vista: cero o más, con hasta 15 enteros y 9 decimales. */
const countQuantity = z.string().regex(/^\d{1,15}(?:\.\d{1,9})?$/, 'Debe ser una cantidad decimal de cero o más');

/**
 * Conteo de una ubicación (ADR 0012, entrega 4): por frasco, el saldo que se vio al contar y lo que
 * hay. Si un saldo cambió entretanto, el conteo se rechaza y se vuelve a cargar.
 */
export const countRequest = z
  .object({
    locationId: z.uuid(),
    lines: z
      .array(z.object({ positionId: z.uuid(), expected: countQuantity, counted: countQuantity }).strict())
      .min(1)
      .max(200)
      .refine((lines) => new Set(lines.map((line) => line.positionId)).size === lines.length, 'Cada frasco se cuenta una vez'),
  })
  .strict();

export const countResponse = z.object({
  operationId: z.uuid().nullable(),
  counted: z.number().int().nonnegative(),
  adjusted: z.number().int().nonnegative(),
  effectiveAt: z.iso.datetime({ offset: true }).nullable(),
});

/** La respuesta de un movimiento indica la operación, la cantidad aplicada, el saldo y la unidad. */
export const movementResponse = z.object({
  operationId: z.uuid(),
  type: operationType,
  positionId: z.uuid(),
  appliedQuantity: decimalString,
  balance: decimalString,
  unit: z.string(),
  effectiveAt: z.iso.datetime({ offset: true }),
});

/**
 * POST /issues (ADR 0012): quien puede aprobar registra la salida al instante (`done`); el
 * Operador deja una solicitud pendiente que aparta la cantidad (`pending`).
 */
export const issueResponse = z.discriminatedUnion('status', [
  movementResponse.extend({ status: z.literal('done') }),
  z.object({
    status: z.literal('pending'),
    requestId: z.uuid(),
    positionId: z.uuid(),
    quantity: decimalString,
    unit: z.string(),
    available: decimalString,
    requestedAt: z.iso.datetime({ offset: true }),
  }),
]);

/** Solicitud de salida en la bandeja o en «mis solicitudes». */
const issueRequestItem = z.object({
  id: z.uuid(),
  /** Rechazada: la decidió quien aprueba, con motivo. Cancelada: la retiró quien la pidió. */
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']),
  quantity: decimalString,
  unit: z.string(),
  reason: z.string(),
  destination: z.string(),
  decisionReason: z.string().nullable(),
  requestedAt: z.iso.datetime({ offset: true }),
  decidedAt: z.iso.datetime({ offset: true }).nullable(),
  positionId: z.uuid(),
  product: z.object({ id: z.uuid(), name: z.string() }),
  container: z.object({ code: z.string() }),
  location: z.object({ code: z.string(), name: z.string() }),
  requester: z.object({ principalId: z.uuid(), displayName: z.string().nullable() }),
  /** La pidió quien consulta: solo esa persona la cancela. */
  mine: z.boolean(),
  decider: z.object({ displayName: z.string().nullable() }).nullable(),
});

export const issueRequestList = z.object({
  /** true si quien consulta puede aprobar: ve la bandeja de su ámbito, no solo las suyas. */
  canApprove: z.boolean(),
  items: z.array(issueRequestItem),
});
export const issueRequestListQuery = z.object({ estado: z.enum(['pendientes', 'todas']).default('pendientes') }).strict();
export const issueRequestParams = z.object({ workspaceId: z.uuid(), requestId: z.uuid() });
export const rejectIssueRequest = z.object({ reason: text(500) }).strict();
export const releasedRequest = z.object({ requestId: z.uuid(), positionId: z.uuid(), status: z.literal('released') });

// ---------------------------------------------------------------------------
// Consultas paginadas
// ---------------------------------------------------------------------------

const page = {
  cursor: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
};

/** `q`: busca en nombre, código o CAS, sin distinguir mayúsculas ni tildes (el buscador del ingreso). */
export const productListQuery = z.object({ ...page, q: z.string().trim().min(2).max(100).optional() }).strict();
export const positionListQuery = z.object({ ...page, productId: z.uuid().optional(), locationId: z.uuid().optional() }).strict();
/** Valores por filtro: como mucho los de una página de opciones (02 §12 no fija otro límite). */
const MAX_FILTER_VALUES = 100;

/**
 * Filtro con varios valores en parámetros repetidos (`?type=issue&type=adjustment`); un valor suelto
 * también vale, así los enlaces anteriores siguen funcionando. Los repetidos cuentan una vez.
 */
const many = <T extends z.ZodType>(item: T) =>
  z
    .preprocess((value) => (value === undefined || Array.isArray(value) ? value : [value]), z.array(item).min(1).max(MAX_FILTER_VALUES))
    .transform((values) => [...new Set(values)])
    .optional();

/**
 * Filtros del libro de Movimientos (ADR 0014), comunes a la lista, a los conteos por opción y a los
 * totales. Cada filtro con varios valores admite cualquiera de ellos; los filtros se combinan entre
 * sí. Ninguno amplía el ámbito de ubicaciones del miembro: la ubicación se cruza con él.
 */
const operationFilterFields = {
  type: many(operationType),
  productId: many(z.uuid()),
  /** Quien pidió la salida si hubo solicitud; si no, quien registró la operación. */
  responsibleId: many(z.uuid()),
  /** Texto exacto guardado en la operación (ADR 0012). */
  destination: many(z.string().min(1).max(200)),
  reason: many(z.string().min(1).max(500)),
  locationId: many(z.uuid()),
  positionId: z.uuid().optional(),
  /** Los últimos N días civiles en la zona del espacio, hoy incluido: la misma ventana del gráfico. */
  days: z.coerce.number().int().min(1).max(90).optional(),
  /** Días civiles en la zona del espacio, ambos incluidos; cada uno puede ir solo. */
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
};

type PeriodFields = { days?: number | undefined; from?: string | undefined; to?: string | undefined };
const periodRules = <T extends z.ZodType<PeriodFields>>(schema: T) =>
  schema
    .refine((value) => value.days === undefined || (value.from === undefined && value.to === undefined), {
      message: 'El periodo es por días o por fechas, no ambos',
      path: ['days'],
    })
    .refine((value) => value.from === undefined || value.to === undefined || value.from <= value.to, {
      message: 'La fecha inicial es posterior a la final',
      path: ['from'],
    });

export const operationListQuery = periodRules(z.object({ ...page, ...operationFilterFields }).strict());

/** GET /operations/facets: los mismos filtros; `productQuery` busca dentro del grupo de reactivos. */
export const operationFacetsQuery = periodRules(
  z.object({ ...operationFilterFields, productQuery: z.string().trim().min(1).max(100).optional() }).strict(),
);

export const operationGroupBy = z.enum(['product', 'responsible', 'destination', 'month']);
/** GET /operations/totals: los mismos filtros, agrupados por reactivo, responsable, destino o mes. */
export const operationTotalsQuery = periodRules(z.object({ ...operationFilterFields, groupBy: operationGroupBy }).strict());

/** Posición: un frasco (ADR 0012) en una ubicación; `container` es null solo en datos sin frasco. */
export const position = z.object({
  id: z.uuid(),
  product: z.object({ id: z.uuid(), code: z.string(), name: z.string(), controlled: z.boolean() }),
  lot: z.object({
    id: z.uuid(),
    code: z.string(),
    expiresOn: z.string().nullable(),
    /** Marca y área, tal como se registraron; null si no se conocen (ADR 0015). */
    brand: z.string().nullable(),
    area: z.string().nullable(),
  }),
  container: z
    .object({
      id: z.uuid(),
      code: z.string(),
      initialQuantity: decimalString,
      receivedAt: z.iso.datetime({ offset: true }),
      /** Tara en g y densidad en g/mL con que se calculó; null sin control por peso (ADR 0015). */
      tare: decimalString.nullable(),
      density: decimalString.nullable(),
    })
    .nullable(),
  disposition: z.enum(['usable', 'quarantine', 'restricted']),
  /** `path`: nombres desde el primer nivel bajo la sede hasta esta ubicación; la sede, solo si es ella. */
  location: z.object({ id: z.uuid(), code: z.string(), name: z.string(), path: z.array(z.string()) }),
  balance: decimalString,
  /** Apartado por solicitudes pendientes (ADR 0012); lo disponible es saldo − reservado. */
  reserved: decimalString,
  unit: z.string(),
});

/** Un asiento del historial: un ingreso de varios frascos son varios asientos de una operación. */
export const operation = z.object({
  id: z.uuid(),
  entryId: z.uuid(),
  type: operationType,
  effectiveAt: z.iso.datetime({ offset: true }),
  actor: z.object({ principalId: z.uuid(), displayName: z.string().nullable() }),
  /** Quién pidió la salida que el actor aprobó (ADR 0012); null si no hubo solicitud. */
  requestedBy: z.object({ displayName: z.string().nullable() }).nullable(),
  reason: z.string().nullable(),
  destination: z.string().nullable(),
  reference: z.string().nullable(),
  positionId: z.uuid(),
  product: z.object({ id: z.uuid(), code: z.string(), name: z.string() }),
  lot: z.object({ code: z.string() }),
  container: z.object({ code: z.string() }).nullable(),
  location: z.object({ code: z.string() }),
  quantity: decimalString,
  balanceAfter: decimalString,
  unit: z.string(),
});

const optionCount = z.number().int().nonnegative();
const productRef = z.object({ id: z.uuid(), code: z.string(), name: z.string() });

/**
 * Conteo de asientos por opción de cada filtro (ADR 0014). `total` aplica todos los filtros; cada
 * grupo, todos menos el suyo, para poder sumar opciones. Solo llegan las opciones con asientos y las
 * ya elegidas aunque queden en cero, por `count` descendente y luego por nombre.
 */
export const operationFacets = z.object({
  total: optionCount,
  types: z.array(z.object({ value: operationType, count: optionCount })),
  /** Como mucho 300 más las elegidas; `more` dice que hay más y conviene buscar con `productQuery`. */
  products: z.object({ options: z.array(productRef.extend({ count: optionCount })), more: z.boolean() }),
  responsibles: z.array(z.object({ principalId: z.uuid(), displayName: z.string().nullable(), count: optionCount })),
  destinations: z.array(z.object({ value: z.string(), count: optionCount })),
  reasons: z.array(z.object({ value: z.string(), count: optionCount })),
  locations: z.array(z.object({ id: z.uuid(), code: z.string(), name: z.string(), count: optionCount })),
});

/**
 * Totales del libro filtrado (ADR 0014), calculados en el servidor. Cada fila es un reactivo con su
 * unidad base: nunca se suman unidades distintas. Las sumas llevan signo y son null si el tipo no tiene
 * asientos; `net` es ingresos + salidas + ajustes. `transfers` cuenta traslados (operaciones, no sus
 * dos asientos) y no suma cantidad; `count` sí cuenta asientos, como las filas del libro.
 */
const operationTotalsRow = z.object({
  product: productRef,
  unit: z.string(),
  count: optionCount,
  receipts: decimalString.nullable(),
  issues: decimalString.nullable(),
  adjustments: decimalString.nullable(),
  net: decimalString,
  transfers: optionCount,
});

export const operationTotals = z.object({
  groupBy: operationGroupBy,
  /**
   * Por `count` descendente (por mes, del más reciente al más antiguo). `key`: id del reactivo o del
   * responsable, texto del destino (null: «Sin destino») o mes `AAAA-MM` en la zona del espacio.
   */
  groups: z.array(
    z.object({
      key: z.string().nullable(),
      label: z.string().nullable(),
      count: optionCount,
      rows: z.array(operationTotalsRow),
    }),
  ),
  /** Hay más de 1000 grupos y solo llegan los primeros. */
  truncated: z.boolean(),
});

const list = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), nextCursor: z.string().nullable() });

/** Ubicación donde el miembro puede registrar el movimiento (su ámbito y descendencia). */
export const location = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  kind: z.string(),
  parentId: z.uuid().nullable(),
});

/**
 * POST /locations (ADR 0015): una ubicación bajo otra, o en la raíz; el tipo y el código los decide el
 * servidor. Un nombre activo repetido bajo el mismo padre devuelve la existente.
 */
export const createLocationRequest = z.object({ name: text(200), parentId: z.uuid().nullable() }).strict();

/** Reactivo con su total y sus frascos con saldo en las ubicaciones que el miembro puede consultar. */
export const stockedProduct = product.extend({
  balance: decimalString,
  containersWithStock: z.number().int().nonnegative(),
  /** Sus avisos de caducidad: frascos con saldo vencidos y por vencer (ADR 0012, 05-10-2026). */
  expiredContainers: z.number().int().nonnegative(),
  expiringContainers: z.number().int().nonnegative(),
  /** Existencia física menor que su mínimo (ADR 0012, 05-10-2026); false si no tiene mínimo. */
  belowMinimum: z.boolean(),
});
export const productList = list(stockedProduct);
/** Ficha (GET /products/:productId): además, si la unidad aún puede cambiar (sin movimientos). */
export const productDetail = stockedProduct.extend({ unitEditable: z.boolean() });
export const locationList = z.object({ items: z.array(location) });
export const positionList = list(position);
export const operationList = list(operation);

/**
 * GET /reagents/summary: el Resumen de la app de Reactivos (ADR 0011). Las mismas cifras, el mismo
 * gráfico y la misma actividad que su tarjeta de Inicio, en el ámbito del miembro.
 */
export const reagentsSummary = z.object({
  summary: z.object({
    productsWithStock: z.number().int().nonnegative(),
    containersWithStock: z.number().int().nonnegative(),
    /** Frascos con saldo vencidos y por vencer (ADR 0012, 05-10-2026; plazo en 02 §12). */
    expiredContainers: z.number().int().nonnegative(),
    expiringContainers: z.number().int().nonnegative(),
    /** Reactivos con mínimo cuya existencia física es menor (ADR 0012, 05-10-2026). */
    belowMinimum: z.number().int().nonnegative(),
    /** Reactivos con mínimo fijado: sin ninguno, un «0 bajo mínimo» no significa «todo bien». */
    productsWithMinimum: z.number().int().nonnegative(),
    /** Solicitudes pendientes: la bandeja de quien aprueba o las propias del Operador. */
    pendingRequests: z.number().int().nonnegative(),
  }),
  activity: z.array(homeActivity).max(10),
  trend: homeTrend.nullable(),
});

// ---------------------------------------------------------------------------
// Motivos, destinos (ADR 0012) y áreas (ADR 0015): listas del espacio; se guarda el texto elegido
// ---------------------------------------------------------------------------

const reasonKind = z.enum(['issue', 'adjustment']);
export const reasonListQuery = z.object({ kind: reasonKind }).strict();
const listEntry = z.object({ id: z.uuid(), name: z.string() });
export const entryList = z.object({ items: z.array(listEntry) });
export const createReasonRequest = z.object({ kind: reasonKind, name: text(120) }).strict();
/** Alta de un destino o de un área: listas con solo un nombre. */
export const createEntryRequest = z.object({ name: text(120) }).strict();
export const entryParams = z.object({ workspaceId: z.uuid(), entryId: z.uuid() });

export type Product = z.infer<typeof product>;
export type MovementResponse = z.infer<typeof movementResponse>;
export type Position = z.infer<typeof position>;
export type Operation = z.infer<typeof operation>;
export type ProductList = z.infer<typeof productList>;
export type ProductDetail = z.infer<typeof productDetail>;
export type Location = z.infer<typeof location>;
export type TareResponse = z.infer<typeof tareResponse>;
export type LocationList = z.infer<typeof locationList>;
export type PositionList = z.infer<typeof positionList>;
export type ReagentsSummary = z.infer<typeof reagentsSummary>;
export type IssueRequestItem = z.infer<typeof issueRequestItem>;
export type IssueResponse = z.infer<typeof issueResponse>;
export type StockedProduct = z.infer<typeof stockedProduct>;
export type ReceiptResponse = z.infer<typeof receiptResponse>;
export type ListEntry = z.infer<typeof listEntry>;
export type TransferResponse = z.infer<typeof transferResponse>;
export type CountResponse = z.infer<typeof countResponse>;
export type ReasonKind = z.infer<typeof reasonKind>;
export type OperationList = z.infer<typeof operationList>;
export type OperationFacets = z.infer<typeof operationFacets>;
export type OperationTotals = z.infer<typeof operationTotals>;
export type OperationGroupBy = z.infer<typeof operationGroupBy>;
