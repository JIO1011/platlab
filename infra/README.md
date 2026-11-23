# Puesta en marcha de staging (ADR 0033)

Primer entorno en la nube, con datos sintéticos. Ningún secreto va al repositorio. Las decisiones están en el
[ADR 0033](../docs/05_decisiones.md#adr-0033); la arquitectura, en [02 §9](../docs/02_arquitectura.md#9-infraestructura-y-ambientes).

```
Navegador ─► Worker «platlab» (Cloudflare) ─┬─ sitio público: la raíz y todo lo que no es de la app
                                           ├─ app: /acceso, /espacios, /e/*, /q/* (y /assets/, /ghs/)
                                           └─ /v1/* ─► API en Render ─► Supabase (PostgreSQL, Auth, Storage)
Navegador ─► Supabase: sesión y archivos públicos
```

`<ref>` es la referencia del proyecto Supabase (`wlqbokexiuvhdwafhfoe`). El orden importa: el rol de la API lo crean las migraciones.

## Una sola vez, en este orden

1. **Supabase.** Proyecto `platlab` (`wlqbokexiuvhdwafhfoe`), región `us-east-2`, con una contraseña de base larga guardada en un gestor.
   En Authentication → Sign In / Providers, apagar «Allow new users to sign up».
2. **Migraciones (desde tu terminal, la primera vez).** Con la conexión del rol `postgres` por Supavisor en modo
   sesión (Connect → Session pooler):
   `pnpm supabase db push --db-url "<conexión>" --yes`. Desde entonces las aplica el CI.
3. **Rol de la API (SQL Editor).** Las migraciones lo crean sin acceso; se le da contraseña una vez, fuera de Git:
   `alter role platlab_api with login password '<contraseña larga>';`
   La de `supabase/seed.sql` es solo local y no se usa aquí.
4. **Archivos.** Storage → bucket público `public-files` (20 MiB; PDF, JPEG, PNG y WebP, como en `supabase/config.toml`).
   Storage → S3 Connection → crear claves de acceso: solo alcanzan archivos.
5. **Datos de demostración (opcional).** `psql "<conexión>" -f supabase/seeds/demo.sql`: cuentas y datos sintéticos
   (contraseña `platlab-demo`, la de la demo abierta).
6. **Render.** New → Blueprint, con este repositorio (`render.yaml`); pide los valores de la tabla. Al terminar, copiar la
   URL del servicio (si `platlab-api` estaba ocupado, Render agrega un sufijo: ajustar `API_ORIGIN` en
   `infra/cloudflare/wrangler.jsonc`) y el **Deploy Hook** (Settings).
7. **Cloudflare** (cuenta de ohmroyal). Token de API con «Edit Cloudflare Workers» y la zona `ohmroyal.org`.
8. **GitHub.** Settings → Environments → `staging`: los secretos y variables de la tabla. Al final, la variable de
   repositorio `DEPLOY_STAGING=true`, y Actions → Deploy staging → Run workflow.
9. **Probar** en el `workers.dev` del Worker (`platlab`): el sitio en la raíz, el acceso en `/acceso` y `/v1/me/workspaces` con 401 sin sesión.

Para probar el Worker en local: compilar la web y el sitio, juntar los activos y levantarlo
(`node infra/cloudflare/assets.mjs`, luego `pnpm dlx wrangler@4.166.0 dev --config infra/cloudflare/wrangler.jsonc`).

## Valores

| Dónde | Nombre | Valor |
|---|---|---|
| Render | `DATABASE_URL_API` | `postgres://platlab_api.<ref>:<contraseña>@<host del Session pooler>:5432/postgres` (Connect → Session pooler; el usuario lleva el sufijo `.<ref>`) |
| Render | `AUTH_JWKS_URL` | `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json` |
| Render | `AUTH_ISSUER` | `https://<ref>.supabase.co/auth/v1` |
| Render | `STORAGE_S3_URL` | `https://<ref>.supabase.co/storage/v1/s3` |
| Render | `STORAGE_S3_REGION` | `us-east-2` |
| Render | `STORAGE_S3_ACCESS_KEY_ID` / `STORAGE_S3_SECRET_ACCESS_KEY` | Las claves S3 del paso 4 |
| Render | `STORAGE_PUBLIC_URL` | `https://<ref>.supabase.co/storage/v1/object/public` |
| GitHub (secreto) | `STAGING_MIGRATIONS_DB_URL` | La conexión del paso 2 |
| GitHub (secreto) | `RENDER_DEPLOY_HOOK_URL` | El Deploy Hook del servicio |
| GitHub (secreto) | `CLOUDFLARE_API_TOKEN` | El token del paso 7 |
| GitHub (variable) | `CLOUDFLARE_ACCOUNT_ID` | `eb6d1357bac4c84bcca2ab2dfe6d903c` |
| GitHub (variable) | `STAGING_SUPABASE_URL` | `https://<ref>.supabase.co` |
| GitHub (variable) | `STAGING_SUPABASE_PUBLISHABLE_KEY` | La clave publicable del proyecto (pública por diseño) |

## Dominio

`platlab.ohmroyal.org` es un dominio personalizado del Worker (`routes` en `infra/cloudflare/wrangler.jsonc`): Cloudflare crea el registro DNS y el certificado al desplegar. No puede existir antes un CNAME con ese nombre (el del túnel antiguo se borró). `workers.dev` queda activo para pruebas; para apagarlo se quita `workers_dev`. Si el despliegue falla por permisos, el token necesita «Workers Routes: Edit» en la zona `ohmroyal.org`.
