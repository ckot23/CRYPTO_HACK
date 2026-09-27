/* ==========================================================================
   screens/poweron.js — включение компьютера.

   Чёрный экран → щелчок питания → тест железа → заставка NeonOS → рабочий
   стол. Дальше игра сама откроет браузер, где спросят логин.
   ========================================================================== */
(function (root) {
  "use strict";

  var CH = root.CH = root.CH || {};
  var el = CH.Dom.el;
  var Fmt = CH.Fmt;

  var BOOT_LINES = [
    { text: "NeonOS BIOS v4.2.1 · NeonTech Systems", cls: "dim" },
    { text: "Power-On Self Test ............................ OK", cls: "" },
    { text: "CPU: quantum-core 4C/8T @ 5.2GHz .............. OK", cls: "" },
    { text: "Memory Test: 65536 MB ......................... OK", cls: "" },
    { text: "Detecting drives: /dev/neo0 (480 GB NVMe) ..... OK", cls: "" },
    { text: "Network: eth0 link up, MAC 0E:1D:7A:9C:41:FF .. OK", cls: "" },
    { text: "Loading kernel modules (net, crypto, vgfx) .... OK", cls: "" },
    { text: "Verifying signatures .......................... OK", cls: "" },
    { text: "Starting NeonOS session ....................... OK", cls: "ok" }
  ];

  function PowerOn(host, opts) {
    var self = this;
    this.onDone = opts.onDone;
    this.login = opts.login || "ghost";
    this.stage = "off";              // off → post → splash → done
    this.timer = 0;
    this.lineIndex = 0;

    this.root = el("div", { cls: "power" });
    this.screen = el("div", { cls: "power-screen" },
      el("div", { cls: "power-prompt" }, "НАЖМИ ПРОБЕЛ ИЛИ КЛИКНИ — ВКЛЮЧИТЬ КОМПЬЮТЕР"),
      el("div", { cls: "power-hint" }, "NeonTech NeonBox 4 · кнопка питания справа снизу")
    );
    this.button = el("button", { cls: "power-btn", title: "Питание", on: { click: power } },
      el("span", { cls: "glyph", text: "◉" }));
    var buttonWrap = el("div", { cls: "power-btn-wrap" }, this.button);
    this.root.appendChild(this.screen);
    this.root.appendChild(buttonWrap);
    host.appendChild(this.root);

    function power() {
      if (self.stage !== "off") return;
      self.startBoot();
    }

    this._onKey = function (e) {
      if (e.key === " " || e.key === "Enter" || e.key === "Spacebar") {
        e.preventDefault();
        power();
      }
    };
    root.addEventListener("keydown", this._onKey);
    this.root.addEventListener("mousedown", function (e) {
      if (self.stage === "off" && !e.target.closest(".power-btn-wrap")) power();
    });

    this.tickFn = function (dt) { self.tick(dt); };
    CH.Ticker.add(this.tickFn);
  }

  PowerOn.prototype.startBoot = function () {
    this.stage = "post";
    this.root.classList.add("on");
    CH.Sfx.unlock();
    CH.Sfx.powerOn();
    this.screen.className = "power-screen post";
    CH.Dom.clear(this.screen);
    this.log = el("div", { cls: "post-log" });
    this.screen.appendChild(this.log);
    this.timer = 0;
  };

  PowerOn.prototype.tick = function (dt) {
    if (this.stage === "post") {
      this.timer += dt;
      var want = Math.floor(this.timer / 0.22);
      while (this.lineIndex < BOOT_LINES.length && this.lineIndex < want) {
        var line = BOOT_LINES[this.lineIndex];
        this.log.appendChild(el("div", { cls: "post-line " + line.cls, text: line.text }));
        this.lineIndex++;
      }
      if (this.lineIndex >= BOOT_LINES.length && this.timer > 0.22 * BOOT_LINES.length + 0.35) {
        this.stage = "splash";
        this.timer = 0;
        CH.Dom.clear(this.screen);
        this.screen.className = "power-screen splash";
        this.screen.appendChild(el("div", { cls: "splash-logo", text: "NEON_OS" }));
        this.screen.appendChild(el("div", { cls: "splash-sub", text: "NeonOS 4.2 · загрузка сеанса оператора" }));
        var bar = el("div", { cls: "splash-bar" }, el("i"));
        this.screen.appendChild(bar);
        this.splashFill = bar.firstChild;
        this.splashLabel = el("div", { cls: "splash-label", text: "готовим сеанс..." });
        this.screen.appendChild(this.splashLabel);
      }
      return;
    }

    if (this.stage === "splash") {
      this.timer += dt;
      var p = Math.min(1, this.timer / 1.9);
      this.splashFill.style.width = (p * 100).toFixed(0) + "%";
      if (p > 0.35) this.splashLabel.textContent = "проверка оператора...";
      if (p > 0.7) this.splashLabel.textContent = "оператор: " + this.login;
      if (p >= 1) {
        this.stage = "done";
        this.finish();
      }
    }
  };

  PowerOn.prototype.finish = function () {
    var self = this;
    this.root.classList.add("fade");
    setTimeout(function () {
      self.destroy();
      self.onDone();
    }, 420);
  };

  PowerOn.prototype.destroy = function () {
    root.removeEventListener("keydown", this._onKey);
    CH.Ticker.remove(this.tickFn);
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  };

  CH.Screens = CH.Screens || {};
  CH.Screens.PowerOn = PowerOn;
})(typeof globalThis !== "undefined" ? globalThis : this);
