"""Sirve la compilación estática del sitio de presentación para la demo publicada (ADR 0029).

Uso: python3 scripts/serve-site.py <carpeta> <puerto>. Escucha solo en 127.0.0.1, adonde apunta el túnel. Una
ruta que no existe responde con el 404.html del sitio, y las carpetas no se listan.
"""

import sys
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

root = Path(sys.argv[1]).resolve()
port = int(sys.argv[2])
not_found = (root / "404.html").read_bytes()


class SiteHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".txt": "text/plain; charset=utf-8",
        ".webp": "image/webp",
        ".woff2": "font/woff2",
    }

    def list_directory(self, path):
        self.send_error(HTTPStatus.NOT_FOUND)
        return None

    def send_error(self, code, message=None, explain=None):
        if code != HTTPStatus.NOT_FOUND:
            super().send_error(code, message, explain)
            return
        self.send_response(HTTPStatus.NOT_FOUND)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(not_found)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(not_found)

    def log_message(self, format, *args):
        pass


ThreadingHTTPServer(("127.0.0.1", port), partial(SiteHandler, directory=str(root))).serve_forever()
