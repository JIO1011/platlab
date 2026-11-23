// Toma declarativa de las capturas de PlatLab (SOLO LECTURA).
//
// Cada toma dice qué pantalla abrir, qué recorte conservar y qué marcar. `rect` son píxeles de
// página (1440×900, sin desplazamiento) y `loc` un localizador de Playwright: el script mide la
// caja real y la convierte a porcentajes del recorte. Los textos de cada marca son los que verá
// la persona en el sitio.

export const WS = 'da000000-0000-4000-8000-00000000000a';

export const CUENTAS = {
  admin: 'admin@demo.platlab.test',
  operador: 'operador@demo.platlab.test',
  docente: 'docente@demo.platlab.test',
};

const CONTENIDO = (h) => ({ x: 290, y: 72, w: 1120, h });

export const TOMAS = [
  {
    id: 'inicio',
    ruta: '',
    direccion: 'platlab.app / Inicio',
    alt: 'Inicio de PlatLab con las tarjetas de Equipos, Laboratorios, Mantenimiento, Materiales y Reactivos, cada una con sus cifras y avisos.',
    recorte: { x: 0, y: 0, w: 1440, h: 940 },
    marcas: [
      { n: 1, rect: { x: 16, y: 102, w: 255, h: 100 }, tipo: 'marco', lado: 'derecha', titulo: 'Tu espacio y tu rol', texto: 'Cada persona entra con su rol y solo ve lo que le corresponde.' },
      { n: 2, rect: { x: 684, y: 563, w: 350, h: 340 }, tipo: 'boton', lado: 'derecha', titulo: 'Un módulo, una tarjeta', texto: 'Con un clic entras al módulo y ves sus cifras al instante.' },
      { n: 3, rect: { x: 705, y: 642, w: 206, h: 34 }, tipo: 'marco', lado: 'arriba', titulo: 'Lo urgente, primero', texto: 'Lo que espera tu decisión aparece antes que todo lo demás.' },
    ],
  },
  {
    id: 'reactivos-resumen',
    ruta: 'reactivos',
    direccion: 'platlab.app / Reactivos / Resumen',
    alt: 'Resumen de Reactivos: alertas de por aprobar, vencidos, por vencer y bajo mínimo, acciones rápidas y la lista de lo que necesita atención.',
    recorte: CONTENIDO(560),
    marcas: [
      { n: 1, rect: { x: 309, y: 177, w: 1082, h: 106 }, tipo: 'marco', lado: 'abajo', titulo: 'Alertas con cifras', texto: 'Vencidos, por vencer y bajo mínimo, a la vista desde el primer segundo.' },
      { n: 2, rect: { x: 310, y: 304, w: 621, h: 179 }, tipo: 'boton', lado: 'abajo', titulo: 'Atajos para lo diario', texto: 'Escanear el QR de un frasco o dar de alta un reactivo nuevo.' },
      { n: 3, rect: { x: 953, y: 304, w: 438, h: 328 }, tipo: 'marco', lado: 'izquierda', titulo: 'Lo que necesita atención', texto: 'Cada reactivo dice por qué: vencido, bajo mínimo o por vencer.' },
    ],
  },
  {
    id: 'reactivos-inventario',
    ruta: 'reactivos/inventario',
    direccion: 'platlab.app / Reactivos / Inventario',
    alt: 'Inventario de reactivos con buscador, filtros, botón Registrar salida y tarjetas por reactivo con su saldo total y alertas.',
    recorte: CONTENIDO(440),
    marcas: [
      { n: 1, rect: { x: 310, y: 178, w: 1030, h: 79 }, tipo: 'marco', lado: 'abajo', titulo: 'Encuentra todo en un clic', texto: 'Busca por nombre, código o CAS y filtra por vencidos o bajo mínimo.' },
      { n: 2, loc: (p) => p.getByRole('button', { name: 'Registrar salida' }), pad: 6, tipo: 'boton', lado: 'abajo', titulo: 'Registrar una salida', texto: 'Pocos pasos: eliges el reactivo, la cantidad, el motivo y el destino.' },
      { n: 3, rect: { x: 310, y: 297, w: 263, h: 193 }, tipo: 'marco', lado: 'abajo', titulo: 'Saldo y alertas por reactivo', texto: 'El total exacto, los frascos y cualquier aviso, en una tarjeta.' },
    ],
  },
  {
    id: 'reactivos-solicitudes',
    ruta: 'reactivos/solicitudes',
    direccion: 'platlab.app / Reactivos / Solicitudes',
    alt: 'Bandeja de solicitudes de salida con una petición pendiente y los botones Rechazar y Aprobar salida.',
    recorte: CONTENIDO(330),
    marcas: [
      { n: 1, rect: { x: 304, y: 178, w: 534, h: 46 }, tipo: 'marco', lado: 'abajo', titulo: 'Apartado mientras decides', texto: 'Lo pedido queda reservado en el frasco hasta que apruebes o rechaces.' },
      { n: 2, rect: { x: 310, y: 234, w: 810, h: 137 }, tipo: 'marco', lado: 'abajo', titulo: 'Todo el contexto', texto: 'Qué se pide, para qué práctica, a qué laboratorio y quién lo pidió.' },
      { n: 3, loc: (p) => p.getByRole('button', { name: 'Aprobar salida' }), pad: 6, tipo: 'boton', lado: 'izquierda', titulo: 'Tú decides', texto: 'Aprueba o rechaza con un clic. Queda registrado quién y cuándo.' },
    ],
  },
  {
    id: 'reactivos-movimientos',
    ruta: 'reactivos/movimientos',
    direccion: 'platlab.app / Reactivos / Movimientos',
    alt: 'Historial de movimientos de reactivos con filtros, quién lo pidió, el motivo, el destino, la cantidad y el saldo resultante.',
    recorte: CONTENIDO(630),
    marcas: [
      { n: 1, rect: { x: 310, y: 178, w: 748, h: 34 }, tipo: 'marco', lado: 'abajo', titulo: 'Filtra por lo que necesites', texto: 'Periodo, tipo, reactivo, responsable, destino, motivo y ubicación.' },
      { n: 2, rect: { x: 770, y: 318, w: 380, h: 330 }, tipo: 'marco', lado: 'arriba', titulo: 'Quién, para qué y a dónde', texto: 'Cada salida guarda el motivo, el destino y quién la pidió.' },
      { n: 3, rect: { x: 1215, y: 280, w: 180, h: 370 }, tipo: 'marco', lado: 'izquierda', titulo: 'Saldo exacto', texto: 'Tras cada movimiento ves lo que queda, sin cálculos a mano.' },
    ],
  },
  {
    id: 'equipos-inventario',
    ruta: 'equipos/inventario',
    direccion: 'platlab.app / Equipos / Inventario',
    alt: 'Inventario de equipos por áreas: cuarto frío, laboratorio de Física y laboratorio de Química, con su encargado y el estado de sus equipos.',
    recorte: CONTENIDO(420),
    marcas: [
      { n: 1, rect: { x: 310, y: 234, w: 350, h: 235 }, tipo: 'marco', lado: 'abajo', titulo: 'Un cuadro por área', texto: 'Cuántos equipos hay y cómo están, en cada laboratorio.' },
      { n: 2, rect: { x: 1062, y: 357, w: 226, h: 28 }, tipo: 'marco', lado: 'izquierda', titulo: 'Estado a simple vista', texto: 'Fuera de servicio o uso limitado: siempre con texto, no solo color.' },
      { n: 3, rect: { x: 1062, y: 414, w: 200, h: 34 }, tipo: 'marco', lado: 'izquierda', titulo: 'Un responsable claro', texto: 'Cada área tiene su encargado.' },
    ],
  },
  {
    id: 'equipos-incidentes',
    ruta: 'equipos/incidentes',
    direccion: 'platlab.app / Equipos / Incidentes',
    alt: 'Incidentes de equipos: fallas reportadas con el equipo, el área, quién las reportó y su estado.',
    recorte: CONTENIDO(470),
    marcas: [
      { n: 1, rect: { x: 310, y: 176, w: 395, h: 38 }, tipo: 'marco', lado: 'abajo', titulo: 'Cada falla sigue su camino', texto: 'Reportado, en reparación y solucionado, separados.' },
      { n: 2, loc: (p) => p.getByRole('button', { name: 'Reportar incidente' }), pad: 6, tipo: 'boton', lado: 'abajo', titulo: 'Reporta en segundos', texto: 'Quien ve la falla la avisa; el equipo responsable la atiende.' },
      { n: 3, rect: { x: 436, y: 396, w: 114, h: 22 }, tipo: 'marco', lado: 'derecha', titulo: 'Impacto claro', texto: 'Sabes si el equipo todavía se puede usar.' },
    ],
  },
  {
    id: 'labs-cronograma',
    ruta: 'laboratorios/cronograma',
    // Navegación pura: el jueves 19 tiene una actividad programada.
    antes: async (p) => {
      await p.mouse.click(1068, 158);
    },
    direccion: 'platlab.app / Laboratorios / Cronograma',
    alt: 'Cronograma de laboratorios: una tabla de horas por áreas para el día, con la bandeja Por programar.',
    recorte: CONTENIDO(800),
    marcas: [
      { n: 1, rect: { x: 822, y: 140, w: 572, h: 38 }, tipo: 'marco', lado: 'abajo', titulo: 'Elige el día', texto: 'Navega por la semana con un clic.' },
      { n: 2, rect: { x: 366, y: 192, w: 1024, h: 72 }, tipo: 'marco', lado: 'abajo', titulo: 'Cada área, con su horario', texto: 'Aforo y horas de atención por laboratorio, sin choques.' },
      { n: 3, rect: { x: 880, y: 540, w: 166, h: 84 }, tipo: 'marco', lado: 'izquierda', titulo: 'Una práctica programada', texto: 'Cada bloque dice qué es, de qué carrera y en qué área, sin choques.' },
      { n: 4, rect: { x: 310, y: 742, w: 1080, h: 125 }, tipo: 'boton', lado: 'arriba', titulo: 'Por programar', texto: 'Las solicitudes aprobadas esperan aquí para ponerles hora y lugar.' },
    ],
  },
  {
    id: 'labs-recibidas',
    ruta: 'laboratorios/recibidas',
    direccion: 'platlab.app / Laboratorios / Recibidas',
    alt: 'Bandeja de solicitudes recibidas en Laboratorios, con contadores de por revisar, fuera de plazo y cambios pedidos.',
    recorte: CONTENIDO(430),
    marcas: [
      { n: 1, rect: { x: 309, y: 184, w: 262, h: 100 }, tipo: 'marco', lado: 'abajo', titulo: 'Lo que espera tu respuesta', texto: 'Un contador por tipo de pendiente.' },
      { n: 2, rect: { x: 333, y: 328, w: 618, h: 38 }, tipo: 'marco', lado: 'abajo', titulo: 'Filtra la bandeja', texto: 'Con recursos, con cambios pedidos o fuera de plazo.' },
      { n: 3, rect: { x: 310, y: 418, w: 1080, h: 66 }, tipo: 'boton', lado: 'arriba', titulo: 'Abre una solicitud', texto: 'Revisa recursos, aprueba o pide cambios.' },
    ],
  },
  {
    id: 'mantenimiento-por-hacer',
    ruta: 'mantenimiento/por-hacer',
    direccion: 'platlab.app / Mantenimiento / Por hacer',
    alt: 'Lista Por hacer de Mantenimiento: trabajos atrasados y próximos 30 días, con su equipo, fecha y botón Registrar.',
    recorte: CONTENIDO(670),
    marcas: [
      { n: 1, rect: { x: 310, y: 238, w: 1080, h: 272 }, tipo: 'marco', lado: 'izquierda', titulo: 'Lo atrasado, arriba', texto: 'Los trabajos vencidos van primero, con los días de atraso.' },
      { n: 2, rect: { x: 937, y: 306, w: 232, h: 24 }, tipo: 'marco', lado: 'arriba', titulo: 'Estado con texto', texto: '«No conforme», «atrasado» o «en 10 días», nunca solo un color.' },
      { n: 3, loc: (p) => p.getByRole('button', { name: 'Registrar', exact: true }).first(), pad: 6, tipo: 'boton', lado: 'izquierda', titulo: 'Registra en un clic', texto: 'Anota el trabajo hecho y el próximo vencimiento se calcula solo.' },
    ],
  },
  {
    id: 'materiales-prestamos',
    ruta: 'materiales/prestamos',
    direccion: 'platlab.app / Materiales / Préstamos',
    alt: 'Préstamos de materiales con vale, persona, piezas pendientes, plazo y estado Activo o Atrasado.',
    recorte: CONTENIDO(350),
    marcas: [
      { n: 1, loc: (p) => p.getByRole('button', { name: 'Nuevo préstamo' }), pad: 6, tipo: 'boton', lado: 'abajo', titulo: 'Un vale por préstamo', texto: 'Quién se lleva qué y para cuándo.' },
      { n: 2, rect: { x: 310, y: 180, w: 437, h: 34 }, tipo: 'marco', lado: 'abajo', titulo: 'Abiertos y atrasados', texto: 'Cambia de vista sin perder el contexto.' },
      { n: 3, rect: { x: 310, y: 340, w: 1080, h: 70 }, tipo: 'marco', lado: 'arriba', titulo: 'Los atrasados se notan', texto: 'Plazo, piezas por devolver y estado en la misma fila.' },
    ],
  },
  // ---- Cada rol ve lo suyo: la misma pantalla de Inicio con tres cuentas ----
  ...[
    ['rol-admin', 'admin', 'Inicio visto por la Administradora: los cinco módulos del espacio.'],
    ['rol-operador', 'operador', 'Inicio visto por el Operador: los cinco módulos, con sus pendientes propios.'],
    ['rol-docente', 'docente', 'Inicio visto por el Docente: solo Equipos y Laboratorios.'],
  ].map(([id, cuenta, alt]) => ({
    id,
    cuenta,
    ruta: '',
    direccion: 'platlab.app / Inicio',
    alt,
    recorte: { x: 0, y: 0, w: 1440, h: 940 },
    marcas: [],
  })),
];
