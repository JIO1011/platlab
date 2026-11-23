"use client";

import { useState } from "react";
import { Layers, Mail } from "lucide-react";
import { ICONOS, MODULOS } from "@/modules/modulos";
import { SITE, enlaceCorreo } from "@/shared/config/site-config";
import { ASUNTO_COTIZACION, PAQUETE, PRECIOS, ahorroPaquete, convienePaquete, mantenimiento, mensajeCotizacion, pagoUnico, usd } from "./precios";
import estilos from "./precios.module.css";

const enumerar = new Intl.ListFormat("es", { style: "long", type: "conjunction" });

/** Un precio de referencia tachado; el lector de pantalla oye «por separado». */
function Tachado({ monto }: { monto: number }) {
  return (
    <s className={estilos.tachado}>
      <span className="sr-only">Por separado: </span>
      {usd(monto)}
    </s>
  );
}

/**
 * «Arme su plan»: el visitante marca sus módulos y ve el primer año y los siguientes. Cuando el paquete
 * Institucional sale más barato, el resumen muestra el paquete con el descuento frente al precio por separado.
 */
export function Calculadora() {
  const [elegidos, setElegidos] = useState<ReadonlySet<string>>(() => new Set(["reactivos"]));
  const nombres = MODULOS.filter((m) => elegidos.has(m.slug)).map((m) => m.nombre);
  const faltan = MODULOS.filter((m) => !elegidos.has(m.slug)).map((m) => m.nombre);
  const n = nombres.length;
  const paquete = convienePaquete(n);
  const ahorro = ahorroPaquete(n);
  const faltaParaPaquete = !paquete && n > 0 && convienePaquete(n + 1) ? PAQUETE.pago - pagoUnico(n) : null;
  const eleccion = paquete ? "el Paquete Institucional" : `Núcleo + ${enumerar.format(nombres)}`;

  function alternar(slug: string) {
    setElegidos((previos) => {
      const siguientes = new Set(previos);
      if (siguientes.has(slug)) siguientes.delete(slug);
      else siguientes.add(slug);
      return siguientes;
    });
  }

  return (
    <div className={estilos.calculadora}>
      <fieldset className={estilos.opciones}>
        <legend className={estilos.leyenda}>Elija sus módulos</legend>
        <label className={estilos.opcion}>
          <input type="checkbox" checked disabled />
          <span className={estilos.icono}>
            <Layers size={20} aria-hidden="true" />
          </span>
          <span className={estilos.opcionTexto}>
            <strong>Núcleo</strong>
            <span>Usuarios ilimitados, roles, ubicaciones y auditoría. Siempre incluido.</span>
          </span>
          <span className={estilos.opcionPrecio}>{usd(PRECIOS.nucleo)}</span>
        </label>
        {MODULOS.map((m) => {
          const Icono = ICONOS[m.slug];
          return (
            <label key={m.slug} data-modulo={m.slug} className={estilos.opcion}>
              <input type="checkbox" checked={elegidos.has(m.slug)} onChange={() => alternar(m.slug)} />
              <span className={estilos.icono}>
                <Icono size={20} aria-hidden="true" />
              </span>
              <span className={estilos.opcionTexto}>
                <strong>{m.nombre}</strong>
                <span>{m.resuelve}</span>
              </span>
              <span className={estilos.opcionPrecio}>{usd(PRECIOS.modulo)}</span>
            </label>
          );
        })}
      </fieldset>

      <aside className={estilos.resumen} aria-label="Su plan">
        {n === 0 ? (
          <p className={estilos.resumenVacio} aria-live="polite">
            Elija al menos un módulo para ver su precio.
          </p>
        ) : (
          <div className={estilos.resumenCuerpo} aria-live="polite">
            <p className={estilos.eleccion}>{paquete ? "Paquete Institucional: los cinco módulos" : eleccion}</p>
            {paquete && (
              <p className={estilos.descuento}>
                {faltan.length === 0
                  ? `Descuento de ${usd(ahorro.pago)}`
                  : `Ahorra ${usd(ahorro.pago)} y suma ${enumerar.format(faltan)} sin costo`}
              </p>
            )}
            <div className={estilos.monto}>
              <span>Primer año</span>
              {paquete && <Tachado monto={pagoUnico(n)} />}
              <strong>{usd(paquete ? PAQUETE.pago : pagoUnico(n))}</strong>
              <small>Un solo pago, con puesta en marcha</small>
            </div>
            <div className={estilos.monto}>
              <span>Desde el segundo año</span>
              <strong>
                {paquete && <Tachado monto={mantenimiento(n)} />}
                {usd(paquete ? PAQUETE.mantenimiento : mantenimiento(n))}
                <small> al año</small>
              </strong>
              <small>Mantenimiento</small>
            </div>
            {faltaParaPaquete !== null && (
              <p className={estilos.conviene}>
                Por {usd(faltaParaPaquete)} más tiene los cinco módulos con el Paquete Institucional: {usd(PAQUETE.pago)} en total.
              </p>
            )}
          </div>
        )}
        <a href={enlaceCorreo(ASUNTO_COTIZACION, mensajeCotizacion(n === 0 ? "el Núcleo" : eleccion))} className="botonClaro">
          <Mail size={18} aria-hidden="true" />
          Cotizar por correo
        </a>
        <p className={estilos.resumenNota}>
          Valores en dólares, sin IVA, para espacios de hasta {PRECIOS.laboratoriosPorEspacio} laboratorios. O escríbanos a {SITE.contacto.correo}.
        </p>
      </aside>
    </div>
  );
}
