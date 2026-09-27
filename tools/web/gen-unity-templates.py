#!/usr/bin/env python3
"""Переносит шаблоны контрактов и боссов из браузерной версии в Unity-версию.

Источник правды — web/js/core/generator.js и web/js/core/bosses.js: тексты
заданий живут там, а не в C#. Скрипт переводит их в C#-файлы:

    Assets/Scripts/Core/ContractTemplates.cs        — 23 шаблона заданий
    Assets/Scripts/Core/BossCatalog.Generated.cs    — 4 сюжетных босса (данные)

Логика сборки контракта (сложности, пулы, награды, seed) написана руками в
ContractGenerator.cs, цепочка боссов — в BossCatalog.cs.

Если в generator.js появится конструкция, которую переводчик не знает, скрипт
НЕ пропускает её молча: он падает со списком неизвестных мест. Поэтому после
правок в JS достаточно перезапустить:

    python3 tools/web/gen-unity-templates.py

Проверка результата — tools/unity (headless-харнесс на .NET): он собирает
Unity-ядро и сравнивает контракты, которые выдают обе версии.
"""

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC_GEN = ROOT / "web" / "js" / "core" / "generator.js"
SRC_BOSSES = ROOT / "web" / "js" / "core" / "bosses.js"
DST_TEMPLATES = ROOT / "Assets" / "Scripts" / "Core" / "ContractTemplates.cs"
DST_BOSSES = ROOT / "Assets" / "Scripts" / "Core" / "BossCatalog.Generated.cs"

HEADER_TEMPLATES = """/* ==========================================================================
   ContractTemplates.cs — 23 шаблона контрактов для Unity-версии.

   ФАЙЛ СГЕНЕРИРОВАН: tools/web/gen-unity-templates.py
   из web/js/core/generator.js (тексты заданий живут там же, где в браузере).
   Руками не править — правь generator.js и запусти:
       python3 tools/web/gen-unity-templates.py

   Каждый шаблон — функция, которая получает контекст цели (GenContext) и
   возвращает поля задания: текст, стартовый код, решение, обязательные
   конструкции, подсказки и теорию.
   ========================================================================== */
using System;

namespace CryptoHack
{
    /// <summary>Собранные поля одного задания (то, что возвращает build в JS).</summary>
    public class BuiltTemplate
    {
        public string Task = "";
        public string StarterCode = "";
        public string Solution = "";
        public string[] RequiredPatterns = new string[0];
        public string[] Hints = new string[0];
        public string[] Theory = new string[0];
    }

    /// <summary>Шаблон задания: где доступен, чему учит и как собирается.</summary>
    public class MissionTemplate
    {
        public string Id = "";
        public int[] Tiers = new int[0];
        public int CodeLib;
        public string Concept = "";
        public string ConceptDesc = "";
        public Func<GenContext, BuiltTemplate> Build;
    }

    public static class ContractTemplates
    {
        // ---------------------------------------------------------------
        //  Помощники, которыми пользуются шаблоны (аналоги функций из JS)
        // ---------------------------------------------------------------

        /// <summary>Случайное целое в диапазоне [lo, hi] — как rint() в generator.js.</summary>
        internal static int Rint(GenRng rng, int lo, int hi)
        {
            return lo + (int)Math.Floor(rng.Next() * (hi - lo + 1));
        }

        /// <summary>Первые n элементов массива — как array.slice(0, n).</summary>
        internal static T[] Take<T>(T[] src, int n)
        {
            int count = n < 0 ? 0 : (n > src.Length ? src.Length : n);
            T[] result = new T[count];
            for (int i = 0; i < count; i++) result[i] = src[i];
            return result;
        }

        /// <summary>Список адресов в виде литерала Python: "0xA1", "0xB2".</summary>
        internal static string JoinQuoted(string[] items)
        {
            string result = "";
            for (int i = 0; i < items.Length; i++)
            {
                if (i > 0) result += ", ";
                result += "\\"" + items[i] + "\\"";
            }
            return result;
        }

        /// <summary>Пары «адрес: сумма» для словаря: "0xA1": 0.4, "0xB2": 1.2.</summary>
        internal static string JoinPairs(string[][] pairs)
        {
            string result = "";
            for (int i = 0; i < pairs.Length; i++)
            {
                if (i > 0) result += ", ";
                result += pairs[i][0] + ": " + pairs[i][1];
            }
            return result;
        }

        /// <summary>Экранирование текста для регулярки — как escapeRe в генераторе.</summary>
        internal static string EscapeRe(string text)
        {
            return System.Text.RegularExpressions.Regex.Escape(text);
        }

        /// <summary>Последняя часть IP — как c.ip.split(".").pop().</summary>
        internal static string IpTail(string ip)
        {
            int dot = ip.LastIndexOf('.');
            return dot >= 0 ? ip.Substring(dot + 1) : ip;
        }

        // ---------------------------------------------------------------
        //  Сами шаблоны
        // ---------------------------------------------------------------
        public static readonly MissionTemplate[] All = new MissionTemplate[]
        {
"""

