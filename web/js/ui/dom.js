/* ==========================================================================
   dom.js — крошечные помощники для сборки интерфейса + общий тикер.

   В Unity-версии весь UI строится кодом (uGUI, без префабов). В браузере
   придерживаемся того же принципа: никаких шаблонов в index.html, только
   функции, которые создают элементы.
   ========================================================================== */
(function (root) {
  "use strict";

  var CH = root.CH = root.CH || {};
  var doc = root.document;

  /** el("div", {cls: "card", text: "привет"}, child1, child2) */
  function el(tag, props) {
    var node = doc.createElement(tag);
    props = props || {};
    if (props.cls) node.className = props.cls;
    if (props.text !== undefined && props.text !== null) node.textContent = String(props.text);
    if (props.html !== undefined) node.innerHTML = props.html;
    if (props.title) node.title = props.title;
    if (props.style) {
      Object.keys(props.style).forEach(function (k) {
        node.style.setProperty(k, props.style[k]);
      });
    }
    if (props.attrs) {
      Object.keys(props.attrs).forEach(function (k) { node.setAttribute(k, props.attrs[k]); });
    }
    if (props.on) {
      Object.keys(props.on).forEach(function (k) { node.addEventListener(k, props.on[k]); });
    }
    for (var i = 2; i < arguments.length; i++) add(node, arguments[i]);
    return node;
  }

  function add(parent, child) {
    if (child === null || child === undefined || child === false) return parent;
    if (Array.isArray(child)) {
      child.forEach(function (c) { add(parent, c); });
      return parent;
    }
    if (typeof child === "string" || typeof child === "number") parent.appendChild(doc.createTextNode(String(child)));
    else parent.appendChild(child);
    return parent;
  }

  function clear(node) {
    if (!node) return node;
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function frag() {
    var children = Array.prototype.slice.call(arguments);
    var f = doc.createDocumentFragment();
    children.forEach(function (c) { add(f, c); });
    return f;
  }

  function q(sel, from) { return (from || doc).querySelector(sel); }

  /* ------------------------------- ТИКЕР ---------------------------------- */
  /* Один requestAnimationFrame на всю игру: и Game.tick, и анимации виджетов. */
  var Ticker = {
    _subs: [],
    _running: false,
    add: function (fn) { if (this._subs.indexOf(fn) < 0) this._subs.push(fn); },
    remove: function (fn) {
      var i = this._subs.indexOf(fn);
      if (i >= 0) this._subs.splice(i, 1);
    },
    start: function () {
      if (this._running) return;
      this._running = true;
      var self = this;
      var last = performance.now();
      function frame(now) {
        var dt = Math.min((now - last) / 1000, 0.25);   // защита от «прыжков» после сворачивания вкладки
        last = now;
        self._subs.slice().forEach(function (fn) {
          try { fn(dt, now); } catch (e) { console.error("[ticker]", e); }
        });
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
  };

  CH.Dom = {
    el: el, add: add, clear: clear, frag: frag, q: q,
    text: function (tag, cls, text) { return el(tag, { cls: cls, text: text }); },
    /** Подписка на событие с автоматической отпиской. */
    on: function (node, type, fn) {
      node.addEventListener(type, fn);
      return function () { node.removeEventListener(type, fn); };
    },
    /** Прячет элемент, если условие ложно. */
    show: function (node, visible) {
      if (!node) return node;
      node.classList.toggle("hidden", !visible);
      return node;
    }
  };
  CH.Ticker = Ticker;
})(typeof globalThis !== "undefined" ? globalThis : this);
