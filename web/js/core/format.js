/* ==========================================================================
   format.js — числовое форматирование (перенос Fmt из Assets/Scripts/Core/Models.cs)
   ========================================================================== */
(function (root) {
  "use strict";

  var Fmt = {};

  /** 1234567 -> "1 234 567" — как toLocaleString('ru-RU') в веб-версии. */
  Fmt.groupDigits = function (intStr) {
    var negative = intStr.charAt(0) === "-";
    var digits = negative ? intStr.slice(1) : intStr;
    var out = "";
    var count = 0;
    for (var i = digits.length - 1; i >= 0; i--) {
      out = digits.charAt(i) + out;
      count++;
      if (count % 3 === 0 && i > 0) out = " " + out;
    }
    return negative ? "-" + out : out;
  };

  function round0(n) {
    // формат C# "0" — округление до целого (для отрицательных берём модуль)
    return (n < 0 ? "-" : "") + Fmt.groupDigits(String(Math.round(Math.abs(n))));
  }

  function fixed(n, digits) {
    return n.toFixed(digits);
  }

  /** $1.2K / $42.50 / $4200 — компактно, для плашек. */
  Fmt.dollars = function (n) {
    n = Number(n) || 0;
    if (n >= 10000) return "$" + fixed(n / 1000, 1) + "K";
    if (n < 100) return "$" + fixed(n, 2);
    return "$" + round0(n);
  };

  /** $1 234,50 — полная сумма с разделителями. */
  Fmt.dollarsFull = function (n) {
    n = Number(n) || 0;
    var abs = Math.abs(n).toFixed(2);
    var dot = abs.indexOf(".");
    var whole = dot >= 0 ? abs.slice(0, dot) : abs;
    var frac = dot >= 0 ? abs.slice(dot + 1) : "00";
    return (n < 0 ? "-$" : "$") + Fmt.groupDigits(whole) + "," + frac;
  };

  /** Крипта: очень маленькие суммы уходят в экспоненту, как в Unity-версии. */
  Fmt.crypto = function (n) {
    n = Number(n) || 0;
    var a = Math.abs(n);
    if (a < 1e-9) return "0";
    if (a < 0.000001) return exp2(n);
    if (a < 0.01) return fixed(n, 6);
    if (a < 1) return fixed(n, 4);
    return fixed(n, 3);
  };

  function exp2(n) {
    var s = n.toExponential(2);           // "1.80e-8"
    var parts = s.split("e");
    var exp = parseInt(parts[1], 10);
    var sign = exp < 0 ? "-" : "+";
    var digits = String(Math.abs(exp));
    if (digits.length < 2) digits = "0" + digits;
    return parts[0] + "e" + sign + digits;
  }

  /** $67 400 — курс монеты. */
  Fmt.price = function (n) {
    n = Number(n) || 0;
    if (n > 0 && n < 1) return "$" + fixed(n, 4);
    return "$" + round0(n);
  };

  /** 1 234 567 — целое с разделителями. */
  Fmt.int = function (n) {
    return round0(Number(n) || 0);
  };

  /** Проценты: 0.045 -> "4.5%". */
  Fmt.percent = function (n, digits) {
    return fixed((Number(n) || 0) * 100, digits === undefined ? 0 : digits) + "%";
  };

  root.CH = root.CH || {};
  root.CH.Fmt = Fmt;
})(typeof globalThis !== "undefined" ? globalThis : this);
