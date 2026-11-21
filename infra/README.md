# Puesta en marcha de staging (ADR 0033)

Primer entorno en la nube, con datos sintéticos. Ningún secreto va al repositorio. Las decisiones están en el
[ADR 0033](../docs/05_decisiones.md#adr-0033); la arquitectura, en [02 §9](../docs/02_arquitectura.md#9-infraestructura-y-ambientes).

```
Navegador ─► Worker «platlab» (Cloudflare) ─┬─ activos de la web (SPA)
                                           └─ /v1/* ─► API en Render ─► Supabase (PostgreSQL, Auth, Storage)
Navegador ─► Supabase: sesión y archivos públicos
```

## Una sola vez

1. **Supabase** (`platlab-staging`, región `us-east-1`):
   - En SQL Editor, fijar la contraseña del rol de la API: `alter role platlab_api with password '<contraseña larga>';`
     Las migraciones crean el rol sin contraseña; la local de `supabase/seed.sql` nunca se usa aquí.
   - Storage: crear el bucket público `public-files` (20 MiB; PDF, JPEG, PNG y WebP, como en `supabase/config.toml`).
   - Storage → S3: crear unas claves de acceso (solo alcanzan archivos).
   - Authentication: desactivar el registro abierto y, para la demo, crear las cuentas sintéticas.
2. **Render:** New → Blueprint, con este repositorio (`render.yaml`). Pide los valores de abajo. Después, en el servicio,
   copiar su **Deploy Hook** (Settings).
3. **Cloudflare** (cuenta de ohmroyal): crear un token de API con «Edit Cloudflare Workers» y la zona `ohmroyal.org`.
4. **GitHub** → Settings → Environments → `staging`: cargar los secretos y variables; al final, la variable de
   repositorio `DEPLOY_STAGING=true`.

## Valores

`<ref>` es la referencia del proyecto Supabase.

| Dónde | Nombre | Valor |
|---|---|---|
| Render | `DATABASE_URL_API` | `postgres://platlab_api.<ref>:<contraseña>@aws-0-us-east-1.pooler.supabase.com:5432/postgres` (Supavisor, modo sesión) |
| Render | `AUTH_JWKS_URL` | `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json` |
| Render | `AUTH_ISSUER` | `https://<ref>.supabase.co/auth/v1` |
| Render | `STORAGE_S3_URL` | `https://<ref>.supabase.co/storage/v1/s3` |
| Render | `STORAGE_S3_REGION` | `us-east-1` |
| Render | `STORAGE_S3_ACCESS_KEY_ID` / `STORAGE_S3_SECRET_ACCESS_KEY` | Las claves S3 del paso 1 |
| Render | `STORAGE_PUBLIC_URL` | `https://<ref>.supabase.co/storage/v1/object/public` |
| GitHub (secreto) | `STAGING_MIGRATIONS_DB_URL` | Conexión del rol `postgres` por Supavisor, modo sesión (la de «Connect» en Supabase) |
| GitHub (secreto) | `RENDER_DEPLOY_HOOK_URL` | El Deploy Hook del servicio |
| GitHub (secreto) | `CLOUDFLARE_API_TOKEN` | El token del paso 3 |
| GitHub (variable) | `CLOUDFLARE_ACCOUNT_ID` | `eb6d1357bac4c84bcca2ab2dfe6d903c` |
| GitHub (variable) | `STAGING_SUPABASE_URL` | `https://<ref>.supabase.co` |
| GitHub (variable) | `STAGING_SUPABASE_PUBLISHABLE_KEY` | La clave publicable del proyecto (pública por diseño) |
| `wrangler.jsonc` | `API_ORIGIN` | La URL del servicio en Render, si no es `https://platlab-api.onrender.com` |

## Corte del dominio

Hasta aquí la web responde en el `workers.dev` del Worker y la demo del túnel sigue en `platlab.ohmroyal.org`. Para
cortar: probar el flujo completo en el `workers.dev`; borrar el CNAME `platlab` del túnel en el panel de Cloudflare; agregar
en `wrangler.jsonc` `"routes": [{ "pattern": "platlab.ohmroyal.org", "custom_domain": true }]` y desplegar.
Para volver atrás, se quita la ruta y se restaura el CNAME del túnel.
