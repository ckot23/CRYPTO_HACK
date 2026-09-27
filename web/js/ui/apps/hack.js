/* ==========================================================================
   apps/hack.js — «NEON_HACK // ТЕРМИНАЛ ВЗЛОМА» (перенос HackWindowView.cs).

   Слева список целей, справа вкладки (задание/теория/подсказки), редактор
   Python и консоль. Запуск идёт либо настоящим Python (Pyodide, если он
   загрузился), либо встроенным симулятором PySim — как в Unity-версии.
   ========================================================================== */
(function (root) {
  "use strict";

  var CH = root.CH = root.CH || {};
  var UI = CH.UI;
  var el = CH.Dom.el;
  var Fmt = CH.Fmt;

  var TABS = [
    { id: "brief", label: "ЗАДАНИЕ" },
    { id: "theory", label: "ТЕОРИЯ" },
    { id: "hints", label: "ПОДСКАЗКИ" }
  ];

  function hackApp(game) {
    return {
      title: "NEON_HACK // ТЕРМИНАЛ ВЗЛОМА",
      accent: "#4fe0a8",
      width: 930,
      height: 620,
      flush: false,
      build: function (body, win) {
        var mission = null;
        var tab = "brief";
        var showSolution = false;
        var tierChoice = preferredTier();          // какую сложность выберет игрок
        var running = false;
        var runTimer = null;
        var unsubscribe = [];
        var realMode = false;

        /* ---------------------------- разметка ---------------------------- */
        var missionItems = el("div", { cls: "items scroll" });
        var tierBox = el("div", { cls: "tier-box" });
        var missionList = el("div", { cls: "mission-list" },
          el("div", { cls: "head", text: "ЦЕЛИ" }), missionItems, tierBox);

        var targetName = el("div", { cls: "name", text: "—" });
        var targetMeta = el("div", { cls: "meta", text: "" });
        var targetSec = el("div", { cls: "sec", text: "" });
        var targetBar = el("div", { cls: "target-bar" }, targetName, targetMeta, targetSec);

        var tabsRow = el("div", { cls: "tabs" });
        var tabPanel = el("div", { cls: "tab-panel scroll" });
        var tabBar = el("div", { cls: "tabs" }, tabsRow, el("div", { cls: "fw", text: "PYTHON 3 · NeonHack FW" }));
        tabBar.style.alignItems = "center";
        tabBar.style.gap = "8px";

        var syntaxLabel = el("span", { cls: "syntax", text: "синтаксис: ок" });
        var modeBtn = UI.button({ text: "РЕЖИМ: СИМУЛЯТОР", accent: "#6cd8f2", kind: "ghost", height: 20, cls: "mode-btn" });
        var resetBtn = UI.button({ text: "сбросить", accent: "#7286a0", kind: "ghost", height: 20 });
        var editorHead = el("div", { cls: "editor-head" },
          el("span", { cls: "name", text: "⌁ exploit.py" }),
          el("span", { cls: "spacer" }),
          modeBtn, resetBtn);

        var editor = new CH.Editor(null, {
          onChanged: onCodeChanged,
          onRun: function () { run(); }
        });

        var playBtn = UI.button({ text: "▶ ЗАПУСТИТЬ", accent: "#4fe0a8", kind: "solid", height: 26, style: { width: "150px" } });
        var editorFoot = el("div", { cls: "editor-head" },
          playBtn,
          el("span", { cls: "faint", text: "Ctrl+Enter — запуск · Tab — отступ" }),
          el("span", { cls: "spacer" }),
          syntaxLabel);

        var consoleBox = new UI.Console(null);
        var resultLabel = el("span", { text: "" });
        var starsLabel = el("span", { cls: "stars", text: "" });
        var resultBar = el("div", { cls: "result-bar hidden" }, resultLabel, starsLabel);

        var right = el("div", { cls: "hack-right" },
          targetBar, tabBar, tabPanel, editorHead, editor.node, editorFoot, consoleBox.node, resultBar);
        var layout = el("div", { cls: "hack-layout" }, missionList, right);
        layout.style.height = "100%";
        body.appendChild(layout);

        /* ---------------------- сложность контрактов ----------------------- */
        // по умолчанию предлагаем самую выгодную из доступных
        function preferredTier() {
          var unlocked = CH.Generator.TIERS.filter(function (t) { return game.tierUnlocked(t.key); });
          return unlocked.length ? unlocked[unlocked.length - 1].key : "easy";
        }

        function tierChip(t) {
          var unlocked = game.tierUnlocked(t.key);
          var active = tierChoice === t.key;
          var chip = UI.button({
            text: t.label,
            accent: unlocked ? t.accent : "#546480",
            kind: active ? "solid" : "outline",
            height: 22,
            cls: "tier-chip" + (active ? " active" : "") + (unlocked ? "" : " locked"),
            title: unlocked ? t.blurb : ("нужно: " + game.tierRequirement(t.key)),
            onClick: function () {
              if (!unlocked) {
                UI.toast("Сложность закрыта", "Нужно: " + game.tierRequirement(t.key), "warn");
                return;
              }
              tierChoice = t.key;
              refreshTierBox();
            }
          });
          return chip;
        }

        function refreshTierBox() {
          CH.Dom.clear(tierBox);
          if (!game.tierUnlocked(tierChoice)) tierChoice = preferredTier();

          // --- боссы: свой блок над выбором сложности ---
          var status = game.bossStatus();
          if (status.boss) {
            var boss = status.boss;
            var taken = game.contracts.some(function (r) { return r.boss === boss.index; });
            var bossBox = el("div", { cls: "boss-box" + (status.ready && !taken ? " ready" : "") },
              el("div", { cls: "boss-title" },
                el("span", { cls: "glyph", text: boss.glyph }),
                el("span", { text: status.ready ? "БОСС ЖДЁТ ВЫЗОВА" : "СЛЕДУЮЩИЙ БОСС" })
              ),
              el("div", { cls: "boss-name", text: boss.name + " — " + boss.subtitle }),
              el("div", { cls: "boss-note", text: taken
                ? "вызов принят · цель ждёт в списке целей"
                : (status.ready
                  ? "защита " + boss.security + "% · +" + Fmt.dollars(boss.dollars) + " · +" + Fmt.crypto(boss.amount) + " " + boss.coin
                  : status.reason) })
            );
            if (taken) {
              bossBox.classList.add("accepted");
              var open = UI.button({
                text: "ОТКРЫТЬ ЦЕЛЬ",
                accent: "#ff7aa8",
                kind: "outline",
                height: 28,
                onClick: function () {
                  var rec = game.contracts.filter(function (r) { return r.boss === boss.index; })[0];
                  if (rec) selectMission(game.contractMission(rec).id);
                }
              });
              open.style.width = "100%";
              bossBox.appendChild(open);
            } else if (status.ready) {
              var accept = UI.button({
                text: "ПРИНЯТЬ ВЫЗОВ",
                accent: "#ff7aa8",
                kind: "solid",
                height: 28,
                onClick: function () { confirmBoss(boss); }
              });
              accept.style.width = "100%";
              bossBox.appendChild(accept);
            }
            bossBox.appendChild(el("div", {
              cls: "boss-count",
              text: "повержено боссов: " + game.bossesDefeated() + "/" + CH.Bosses.list.length
            }));
            tierBox.appendChild(bossBox);
          }

          tierBox.appendChild(el("div", { cls: "tier-title", text: "СЛОЖНОСТЬ КОНТРАКТА" }));
          var chips = el("div", { cls: "tier-chips" });
          CH.Generator.TIERS.forEach(function (t) { chips.appendChild(tierChip(t)); });
          tierBox.appendChild(chips);

          var p = CH.Generator.preview(tierChoice, game.contractsDone());
          var tier = CH.Generator.TIER_BY_KEY[tierChoice];
          tierBox.appendChild(el("div", { cls: "tier-preview" },
            el("div", { text: "защита цели " + tier.security[0] + "–" + tier.security[1] + "%" }),
            el("div", { cls: "reward", text: "+" + Fmt.crypto(p.amount) + " " + p.coin + " · +" +
              Fmt.dollars(p.dollars) + " · +" + p.xp + " XP" })
          ));

          var active = game.activeContract();
          var btn = UI.button({
            text: active ? "+ ЕЩЁ КОНТРАКТ" : "▶ ВЗЯТЬ КОНТРАКТ",
            accent: tier.accent,
            kind: "solid",
            height: 30,
            onClick: function () {
              if (!game.tutorialDone()) {
                UI.toast("Сначала обучение", "Пройди обучающую миссию — потом возьмём контракт.", "warn");
                selectMission(game.tutorial.id);
                return;
              }
              var created = game.createContract(tierChoice);
              if (!created) {
                UI.toast("Сложность закрыта", "Нужно: " + game.tierRequirement(tierChoice), "warn");
                return;
              }
              CH.Sfx.uiOpen();
              UI.toast("Новый контракт", created.title + " · " + created.difficulty, "info");
              selectMission(created.id);
            }
          });
          btn.style.width = "100%";
          tierBox.appendChild(btn);
          var openCount = game.contracts.filter(function (rec) {
            return !game.isMissionCompleted(game.contractMission(rec).id);
          }).length;
          tierBox.appendChild(el("div", {
            cls: "tier-note",
            text: !game.tierUnlocked(tierChoice)
              ? "нужно: " + game.tierRequirement(tierChoice)
              : (openCount
                ? "открытых контрактов: " + openCount + " · закрыто: " + game.contractsDone()
                : "следующий контракт будет сложности " + tier.label)
          }));
        }

        /* ------------------------- список целей ---------------------------- */
        function contractRow(m, subtitle) {
          var done = game.isMissionCompleted(m.id);
          var unlocked = game.missionUnlocked(m);
          var cls = "mission-item" + (done ? " done" : "") + (unlocked ? "" : " locked") +
            (m.boss ? " boss" : "") + (mission && mission.id === m.id ? " active" : "");
          var badge = done ? "✓" : (m.boss ? "☠" : (unlocked ? "!" : "✗"));
          var btn = UI.button({
            text: badge + "  " + m.title + "\n" + subtitle,
            accent: done ? "#4fe0a8" : (unlocked ? (m.tierAccent || "#e2e9f5") : "#546480"),
            kind: "ghost",
            cls: cls,
            style: { height: "50px", "align-items": "center", "border-left": "3px solid " + (m.tierAccent || "#6cd8f2") },
            onClick: function () { selectMission(m.id); }
          });
          return btn;
        }

        function refreshMissionList() {
          CH.Dom.clear(missionItems);

          // 1. обучение — всегда первым и всегда доступно
          var tut = game.tutorial;
          missionItems.appendChild(contractRow(tut, game.tutorialDone()
            ? "пройдено · повтор без награды"
            : "обучение · вызываем первую функцию"));

          // 2. контракты: незакрытые сверху, закрытые — в истории
          var open = [], closed = [];
          game.contracts.forEach(function (rec) {
            var m = game.contractMission(rec);
            (game.isMissionCompleted(m.id) ? closed : open).push(m);
          });

          open.forEach(function (m) {
            missionItems.appendChild(contractRow(m, m.tierLabel + " · защита " + m.security + "% · +" +
              Fmt.dollars(m.rewardDollars) + " · +" + Fmt.crypto(m.rewardAmount) + " " + m.rewardCrypto));
          });

          if (closed.length) {
            missionItems.appendChild(el("div", { cls: "divider", text: "ИСТОРИЯ · " + closed.length }));
            closed.slice().reverse().forEach(function (m) {
              missionItems.appendChild(contractRow(m, "закрыт · " + m.difficulty + " · " + m.targetName));
            });
          }

          refreshTierBox();
        }

        /* ----------------------------- боссы ------------------------------- */
        function confirmBoss(boss) {
          var body = el("div", { cls: "col" },
            el("div", { style: { "font-size": "12px", color: "#c3cee1", "white-space": "pre-wrap" }, text: boss.briefing }),
            el("div", { cls: "boss-reward", text:
              "ЗАЩИТА " + boss.security + "% · НАГРАДА: +" + Fmt.crypto(boss.amount) + " " + boss.coin +
              " · +" + Fmt.dollarsFull(boss.dollars) + " · +" + boss.xp + " XP" }),
            el("div", { cls: "tier-note", text: "Провал ничего не отнимает — можно пробовать сколько нужно." })
          );
          var buttons = el("div", { cls: "row", style: { gap: "8px" } });
          var ok = UI.button({
            text: "ПРИНЯТЬ ВЫЗОВ", accent: "#ff7aa8", kind: "solid", height: 34,
            style: { flex: "1 1 0" },
            onClick: function () {
              var created = game.acceptBoss();
              modal.close();
              if (created) {
                CH.Sfx.hackSuccess();
                UI.toast("Вызов принят", created.title + " · защита " + created.security + "%", "err");
                selectMission(created.id);
              }
            }
          });
          buttons.appendChild(ok);
          buttons.appendChild(UI.button({
            text: "позже", accent: "#7286a0", kind: "outline", height: 34,
            onClick: function () { modal.close(); }
          }));
          body.appendChild(buttons);

          var modal = UI.modal({ title: boss.glyph + " " + boss.name, body: body, accent: "#ff7aa8" });
        }

        /* ---------------------------- вкладки ------------------------------ */
        function refreshTabs() {
          CH.Dom.clear(tabsRow);
          TABS.forEach(function (t) {
            var b = UI.button({
              text: t.label,
              accent: tab === t.id ? "#4fe0a8" : "#7286a0",
              kind: "ghost",
              cls: tab === t.id ? "active" : "",
              height: 24,
              onClick: function () {
                tab = t.id;
                showSolution = false;
                refreshTabs();
                refreshTabPanel();
              }
            });
            tabsRow.appendChild(b);
          });
        }

        function refreshTabPanel() {
          CH.Dom.clear(tabPanel);
          if (!mission) return;

          if (!game.missionUnlocked(mission)) {
            tabPanel.appendChild(el("div", { cls: "b", style: { color: "#ff7aa8", "font-size": "16px" }, text: "ДОСТУП ЗАБЛОКИРОВАН" }));
            tabPanel.appendChild(el("p", {
              style: { color: "#c3cee1", "font-size": "12px" },
              text: "Цель требует " + (mission.requirementsText() || "больше опыта") +
                " (сейчас уровень " + game.level + ", библиотека кода ур. " + game.upgradeLevel("codeLib") + "). " +
                "Взламывай другие миссии, учись в школе Python и качайся."
            }));
            tabPanel.appendChild(el("div", { style: { color: "#ffd479", "font-size": "12px" }, text: "Концепт миссии: " + mission.concept }));
            return;
          }

          if (tab === "theory") {
            tabPanel.appendChild(el("div", { cls: "b", style: { color: "#6cd8f2" }, text: "Тема: " + mission.concept }));
            tabPanel.appendChild(el("p", { style: { color: "#9aabc4", "font-size": "12px" }, text: mission.conceptDesc }));
            mission.theory.forEach(function (t, i) {
              tabPanel.appendChild(el("p", { style: { color: "#c3cee1", "font-size": "12px" }, text: (i + 1) + ". " + t }));
            });
            return;
          }

          if (tab === "hints") {
            mission.hints.forEach(function (h) {
              tabPanel.appendChild(el("p", { style: { color: "#c3cee1", "font-size": "12px" }, text: "● " + h }));
            });
            if (!showSolution) {
              tabPanel.appendChild(UI.button({
                text: "показать готовое решение (без штрафа, ты же учишься)",
                accent: "#7286a0", kind: "ghost", height: 26,
                onClick: function () { showSolution = true; refreshTabPanel(); }
              }));
            } else {
              var box = el("div", { cls: "solution-box" });
              var head = el("div", { cls: "row" },
                el("span", { cls: "b", style: { color: "#ff7aa8", "font-size": "11px" }, text: "РЕШЕНИЕ:" }),
                (function () {
                  var b = UI.button({
                    text: "вставить в редактор", accent: "#4fe0a8", kind: "ghost", height: 20,
                    onClick: function () {
                      editor.setText(mission.solution, true);
                      consoleBox.clear();
                      consoleBox.addLine("Решение вставлено в редактор — разберись, как оно работает.", "info");
                      setResult(null, 0, true);
                    }
                  });
                  b.style.marginLeft = "auto";
                  return b;
                })()
              );
              box.appendChild(head);
              box.appendChild(el("div", { text: mission.solution }));
              tabPanel.appendChild(box);
            }
            return;
          }

          // brief
          tabPanel.appendChild(el("p", { style: { color: "#c3cee1", "font-size": "12px" }, text: mission.briefing }));
          tabPanel.appendChild(el("div", { cls: "task-box" }, "ЗАДАЧА:\n" + mission.task));
          tabPanel.appendChild(el("div", {
            style: { color: "#ffd479", "font-size": "12px", "margin-top": "6px" },
            text: "+" + Fmt.crypto(mission.rewardAmount) + " " + mission.rewardCrypto +
              "   +" + Fmt.dollars(mission.rewardDollars) + "   +" + mission.rewardXp + " XP" +
              (game.isMissionCompleted(mission.id) ? "   ✓ пройдено — повтор без награды" : "") +
              (!game.missionUnlocked(mission) && mission.requirementsText()
                ? "   · нужно: " + mission.requirementsText()
                : "")
          }));
        }

        /* --------------------------- выбор цели ---------------------------- */
        function selectMission(id) {
          var found = game.getMission(id) || game.tutorial;
          if (!found) return;
          mission = found;
          game.selectedMission = mission.id;
          tab = "brief";
          showSolution = false;

          targetName.textContent = mission.targetName;
          targetMeta.textContent = mission.targetIp + " · " + mission.os + " · " + mission.difficulty;
          targetSec.textContent = "Защита " + mission.security + "%";

          editor.setText(CH.CodeStore.get(mission.id, mission.starterCode), true);
          consoleBox.clear();
          consoleBox.addLine("$ цель загружена: " + mission.targetIp + " (" + mission.os + ")", "cmd");

          setResult(null, 0, true);
          refreshMissionList();
          refreshTabs();
          refreshTabPanel();
          updateModeButton();
        }

        /* ------------------------- режим выполнения ------------------------ */
        function updateModeButton() {
          var label = game.realPython ? "РЕЖИМ: PYTHON (WASM)" : "РЕЖИМ: СИМУЛЯТОР";
          if (game.realPython && !CH.PyRunner.available) {
            label = CH.PyRunner.status === "loading" ? "РЕЖИМ: ЗАГРУЗКА..." : "РЕЖИМ: PYTHON";
          }
          modeBtn.setText(label);
          realMode = game.realPython && CH.PyRunner.available;
          modeBtn.setAccent(CH.PyRunner.available || !game.realPython ? "#6cd8f2" : "#ffb27a");
        }

        function toggleMode() {
          if (running) return;
          if (game.realPython) {
            game.realPython = false;
            game.save();
            consoleBox.clear();
            consoleBox.addLine("Режим выполнения: СИМУЛЯТОР ТЕРМИНАЛА", "info");
            updateModeButton();
            return;
          }

          game.realPython = true;
          game.save();
          updateModeButton();
          CH.PyRunner.load().then(function (ok) {
            updateModeButton();
            if (ok) {
              consoleBox.clear();
              consoleBox.addLine("Python загружен: " + CH.PyRunner.describe(), "ok");
              consoleBox.addLine("Теперь код выполняется по-настоящему.", "info");
            } else {
              game.realPython = false;
              game.save();
              updateModeButton();
              consoleBox.clear();
              consoleBox.addLine("Не удалось загрузить Python в браузере: " + (CH.PyRunner.error || "нет доступа к CDN"), "warn");
              consoleBox.addLine("Остаёмся на симуляторе терминала — он тоже проверяет код по шагам.", "info");
              UI.toast("Python недоступен", "Нет доступа к CDN Pyodide — работает симулятор", "warn");
            }
          });
        }

        /* ----------------------------- запуск ------------------------------ */
        function onCodeChanged(code) {
          if (!mission) return;
          CH.CodeStore.set(mission.id, code);
          var problem = CH.PySim.checkSyntax(code);
          if (problem) {
            syntaxLabel.textContent = "⚠ строка " + problem.line + ": " + problem.msg;
            syntaxLabel.classList.add("warn");
          } else {
            syntaxLabel.textContent = "синтаксис: ок";
            syntaxLabel.classList.remove("warn");
          }
        }

        function setResult(text, stars, ok) {
          if (!text) {
            resultBar.classList.add("hidden");
            starsLabel.textContent = "";
            return;
          }
          resultBar.classList.remove("hidden");
          resultBar.classList.toggle("ok", !!ok);
          resultBar.classList.toggle("fail", !ok);
          resultLabel.textContent = text;
          starsLabel.textContent = stars > 0 ? UI.starString(stars) : "";
        }

        function setBusy(busy) {
          running = busy;
          playBtn.setDisabled(busy);
          playBtn.setText(busy ? "ВЫПОЛНЯЕТСЯ..." : "▶ ЗАПУСТИТЬ");
        }

        function guessKind(line) {
          if (line.charAt(0) === "$") return "cmd";
          if (/Error|Ошибка|^\s+File |SyntaxError/.test(line)) return "err";
          if (/^\[.*(OK|drained|внедрён|извлечены|подобран|ослеплён|расшифрована|выполнен)/.test(line)) return "ok";
          return "info";
        }

        function finishRun(ok, missing, stars) {
          setBusy(false);
          if (ok) {
            var firstTime = !game.isMissionCompleted(mission.id);
            var wasTutorial = !!mission.tutorial;
            if (firstTime) {
              game.hackSuccess(mission, stars);
            } else {
              consoleBox.addLine("Цель уже взломана — награда не начисляется.", "info");
            }
            setResult("ВЗЛОМ УСПЕШЕН", stars, true);
            CH.Sfx.hackSuccess();

            // обучение позади → выдаём первый контракт сразу, без лишних кликов
            if (wasTutorial && firstTime) {
              var next = game.createContract("easy");
              if (next) {
                UI.toast("Обучение пройдено", "Держи первый контракт: " + next.title, "ok");
                setTimeout(function () { selectMission(next.id); }, 700);
              }
            }
          } else {
            if (missing && missing.length) {
              consoleBox.addLine("Не хватает шагов: " + missing.length + ". Открой вкладку «Подсказки».", "warn");
            }
            setResult("ВЗЛОМ ПРОВАЛЕН — смотри подсказки и пробуй ещё", 0, false);
            CH.Sfx.hackFail();
          }
          refreshMissionList();
          refreshTabPanel();
        }

        function run() {
          if (running || !mission) return;
          if (!game.missionUnlocked(mission)) {
            UI.toast("Цель заблокирована", "Нужно: " + (mission.requirementsText() || "больше опыта"), "err");
            return;
          }

          var code = editor.getText();
          setBusy(true);
          setResult(null, 0, true);
          consoleBox.clear();
          CH.Sfx.beepSquare(440, 0.07, 0.3);

          realMode = game.realPython && CH.PyRunner.available;
          if (!realMode) {
            var sim = CH.PySim.simulate(code, mission, game.upgradeLevel("hackSpeed"));
            sim.logs.forEach(function (l) { consoleBox.addDelayed(l.text, l.kind, l.delay); });
            var total = CH.PySim.totalDelay(sim.logs) + 160;
            runTimer = setTimeout(function () { finishRun(sim.success, sim.missing, sim.styleScore); }, total);
            return;
          }

          consoleBox.addLine("$ " + CH.PyRunner.describe() + " exploit.py --target " + mission.targetIp, "cmd");
          consoleBox.addLine("[*] Выполняется настоящий код — никаких подделок...", "info");
          CH.PyRunner.run(code, mission).then(function (res) {
            var lines = res.lines || [];
            if (!lines.length && res.error) lines = ["  " + res.error];
            var delay = 0;
            lines.forEach(function (line, i) {
              delay = Math.min(180 + i * 90, 3000);
              consoleBox.addDelayed(line, guessKind(line), delay);
            });
            if (res.timedOut) {
              consoleBox.addDelayed("Превышено время выполнения (8 с) — вероятно, бесконечный цикл.", "warn", delay + 150);
              consoleBox.addDelayed("Интерпретатор перезапущен, включён симулятор.", "warn", delay + 300);
              game.realPython = false;
              game.save();
              updateModeButton();
              delay += 400;
            }
            var missing = CH.PySim.checkPatterns(code, mission);
            var text = lines.join("\n");
            var syntaxFailed = text.indexOf("SyntaxError") >= 0;
            var ok = !res.timedOut && missing.length === 0 && !syntaxFailed;
            var stars = CH.PySim.styleScore(code, mission, missing);
            runTimer = setTimeout(function () { finishRun(ok, missing, stars); }, delay + 200);
          }).catch(function (e) {
            game.realPython = false;
            game.save();
            updateModeButton();
            consoleBox.addLine("Python недоступен (" + e.message + ") — переключаюсь на симулятор.", "warn");
            setBusy(false);
            run();
          });
        }

        /* ------------------------- кнопки и события ------------------------ */
        playBtn.addEventListener("click", run);
        modeBtn.addEventListener("click", toggleMode);
        resetBtn.addEventListener("click", function () {
          editor.setText(mission ? mission.starterCode : "", true);
          consoleBox.clear();
          consoleBox.addLine("Редактор сброшен к заготовке миссии.", "info");
          setResult(null, 0, true);
        });

        unsubscribe.push(function () { game.off("state", refreshMissionList); });
        game.on("state", refreshMissionList);
        win.onClose(function () {
          unsubscribe.forEach(function (fn) { fn(); });
          if (runTimer) clearTimeout(runTimer);
          consoleBox.destroy();
        });

        selectMission(game.selectedMission);
      }
    };
  }

  CH.Apps = CH.Apps || {};
  CH.Apps.hack = hackApp;
})(typeof globalThis !== "undefined" ? globalThis : this);
