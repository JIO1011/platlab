// Tomas de móvil (390×844). Coordenadas en píxeles CSS de la página.
export const TOMAS_MOVIL = [
  {
    id: 'movil-inicio',
    ruta: '',
    direccion: '',
    alt: 'Inicio de PlatLab en el celular: tarjetas de módulos con sus cifras y avisos.',
    recorte: { x: 0, y: 0, w: 390, h: 844 },
    marcas: [
      { n: 1, rect: { x: 326, y: 8, w: 52, h: 48 }, tipo: 'marco', lado: 'abajo', titulo: 'Tu cuenta', texto: 'Tu rol decide qué módulos ves.' },
      { n: 2, rect: { x: 14, y: 294, w: 362, h: 270 }, tipo: 'boton', lado: 'abajo', titulo: 'Un toque abre el módulo', texto: 'Tarjetas grandes, pensadas para el pulgar.' },
      { n: 3, rect: { x: 38, y: 374, w: 214, h: 34 }, tipo: 'marco', lado: 'abajo', titulo: 'Lo urgente, primero', texto: 'Los avisos van arriba de las cifras.' },
    ],
  },
  {
    id: 'movil-inventario',
    ruta: 'reactivos/inventario',
    direccion: '',
    alt: 'Inventario de reactivos en el celular, con los botones Escanear y Registrar salida, filtros y tarjetas por reactivo.',
    recorte: { x: 0, y: 0, w: 390, h: 844 },
    marcas: [
      { n: 1, rect: { x: 14, y: 202, w: 362, h: 48 }, tipo: 'boton', lado: 'abajo', titulo: 'Escanea el frasco', texto: 'Apunta la cámara al código QR y abre su ficha.' },
      { n: 2, rect: { x: 14, y: 254, w: 362, h: 40 }, tipo: 'boton', lado: 'abajo', titulo: 'Registra una salida', texto: 'Desde el mismo lugar donde sacas el reactivo.' },
      { n: 3, rect: { x: 14, y: 412, w: 340, h: 164 }, tipo: 'marco', lado: 'arriba', titulo: 'Filtros al alcance', texto: 'Vencidos, bajo mínimo, sin ficha de seguridad…' },
    ],
  },
  {
    id: 'movil-incidentes',
    ruta: 'equipos/incidentes',
    direccion: '',
    alt: 'Incidentes de equipos en el celular, con el botón Reportar incidente y las fallas reportadas.',
    recorte: { x: 0, y: 0, w: 390, h: 844 },
    marcas: [
      { n: 1, rect: { x: 14, y: 202, w: 362, h: 48 }, tipo: 'boton', lado: 'abajo', titulo: 'Reporta en segundos', texto: 'Si algo falla, lo avisas ahí mismo, en el laboratorio.' },
      { n: 2, rect: { x: 14, y: 270, w: 362, h: 48 }, tipo: 'marco', lado: 'abajo', titulo: 'Cada falla sigue su camino', texto: 'Reportado, en reparación y solucionado.' },
      { n: 3, rect: { x: 138, y: 650, w: 122, h: 32 }, tipo: 'marco', lado: 'arriba', titulo: 'Impacto claro', texto: 'Sabes si el equipo todavía se puede usar.' },
    ],
  },
];
