# ADR 0004 — Identidad, invitaciones y consola del proveedor

Estado: aceptado. Fecha: 28 de septiembre de 2026. Reemplaza la consola dentro del frontend institucional; conserva API y monolito comunes.

## Identidad y JWT

F1a configura firma asimétrica de Supabase y verifica JWT mediante JWKS del proyecto con `jose`. El servidor fija emisor, audiencia, algoritmos permitidos y URL de claves; comprueba firma, expiración, sujeto y `kid`. No toma la URL de claves de un token ni distribuye un secreto compartido de firma a la API. Probar rotación, clave desconocida y caché; revocar una clave no es necesariamente inmediato en verificadores con caché. Membresía/operador vigente se comprueban en PostgreSQL aunque el JWT sea válido. [Claves de firma](https://supabase.com/docs/guides/auth/signing-keys), [verificación JWT](https://supabase.com/docs/guides/auth/jwts#verifying-a-jwt-from-supabase).

El acceso por correo basta para el primer incremento. Google y Microsoft OAuth se incorporan en F3 antes del piloto docente, conservando alternativa por correo. OAuth no es SAML institucional. Azure necesita `email` y comprobación de `xms_edov`/garantías del proveedor para correos verificados; probar organizaciones externas y cuentas admitidas. Su tenant de Entra no es un workspace de PlatLab. No asignar pertenencia por dominio o por un claim `tid`. [Azure](https://supabase.com/docs/guides/auth/social-login/auth-azure), [Google](https://supabase.com/docs/guides/auth/social-login/auth-google).

No implementar fusiones propias por nombre/email; usar capacidades de vinculación admitidas por Auth y comprobar sus garantías. SAML tiene reglas distintas y queda fuera del alcance inicial. [Vinculación de identidades](https://supabase.com/docs/guides/auth/auth-identity-linking).

## Invitación con un solo correo

La invitación al workspace se registra antes en Core. Para una persona nueva por correo, se integra invitación Auth y continuación al espacio: la cuenta se confirma **al verificar/canjear el correo**, nunca por haber sido incluida en un CSV. Una identidad existente o autenticada por OAuth acepta la membresía local sin otra alta global. La aceptación es idempotente y comprueba destinatario verificado, vigencia, revocación y facultades de delegación actuales. [Invitar usuarios](https://supabase.com/docs/guides/auth/users#inviting-users).

No utilizar `email_confirm: true` como atajo ni guardar autorización en metadatos editables por el usuario. No aceptar invitaciones ni consumir tokens mediante un GET automático: analizadores de correo pueden abrir enlaces antes que la persona. Implementar pantalla y acción explícita, y probar navegadores distintos y enlaces reabiertos. PKCE de OAuth y canje de invitación no son el mismo flujo. [Precarga de enlaces](https://supabase.com/docs/guides/auth/auth-email-templates#email-prefetching), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow).

## Consola del proveedor

Crear `apps/operator`, una SPA compilada por separado y publicada en `ops.<dominio>`. Compartir componentes/contratos con `apps/web`, sin importar su sesión ni guardar secretos en ninguno de los bundles. Ambas consumen la misma API; no se crea otro backend de negocio.

Cada ruta `/v1/operator/*` exige JWT validado + `aal2` + operador activo + permiso específico. OAuth por sí solo no satisface `aal2`; el servidor exige el factor adicional. CORS y el dominio no constituyen autorización. No usar cookies compartidas con `Domain=.dominio` para dar sesión operadora a todas las aplicaciones. [MFA en API](https://supabase.com/docs/guides/auth/auth-mfa#apis).

Cloudflare Access es opcional y no reemplaza estos controles. El plan consultado ofrece hasta 50 usuarios gratuitos, sujeto a condiciones futuras. Si también se protege la API administrativa, validar la assertion de Access en el origen y cubrir el hostname que evita el proxy; proteger solo los archivos del frontend no protege `/v1/operator/*`. [Planes Access](https://www.cloudflare.com/plans/zero-trust-services/), [validación de assertion](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/).

La limitación de la consola no elimina acceso de custodios a infraestructura. Ese acceso tiene controles distintos en [ADR 0005](0005_datos_reales_y_recuperacion.md).
