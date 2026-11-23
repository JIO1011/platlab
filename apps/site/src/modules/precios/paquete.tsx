import { Mail } from "lucide-react";
import { ICONOS, MODULOS } from "@/modules/modulos";
import { enlaceCorreo } from "@/shared/config/site-config";
import { ASUNTO_COTIZACION, DESCUENTO_PAQUETE, PAQUETE, PRECIO_SUELTO, mensajeCotizacion, usd } from "./precios";
import estilos from "./precios.module.css";

/** La banda del paquete Institucional: todo PlatLab en un solo pago, con su descuento a la vista. */
export function Paquete() {
  return (
    <div className={estilos.paquete}>
      <div>
        <h2 className={estilos.paqueteTitulo}>Paquete Institucional</h2>
        <p className={estilos.paqueteTexto}>
          Todo PlatLab en un solo pago: el Núcleo con los cinco módulos, por {usd(DESCUENTO_PAQUETE.pago)} menos que comprarlos por separado.
        </p>
        <ul className={estilos.chips}>
          {MODULOS.map((m) => {
            const Icono = ICONOS[m.slug];
            return (
              <li key={m.slug} data-modulo={m.slug}>
                <Icono size={16} aria-hidden="true" />
                {m.nombre}
              </li>
            );
          })}
        </ul>
      </div>
      <div className={estilos.paquetePrecio}>
        <p className={estilos.descuento}>Descuento de {usd(DESCUENTO_PAQUETE.pago)}</p>
        <s className={estilos.tachado}>
          <span className="sr-only">Por separado: </span>
          {usd(PRECIO_SUELTO.pago)}
        </s>
        <strong>{usd(PAQUETE.pago)}</strong>
        <p className={estilos.paqueteNota}>Un solo pago, con puesta en marcha y capacitación</p>
        <p className={estilos.paqueteAnual}>
          Desde el segundo año:{" "}
          <s className={estilos.tachado}>
            <span className="sr-only">por separado </span>
            {usd(PRECIO_SUELTO.mantenimiento)}
          </s>{" "}
          <span className={estilos.sinCorte}>{usd(PAQUETE.mantenimiento)} al año</span>
        </p>
        <a href={enlaceCorreo(ASUNTO_COTIZACION, mensajeCotizacion("el Paquete Institucional"))} className="botonClaro">
          <Mail size={18} aria-hidden="true" />
          Cotizar el paquete
        </a>
      </div>
    </div>
  );
}