BOSS_HEADER = """/* ==========================================================================
   BossCatalog.Generated.cs — данные четырёх сюжетных боссов.

   ФАЙЛ СГЕНЕРИРОВАН: tools/web/gen-unity-templates.py
   из web/js/core/bosses.js (там же живут их тексты). Руками не править —
   правь bosses.js и запусти:
       python3 tools/web/gen-unity-templates.py

   Логика цепочки (кто открыт, кого выдать следующим) — в BossCatalog.cs.
   ========================================================================== */
using System;

namespace CryptoHack
{
    /// <summary>Один сюжетный босс: легенда, задание, награда и условие открытия.</summary>
    public class BossData
    {
        public int Index;
        public int Id;
        public string Name = "";
        public string Subtitle = "";
        public string Glyph = "";
        public string TargetName = "";
        public string Os = "";
        public int Security;
        public int Need;              // сколько контрактов должно быть закрыто
        public string Coin = "BTC";
        public float Amount;
        public float Dollars;
        public int Xp;
        public int CodeLib;
        public string TemplateId = "";  // на каком шаблоне построено задание
        public string Briefing = "";
        public string Task = "";
        public string StarterCode = "";
        public string Solution = "";
        public string[] RequiredPatterns = new string[0];
        public string[] Hints = new string[0];
        public string[] Theory = new string[0];
    }

    public static class BossCatalogGenerated
    {
        public static readonly BossData[] All = new BossData[]
        {
"""


# ---------------------------------------------------------------------------
#  Вспомогательный разбор JS-текста
# ---------------------------------------------------------------------------
def read(path: pathlib.Path) -> str:
    if not path.exists():
        sys.exit("не найден " + str(path))
    return path.read_text(encoding="utf-8")


def slice_block(text: str, open_index: int) -> str:
    """Содержимое блока { ... } с учётом вложенности и кавычек."""
    depth = 0
    quote = None
    i = open_index
    while i < len(text):
        ch = text[i]
        if quote:
            if ch == "\\":
                i += 2
                continue
            if ch == quote:
                quote = None
        elif ch in "\"'":
            quote = ch
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[open_index + 1:i]
        i += 1
    raise SystemExit("не закрыт блок — проверь исходник")


def split_top_level(text: str, sep: str = ",") -> list:
    """Разбить по разделителям верхнего уровня (кавычки и скобки учитываются)."""
    parts = []
    depth = 0
    quote = None
    current = ""
    i = 0
    while i < len(text):
        ch = text[i]
        if quote:
            current += ch
            if ch == "\\" and i + 1 < len(text):
                current += text[i + 1]
                i += 2
                continue
            if ch == quote:
                quote = None
        elif ch in "\"'":
            quote = ch
            current += ch
        elif ch in "([{":
            depth += 1
            current += ch
        elif ch in ")]}":
            depth -= 1
            current += ch
        elif ch == sep and depth == 0:
            parts.append(current.strip())
            current = ""
        else:
            current += ch
        i += 1
    if current.strip():
        parts.append(current.strip())
    return parts


