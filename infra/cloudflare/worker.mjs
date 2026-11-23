// El Worker solo atiende las rutas de `run_worker_first` (wrangler.jsonc); todo lo demás es el sitio público.
// /v1/* va a la API: un solo origen para el navegador, sin CORS (02 §10). Las respuestas privadas ya llevan
// `Cache-Control: no-store`; el Worker no cachea nada. Las rutas de la app reciben su index.html y su enrutador
// decide la pantalla.
export default {
  fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/v1/')) {
      return fetch(new Request(new URL(url.pathname + url.search, env.API_ORIGIN), request));
    }
    return env.ASSETS.fetch(new Request(new URL('/_app/', url), request));
  },
};
