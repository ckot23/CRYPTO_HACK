/* ==========================================================================
   screens/boot.js — экран загрузки «NEON BIOS» (перенос BootScreen.cs):
   строки печатаются посимвольно, прогресс-бар растёт, любая клавиша —
   пропустить и уйти на рабочий стол.
   ========================================================================== */
(function (root) {
  "use strict";

  var CH = root.CH = root.CH || {};
  var el = CH.Dom.el;
  var Fmt = CH.Fmt;

  var LINE_DELAY = 0.16;      // сек между строками
  var CHAR_DELAY = 0.006;     // сек на символ

  function BootScreen(host, opts) {
    this.host = host;
    this.game = opts.game;
    this.onDone = opts.onDone;

    this.root = el("div", { cls: "boot" });
    this.log = el("div", { cls: "log" });
    this.fill = el("i");
    this.percent = el("div", { cls: "percent", text: "0%" });
    this.status = el("div", { cls: "status", text: "NEON OS v4.2 · инициализация..." });
    this.skip = el("div", { cls: "skip", text: "[ любая клавиша или клик — пропустить ]" });

    this.bg = new CH.Backgrounds(this.root);

    this.root.appendChild(this.log);
    var bar = el("div", { cls: "boot-bar" },
      this.percent,
      el("div", { cls: "track" }, this.fill)
    );
    this.root.appendChild(bar);
    this.root.appendChild(this.status);
    this.root.appendChild(this.skip);
    host.appendChild(this.root);

    this.lines = [];
    this.queue = this.buildQueue();
    this.total = this.queue.length;

    this.typing = "";
    this.charIndex = 0;
    this.lineTimer = 0;
    this.charTimer = 0;
    this.holdTimer = 0;
    this.done = false;

    var self = this;
    this._onKey = function (e) { self.finish(); };
    this._onClick = function () { self.finish(); };
    root.addEventListener("keydown", this._onKey);
    this.root.addEventListener("mousedown", this._onClick);

    this.tickFn = function (dt) { self.tick(dt); };
    CH.Ticker.add(this.tickFn);
    this.push("NEON BIOS v4.2.1 — POST OK");
  }

  BootScreen.prototype.buildQueue = function () {
    var g = this.game;
    return [
      "CPU: quantum-core 4x5.2GHz · RAM: 64GB · GPU: n/a",
      "mount /dev/neo0 → /neon .............. OK",
      "crypto modules: " + g.Data.cryptos.length + " · missions: " + g.Data.missions.length +
        " · upgrades: " + g.Data.upgrades.length,
      "loading school_db (" + g.Data.lessons.length + " lessons) ..... OK",
      "starting net daemon ............... OK",
      "checking blacklist ............... CLEAN",
      "checking whitehat tracker ........ CLEAN",
      "profile: level " + g.level + " · xp " + g.xp + " · $" + Fmt.int(g.dollars),
      "» всё готово. Добро пожаловать в NEON NET, хакер."
    ];
  };

  BootScreen.prototype.push = function (line) {
    this.lines.push(line);
    this.log.textContent = this.lines.join("\n");
    CH.Sfx.bootLine(this.lines.length);
  };

  BootScreen.prototype.consumed = function () {
    return this.lines.length + (this.typing.length > 0 ? 1 : 0);
  };

  BootScreen.prototype.refreshBar = function () {
    var p = this.total > 0 ? Math.min(1, this.consumed() / this.total) : 1;
    this.percent.textContent = Math.round(p * 100) + "%" + (p >= 1 ? " · ГОТОВО" : "");
    this.fill.style.width = (p * 100).toFixed(1) + "%";
    if (this.lines.length) this.status.textContent = this.lines[this.lines.length - 1];
  };

  BootScreen.prototype.tick = function (dt) {
    if (this.done) return;

    if (this.charIndex < this.typing.length) {
      this.charTimer += dt;
      while (this.charIndex < this.typing.length && this.charTimer >= CHAR_DELAY) {
        this.charTimer -= CHAR_DELAY;
        this.charIndex++;
      }
      this.log.textContent = this.lines.join("\n") +
        (this.lines.length ? "\n" : "") + this.typing.slice(0, this.charIndex) + "█";
      this.refreshBar();
      return;
    }

    if (this.typing.length > 0) {
      this.queue.unshift(this.typing);
      this.typing = "";
      this.charIndex = 0;
    }

    if (this.queue.length === 0) {
      this.holdTimer += dt;
      if (this.holdTimer >= 1.2) this.finish();
      return;
    }

    this.lineTimer += dt;
    if (this.lineTimer >= LINE_DELAY) {
      this.lineTimer = 0;
      this.typing = this.queue.shift();
      this.charIndex = 0;
      this.charTimer = 0;
    }
  };

  BootScreen.prototype.finish = function () {
    if (this.done) return;
    this.done = true;

    while (this.queue.length) this.push(this.queue.shift());
    if (this.typing) { this.push(this.typing); this.typing = ""; }
    this.log.textContent = this.lines.join("\n");
    this.percent.textContent = "100% · ГОТОВО";
    this.status.textContent = "запуск рабочего стола...";
    this.fill.style.width = "100%";

    // отметка времени последнего запуска (если хранилище вообще доступно)
    try {
      root.localStorage.setItem("cryptohack_last_boot", new Date().toISOString().slice(0, 16).replace("T", " "));
    } catch (e) { /* приватный режим или file:// — не критично */ }

    var self = this;
    setTimeout(function () { self.destroy(); self.onDone(); }, 420);
  };

  BootScreen.prototype.destroy = function () {
    root.removeEventListener("keydown", this._onKey);
    CH.Ticker.remove(this.tickFn);
    this.bg.destroy();
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  };

  CH.Screens = CH.Screens || {};
  CH.Screens.Boot = BootScreen;
})(typeof globalThis !== "undefined" ? globalThis : this);