def split_statements(text: str) -> list:
    """Разбить пролог build() на объявления по «;» верхнего уровня."""
    parts = []
    depth = 0
    quote = None
    current = ""
    i = 0
    while i < len(text):
        ch = text[i]
        if quote:
            current += ch
            if ch == "\\" and i + 1 < len(text):
                current += text[i + 1]
                i += 2
                continue
            if ch == quote:
                quote = None
        elif ch in "\"'":
            quote = ch
            current += ch
        elif ch in "([{":
            depth += 1
            current += ch
        elif ch in ")]}":
            depth -= 1
            current += ch
        elif ch == ";" and depth == 0:
            parts.append(current.strip())
            current = ""
        else:
            current += ch
        i += 1
    if current.strip():
        parts.append(current.strip())
    return parts


STRING_RE = re.compile(r'"(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\'')

# Идиомы из generator.js, которые нужно узнать (иначе — ошибка перевода)
RINT_CALL_RE = re.compile(r"^rint\(c\.rng, (-?\w+), (-?\w+)\)$")
RINT_ARG_RE = re.compile(r"^rint\(c\.rng, (-?\w+), (-?\w+)\)$")
MAXSEC_RE = re.compile(r"^Math\.max\((-?\w+), c\.security(?: - (\w+))?\)$")
# идиома '"' + w + '"' — адрес в кавычках для python-литерала
QUOTED_TOKEN = "'" + chr(34) + "'"
MAP_QUOTED_RE = re.compile(
    r"^(\w+)\.map\(function\s*\(\w+\)\s*\{\s*return\s+" + re.escape(QUOTED_TOKEN)
    + r"\s*\+\s*\w+\s*\+\s*" + re.escape(QUOTED_TOKEN) + r"\s*;\s*\}\)"
    + r"\.join\(\"\s*,\s*\"\)$")
PAIRS_RE = re.compile(
    r"^(\[\[.*?\]\])\.slice\(0,\s*([^)]+)\)\s*\.map\(function\s*\(\w+\)\s*\{\s*return\s+"
    r"\w+\[0\]\s*\+\s*\":\s*\"\s*\+\s*\w+\[1\]\s*;\s*\}\)\.join\(\"\s*,\s*\"\)$", re.S)

CTX_MAP = {
    "c.rng": "c.Rng",
    "c.ip": "c.Ip",
    "c.os": "c.Os",
    "c.security": "c.Security",
    "c.coin": "c.Coin",
    "c.index": "c.Index",
    "c.target.name": "c.TargetName",
    "c.target.os": "c.Os",
}


def js_string_to_cs(literal: str) -> str:
    """JS-строку (вместе с кавычками) перевести в C#-строку."""
    quote = literal[0]
    body = literal[1:-1]
    if quote == "'":
        # в одинарных кавычках JS кавычки двойные не экранируются, а в C# обязательно
        body = body.replace('"', '\\"')
    body = body.replace("\\/", "/")
    return '"' + body + '"'


def arr_to_cs(expr: str, path: str, unknown: list) -> str:
    """JS-массив → C#-массив new[] { ... }."""
    items = split_top_level(expr.strip()[1:-1])
    converted = []
    for item in items:
        item = item.strip()
        if item.startswith("[") and item.endswith("]"):
            converted.append(arr_to_cs(item, path, unknown))
        elif STRING_RE.fullmatch(item):
            converted.append(js_string_to_cs(item))
        else:
            converted.append(expr_to_cs(item, path, unknown))
    return "new[] { " + ", ".join(converted) + " }"


def convert_js_strings(expr: str) -> str:
    """Заменить строковые литералы JS (одинарные и двойные) на C#-совместимые."""
    out = ""
    i = 0
    while i < len(expr):
        ch = expr[i]
        if ch in "\"'":
            j = i + 1
            while j < len(expr):
                if expr[j] == "\\":
                    j += 2
                    continue
                if expr[j] == ch:
                    break
                j += 1
            literal = expr[i:j + 1]
            out += literal if ch == '"' else js_string_to_cs(literal)
            i = j + 1
            continue
        out += ch
        i += 1
    return out


