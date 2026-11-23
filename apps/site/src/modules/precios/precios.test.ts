import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DESCUENTO_PAQUETE, PAQUETE, PRECIO_SUELTO, TECHO_COMPRA_DIRECTA, ahorroPaquete, convienePaquete, mantenimiento, mensajeCotizacion, pagoUnico, usd } from "./precios.ts";

describe("Precios publicados (ADR 0032)", () => {
  it("el primer año es el Núcleo más cada módulo elegido", () => {
    assert.equal(pagoUnico(1), 2300);
    assert.equal(pagoUnico(3), 4900);
  });

  it("el mantenimiento es el 20 % de lo adquirido, y el del paquete Institucional es su cifra fija", () => {
    assert.equal(mantenimiento(1), 460);
    assert.equal(mantenimiento(3), 980);
    assert.equal(PAQUETE.mantenimiento, 1200);
  });

  it("el paquete descuenta frente a los cinco módulos sueltos y se recomienda desde cuatro", () => {
    assert.deepEqual(PRECIO_SUELTO, { pago: 7500, mantenimiento: 1500 });
    assert.deepEqual(DESCUENTO_PAQUETE, { pago: 1700, mantenimiento: 300 });
    assert.deepEqual(ahorroPaquete(4), { pago: 400, mantenimiento: 40 });
    assert.equal(convienePaquete(3), false);
    assert.equal(convienePaquete(4), true);
    assert.equal(convienePaquete(5), true);
  });

  it("ningún primer pago llega al límite de la compra pública directa", () => {
    for (let n = 1; n <= 5; n++) assert.ok(pagoUnico(n) < TECHO_COMPRA_DIRECTA, `${n} módulos`);
    assert.ok(PAQUETE.pago < TECHO_COMPRA_DIRECTA);
  });

  it("escribe los montos con punto de miles y cotiza lo elegido", () => {
    assert.equal(usd(50), "US$50");
    assert.equal(usd(1300), "US$1.300");
    assert.match(mensajeCotizacion("Reactivos y Equipos"), /cotización de PlatLab: Reactivos y Equipos\./);
  });
});
