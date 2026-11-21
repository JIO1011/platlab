// Reenvía /v1/* a la API. Un solo origen para el navegador: sin CORS (02 §10). Las respuestas privadas ya llevan
// `Cache-Control: no-store`; el Worker no cachea nada.
export default {
  fetch(request, env) {
    const { pathname, search } = new URL(request.url);
    return fetch(new Request(new URL(pathname + search, env.API_ORIGIN), request));
  },
};
