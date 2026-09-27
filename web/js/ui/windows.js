/* ==========================================================================
   windows.js — перетаскиваемые окна NeonOS с менеджером z-порядка.
   Перенос UI/UiWindow.cs + логики каскада из UI/Screens/DesktopScreen.cs.
   ========================================================================== */
(function (root) {
  "use strict";

  var CH = root.CH = root.CH || {};
  var el = CH.Dom.el;

  var HEAD_H = 30;
  var TOP_LIMIT = 44;     // не заезжать под верхнюю панель
  var BASE_Z = 100;

  function Window(layer, id, opts) {
    opts = opts || {};
    this.id = id;
    this.accent = opts.accent || "#00ff9d";
    this._layer = layer;
    this._closed = false;
    this._closeHandlers = [];

    this.titleNode = el("span", { cls: "win-title", text: opts.title || id });
    this.head = el("div", { cls: "win-head" },
      el("i", { cls: "win-dot" }),
      this.titleNode,
      el("button", { cls: "win-close", text: "✗", title: "Закрыть окно", on: { click: this._requestClose.bind(this) } })
    );
    this.body = el("div", { cls: "win-body" + (opts.flush ? " flush" : "") });
    this.node = el("section", {
      cls: "win",
      style: {
        "--accent": this.accent,
        width: (opts.width || 660) + "px",
        height: (opts.height || 480) + "px",
        left: (opts.x || 0) + "px",
        top: (opts.y || 0) + "px",
        zIndex: String(layer.nextZ())
      }
    }, this.head, this.body);

    layer.container.appendChild(this.node);
    this._bindDrag();
  }

  Window.prototype.setTitle = function (title) {
    this.titleNode.textContent = title;
    return this;
  };

  Window.prototype.setAccent = function (accent) {
    this.accent = accent;
    this.node.style.setProperty("--accent", accent);
    return this;
  };

  Window.prototype.focus = function () {
    this.node.style.zIndex = String(this._layer.nextZ());
    this._layer.focused = this.id;
    this._layer.handleFocus(this);
  };

  Window.prototype.close = function () {
    if (this._closed) return;
    this._closed = true;
    this._closeHandlers.forEach(function (fn) { fn(this); }, this);
    if (this.node.parentNode) this.node.parentNode.removeChild(this.node);
    this._layer.handleClose(this);
  };

  Window.prototype.onClose = function (fn) { this._closeHandlers.push(fn); };
  Window.prototype.isOpen = function () { return !this._closed; };

  Window.prototype._requestClose = function () { this.close(); };

  /** Перетаскивание за шапку (мышь + тач), с ограничением по границам экрана. */
  Window.prototype._bindDrag = function () {
    var self = this;
    var dragging = false;
    var dx = 0, dy = 0;

    function onDown(e) {
      if (e.target.closest(".win-close")) return;
      dragging = true;
      var p = point(e);
      var rect = self.node.getBoundingClientRect();
      dx = p.x - rect.left;
      dy = p.y - rect.top;
      self.focus();
      root.document.addEventListener("pointermove", onMove);
      root.document.addEventListener("pointerup", onUp);
      e.preventDefault();
    }

    function onMove(e) {
      if (!dragging) return;
      var p = point(e);
      var maxX = root.innerWidth - 80;
      var maxY = root.innerHeight - 60;
      var x = Math.max(-self.node.offsetWidth + 120, Math.min(maxX, p.x - dx));
      var y = Math.max(TOP_LIMIT, Math.min(maxY, p.y - dy));
      self.node.style.left = Math.round(x) + "px";
      self.node.style.top = Math.round(y) + "px";
    }

    function onUp() {
      dragging = false;
      root.document.removeEventListener("pointermove", onMove);
      root.document.removeEventListener("pointerup", onUp);
    }

    function point(e) {
      if (e.touches && e.touches.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      return { x: e.clientX, y: e.clientY };
    }

    this.head.addEventListener("pointerdown", onDown);
    this.node.addEventListener("mousedown", function () { self.focus(); });
  };

  /* ---------------------------- Слой окон -------------------------------- */
  function WindowLayer(container) {
    this.container = container;
    this.windows = {};
    this.order = [];
    this._z = BASE_Z;
    this._cascade = 0;
    this.focused = "";
    this.onChange = null;
    this.onFocus = null;
  }

  WindowLayer.prototype.nextZ = function () { this._z += 2; return this._z; };

  WindowLayer.prototype.handleClose = function (win) {
    delete this.windows[win.id];
    var i = this.order.indexOf(win.id);
    if (i >= 0) this.order.splice(i, 1);
    if (this.focused === win.id) this.focused = "";
    if (this.onChange) this.onChange();
  };

  WindowLayer.prototype.handleFocus = function (win) {
    this.order = this.order.filter(function (id) { return id !== win.id; });
    this.order.push(win.id);
    if (this.onFocus) this.onFocus(win);
  };

  WindowLayer.prototype.isOpen = function (id) { return !!this.windows[id]; };

  WindowLayer.prototype.open = function (id, opts) {
    if (this.windows[id]) {
      this.windows[id].focus();
      return this.windows[id];
    }
    // каскад: каждое новое окно чуть ниже и правее предыдущего
    var shift = (this._cascade % 7) * 36;
    this._cascade++;
    var conf = Object.assign({}, opts);
    if (conf.x === undefined) conf.x = 48 + shift;
    if (conf.y === undefined) conf.y = 72 + shift;
    // на узких экранах каскад не должен уводить окно за правый край
    var maxX = Math.max(12, (root.innerWidth || 1280) - 220);
    conf.x = Math.min(conf.x, maxX);

    var win = new Window(this, id, conf);
    this.windows[id] = win;
    this.order.push(id);
    if (opts && opts.build) opts.build(win.body, win);
    win.focus();
    if (this.onChange) this.onChange();
    return win;
  };

  WindowLayer.prototype.get = function (id) { return this.windows[id] || null; };

  WindowLayer.prototype.close = function (id) {
    var win = this.windows[id];
    if (win) win.close();
  };

  WindowLayer.prototype.closeTop = function () {
    var id = this.order[this.order.length - 1];
    if (id) this.close(id);
  };

  WindowLayer.prototype.list = function () {
    var self = this;
    return this.order.map(function (id) { return self.windows[id]; }).filter(Boolean);
  };

  WindowLayer.prototype.destroy = function () {
    this.list().forEach(function (w) { w.close(); });
    this.windows = {};
    this.order = [];
  };

  CH.Window = Window;
  CH.WindowLayer = WindowLayer;
})(typeof globalThis !== "undefined" ? globalThis : this);