def expr_to_cs(expr: str, path: str, unknown: list) -> str:
    """JS-выражение → C#-выражение."""
    expr = expr.strip()

    # map/join — узнаём по идиоме целиком, до остальных замен
    m = MAP_QUOTED_RE.match(expr)
    if m:
        return f"JoinQuoted({m.group(1)})"
    m = PAIRS_RE.match(expr)
    if m:
        return f"JoinPairs(Take({arr_to_cs(m.group(1), path, unknown)}, {m.group(2).strip()}))"
    m = re.match(r"^(\w+)\.join\(\"\s*,\s*\"\)$", expr)
    if m:
        return f"string.Join(\", \", {m.group(1)})"

    # конкатенация строк: «текст» + список.join(", ") + «текст» — по частям
    if "+" in expr:
        parts = split_top_level(expr, "+")
        if len(parts) > 1:
            return " + ".join(expr_to_cs(part, path, unknown) for part in parts)

    # ищем незнакомые обращения к контексту до подстановки C#-имён
    for token in re.findall(r"\bc\.(?:\w+\.?)+", expr):
        if token not in CTX_MAP:
            unknown.append(f"{path}: неизвестное поле контекста {token}")

    for js, cs in CTX_MAP.items():
        expr = re.sub(r"\b" + re.escape(js) + r"\b", cs, expr)
    expr = expr.replace("Math.max(", "System.Math.Max(").replace("Math.min(", "System.Math.Min(")
    expr = expr.replace("escapeRe(", "EscapeRe(")

    if ".map(" in expr or ".slice(" in expr or "function" in expr:
        unknown.append(f"{path}: не поддержано выражение «{expr[:70]}»")
    return convert_js_strings(expr)


def decl_to_cs(statement: str, path: str, unknown: list) -> str:
    """Одно объявление var из JS → строка C#."""
    statement = statement.strip().rstrip(";").strip()
    m = re.match(r"^var (\w+) = (.*)$", statement, re.S)
    if not m:
        unknown.append(f"{path}: не поддержано объявление «{statement[:80]}»")
        return "// ??? " + statement

    name, value = m.group(1), m.group(2).strip()

    r = RINT_CALL_RE.match(value)
    if r:
        return f"int {name} = Rint(c.Rng, {r.group(1)}, {r.group(2)});"

    r = MAXSEC_RE.match(value)
    if r:
        if r.group(2):
            return f"int {name} = System.Math.Max({r.group(1)}, c.Security - {r.group(2)});"
        return f"int {name} = System.Math.Max({r.group(1)}, c.Security);"

    if value == 'c.ip.split(".").pop()':
        return f"string {name} = IpTail(c.Ip);"

    r = MAP_QUOTED_RE.match(value)
    if r:
        return f"string {name} = JoinQuoted({r.group(1)});"

    r = PAIRS_RE.match(value)
    if r:
        return (f"string {name} = JoinPairs(Take({arr_to_cs(r.group(1), path, unknown)}, "
                f"{r.group(2).strip()}));")

    # массив с .slice(0, N)
    if value.startswith("[") and "].slice(" in value:
        close = value.rindex("].slice(")
        cs_arr = arr_to_cs(value[:close + 1], path, unknown)
        arg = value[close + len("].slice("):]
        if arg.endswith(")"):
            arg = arg[:-1]
        args = split_top_level(arg)
        arg = args[-1].strip()          # slice(0, N) — нужен только N
        rr = RINT_ARG_RE.match(arg)
        cs_arg = f"Rint(c.Rng, {rr.group(1)}, {rr.group(2)})" if rr else expr_to_cs(arg, path, unknown)
        return f"string[] {name} = Take({cs_arr}, {cs_arg});"

    # массив чисел из rint(...)
    if value.startswith("[") and value.endswith("]") and "rint(" in value:
        cs_items = []
        for item in split_top_level(value[1:-1]):
            rr = RINT_ARG_RE.match(item.strip())
            if rr:
                cs_items.append(f"Rint(c.Rng, {rr.group(1)}, {rr.group(2)})")
            else:
                unknown.append(f"{path}: не поддержан элемент {item[:40]}")
                cs_items.append("0")
        return f"int[] {name} = new[] {{ {', '.join(cs_items)} }};"

    if value.startswith("[") and value.endswith("]"):
        return f"string[] {name} = {arr_to_cs(value, path, unknown)};"

    unknown.append(f"{path}: не поддержано значение «{value[:70]}»")
    return "// ??? " + statement


