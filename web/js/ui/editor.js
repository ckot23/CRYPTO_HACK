/* ==========================================================================
   editor.js — редактор Python-кода с подсветкой (перенос UI/CodeEditor.cs):
   Tab = 4 пробела, автоотступ после «:», Ctrl+Enter — запуск, подсветка
   ключевых слов, строк, чисел, комментариев и вызовов функций.
   Плюс хранилище кода миссий (в Unity это HackWindowView.SavedCode).
   ========================================================================== */
(function (root) {
  "use strict";

  var CH = root.CH = root.CH || {};
  var el = CH.Dom.el;

  var KEYWORDS = ["for", "while", "if", "elif", "else", "def", "return", "import", "from",
    "in", "and", "or", "not", "break", "continue", "pass", "global", "lambda", "try",
    "except", "finally", "with", "as", "class", "del", "yield"];
  var CONSTANTS = ["True", "False", "None"];
  var BUILTINS = ["print", "range", "len", "str", "int", "float", "bool", "list", "dict", "sum",
    "enumerate", "scan", "connect", "brute", "bypass", "decrypt", "extract", "drain",
    "install_miner", "wallets", "spoof", "quantum_brute", "ghost"];

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /** Подсветка одной строки — порт CodeEditor.Highlight. */
  function highlight(line) {
    if (!line) return "";
    var out = "";
    var i = 0;
    while (i < line.length) {
      var c = line.charAt(i);

      if (c === "#") {
        out += '<span class="tok-com">' + escapeHtml(line.slice(i)) + "</span>";
        break;
      }

      if (c === '"' || c === "'") {
        var j = i + 1;
        while (j < line.length) {
          if (line.charAt(j) === "\\") { j += 2; continue; }
          if (line.charAt(j) === c) { j++; break; }
          j++;
        }
        if (j > line.length) j = line.length;
        out += '<span class="tok-str">' + escapeHtml(line.slice(i, j)) + "</span>";
        i = j;
        continue;
      }

      if (/[0-9]/.test(c)) {
        var k = i;
        while (k < line.length && /[0-9.]/.test(line.charAt(k))) k++;
        out += '<span class="tok-num">' + escapeHtml(line.slice(i, k)) + "</span>";
        i = k;
        continue;
      }

      if (/[A-Za-z_\u0400-\u04FF]/.test(c)) {
        var m = i;
        while (m < line.length && /[A-Za-z0-9_\u0400-\u04FF]/.test(line.charAt(m))) m++;
        var word = line.slice(i, m);
        var cls = null;
        if (CONSTANTS.indexOf(word) >= 0) cls = "tok-con";
        else if (KEYWORDS.indexOf(word) >= 0) cls = "tok-kw";
        else if (BUILTINS.indexOf(word) >= 0) cls = "tok-blt";
        else if (line.charAt(m) === "(") cls = "tok-fn";
        out += cls ? '<span class="' + cls + '">' + escapeHtml(word) + "</span>" : escapeHtml(word);
        i = m;
        continue;
      }

      out += escapeHtml(c);
      i++;
    }
    return out;
  }

  /* ------------------- Хранилище кода по миссиям -------------------------- */
  var CodeStore = (function () {
    var KEY = "cryptohack_code.json";
    var mem = {};
    var loaded = false;

    function load() {
      if (loaded) return;
      loaded = true;
      try {
        var raw = root.localStorage && root.localStorage.getItem(KEY);
        if (raw) mem = JSON.parse(raw) || {};
      } catch (e) { mem = {}; }
    }
    return {
      get: function (missionId, fallback) {
        load();
        var code = mem[String(missionId)];
        return typeof code === "string" ? code : (fallback || "");
      },
      set: function (missionId, code) {
        load();
        mem[String(missionId)] = String(code);
        try {
          if (root.localStorage) root.localStorage.setItem(KEY, JSON.stringify(mem));
        } catch (e) { /* приватный режим — просто держим в памяти */ }
      },
      all: function () { load(); return mem; }
    };
  })();

  /* ------------------------------ Редактор -------------------------------- */
  function Editor(parent, opts) {
    opts = opts || {};
    this.gutterInner = el("div", { text: "1" });
    this.gutter = el("div", { cls: "gutter" }, this.gutterInner);
    this.code = el("code");
    this.pre = el("pre", { cls: "highlight" }, this.code);
    this.input = el("textarea", {
      cls: "input",
      attrs: { spellcheck: "false", autocapitalize: "off", autocomplete: "off", wrap: "off" }
    });
    this.node = el("div", { cls: "editor" }, this.gutter, el("div", { cls: "code-area" }, this.pre, this.input));
    this.onChanged = opts.onChanged || null;
    this.onRun = opts.onRun || null;
    this._lastText = null;

    if (parent) parent.appendChild(this.node);

    var self = this;
    this.input.addEventListener("input", function () { self._changed(); });
    this.input.addEventListener("scroll", function () { self._syncScroll(); });
    this.input.addEventListener("keydown", function (e) { self._onKeyDown(e); });
    this.input.addEventListener("focus", function () { self.node.classList.add("focused"); });
    this.input.addEventListener("blur", function () { self.node.classList.remove("focused"); });
    this.setText(opts.text || "", true);
  }

  Editor.prototype.getText = function () { return this.input.value; };

  Editor.prototype.setText = function (text, caretToEnd) {
    this.input.value = String(text === null || text === undefined ? "" : text);
    this._render();
    if (caretToEnd) this.input.selectionStart = this.input.selectionEnd = this.input.value.length;
    this._lastText = this.input.value;
    if (this.onChanged) this.onChanged(this.input.value);
  };

  Editor.prototype.focus = function () { this.input.focus(); };

  Editor.prototype._changed = function () {
    if (this.input.value === this._lastText) return;
    this._lastText = this.input.value;
    this._render();
    if (this.onChanged) this.onChanged(this.input.value);
  };

  Editor.prototype._render = function () {
    var text = this.input.value;
    var lines = text.split("\n");
    var html = lines.map(highlight).join("\n");
    // добавляем пустую строку, чтобы последний перевод строки не «схлопывался»
    this.code.innerHTML = html + "\n";
    var nums = "";
    for (var i = 1; i <= lines.length; i++) nums += i + (i < lines.length ? "\n" : "");
    this.gutterInner.textContent = nums + "\n";
    this._syncScroll();
  };

  Editor.prototype._syncScroll = function () {
    var left = this.input.scrollLeft;
    var top = this.input.scrollTop;
    this.pre.style.transform = "translate(" + (-left) + "px," + (-top) + "px)";
    this.gutterInner.style.transform = "translateY(" + (-top) + "px)";
  };

  Editor.prototype._replaceSelection = function (text, caretDelta) {
    var input = this.input;
    var start = input.selectionStart;
    var end = input.selectionEnd;
    input.value = input.value.slice(0, start) + text + input.value.slice(end);
    var caret = start + text.length + (caretDelta || 0);
    input.selectionStart = input.selectionEnd = caret;
    this._changed();
  };

  Editor.prototype._onKeyDown = function (e) {
    var input = this.input;

    if (e.key === "Tab") {
      e.preventDefault();
      this._replaceSelection("    ");
      return;
    }

    if (e.key === "Enter") {
      if ((e.ctrlKey || e.metaKey) && this.onRun) {
        e.preventDefault();
        this.onRun(this.getText());
        return;
      }
      // автоотступ: повторяем ведущие пробелы, +4 после «:»
      var upto = input.value.slice(0, input.selectionStart);
      var lineStart = upto.lastIndexOf("\n") + 1;
      var lineHead = upto.slice(lineStart);
      var indent = (/^\s*/.exec(lineHead) || [""])[0];
      var tail = input.value.slice(input.selectionEnd);
      if (/^\s*$/.test(tail.slice(0, tail.indexOf("\n") === -1 ? tail.length : tail.indexOf("\n")))
        && lineHead.trim().length > 0 && /:\s*$/.test(lineHead)) {
        indent += "    ";
      }
      e.preventDefault();
      this._replaceSelection("\n" + indent);
      return;
    }

    // горячие клавиши рабочего стола (1..7, Esc) не должны срабатывать в редакторе
    if (!e.ctrlKey && !e.metaKey && (e.key === "Escape" || /^[1-7]$/.test(e.key))) e.stopPropagation();
  };

  Editor.prototype.destroy = function () {
    if (this.node.parentNode) this.node.parentNode.removeChild(this.node);
  };

  CH.Editor = Editor;
  CH.CodeStore = CodeStore;
  CH.highlightPython = highlight;
  CH.escapeHtml = escapeHtml;
})(typeof globalThis !== "undefined" ? globalThis : this);
