/* ==========================================================================
   backgrounds.js — фон рабочего стола: сетка, «матричный дождь», луч сканера.
   Перенос UI/Backgrounds.cs (там это текстура-тайл и пул текстовых колонок).
   ========================================================================== */
(function (root) {
  "use strict";

  var CH = root.CH = root.CH || {};
  var el = CH.Dom.el;

  var CHARSET = "01ABCDEF$#@%&Ξ<>+*";

  function Backgrounds(parent) {
    this.root = el("div", { cls: "bg-layer" });
    this.grid = el("div", { cls: "grid-bg" });
    this.canvas = el("canvas", { cls: "matrix" });
    this.beam = el("div", { cls: "scanbeam" });
    this.root.appendChild(this.grid);
    this.root.appendChild(this.canvas);
    this.root.appendChild(this.beam);
    parent.appendChild(this.root);

    this.ctx = this.canvas.getContext("2d");
    this.columns = [];
    this.acc = 0;
    this.stepSeconds = 0.066;
    this.running = true;

    var self = this;
    this._onResize = function () { self.resize(); };
    root.addEventListener("resize", this._onResize);
    this.resize();
    this.tickFn = function (dt) { self.tick(dt); };
    CH.Ticker.add(this.tickFn);
  }

  Backgrounds.prototype.resize = function () {
    if (!this.ctx) return;                 // canvas недоступен (например, jsdom без canvas)
    var dpr = Math.min(root.devicePixelRatio || 1, 2);
    var w = this.root.clientWidth || root.innerWidth;
    var h = this.root.clientHeight || root.innerHeight;
    this.w = w;
    this.h = h;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var count = Math.max(14, Math.floor(w / 40));
    this.columns = [];
    for (var i = 0; i < count; i++) {
      this.columns.push({
        x: (i + 0.5) * (w / count),
        y: -Math.random() * h,
        speed: 28 + Math.random() * 70,
        rows: 12,
        text: this.buildColumn()
      });
    }
  };

  Backgrounds.prototype.buildColumn = function () {
    var out = [];
    for (var r = 0; r < 12; r++) {
      out.push(CHARSET.charAt(Math.floor(Math.random() * CHARSET.length)));
    }
    return out;
  };

  Backgrounds.prototype.tick = function (dt) {
    if (!this.running || !this.w || !this.ctx) return;   // ctx == null, если canvas недоступен
    var ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.font = '13px "NeonMono", monospace';
    ctx.textBaseline = "top";

    for (var i = 0; i < this.columns.length; i++) {
      var c = this.columns[i];
      c.y += c.speed * dt;
      if (c.y > this.h + 160) {
        c.y = -Math.random() * 200 - 40;
        c.speed = 28 + Math.random() * 70;
      }
      for (var r = 0; r < c.rows; r++) {
        var alpha = (1 - r / c.rows) * 0.38;
        if (alpha < 0.03) continue;
        ctx.fillStyle = "rgba(79, 224, 168, " + alpha.toFixed(3) + ")";
        ctx.fillText(c.text[r], c.x, c.y + r * 15);
      }
    }

    this.acc += dt;
    if (this.acc >= this.stepSeconds) {
      this.acc = 0;
      for (var k = 0; k < this.columns.length; k++) this.columns[k].text = this.buildColumn();
    }
  };

  Backgrounds.prototype.destroy = function () {
    this.running = false;
    CH.Ticker.remove(this.tickFn);
    root.removeEventListener("resize", this._onResize);
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  };

  CH.Backgrounds = Backgrounds;
})(typeof globalThis !== "undefined" ? globalThis : this);
