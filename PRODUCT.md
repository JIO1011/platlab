# PRODUCT.md

Contexto de producto para las herramientas de diseño. No copia la documentación: la verdad del producto vive en `docs/` y este archivo solo la enlaza.

## Platform

web

## Register

product (Operate): aplicación de trabajo diario para laboratorios.

## Fuentes

- Qué es, módulos, roles, flujos y pantallas: [docs/01_producto.md](docs/01_producto.md) (§5 roles, §7 «Cómo se ve la plataforma» y «Dirección visual»).
- Stack y frontend: [docs/02_arquitectura.md](docs/02_arquitectura.md) §2 y §8.
- Sistema de diseño y movimiento: [ADR 0010](docs/05_decisiones.md#adr-0010).
- Lo que se construye ahora: [primer incremento](docs/desarrollo/primer_incremento.md), «Interfaz mínima».
- Glosario: [docs/README.md](docs/README.md#glosario).

## Restricciones que no se negocian

- Las reglas del dominio mandan sobre el estilo: no hay UI optimista sobre existencias ni «deshacer» en movimientos confirmados.
- La interfaz oculta lo que el usuario no puede hacer y la API lo rechaza igual.
- Español de Ecuador; WCAG 2.2 AA.
