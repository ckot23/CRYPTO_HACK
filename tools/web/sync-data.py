#!/usr/bin/env python3
"""Собирает web/js/core/gamedata.js из Assets/Resources/gamedata.json.

Единственный источник контента — gamedata.json (он же читает Unity-версия).
Этот скрипт лишь оборачивает его в обычный JS-файл, чтобы браузерная сборка
работала и без HTTP-сервера (fetch на file:// запрещён), и отдавала данные
мгновенно, без лишнего запроса.

Запуск из корня репозитория:
    python3 tools/web/sync-data.py
"""

import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / "Assets" / "Resources" / "gamedata.json"
DST = ROOT / "web" / "js" / "core" / "gamedata.js"

# Мягкая палитра браузерной версии: в JSON (он общий с Unity) цвета «жёсткие»,
# при раскладке в web/ перекрашиваем их — так генерируемый файл всегда совпадает
# по виду с остальным интерфейсом.
SOFT_COLORS = {
    "#00ff9d": "#4fe0a8",   # кислый зелёный → мята
    "#00e5ff": "#6cd8f2",   # электрик → небесный
    "#ff2d78": "#ff7aa8",   # фуксия → роза
    "#ffe600": "#ffd479",   # кислый жёлтый → янтарь
    "#ff9f43": "#ffb27a",   # оранжевый → персик
    "#d7e3f4": "#e2e9f5",   # текст
}

HEADER = """/* ==========================================================================
   gamedata.js — контент игры (монеты, миссии, апгрейды, уроки, цитаты).

   ФАЙЛ СГЕНЕРИРОВАН: tools/web/sync-data.py из Assets/Resources/gamedata.json.
   Руками не править — правь JSON и запусти:
       python3 tools/web/sync-data.py
   ========================================================================== */
(function (root, data) {
  "use strict";
  if (typeof module !== "undefined" && module.exports) module.exports = data;
  root.CRYPTO_HACK_DATA = data;
})(typeof globalThis !== "undefined" ? globalThis : this, """


def main() -> int:
    if not SRC.exists():
        print(f"не найден {SRC}", file=sys.stderr)
        return 1

    raw = json.loads(SRC.read_text(encoding="utf-8"))

    recolored = 0
    for item in raw.get("cryptos", []):
        color = SOFT_COLORS.get(str(item.get("color", "")).lower())
        if color:
            item["color"] = color
            recolored += 1

    body = json.dumps(raw, ensure_ascii=False, indent=2, sort_keys=False)

    DST.parent.mkdir(parents=True, exist_ok=True)
    DST.write_text(HEADER + body + ");\n", encoding="utf-8")

    size = DST.stat().st_size
    print(f"ok: {DST.relative_to(ROOT)} ({size} байт) — "
          f"монет {len(raw.get('cryptos', []))}, "
          f"миссий {len(raw.get('missions', []))}, "
          f"апгрейдов {len(raw.get('upgrades', []))}, "
          f"уроков {len(raw.get('lessons', []))}, "
          f"монет перекрашено в мягкую палитру {recolored}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
