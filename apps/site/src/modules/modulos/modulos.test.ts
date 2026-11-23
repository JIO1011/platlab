import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ETAPAS, MODULOS } from "./modulos.ts";
import manifiesto from "../capturas/manifiesto.json" with { type: "json" };

describe("Catálogo de módulos y capturas", () => {
  it("cada módulo apunta a capturas que existen en el manifiesto y en public/capturas", () => {
    assert.equal(MODULOS.length, 5);
    const mapa = manifiesto as Record<string, { archivo: string }>;

    for (const mod of MODULOS) {
      for (const id of [mod.principal, mod.secundaria].filter((x): x is string => Boolean(x))) {
        const entrada = mapa[id];
        assert.ok(entrada, `Falta ${id} en manifiesto.json`);
        const rutaArchivo = join(process.cwd(), "public", entrada.archivo);
        assert.ok(existsSync(rutaArchivo), `No existe el archivo ${rutaArchivo}`);
      }
    }
  });

  it("cada módulo declara una etapa conocida y tres puntos", () => {
    for (const mod of MODULOS) {
      assert.ok(mod.etapa in ETAPAS, `${mod.slug}: etapa desconocida`);
      assert.equal(mod.puntos.length, 3, `${mod.slug} debe tener tres puntos`);
    }
  });
});
