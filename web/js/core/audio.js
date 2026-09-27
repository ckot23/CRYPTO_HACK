/* ==========================================================================
   audio.js — весь звук синтезируется кодом, как в Unity-версии (Core/Sfx.cs).
   Никаких внешних mp3/wav: только осцилляторы Web Audio API.
   ========================================================================== */
(function (root) {
  "use strict";

  var CH = root.CH = root.CH || {};

  var ctx = null;
  var unavailable = false;
  var Sfx = {
    enabled: true,
    master: 0.55,
    /** Контекст создаём лениво: браузеры режут звук до первого действия игрока. */
    unlock: function () {
      var c = context();
      if (c && c.state === "suspended" && c.resume) c.resume();
    },
    isUnlocked: function () { return !!ctx && ctx.state === "running"; }
  };

  function context() {
    if (ctx || unavailable) return ctx;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) { unavailable = true; return null; }
    try {
      ctx = new AC();
    } catch (e) {
      unavailable = true;
      return null;
    }
    return ctx;
  }

  function beep(freq, dur, wave, vol, delay) {
    if (!Sfx.enabled) return;
    var c = context();
    if (!c) return;
    if (c.state === "suspended" && c.resume) c.resume();

    var t0 = c.currentTime + (delay || 0);
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = wave || "square";
    osc.frequency.setValueAtTime(Math.max(freq, 1), t0);

    var amp = Math.max(0, Math.min(1, (vol === undefined ? 0.3 : vol))) * Sfx.master;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(amp, t0 + 0.005);            // без щелчка на старте
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(dur, 0.01));

    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + Math.max(dur, 0.01) + 0.02);
  }

  Sfx.beep = beep;
  Sfx.beepSquare = function (f, d, v) { beep(f, d, "square", v, 0); };
  Sfx.beepSine = function (f, d, v) { beep(f, d, "sine", v, 0); };
  Sfx.beepSaw = function (f, d, v) { beep(f, d, "sawtooth", v, 0); };

  /* ---------------------- «фирменные» звуки интерфейса -------------------- */
  Sfx.uiClick = function () { beep(550, 0.05, "sine", 0.25, 0); };

  Sfx.uiOpen = function () {
    beep(520, 0.05, "square", 0.05, 0);
    beep(760, 0.06, "square", 0.04, 0.05);
  };

  Sfx.uiOk = function () { beep(700, 0.03, "sine", 0.18, 0); };

  Sfx.hackSuccess = function () {
    beep(660, 0.10, "square", 0.35, 0);
    beep(880, 0.12, "square", 0.35, 0.12);
    beep(1320, 0.18, "square", 0.35, 0.24);
  };

  Sfx.hackFail = function () { beep(180, 0.25, "sawtooth", 0.35, 0); };

  Sfx.levelUp = function () {
    beep(523, 0.12, "square", 0.35, 0);
    beep(659, 0.12, "square", 0.35, 0.13);
    beep(784, 0.20, "square", 0.35, 0.26);
  };

  Sfx.bootLine = function (index) { beep(300 + index * 90, 0.05, "square", 0.18, 0); };

  Sfx.buy = function () {
    beep(600, 0.08, "square", 0.35, 0);
    beep(900, 0.10, "square", 0.35, 0.10);
  };

  Sfx.trade = function () { beep(760, 0.07, "sine", 0.3, 0); };

  /** Щелчок питания и раскрутка вентиляторов. */
  Sfx.powerOn = function () {
    beep(90, 0.06, "square", 0.35, 0);        // реле
    beep(55, 0.5, "sawtooth", 0.06, 0.12);    // гул кулеров
    beep(180, 0.09, "square", 0.12, 0.2);     // тест динамика
    beep(1200, 0.04, "square", 0.1, 0.32);
    beep(1600, 0.05, "square", 0.1, 0.4);
  };

  CH.Sfx = Sfx;
})(typeof globalThis !== "undefined" ? globalThis : this);
