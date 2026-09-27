/* ==========================================================================
   screens/menu.js — главное меню (перенос MainMenuScreen.cs):
   глитч-заголовок, кнопки старта, «как играть», цитаты и фичи.
   ========================================================================== */
(function (root) {
  "use strict";

  var CH = root.CH = root.CH || {};
  var UI = CH.UI;
  var el = CH.Dom.el;
  var Fmt = CH.Fmt;

  function MainMenu(host, opts) {
    var game = opts.game;
    var self = this;

    this.root = el("div", { cls: "menu" });
    this.bg = new CH.Backgrounds(this.root);
    host.appendChild(this.root);

    var hasSave = game.hasSave;

    /* ------------------------------- шапка -------------------------------- */
    var top = el("div", { cls: "top" },
      el("span", { cls: "status-online", text: "● NEON NET ONLINE" }),
      el("span", { cls: "right", text: "v1.0.5 · браузерная версия" })
    );

    /* ------------------------------- центр -------------------------------- */
    var main = el("span", { cls: "main", text: "CRYPTO_HACK" });
    var cyan = el("span", { cls: "layer cyan", text: "CRYPTO_HACK" });
    var pink = el("span", { cls: "layer pink", text: "CRYPTO_HACK" });
    var title = el("h1", { cls: "title-glitch" }, cyan, pink, main);

    var buttons = el("div", { cls: "menu-buttons" },
      UI.button({
        text: hasSave ? "ПРОДОЛЖИТЬ ВЗЛОМ" : "НАЧАТЬ ИГРУ",
        accent: "#00ff9d", kind: "solid", height: 54,
        onClick: function () {
          CH.Sfx.unlock();
          CH.Sfx.uiClick();
          if (!game.hasSave) game.save();
          opts.onStart();
        }
      }),
      UI.button({
        text: "КАК ИГРАТЬ", accent: "#00e5ff", kind: "outline", height: 40, cls: "small",
        onClick: showHelp
      })
    );

    if (hasSave) {
      buttons.appendChild(UI.button({
        text: "СБРОСИТЬ ПРОГРЕСС", accent: "#ff2d78", kind: "ghost", height: 28, cls: "small",
        onClick: function () {
          game.resetProgress();
          UI.toast("Прогресс сброшен", "Новая жизнь начинается с $150", "warn");
          opts.onReset();
        }
      }));
    }

    var features = el("div", { cls: "features" });
    [
      "⌁  ВЗЛОМ — 8 миссий на Python",
      "⚙  МАЙНИНГ — пассивный доход с чужих ПК",
      "▲  БИРЖА — живые курсы и комиссия",
      "✎  ШКОЛА — 5 уроков с мини-тестами"
    ].forEach(function (text) {
      features.appendChild(el("div", { cls: "feature", text: text }));
    });

    var center = el("div", { cls: "center" },
      title,
      el("div", { cls: "subtitle", text: "симулятор хакера · учи Python · взламывай цели · майни крипту" }),
      el("div", { cls: "sub2", text: "8 миссий · 5 уроков · 4 апгрейда · одна легенда" }),
      buttons, features
    );

    this.quote = el("div", { cls: "quote", text: "" });
    var footer = el("div", { cls: "footer", text: "клавиши 1–7 — программы · Esc — закрыть окно · Ctrl+Enter — запуск кода" });

    this.root.appendChild(top);
    this.root.appendChild(center);
    this.root.appendChild(this.quote);
    this.root.appendChild(footer);

    /* ---------------------------- глитч и цитаты -------------------------- */
    this.quotes = game.Data.quotes.length ? game.Data.quotes : ["Тишина — лучший шифр"];
    this.quoteIndex = 0;
    this.quoteTimer = 0;
    this.glitchTimer = 0;
    this.refreshQuote();

    this.tickFn = function (dt) { self.tick(dt); };
    CH.Ticker.add(this.tickFn);

    this._onKey = function (e) {
      if (e.key === "Escape" || e.key === "F1") showHelp();
    };
    root.addEventListener("keydown", this._onKey);
  }

  MainMenu.prototype.refreshQuote = function () {
    this.quoteIndex = this.quoteIndex % this.quotes.length;
    this.quote.textContent = "«" + this.quotes[this.quoteIndex] + "»";
  };

  MainMenu.prototype.tick = function (dt) {
    this.glitchTimer -= dt;
    if (this.glitchTimer <= 0) {
      this.glitchTimer = 0.08;
      var dx = (Math.random() - 0.5) * 6;
      var dy = (Math.random() - 0.5) * 3;
      var layers = this.root.querySelectorAll(".title-glitch .layer");
      if (layers.length >= 2) {
        layers[0].style.transform = "translate(" + (dx - 1).toFixed(2) + "px," + dy.toFixed(2) + "px)";
        layers[1].style.transform = "translate(" + (-dx + 1).toFixed(2) + "px," + (-dy).toFixed(2) + "px)";
      }
    }

    this.quoteTimer += dt;
    if (this.quoteTimer >= 8) {
      this.quoteTimer = 0;
      this.quoteIndex++;
      this.refreshQuote();
    }
  };

  MainMenu.prototype.destroy = function () {
    root.removeEventListener("keydown", this._onKey);
    CH.Ticker.remove(this.tickFn);
    this.bg.destroy();
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  };

  function showHelp() {
    var steps = [
      "1. Иконка ⌁ ХАК-ТЕРМИНАЛ — выбери миссию слева.",
      "2. Пиши код на Python в редакторе и жми ▶ ЗАПУСТИТЬ.",
      "3. Соблюдай требования миссии — они во вкладке ПОДСКАЗКИ.",
      "4. Награда: крипта, доллары, XP. XP повышает уровень.",
      "5. Ставь майнеры (⚙) и торгуй на бирже (▲), чтобы расти.",
      "6. Клавиши 1–7 открывают программы, Esc закрывает верхнее окно."
    ];
    var box = el("div", { cls: "col" });
    steps.forEach(function (s) { box.appendChild(el("div", { style: { "font-size": "13px", color: "#b9c7dd" }, text: s })); });
    UI.modal({
      title: "КАК ИГРАТЬ",
      body: box,
      accent: "#00e5ff",
      okLabel: "ПОНЯТНО"
    });
  }

  CH.Screens = CH.Screens || {};
  CH.Screens.MainMenu = MainMenu;
})(typeof globalThis !== "undefined" ? globalThis : this);