def translate_prologue(prologue: str, path: str, unknown: list) -> str:
    lines = []
    for statement in split_statements(prologue):
        if statement:
            lines.append("                    " + decl_to_cs(statement, path, unknown))
    return "\n".join(lines)


# ---------------------------------------------------------------------------
#  Шаблоны заданий
# ---------------------------------------------------------------------------
FIELD_ORDER = ["task", "starterCode", "solution", "requiredPatterns", "hints", "theory"]
FIELD_CS = {
    "task": "Task",
    "starterCode": "StarterCode",
    "solution": "Solution",
    "requiredPatterns": "RequiredPatterns",
    "hints": "Hints",
    "theory": "Theory",
}


def parse_return_object(body: str, path: str, unknown: list):
    idx = body.find("return {")
    if idx < 0:
        unknown.append(f"{path}: не найден return {{...}}")
        return "", {}
    prologue = body[:idx]
    obj = slice_block(body, body.index("{", idx))
    fields = {}
    for chunk in split_top_level(obj):
        key, _, value = chunk.partition(":")
        fields[key.strip()] = value.strip().rstrip(",")
    return prologue, fields


def value_to_cs(key: str, value: str, path: str, unknown: list) -> str:
    if key in ("hints", "theory", "requiredPatterns"):
        return arr_to_cs(value, path, unknown)
    return expr_to_cs(value, path, unknown)


def extract_templates(src: str, unknown: list):
    templates = []
    for m in re.finditer(r'^\s{4}\{\n\s+id: "(\w+)",', src, re.M):
        nxt = re.search(r'^\s{4}\{\n\s+id: "', src[m.end():], re.M)
        tpl_end = m.end() + nxt.start() if nxt else src.index("  ];\n\n  function escapeRe")
        block = src[m.start():tpl_end]
        path = "шаблон " + m.group(1)

        tiers = re.search(r"tiers: \[([^\]]*)\]", block)
        code_lib = re.search(r"codeLib: (\d+)", block)
        concept = re.search(r'concept: ("(?:[^"\\]|\\.)*")', block)
        concept_desc = re.search(r'conceptDesc: ("(?:[^"\\]|\\.)*")', block)
        build_at = block.index("build: function (c) {")
        body = slice_block(block, block.index("{", build_at))

        prologue, fields = parse_return_object(body, path, unknown)
        for key in fields:
            if key not in FIELD_ORDER:
                unknown.append(f"{path}: неизвестное поле «{key}»")

        lines = [
            "            new MissionTemplate",
            "            {",
            f'                Id = "{m.group(1)}",',
            f"                Tiers = new[] {{ {tiers.group(1).strip()} }},",
            f"                CodeLib = {code_lib.group(1)},",
            "                Concept = " + js_string_to_cs(concept.group(1)) + ",",
            "                ConceptDesc = " + js_string_to_cs(concept_desc.group(1)) + ",",
            "                Build = delegate (GenContext c)",
            "                {",
        ]
        pro = translate_prologue(prologue, path, unknown)
        if pro:
            lines.append(pro)
        lines.append("                    BuiltTemplate b = new BuiltTemplate();")
        for key in FIELD_ORDER:
            if key not in fields:
                unknown.append(f"{path}: нет поля «{key}»")
                continue
            lines.append(f"                    b.{FIELD_CS[key]} = "
                         f"{value_to_cs(key, fields[key], path, unknown)};")
        lines += ["                    return b;", "                }", "            },"]
        templates.append("\n".join(lines))
    return templates


# ---------------------------------------------------------------------------
#  Боссы
# ---------------------------------------------------------------------------
BOSS_FIELDS = [
    ("index", "Index", "num"), ("id", "Id", "num"), ("name", "Name", "str"),
    ("subtitle", "Subtitle", "str"), ("glyph", "Glyph", "str"),
    ("targetName", "TargetName", "str"), ("os", "Os", "str"),
    ("security", "Security", "num"), ("need", "Need", "num"),
    ("coin", "Coin", "str"), ("amount", "Amount", "num"),
    ("dollars", "Dollars", "num"), ("xp", "Xp", "num"),
    ("codeLib", "CodeLib", "num"), ("templateId", "TemplateId", "str"),
    ("briefing", "Briefing", "str"), ("task", "Task", "str"),
    ("starterCode", "StarterCode", "str"), ("solution", "Solution", "str"),
    ("requiredPatterns", "RequiredPatterns", "arr"),
    ("hints", "Hints", "arr"), ("theory", "Theory", "arr"),
]


