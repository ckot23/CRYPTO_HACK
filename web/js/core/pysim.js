/* ==========================================================================
   pysim.js — встроенный «терминал»: разбор кода игрока без интерпретатора
   (перенос Core/PySim.cs, а тот — порт src/engine.ts веб-версии).

   Миссия считается выполненной, если в коде есть все requiredPatterns,
   синтаксис не сломан, а в консоль выводится красивый хакерский лог.
   ========================================================================== */
(function (root) {
  "use strict";

  var CH = root.CH = root.CH || {};
  var Fmt = CH.Fmt;

  var KIND = { cmd: "cmd", ok: "ok", info: "info", warn: "warn", err: "err" };
  var MAX_BRUTE_TRIES = 5;

  function search(pattern, text) {
    try {
      return new RegExp(pattern).test(text);
    } catch (e) {
      console.warn("[pysim] некорректная регулярка в данных миссии: " + pattern);
      return false;
    }
  }

  function find(pattern, text) {
    try {
      return new RegExp(pattern).exec(text);
    } catch (e) {
      console.warn("[pysim] некорректная регулярка в данных миссии: " + pattern);
      return null;
    }
  }

  function count(s, ch) {
    var n = 0;
    for (var i = 0; i < s.length; i++) if (s.charAt(i) === ch) n++;
    return n;
  }

  /** Строки без комментариев — по ним проверяются требования миссии. */
  function meaningfulLines(code) {
    return String(code || "").split("\n").filter(function (line) {
      var t = line.trim();
      return t.length > 0 && t.charAt(0) !== "#";
    });
  }

  /** Каких требований миссии не хватает. Пустой массив = выполнено. */
  function checkPatterns(code, mission) {
    var missing = [];
    var body = meaningfulLines(code).join("\n");
    var patterns = mission.requiredPatterns || [];
    for (var i = 0; i < patterns.length; i++) {
      if (!search(patterns[i], body)) {
        if (i < (mission.hints || []).length) missing.push(mission.hints[i]);
        else missing.push("Требование " + (i + 1) + " не выполнено");
      }
    }
    return missing;
  }

  /** Простая проверка синтаксиса. null, если всё чисто. */
  function checkSyntax(code) {
    var lines = String(code || "").split("\n");
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var trimmed = line.trim();
      if (trimmed.length === 0) continue;

      // for/if/while/def/else без двоеточия
      if (search("^(for\\b|if\\b|while\\b|def\\b|else\\b)", trimmed)
        && !/:\s*$/.test(trimmed) && trimmed.indexOf("#") < 0) {
        if (trimmed.indexOf(":") < 0) {
          var head = trimmed.length > 30 ? trimmed.slice(0, 30) : trimmed;
          return { line: i + 1, msg: "ожидалось ':' в конце строки («" + head + "...»)" };
        }
      }

      // незакрытые кавычки
      if (count(line, '"') % 2 !== 0 || count(line, "'") % 2 !== 0) {
        return { line: i + 1, msg: "незакрытая кавычка — проверь строки" };
      }

      // несогласованные скобки
      if (count(line, "(") !== count(line, ")")) {
        return { line: i + 1, msg: "несогласованные скобки ( и )" };
      }

      // после строки с «:» должен быть отступ
      if (i > 0) {
        var prev = lines[i - 1].trim();
        if (/:\s*$/.test(prev) && line.length > 0
          && line.charAt(0) !== " " && line.charAt(0) !== "\t") {
          return { line: i + 1, msg: "ожидался отступ после «:» (4 пробела)" };
        }
      }
    }
    return null;
  }

  /** Оценка «стиля» кода — 1..3 звезды. */
  function styleScore(code, mission, missing) {
    var stars = 2;
    if (String(code).indexOf("#") >= 0) stars = 3;
    var bodyLines = meaningfulLines(code);
    if (bodyLines.length <= 6 && missing.length === 0) stars = Math.max(stars, 2);
    if (String(code).indexOf("print") >= 0 && mission.id > 2) stars = 3;
    return stars;
  }

  /** Главная функция: прогон кода в режиме симулятора. */
  function simulate(code, mission, hackSpeedLevel) {
    var res = { success: false, logs: [], missing: [], styleScore: 0 };
    var body = meaningfulLines(code).join("\n");
    var missing = checkPatterns(code, mission);
    var speedDiv = 1 + (hackSpeedLevel || 0) * 0.35;
    function d(ms) { return Math.max(120, Math.round(ms / speedDiv)); }
    function log(text, kind, delay) { res.logs.push({ text: text, kind: kind, delay: delay }); }

    if (body.trim().length === 0) {
      log("! Пустой скрипт. Напиши код и попробуй снова.", KIND.warn, 200);
      res.missing.push("Напиши код в редакторе");
      res.styleScore = 0;
      return res;
    }

    var syntax = checkSyntax(body);
    if (syntax) {
      log("$ python3 exploit.py --target " + mission.targetIp, KIND.cmd, 250);
      log('  File "exploit.py", line ' + syntax.line, KIND.err, 350);
      log("SyntaxError: " + syntax.msg, KIND.err, 300);
      log("Подсказка: проверь двоеточия, отступы и кавычки.", KIND.info, 200);
      res.missing.push(syntax.msg);
      res.styleScore = 0;
      return res;
    }

    log("$ python3 exploit.py --target " + mission.targetIp, KIND.cmd, d(400));
    log("[*] Инициализация NeonHack Framework v3.7...", KIND.info, d(450));

    if (search("scan\\s*\\(", body)) {
      log("[SCAN] Сканирование подсети 192.168.0.0/24 ...", KIND.info, d(600));
      log("[SCAN] Найдено 4 узла. Цель: " + mission.targetIp + " (" + mission.os + ") OK", KIND.ok, d(550));
    }

    if (search("print\\s*\\(", body)) {
      if (search("print\\s*\\(\\s*(target|ip|wallets|key)\\s*\\)", body)) {
        log("[OUT] " + mission.targetIp + " :: " + mission.targetName, KIND.info, d(350));
      } else {
        var m = find("print\\s*\\(\\s*([\"']?)(.*?)\\1\\s*\\)", body);
        var value = "...";
        if (m && m.length > 2) {
          value = m[2];
          if (value.length > 60) value = value.slice(0, 60);
        }
        log("[OUT] " + value, KIND.info, d(350));
      }
    }

    if (search("\\bconnect\\s*\\(", body)) {
      log("[NET] Подключение к " + mission.targetIp + ":22 ...", KIND.info, d(600));
      log("[NET] Туннель установлен. Обход firewall... OK", KIND.ok, d(550));
    }

    if (search("\\bbrute\\s*\\(", body)) {
      var tries = 5;
      var bm = find("range\\s*\\(\\s*(\\d+)", body);
      if (bm) tries = Math.min(parseInt(bm[1], 10) || 5, 12);
      log("[BRUTE] Перебор " + tries + " комбинаций...", KIND.info, d(500));
      var attempts = Math.min(tries, MAX_BRUTE_TRIES);
      for (var i = 0; i < attempts; i++) {
        log("  попытка " + i + " ... неверно", KIND.info, d(220));
      }
      if (search("for\\s+", body)) {
        log("[BRUTE] Пароль подобран! Цикл for сработал идеально", KIND.ok, d(500));
      }
    }

    if (search("\\bif\\s+", body)) {
      log("[CHECK] Проверка условия...", KIND.info, d(400));
      log("[CHECK] Условие True -> выполняю блок if", KIND.ok, d(400));
    }

    if (search("else\\s*:", body)) {
      log("[CHECK] Ветка else готова (защита от ошибок)", KIND.info, d(250));
    }

    if (search("\\bwallets\\s*=\\s*\\[", body)) {
      log("[DATA] Список кошельков загружен: 3 адреса", KIND.info, d(400));
      log("  |- 0xA1 ... 0xB2 ... 0xC3", KIND.info, d(300));
    }

    if (search("\\bdrain\\s*\\(", body)) {
      log("[DRAIN] Извлечение средств из кошельков...", KIND.info, d(600));
      log("[DRAIN] 0xA1 drained | 0xB2 drained | 0xC3 drained", KIND.ok, d(600));
    }

    if (search("def\\s+\\w+", body)) {
      var fm = find("def\\s+(\\w+)", body);
      var fnName = fm ? fm[1] : "";
      log("[FUNC] Функция " + fnName + "() скомпилирована", KIND.ok, d(400));
    }

    if (search("\\bbypass\\s*\\(", body)) {
      log("[EVADE] Антивирус обойдён, EDR ослеплён", KIND.ok, d(500));
    }
    if (search("\\bdecrypt\\s*\\(", body)) {
      log("[CRYPT] AES-256 ключи восстановлены, сид-фраза расшифрована", KIND.ok, d(650));
    }
    if (search("\\bextract\\s*\\(", body)) {
      log("[EXTRACT] Приватные ключи извлечены", KIND.ok, d(550));
    }
    if (search("while\\s+", body)) {
      log("[LOOP] while-цикл запущен, флаг mining = True", KIND.info, d(400));
    }
    if (search("install_miner\\s*\\(", body)) {
      log("[MINER] Загрузка xmrig-neon... компиляция...", KIND.info, d(600));
      log("[MINER] Майнер внедрён в автозагрузку, скрыт от диспетчера", KIND.ok, d(600));
    }

    if (missing.length > 0) {
      log("[!] Эксплойт завершён с ошибками.", KIND.warn, d(350));
      log("[!] Цель не взломана. Не хватает шагов: " + missing.length, KIND.err, d(300));
      log("Открой вкладку «Подсказки» — там разжёвано по шагам.", KIND.info, d(200));
      res.missing = missing;
      res.styleScore = 1;
      return res;
    }

    log("[ROOT] Доступ ROOT получен! Заметаю следы...", KIND.ok, d(550));
    log("[WALLET] Перевод " + Fmt.crypto(mission.rewardAmount) + " " + mission.rewardCrypto
      + " на твой кошелёк...", KIND.ok, d(700));
    log("[OK] ВЗЛОМ ЗАВЕРШЁН. Ты — машина.", KIND.ok, d(400));

    res.success = true;
    res.missing = [];
    res.styleScore = styleScore(code, mission, missing);
    return res;
  }

  /** Общая длительность «проигрывания» лога в миллисекундах. */
  function totalDelay(logs) {
    return logs.reduce(function (max, l) { return Math.max(max, l.delay || 0); }, 0);
  }

  CH.PySim = {
    KIND: KIND,
    meaningfulLines: meaningfulLines,
    checkPatterns: checkPatterns,
    checkSyntax: checkSyntax,
    styleScore: styleScore,
    simulate: simulate,
    totalDelay: totalDelay,
    search: search,
    find: find
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
