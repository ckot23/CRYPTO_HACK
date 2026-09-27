#!/usr/bin/env python3
"""Отдаёт стиль-лист (web/styleguide.html) для проверки внешнего вида игры.

Отдельный порт нужен потому, что корень обычного статического сервера занят
самой игрой (web/index.html): здесь корень ведёт на стиль-лист, а картинки,
шрифты и neon.css берутся из web/.

Запуск из корня репозитория:
    python3 tools/web/design-preview.py 8081
"""

import functools
import http.server
import pathlib
import sys

WEB = pathlib.Path(__file__).resolve().parents[2] / "web"


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):                                     # noqa: N802 (API стандартной библиотеки)
        if self.path in ("/", "/index.html"):
            self.path = "/styleguide.html"
        return super().do_GET()


def main() -> int:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8081
    handler = functools.partial(Handler, directory=str(WEB))
    with http.server.ThreadingHTTPServer(("0.0.0.0", port), handler) as httpd:
        print(f"стиль-лист: http://localhost:{port}/  (каталог {WEB})")
        httpd.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
