/* ==========================================================================
   pyrunner.js — настоящий Python в браузере (перенос Core/PyRunner.cs).

   В Unity это запуск python3 как процесса. В браузере роль интерпретатора
   играет CPython, скомпилированный в WebAssembly (Pyodide), который живёт
   в отдельном Web Worker — поэтому бесконечный цикл в коде игрока не
   подвешивает интерфейс, а просто убивается по таймауту.

   Если Pyodide загрузить не удалось (нет интернета, закрыт CDN, старый
   браузер) — игра молча остаётся на симуляторе терминала, ровно как в
   Unity-версии при отсутствии python3.
   ========================================================================== */
(function (root) {
  "use strict";

  var CH = root.CH = root.CH || {};

  var CDN = "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/";
  var DEFAULT_TIMEOUT_MS = 8000;

  /* Код воркера: грузит Pyodide и выполняет скрипт игрока с игровыми
     заглушками scan/connect/brute/... — тот же раннер, что в Unity-версии. */
  var WORKER_SRC = [
    "var CDN = " + JSON.stringify(CDN) + ";",
    "importScripts(CDN + 'pyodide.js');",
    "var py = null;",
    "var out = [];",
    "var PROLOGUE = " + JSON.stringify(PROLOGUE()) + ";",
    "function push(s) { out.push(s); }",
    "self.onmessage = function (ev) {",
    "  var msg = ev.data || {};",
    "  if (msg.type === 'init') {",
    "    loadPyodide({ indexURL: CDN }).then(function (p) {",
    "      py = p;",
    "      py.setStdout({ batched: push });",
    "      py.setStderr({ batched: push });",
    "      postMessage({ type: 'ready', version: String(py.version || '') });",
    "    }).catch(function (e) {",
    "      postMessage({ type: 'error', message: String((e && e.message) || e) });",
    "    });",
    "    return;",
    "  }",
    "  if (msg.type === 'run') {",
    "    out = [];",
    "    try {",
    "      py.globals.set('_USER_CODE', msg.code);",
    "      py.globals.set('_TARGET_IP', msg.targetIp);",
    "      py.globals.set('_TARGET_NAME', msg.targetName);",
    "      py.runPython(PROLOGUE);",
    "      postMessage({ type: 'done', lines: out.slice() });",
    "    } catch (e) {",
    "      postMessage({ type: 'done', lines: out.slice(), error: String((e && e.message) || e) });",
    "    }",
    "    return;",
    "  }",
    "};"
  ].join("\n");

  /* ------------- python-обёртка: заглушки хакерских функций --------------- */
  function PROLOGUE() {
    return [
      "# NeonHack runner — генерируется игрой CRYPTO_HACK (браузерная версия)",
      "import sys, traceback",
      "",
      "TARGET_IP = _TARGET_IP",
      "TARGET_NAME = _TARGET_NAME",
      "WALLETS = ['0xA1', '0xB2', '0xC3']",
      "KEY = 'neon-77'",
      "MINING = True",
      "MINER_INSTALLED = False",
      "",
      "def _out(text):",
      "    print(text, flush=True)",
      "",
      "def scan():",
      "    _out('[SCAN] Сканирование подсети 192.168.0.0/24 ...')",
      "    _out('[SCAN] Найдено 4 узла. Цель: %s (%s)' % (TARGET_IP, TARGET_NAME))",
      "    return TARGET_IP",
      "",
      "def connect(ip='127.0.0.1'):",
      "    _out('[NET] Подключение к %s:22 ...' % (ip,))",
      "    _out('[NET] Туннель установлен. Обход firewall... OK')",
      "    return True",
      "",
      "def brute(pin=None):",
      "    _out('  попытка %s ... неверно' % (pin,))",
      "    if pin == 3:",
      "        _out('[BRUTE] Пароль подобран: 3')",
      "    return pin == 3",
      "",
      "def bypass(target=None):",
      "    _out('[EVADE] Антивирус обойдён, EDR ослеплён')",
      "    return True",
      "",
      "def decrypt(data=None):",
      "    _out('[CRYPT] AES-256 ключи восстановлены, сид-фраза расшифрована')",
      "    return KEY",
      "",
      "def extract(target=None):",
      "    _out('[EXTRACT] Приватные ключи извлечены')",
      "    return True",
      "",
      "def drain(wallet=None):",
      "    _out('[DRAIN] %s drained' % (wallet,))",
      "    return True",
      "",
      "def install_miner(target=None):",
      "    global MINER_INSTALLED",
      "    MINER_INSTALLED = True",
      "    _out('[MINER] Майнер внедрён в автозагрузку, скрыт от диспетчера')",
      "    return True",
      "",
      "def wallets():",
      "    return list(WALLETS)",
      "",
      "def spoof():",
      "    _out('[EVADE] MAC-адрес и отпечаток системы подменены')",
      "    return True",
      "",
      "def quantum_brute(target=None):",
      "    _out('[QUANTUM] Кубиты коллапсировали в верный ключ')",
      "    return True",
      "",
      "def ghost():",
      "    _out('[GHOST] Следы удалены, сессия анонимна')",
      "    return True",
      "",
      "def _run(src):",
      "    env = dict(globals())",
      "    try:",
      "        code = compile(src, 'exploit.py', 'exec')",
      "    except SyntaxError as e:",
      "        _out('  File \"exploit.py\", line %s' % (e.lineno or 0))",
      "        _out('SyntaxError: %s' % (e.msg,))",
      "        _out('Подсказка: проверь двоеточия, отступы и кавычки.')",
      "        return 1",
      "    try:",
      "        exec(code, env)",
      "    except SystemExit:",
      "        pass",
      "    except Exception as exc:",
      "        tb = traceback.extract_tb(sys.exc_info()[2])",
      "        frame = tb[-1] if tb else None",
      "        if frame is not None and frame.filename == 'exploit.py':",
      "            _out('  File \"exploit.py\", line %d, in %s' % (frame.lineno, frame.name))",
      "            _out('%s: %s' % (type(exc).__name__, exc))",
      "        else:",
      "            traceback.print_exc()",
      "        _out('Скрипт завершился с ошибкой — цель не взломана.')",
      "        return 1",
      "    _out('[OK] Скрипт выполнен без ошибок.')",
      "    return 0",
      "",
      "rc = _run(_USER_CODE)",
      "print('[EXIT] код возврата: %d' % rc, flush=True)"
    ].join("\n");
  }

  /* ------------------------------- Состояние ------------------------------ */
  var PyRunner = {
    available: false,
    running: false,
    status: "idle",          // idle | loading | ready | failed | timeout
    error: "",
    version: "",
    timeoutMs: DEFAULT_TIMEOUT_MS
  };
  var worker = null;
  var pending = null;        // {resolve, timer}

  PyRunner.describe = function () {
    if (!PyRunner.available) return "Python недоступен";
    return "CPython " + (PyRunner.version || "") + " (WebAssembly)";
  };

  /** Грузит интерпретатор. Возвращает Promise<boolean>. */
  PyRunner.load = function () {
    if (PyRunner.available) return Promise.resolve(true);
    if (PyRunner.status === "loading") return pendingLoad || Promise.resolve(false);
    if (typeof root.Worker === "undefined" || typeof root.Blob === "undefined"
      || typeof root.URL === "undefined" || !root.URL.createObjectURL) {
      PyRunner.status = "failed";
      PyRunner.error = "браузер не поддерживает Web Worker";
      return Promise.resolve(false);
    }

    PyRunner.status = "loading";
    PyRunner.error = "";

    pendingLoad = new Promise(function (resolve) {
      var url = null;
      try {
        url = root.URL.createObjectURL(new root.Blob([WORKER_SRC], { type: "text/javascript" }));
        worker = new root.Worker(url);
      } catch (e) {
        PyRunner.status = "failed";
        PyRunner.error = "не удалось создать Web Worker: " + (e && e.message ? e.message : e);
        resolve(false);
        return;
      }

      var settled = false;
      var initTimer = setTimeout(function () {
        if (settled) return;
        settled = true;
        PyRunner.status = "failed";
        PyRunner.error = "интерпретатор не загрузился за 60 секунд";
        killWorker();
        resolve(false);
      }, 60000);

      worker.onmessage = function (ev) {
        var msg = ev.data || {};
        if (msg.type === "ready") {
          PyRunner.available = true;
          PyRunner.status = "ready";
          PyRunner.version = msg.version || "";
          if (!settled) {
            settled = true;
            clearTimeout(initTimer);
            resolve(true);
          }
          return;
        }
        if (msg.type === "error") {
          PyRunner.status = "failed";
          PyRunner.error = msg.message || "ошибка загрузки";
          if (!settled) {
            settled = true;
            clearTimeout(initTimer);
            killWorker();
            resolve(false);
          }
          return;
        }
        if (msg.type === "done") {
          finishRun({ lines: msg.lines || [], error: msg.error || "" });
        }
      };

      worker.onerror = function (e) {
        PyRunner.status = "failed";
        PyRunner.error = e && e.message ? e.message : "ошибка воркера";
        if (!settled) {
          settled = true;
          clearTimeout(initTimer);
          killWorker();
          resolve(false);
        } else {
          finishRun({ lines: [], error: PyRunner.error, failed: true });
        }
      };
    });
    return pendingLoad;
  };
  var pendingLoad = null;

  function killWorker() {
    if (worker) {
      try { worker.terminate(); } catch (e) { /* ок */ }
      worker = null;
    }
  }

  function finishRun(result) {
    PyRunner.running = false;
    var p = pending;
    pending = null;
    if (!p) return;
    clearTimeout(p.timer);
    p.resolve({
      lines: result.lines || [],
      error: result.error || "",
      timedOut: !!result.timedOut
    });
  }

  /**
   * Выполняет код игрока. Возвращает Promise<{lines, error, timedOut}>.
   * Если воркер не поднят — промис отклоняется, вызывающий уходит в симулятор.
   */
  PyRunner.run = function (code, mission) {
    if (!PyRunner.available || !worker) return Promise.reject(new Error("Python недоступен"));
    if (PyRunner.running) return Promise.reject(new Error("уже выполняется"));

    PyRunner.running = true;
    return new Promise(function (resolve) {
      pending = {
        resolve: resolve,
        timer: setTimeout(function () {
          // Бесконечный цикл в коде игрока: убиваем воркер, интерпретатор
          // придётся поднять заново (кнопка «РЕЖИМ» сделает это сама).
          PyRunner.status = "timeout";
          PyRunner.available = false;
          PyRunner.running = false;
          killWorker();
          pending = null;
          resolve({ lines: [], error: "", timedOut: true });
        }, PyRunner.timeoutMs)
      };
      worker.postMessage({
        type: "run",
        code: String(code || ""),
        targetIp: mission ? mission.targetIp : "127.0.0.1",
        targetName: mission ? mission.targetName : "target"
      });
    });
  };

  /** Сбросить состояние (например, после таймаута) и попробовать снова. */
  PyRunner.reload = function () {
    killWorker();
    PyRunner.available = false;
    PyRunner.status = "idle";
    PyRunner.error = "";
    return PyRunner.load();
  };

  CH.PyRunner = PyRunner;
})(typeof globalThis !== "undefined" ? globalThis : this);
