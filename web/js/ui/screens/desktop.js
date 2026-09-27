/* ==========================================================================
   screens/desktop.js — рабочий стол NeonOS (перенос DesktopScreen.cs):
   топбар с курсами, колонка программ, окна, панель задач, меню «GHOST»,
   горячие клавиши 1–7 и Esc, обучение и модалка повышения уровня.
   ========================================================================== */
(function (root) {
  "use strict";

  var CH = root.CH = root.CH || {};
  var UI = CH.UI;
  var el = CH.Dom.el;
  var Fmt = CH.Fmt;

  var APPS = [
    { id: "hack", label: "Хак-терминал", glyph: "⌁", accent: "#4fe0a8", make: "hack" },
    { id: "miner", label: "Майнеры", glyph: "⚙", accent: "#6cd8f2", make: "miner" },
    { id: "trade", label: "Биржа", glyph: "▲", accent: "#ffd479", make: "trade" },
    { id: "upgrade", label: "Апгрейды", glyph: "✚", accent: "#ffb27a", make: "upgrade" },
    { id: "learn", label: "Школа Python", glyph: "✎", accent: "#ff7aa8", make: "learn" },
    { id: "files", label: "Файлы", glyph: "▶", accent: "#6cd8f2", make: "files" },
    { id: "profile", label: "Профиль", glyph: "★", accent: "#ffd479", make: "profile" }
  ];

  function DesktopScreen(host, opts) {
    var game = opts.game;
    var self = this;
    this.game = game;
    this.onExitToMenu = opts.onExitToMenu;
    this.unsubscribe = [];

    this.root = el("div", { cls: "desktop" });
    this.bg = new CH.Backgrounds(this.root);

    /* ------------------------------ топбар -------------------------------- */
    this.tickers = {};
    this.prevPrices = {};
    var tickersRow = el("div", { cls: "row", style: { gap: "14px" } });
    game.Data.cryptos.forEach(function (c) {
      var node = el("div", { cls: "ticker", style: { color: "#e2e9f5" } });
      self.tickers[c.id] = node;
      tickersRow.appendChild(node);
    });

    this.pyModeLabel = el("div", { cls: "py-mode", text: game.pythonModeText() });
    this.levelChip = el("div", { cls: "level-chip", text: "LV 1" });
    this.xpBar = UI.bar("#ffd479");
    this.xpBar.style.width = "90px";
    this.xpText = el("div", { cls: "label", text: "" });
    this.money = el("div", { cls: "money", text: "" });
    this.cryptoTotal = el("div", { cls: "crypto-total", text: "" });
    this.clock = el("div", { cls: "clock", text: "" });

    var topbar = el("header", { cls: "topbar" },
      tickersRow,
      this.pyModeLabel,
      el("div", { cls: "right" },
        this.levelChip,
        el("div", { cls: "xp-wrap" }, this.xpBar, this.xpText),
        this.money,
        this.cryptoTotal,
        this.clock
      )
    );

    /* --------------------------- колонка иконок ---------------------------- */
    this.badges = {};
    this.iconNodes = {};
    var icons = el("div", { cls: "icons" });
    APPS.forEach(function (app, index) {
      var badge = el("span", { cls: "badge", text: "" });
      var node = el("button", {
        cls: "app-icon",
        style: { "--accent": app.accent },
        title: app.label + "  (" + (index + 1) + ")",
        on: { click: function () { self.openApp(app.id); } }
      },
        el("span", { cls: "glyph", text: app.glyph }),
        el("span", { text: app.label }),
        badge
      );
      self.badges[app.id] = badge;
      self.iconNodes[app.id] = node;
      icons.appendChild(node);
    });

    /* ------------------------------- окна --------------------------------- */
    var windowsContainer = el("div", { cls: "windows" });
    this.layer = new CH.WindowLayer(windowsContainer);
    var self2 = this;
    this.layer.onChange = function () { self2.refreshTaskbar(); self2.refreshIcons(); };
    this.layer.onFocus = function () { self2.refreshTaskbar(); self2.refreshIcons(); };

    /* ---------------------------- панель задач ---------------------------- */
    this.startBtn = UI.button({
      text: "⌁ " + (game.displayName() || "ghost").toUpperCase(), accent: "#4fe0a8", kind: "outline", height: 32,
      onClick: function () { self.toggleStartMenu(); }
    });
    this.startBtn.style.width = "96px";
    this.tasks = el("div", { cls: "tasks" });
    this.incomeLabel = el("div", { cls: "income", text: "" });
    this.btcLabel = el("div", { text: "" });
    var taskbar = el("footer", { cls: "taskbar" },
      this.startBtn,
      this.tasks,
      el("div", { cls: "status" }, this.incomeLabel, this.btcLabel)
    );

    this.root.appendChild(topbar);
    this.root.appendChild(icons);
    this.root.appendChild(windowsContainer);
    this.root.appendChild(taskbar);
    host.appendChild(this.root);

    /* ------------------------------ события ------------------------------- */
    var refreshHud = function () { self.refreshHud(); };
    game.on("state", refreshHud);
    game.on("prices", refreshHud);
    game.on("miners", refreshHud);
    this.unsubscribe.push(function () {
      game.off("state", refreshHud);
      game.off("prices", refreshHud);
      game.off("miners", refreshHud);
    });

    var onLevelUp = function (level) { self.showLevelUp(level); };
    game.on("levelup", onLevelUp);
    this.unsubscribe.push(function () { game.off("levelup", onLevelUp); });

    this._onKey = function (e) { self.onKeyDown(e); };
    root.addEventListener("keydown", this._onKey);
    root.addEventListener("mousedown", function () { CH.Sfx.unlock(); }, { once: true });

    this.tickFn = function () { self.tickClock(); };
    CH.Ticker.add(this.tickFn);

    /* ------------------------------- старт -------------------------------- */
    this.refreshHud();
    this.refreshTaskbar();
    this.openApp("hack");
    // вводную показываем один раз на новом профиле
    if (!game.onboarded) {
      game.onboarded = true;
      game.save();
      this.showOnboarding();
    }
  }

  /* ============================== ПРИЛОЖЕНИЯ ============================= */
  DesktopScreen.prototype.appById = function (id) {
    for (var i = 0; i < APPS.length; i++) if (APPS[i].id === id) return APPS[i];
    return null;
  };

  DesktopScreen.prototype.openApp = function (id) {
    var app = this.appById(id);
    if (!app) return;
    if (this.layer.isOpen(id)) {
      this.layer.get(id).focus();
      return;
    }
    var factory = CH.Apps[app.make];
    if (!factory) {
      UI.toast("Программа недоступна", "Не загрузился модуль " + id, "err");
      return;
    }
    var view = factory(this.game);
    this.layer.open(id, view);
    CH.Sfx.uiOpen();
    this.refreshTaskbar();
    this.refreshIcons();
  };

  DesktopScreen.prototype.closeApp = function (id) {
    if (this.layer.isOpen(id)) {
      CH.Sfx.uiClick();
      this.layer.close(id);
    }
  };

  DesktopScreen.prototype.refreshTaskbar = function () {
    var self = this;
    CH.Dom.clear(this.tasks);
    this.layer.list().forEach(function (win) {
      var app = self.appById(win.id);
      if (!app) return;
      var focused = self.layer.focused === win.id;
      self.tasks.appendChild(UI.button({
        text: app.label,
        accent: app.accent,
        kind: focused ? "solid" : "outline",
        height: 28,
        onClick: function () {
          if (self.layer.focused === win.id) self.closeApp(win.id);
          else self.layer.get(win.id).focus();
        }
      }));
    });
  };

  DesktopScreen.prototype.refreshIcons = function () {
    var self = this;
    APPS.forEach(function (app) {
      self.iconNodes[app.id].classList.toggle("open", self.layer.isOpen(app.id));
    });
  };

  /* ================================ HUD ================================== */
  DesktopScreen.prototype.refreshHud = function () {
    var game = this.game;
    var self = this;

    game.Data.cryptos.forEach(function (c) {
      var node = self.tickers[c.id];
      var price = game.getPrice(c.id);
      var prev = self.prevPrices[c.id];
      var arrow = "";
      var cls = "";
      if (prev && prev > 0) {
        var delta = (price - prev) / prev;
        if (Math.abs(delta) > 0.0005) {
          arrow = delta > 0 ? " ▲" : " ▼";
          cls = delta > 0 ? " up" : " down";
        }
      }
      self.prevPrices[c.id] = price;
      node.className = "ticker" + cls;
      node.textContent = c.icon + " " + c.id + " " + Fmt.price(price) + arrow;
    });

    this.levelChip.textContent = "LV " + game.level;
    this.xpBar.setValue(game.xpProgress());
    this.xpText.textContent = game.xp + "/" + game.xpForLevel(game.level) + " xp";
    this.money.textContent = Fmt.dollars(game.dollars);
    this.cryptoTotal.textContent = Fmt.dollarsFull(game.portfolioValue()) + " в крипте";
    this.pyModeLabel.textContent = game.pythonModeText();
    this.incomeLabel.textContent = game.miners.length
      ? "⚙ +" + Fmt.dollars(game.minerIncomePerMin()) + "/мин"
      : "";
    this.btcLabel.textContent = Fmt.crypto(game.getCrypto("BTC")) + " BTC";

    this.badges.hack.textContent = game.contracts.length
      ? game.contractsDone() + "/" + game.contracts.length
      : (game.tutorialDone() ? "0" : "1");
    this.badges.learn.textContent = game.completedLessons.length + "/" + game.Data.lessons.length;
    this.badges.miner.textContent = game.miners.length ? String(game.miners.length) : "";
  };

  DesktopScreen.prototype.tickClock = function () {
    var d = new Date();
    var text = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    if (this.clock.textContent !== text) this.clock.textContent = text;
  };

  /* =============================== МЕНЮ ================================== */
  DesktopScreen.prototype.toggleStartMenu = function () {
    if (this.startMenu) {
      this.closeStartMenu();
      return;
    }
    CH.Sfx.uiClick();
    var self = this;

    var items = [
      {
        label: "Звук: " + (this.game.soundOn ? "ВКЛ" : "ВЫКЛ"),
        action: function () {
          self.game.soundOn = !self.game.soundOn;
          CH.Sfx.enabled = self.game.soundOn;
          self.game.save();
          self.closeStartMenu();
          self.toggleStartMenu();
        }
      },
      { label: "Показать обучение", action: function () { self.closeStartMenu(); self.showOnboarding(); } },
      {
        label: "Сбросить прогресс",
        action: function () {
          self.closeStartMenu();
          self.game.resetProgress();
          self.refreshHud();
          UI.toast("Прогресс сброшен", "Начинаем с $150 и чистой репутации", "warn");
        }
      },
      {
        label: "Сохранить игру",
        action: function () {
          self.closeStartMenu();
          self.game.save();
          UI.toast("Сохранено", "Прогресс записан в localStorage", "info");
        }
      },
      {
        label: "В главное меню",
        action: function () {
          self.game.save();
          self.closeStartMenu();
          self.onExitToMenu();
        }
      }
    ];

    var menu = el("div", { cls: "startmenu" },
      el("div", { cls: "head", text: "NEON_OS // МЕНЮ" })
    );
    items.forEach(function (item) {
      var b = UI.button({
        text: item.label, accent: "#e2e9f5", kind: "ghost", height: 30,
        cls: "item", onClick: item.action
      });
      menu.appendChild(b);
    });
    menu.appendChild(el("div", { cls: "ver", text: "CRYPTO_HACK · браузерная версия" }));
    this.root.appendChild(menu);
    this.startMenu = menu;
  };

  DesktopScreen.prototype.closeStartMenu = function () {
    if (this.startMenu && this.startMenu.parentNode) this.startMenu.parentNode.removeChild(this.startMenu);
    this.startMenu = null;
  };

  /* ============================== МОДАЛКИ ================================ */
  DesktopScreen.prototype.showLevelUp = function (level) {
    var text = "Ты становишься сильнее. Продолжай взламывать!";
    this.game.Data.cryptos.forEach(function (c) {
      if (c.unlockLevel === level) {
        text = "Разблокирована " + c.name + " (" + c.id + ")! Новые миссии и майнеры ждут.";
      }
    });
    if (this.game.soundOn) CH.Sfx.levelUp();
    UI.modal({
      title: "LEVEL " + level,
      text: text,
      accent: "#ffd479",
      okLabel: "ЗАБРАТЬ НАГРАДУ"
    });
  };

  DesktopScreen.prototype.showOnboarding = function () {
    var box = el("div", { cls: "col" },
      el("div", {
        style: { "font-size": "12px", color: "#c3cee1", "white-space": "pre-wrap" },
        text: "Это NeonOS — твоя хакерская ОС. Слева программы, сверху деньги и курсы, снизу панель задач.\n" +
          "1. Пройди обучение в «Хак-терминале» — это единственная ручная миссия.\n" +
          "2. Дальше бери контракты: выбери сложность слева внизу — чем сложнее, тем выше награда.\n" +
          "3. Ставь майнеры на взломанные компы — доход капает каждую секунду.\n" +
          "4. Продавай крипту на бирже, качай апгрейды и учись в школе Python."
      })
    );
    UI.modal({
      title: "Добро пожаловать, ghost!",
      body: box,
      accent: "#6cd8f2",
      okLabel: "ПОГНАЛИ",
      onClose: (function (game) {
        return function () { game.save(); };
      })(this.game)
    });
  };

  /* ============================== КЛАВИШИ ================================ */
  DesktopScreen.prototype.onKeyDown = function (e) {
    if (e.target && (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT")) return;

    if (e.key === "Escape") {
      if (this.startMenu) { this.closeStartMenu(); return; }
      var open = root.document.querySelectorAll(".modal");
      if (open.length) { open[open.length - 1].dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); return; }
      this.layer.closeTop();
      this.refreshTaskbar();
      return;
    }

    if (/^[1-7]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      var app = APPS[Number(e.key) - 1];
      if (app) this.openApp(app.id);
    }
  };

  DesktopScreen.prototype.destroy = function () {
    root.removeEventListener("keydown", this._onKey);
    CH.Ticker.remove(this.tickFn);
    this.unsubscribe.forEach(function (fn) { fn(); });
    this.layer.destroy();
    this.bg.destroy();
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  };

  CH.Screens = CH.Screens || {};
  CH.Screens.Desktop = DesktopScreen;
})(typeof globalThis !== "undefined" ? globalThis : this);