def parse_object_fields(obj_text: str) -> dict:
    """Все пары key: value верхнего уровня из содержимого JS-объекта."""
    fields = {}
    i = 0
    n = len(obj_text)
    while i < n:
        while i < n and obj_text[i] in ", \t\r\n":
            i += 1
        m = re.match(r"[A-Za-z_]\w*", obj_text[i:])
        if not m:
            break
        key = m.group(0)
        i += len(key)
        while i < n and obj_text[i] in " \t\r\n":
            i += 1
        if i < n and obj_text[i] == ":":
            i += 1
        while i < n and obj_text[i] in " \t\r\n":
            i += 1
        start = i
        depth = 0
        quote = None
        while i < n:
            ch = obj_text[i]
            if quote:
                if ch == "\\":
                    i += 2
                    continue
                if ch == quote:
                    quote = None
            elif ch in "\"'":
                quote = ch
            elif ch in "([{":
                depth += 1
            elif ch in ")]}":
                if depth == 0:
                    break
                depth -= 1
            elif ch == "," and depth == 0:
                break
            i += 1
        fields[key] = obj_text[start:i].strip()
    return fields


def concat_to_cs(value: str, path: str, unknown: list) -> str:
    """Строка или конкатенация строк JS → C#."""
    parts = [p.strip() for p in split_top_level(value, "+")]
    converted = []
    for part in parts:
        if STRING_RE.fullmatch(part):
            converted.append(js_string_to_cs(part))
        elif re.fullmatch(r"-?\d+(\.\d+)?", part):
            converted.append('"' + part + '"')
        else:
            unknown.append(f"{path}: не поддержано значение «{part[:60]}»")
            converted.append('""')
    return converted[0] if len(converted) == 1 else " + ".join(converted)


def extract_bosses(src: str, unknown: list):
    body = src[src.index("var BOSSES = ["):]
    body = body[:body.index("\n  ];")]
    starts = [m.start() for m in re.finditer(r"\n    \{", body)]
    bosses = []
    for i, start in enumerate(starts):
        end = starts[i + 1] if i + 1 < len(starts) else len(body)
        block = body[start:end]
        path = "босс"
        obj = slice_block(block, block.index("{"))
        values = parse_object_fields(obj)
        lines = ["            new BossData", "            {"]
        for js_key, cs_key, kind in BOSS_FIELDS:
            value = values.get(js_key)
            if value is None:
                unknown.append(f"{path}: нет поля {js_key}")
                continue
            if kind == "str":
                lines.append(f"                {cs_key} = {concat_to_cs(value, path, unknown)},")
            elif kind == "num":
                number = value.rstrip(',')
                if "." in number:
                    number += "f"                    # Amount и Dollars — float
                lines.append(f"                {cs_key} = {number},")
            else:
                lines.append(f"                {cs_key} = {arr_to_cs(value, path, unknown)},")
        lines.append("            },")
        bosses.append("\n".join(lines))
    return bosses


def main() -> int:
    unknown = []
    templates = extract_templates(read(SRC_GEN), unknown)
    bosses = extract_bosses(read(SRC_BOSSES), unknown)

    if unknown:
        print("перевод остановлен — непонятные конструкции:", file=sys.stderr)
        for item in unknown:
            print("  · " + item, file=sys.stderr)
        return 1

    DST_TEMPLATES.write_text(
        HEADER_TEMPLATES + "\n".join(templates) + "\n        };\n    }\n}\n", encoding="utf-8")
    DST_BOSSES.write_text(
        BOSS_HEADER + "\n".join(bosses) + "\n        };\n    }\n}\n", encoding="utf-8")

    print(f"ok: {DST_TEMPLATES.relative_to(ROOT)} — шаблонов {len(templates)}")
    print(f"ok: {DST_BOSSES.relative_to(ROOT)} — боссов {len(bosses)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
