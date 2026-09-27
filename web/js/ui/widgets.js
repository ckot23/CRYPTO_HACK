/* ==========================================================================
   widgets.js — кнопки, поля ввода, модалки, тосты, консоль и график.
   Перенос UI/Widgets.cs: те же виды кнопок (Solid/Outline/Ghost), та же
   «печатающаяся» консоль с задержками и тот же неоновый график курса.
   ========================================================================== */
(function (root) {
  "use strict";

  var CH = root.CH = root.CH || {};
  var el = CH.Dom.el;

  /* ------------------------------ Цвет ----------------------------------- */
  function lighten(hex, amount) {
    var c = parseColor(hex);
    if (!c) return hex;
    var f = amount === undefined ? 0.3 : amount;
    return "rgb(" + Math.round(c.r + (255 - c.r) * f) + "," +
      Math.round(c.g + (255 - c.g) * f) + "," +
      Math.round(c.b + (255 - c.b) * f) + ")";
  }

  function parseColor(hex) {
    if (!hex) return null;
    var s = String(hex).trim();
    if (s.charAt(0) === "#") {
      var h = s.slice(1);
      if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
      if (h.length !== 6) return null;
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16)
      };
    }
    var m = /rgba?\(([^)]+)\)/.exec(s);
    if (m) {
      var p = m[1].split(",").map(function (x) { return parseFloat(x); });
      return { r: p[0], g: p[1], b: p[2] };
    }
    return null;
  }

  /** Кнопка в духе UiButton: solid / outline / ghost + акцентный цвет. */
  function button(opts) {
    opts = opts || {};
    var accent = opts.accent || "#4fe0a8";
    var kind = opts.kind || "solid";
    var cls = "btn btn--" + kind + (opts.cls ? " " + opts.cls : "");
    var node = el("button", {
      cls: cls,
      title: opts.title,
      attrs: { type: "button" },        // формы не должны отправляться «случайно»
      style: {
        "--accent": accent,
        "--accent-hover": lighten(accent, 0.35),
        height: opts.height ? opts.height + "px" : null
      }
    }, opts.text || "");
    if (opts.style) {
      Object.keys(opts.style).forEach(function (k) { node.style.setProperty(k, opts.style[k]); });
    }
    if (opts.onClick) node.addEventListener("click", opts.onClick);
    if (opts.disabled) node.disabled = true;
    node._accent = accent;
    node.setAccent = function (color) {
      node._accent = color;
      node.style.setProperty("--accent", color);
      node.style.setProperty("--accent-hover", lighten(color, 0.35));
    };
    node.setText = function (text) { node.textContent = text; };
    node.setDisabled = function (flag) {
      node.disabled = !!flag;
      node.classList.toggle("is-disabled", !!flag);
    };
    return node;
  }

  /** Поле ввода суммы на бирже. */
  function field(opts) {
    opts = opts || {};
    var node = el("input", {
      cls: "field",
      attrs: {
        type: "text",
        inputmode: "decimal",
        value: opts.value !== undefined ? opts.value : "",
        placeholder: opts.placeholder || ""
      },
      style: { "--accent": opts.accent || "#6cd8f2", width: (opts.width || 120) + "px" }
    });
    node.addEventListener("input", function () {
      node.value = node.value.replace(/[^\d.,-]/g, "").replace(",", ".");
      if (opts.onInput) opts.onInput(value());
    });
    node.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && opts.onEnter) { e.preventDefault(); opts.onEnter(value()); }
      e.stopPropagation();
    });
    function value() {
      var v = parseFloat(node.value);
      return isFinite(v) ? v : 0;
    }
    node.getValue = value;
    node.setValue = function (v) { node.value = String(v); };
    return node;
  }

  /* ------------------------------ ТОСТЫ ---------------------------------- */
  var Toasts = (function () {
    var layer = null;
    function ensure() {
      if (!layer) {
        layer = el("div", { cls: "toasts" });
        root.document.body.appendChild(layer);
      }
      return layer;
    }
    return {
      push: function (title, text, kind) {
        var accent = kindAccent(kind);
        var node = el("div", { cls: "toast", style: { "--accent": accent } },
          el("b", { text: title }),
          text ? el("span", { text: text }) : null);
        ensure().appendChild(node);
        setTimeout(function () {
          node.classList.add("out");
          setTimeout(function () {
            if (node.parentNode) node.parentNode.removeChild(node);
          }, 320);
        }, text ? 4200 : 3200);
        return node;
      },
      clear: function () { if (layer) CH.Dom.clear(layer); }
    };
  })();

  function kindAccent(kind) {
    if (kind === "ok") return "#4fe0a8";
    if (kind === "gold") return "#ffd479";
    if (kind === "err") return "#ff7aa8";
    if (kind === "warn") return "#ffb27a";
    return "#6cd8f2";
  }

  /* ------------------------------ МОДАЛКА --------------------------------- */
  function modal(opts) {
    opts = opts || {};
    var accent = opts.accent || "#6cd8f2";
    var card = el("div", { cls: "modal-card", style: { "--accent": accent } });
    var overlay = el("div", { cls: "modal", style: { "--accent": accent } }, card);

    if (opts.title) card.appendChild(el("h2", { text: opts.title }));
    if (opts.text) card.appendChild(el("div", { cls: "label", style: { "white-space": "pre-wrap" }, text: opts.text }));
    if (opts.body) card.appendChild(opts.body);
    if (opts.okLabel) {
      card.appendChild(button({
        text: opts.okLabel, accent: accent, kind: "solid", height: 36,
        style: { width: "100%" },
        onClick: function () { close(); }
      }));
    }

    root.document.body.appendChild(overlay);

    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (opts.onClose) opts.onClose();
    }

    if (opts.dim !== false) {
      overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) close(); });
    }
    return { node: overlay, card: card, close: close, isOpen: function () { return !closed; } };
  }

  /* ------------------------------ КОНСОЛЬ -------------------------------- */
  function Console(parent) {
    this.node = el("div", { cls: "console" });
    this.body = el("div");
    this.node.appendChild(this.body);
    if (parent) parent.appendChild(this.node);
    this.pending = [];
    this.t0 = now();
    var self = this;
    this.tickFn = function () { self.tick(); };
    CH.Ticker.add(this.tickFn);
  }

  function now() { return root.performance && root.performance.now ? root.performance.now() : Date.now(); }

  Console.prototype.addLine = function (text, kind) {
    var line = el("div", { cls: "line line--" + (kind || "info"), text: text });
    this.body.appendChild(line);
    this.node.scrollTop = this.node.scrollHeight;
    return line;
  };

  /** Строка появится через delayMs после запуска прогона (как AddDelayed в Unity). */
  Console.prototype.addDelayed = function (text, kind, delayMs) {
    this.pending.push({ text: text, kind: kind, at: delayMs, done: false });
    this.pending.sort(function (a, b) { return a.at - b.at; });
  };

  /** Мгновенно вывести всё, что ещё в очереди (кнопка «пропустить»). */
  Console.prototype.flush = function () {
    var list = this.pending.slice();
    this.pending.length = 0;
    list.forEach(function (item) { this.addLine(item.text, item.kind); }, this);
  };

  Console.prototype.tick = function () {
    if (!this.pending.length) return;
    var t = now() - this.t0;
    while (this.pending.length && this.pending[0].at <= t) {
      var item = this.pending.shift();
      this.addLine(item.text, item.kind);
    }
  };

  Console.prototype.clear = function () {
    CH.Dom.clear(this.body);
    this.pending.length = 0;
    this.t0 = now();
  };

  Console.prototype.resetClock = function () { this.t0 = now(); };

  Console.prototype.destroy = function () { CH.Ticker.remove(this.tickFn); };

  /* ------------------------------- ГРАФИК --------------------------------- */
  function Chart(parent, height) {
    this.canvas = el("canvas", { cls: "chart" });
    this.canvas.style.height = (height || 112) + "px";
    this.values = [];
    this.color = "#4fe0a8";
    if (parent) parent.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    var self = this;
    this._onResize = function () { self.draw(); };
    root.addEventListener("resize", this._onResize);
  }

  Chart.prototype.setValues = function (values, color) {
    this.values = Array.isArray(values) ? values.slice() : [];
    if (color) this.color = color;
    this.draw();
  };

  Chart.prototype.draw = function () {
    if (!this.ctx) return;                 // canvas недоступен — молча пропускаем
    var canvas = this.canvas;
    var dpr = Math.min(root.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth || 600;
    var h = canvas.clientHeight || 112;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    var ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // фон + сетка, как в UiChart
    ctx.fillStyle = "rgba(9, 14, 26, 0.45)";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 1;
    for (var g = 1; g < 4; g++) {
      var y = Math.round(h * g / 4) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    var v = this.values;
    if (v.length < 2) return;

    var min = v[0], max = v[0];
    for (var i = 1; i < v.length; i++) {
      if (v[i] < min) min = v[i];
      if (v[i] > max) max = v[i];
    }
    var span = Math.max(max - min, 1e-9);
    var pad = 6;
    var innerH = h - pad * 2;
    function px(i) { return (i / (v.length - 1)) * (w - 1); }
    function py(value) { return pad + (1 - (value - min) / span) * innerH; }

    // заливка под линией
    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, hexToRgba(this.color, 0.22));
    grad.addColorStop(1, hexToRgba(this.color, 0.02));
    ctx.beginPath();
    ctx.moveTo(px(0), py(v[0]));
    for (var k = 1; k < v.length; k++) ctx.lineTo(px(k), py(v[k]));
    ctx.lineTo(px(v.length - 1), h);
    ctx.lineTo(px(0), h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // сама линия + неоновое свечение
    ctx.beginPath();
    ctx.moveTo(px(0), py(v[0]));
    for (var j = 1; j < v.length; j++) ctx.lineTo(px(j), py(v[j]));
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // точка на последней цене
    ctx.beginPath();
    ctx.arc(px(v.length - 1), py(v[v.length - 1]), 2.4, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  };

  Chart.prototype.destroy = function () {
    root.removeEventListener("resize", this._onResize);
  };

  function hexToRgba(hex, alpha) {
    var c = parseColor(hex);
    if (!c) return "rgba(79, 224, 168, " + alpha + ")";
    return "rgba(" + c.r + "," + c.g + "," + c.b + "," + alpha + ")";
  }

  /* -------------------------- Мелкие построители -------------------------- */
  var UI = {
    button: button,
    field: field,
    modal: modal,
    toast: Toasts.push,
    Console: Console,
    Chart: Chart,

    card: function (cls, children) {
      return el("div", { cls: "card " + (cls || "") }, children);
    },

    /** Полоска прогресса. */
    bar: function (accent) {
      var fill = el("i", { style: { background: accent || "#4fe0a8" } });
      var node = el("div", { cls: "bar" }, fill);
      node.setValue = function (p) { fill.style.width = Math.round(Math.max(0, Math.min(1, p)) * 100) + "%"; };
      return node;
    },

    /** Индикатор уровней апгрейда. */
    pips: function (count, level) {
      var node = el("div", { cls: "pips" });
      for (var i = 0; i < count; i++) {
        node.appendChild(el("i", { cls: i < level ? "on" : "" }));
      }
      return node;
    },

    label: function (text, cls) { return el("div", { cls: "label " + (cls || ""), text: text }); },
    span: function (text, cls) { return el("span", { cls: cls || "", text: text }); },
    para: function (text, cls) { return el("p", { cls: cls || "", style: { margin: "0" }, text: text }); },

    /** Разделитель-подпись раздела. */
    sectionTitle: function (text, accent) {
      return el("div", {
        cls: "label b",
        style: { color: accent || "#9aabc4", "letter-spacing": "1px", "margin-top": "4px" },
        text: text
      });
    },

    lighten: lighten,
    starString: function (stars) {
      var s = "";
      for (var i = 0; i < 3; i++) s += i < stars ? "★" : "☆";
      return s;
    }
  };

  CH.UI = UI;
  CH.Widgets = UI;
})(typeof globalThis !== "undefined" ? globalThis : this);
