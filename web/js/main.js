/* ==========================================================================
   main.js — точка входа браузерной версии CRYPTO_HACK.

   Аналог Core/GameBoot.cs: создаёт игру, поднимает общий тикер, следит за
   сменой экранов (меню → загрузка BIOS → рабочий стол) и сохраняет прогресс.
   ========================================================================== */
(function (root) {
  "use strict";

  var CH = root.CH;
  var host = root.document.getElementById("screen");
  var game = null;
  var currentScreen = null;

  /**
   * Смена экрана: сначала уничтожаем предыдущий и чистим #screen, и только
   * потом создаём новый (иначе конструктор успеет добавить себя в уже
   * очищаемый контейнер). Принимает функцию-фабрику экрана.
   */
  function swapScreen(make) {
    if (currentScreen && currentScreen.destroy) {
      try { currentScreen.destroy(); } catch (e) { console.warn("[main] destroy", e); }
    }
    currentScreen = null;
    CH.Dom.clear(host);
    currentScreen = make();
  }

  var flow = {
    showMenu: function () {
      swapScreen(function () {
        return new CH.Screens.MainMenu(host, {
          game: game,
          onStart: function () { flow.showBoot(); },
          onReset: function () { flow.showMenu(); }
        });
      });
    },

    showBoot: function () {
      swapScreen(function () {
        return new CH.Screens.Boot(host, {
          game: game,
          onDone: function () { flow.showDesktop(); }
        });
      });
    },

    showDesktop: function () {
      swapScreen(function () {
        return new CH.Screens.Desktop(host, {
          game: game,
          onExitToMenu: function () { flow.showMenu(); }
        });
      });
    }
  };

  function fail(message, hint) {
    CH.Dom.clear(host);
    host.appendChild(CH.Dom.el("div", {
      style: {
        position: "fixed", inset: "0", display: "flex", "flex-direction": "column",
        "align-items": "center", "justify-content": "center", gap: "12px", padding: "24px", "text-align": "center"
      }
    },
      CH.Dom.el("h1", { style: { color: "#ff2d78", "font-size": "18px" }, text: message }),
      CH.Dom.el("div", { style: { color: "#8fa3bd", "font-size": "12px" }, text: hint || "" })
    ));
  }

  function start() {
    var data = CH.GameData.load();
    if (data.loadError) {
      fail("Не загрузился контент игры", data.loadError);
      return;
    }

    game = new CH.Game(data).init();
    CH.Sfx.enabled = game.soundOn;
    CH.game = game;               // удобно для отладки из консоли браузера

    // тосты от игры — в общий слой уведомлений
    game.on("toast", function (title, text, kind) { CH.UI.toast(title, text, kind); });

    // весь игровой цикл идёт через общий тикер (один requestAnimationFrame)
    CH.Ticker.add(function (dt) { game.tick(dt); });
    CH.Ticker.start();

    // сохраняемся при уходе со страницы (если что-то изменилось)
    root.addEventListener("beforeunload", function () { game.save(); });
    root.document.addEventListener("visibilitychange", function () {
      if (root.document.visibilityState === "hidden") game.save();
    });

    // если игрок оставил включённым настоящий Python — прогреваем интерпретатор
    if (game.realPython) {
      CH.PyRunner.load().then(function (ok) {
        if (!ok) {
          game.realPython = false;
          game.save();
          CH.UI.toast("Python недоступен", "Остаёмся на симуляторе терминала", "warn");
        }
      });
    }

    flow.showMenu();
  }

  if (root.document.readyState === "loading") {
    root.document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
