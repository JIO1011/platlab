import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Sitio público de PlatLab", () => {
  test("muestra la propuesta, los accesos y los cinco módulos con sus imágenes", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Todo su laboratorio");

    // «Iniciar sesión» lleva a la app; la demostración, a la página con el correo (el único canal).
    await expect(page.getByRole("banner").getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute("href", /\/acceso$/);
    await expect(page.getByRole("banner").getByRole("link", { name: "Solicitar demostración" }).first()).toHaveAttribute("href", "/demo/");
    await expect(page.locator('a[href*="wa.me"], a[href^="tel:"]')).toHaveCount(0);

    // Un panel por módulo, con su etapa real.
    for (const slug of ["reactivos", "laboratorios", "equipos", "mantenimiento", "materiales"]) {
      await expect(page.locator(`article#${slug}`)).toHaveCount(1);
    }
    await expect(page.locator("article#reactivos").getByText("En piloto")).toBeVisible();
    await expect(page.locator("article#equipos").getByText("Próximamente")).toBeVisible();

    // Todas las imágenes cargan.
    const imgs = page.locator("img");
    const total = await imgs.count();
    expect(total).toBeGreaterThanOrEqual(12);
    for (let i = 0; i < total; i++) {
      const img = imgs.nth(i);
      await img.scrollIntoViewIfNeeded();
      const ok = await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0);
      expect(ok, `Imagen #${i} no cargó`).toBe(true);
    }
  });

  test("«Precios» calcula el primer año y el mantenimiento, y recomienda el paquete (ADR 0032)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("banner").getByRole("link", { name: "Precios" }).first().click();
    await expect(page).toHaveURL(/\/precios\/$/);

    // Empieza con Núcleo + Reactivos: 1.000 + 1.300 y el 20 % al año.
    const plan = page.getByRole("complementary", { name: "Su plan" });
    await expect(plan).toContainText("US$2.300");
    await expect(plan).toContainText("US$460");

    // Con cuatro módulos, el paquete Institucional sale más barato.
    for (const nombre of ["Laboratorios", "Equipos", "Mantenimiento"]) await page.getByRole("checkbox", { name: new RegExp(nombre) }).check();
    await expect(plan).toContainText("Paquete Institucional");
    await expect(plan).toContainText("Ahorra US$400 y suma Materiales sin costo");
    await expect(plan).toContainText("US$5.800");
    await expect(plan).toContainText("US$1.200");

    // Con los cinco, el descuento completo frente al precio por separado.
    await page.getByRole("checkbox", { name: /Materiales/ }).check();
    await expect(plan).toContainText("Descuento de US$1.700");
    await expect(plan.locator("s").first()).toContainText("US$7.500");
    await expect(plan.getByRole("link", { name: "Cotizar por correo" })).toHaveAttribute("href", /^mailto:contacto@ohmroyal\.org\?subject=.*Paquete%20Institucional/);
  });

  test("cumple WCAG 2.2 AA con axe en escritorio y móvil", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const vp of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(vp);
      for (const ruta of ["/", "/precios/"]) {
        await page.goto(ruta);
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
        expect(results.violations.map((v) => `${ruta} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
      }
    }
  });
});
