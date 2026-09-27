/* ==========================================================================
   models.js — разбор контента игры (перенос GameData из Core/Models.cs).

   Источник данных — Assets/Resources/gamedata.json, обёрнутый в
   js/core/gamedata.js скриптом tools/web/sync-data.py.
   ========================================================================== */
(function (root) {
  "use strict";

  var CH = root.CH = root.CH || {};
  var Fmt = CH.Fmt;

  function str(s) { return s === null || s === undefined ? "" : String(s); }
  function num(n, def) { var v = Number(n); return isFinite(v) ? v : (def || 0); }
  function arr(a) { return Array.isArray(a) ? a : []; }

  /* ------------------------------ Монета ---------------------------------- */
  function CryptoInfo(d) {
    d = d || {};
    this.id = str(d.id);
    this.name = str(d.name) || this.id;
    this.fullName = str(d.fullName) || this.name;
    this.icon = str(d.icon) || (this.id ? this.id.charAt(0) : "?");
    this.color = str(d.color) || "#ffffff";
    this.basePrice = num(d.basePrice, 1);
    this.unlockLevel = num(d.unlockLevel, 1) > 0 ? num(d.unlockLevel, 1) : 1;
    this.desc = str(d.desc);
    this.volatility = num(d.volatility, 0.01) > 0 ? num(d.volatility, 0.01) : 0.01;
  }

  /* ------------------------------ Миссия ---------------------------------- */
  function Mission(d) {
    d = d || {};
    this.id = num(d.id, 0);
    this.title = str(d.title);
    this.targetName = str(d.targetName);
    this.targetIp = str(d.targetIp);
    this.os = str(d.os);
    this.security = num(d.security, 0);
    this.difficulty = str(d.difficulty);
    this.concept = str(d.concept);
    this.conceptDesc = str(d.conceptDesc);
    this.briefing = str(d.briefing);
    this.task = str(d.task);
    this.starterCode = str(d.starterCode);
    this.solution = str(d.solution);
    this.hints = arr(d.hints).map(str);
    this.requiredPatterns = arr(d.requiredPatterns).map(str);
    this.rewardCrypto = str(d.rewardCrypto) || "BTC";
    this.rewardAmount = num(d.rewardAmount, 0);
    this.rewardDollars = num(d.rewardDollars, 0);
    this.rewardXp = num(d.rewardXp, 0);
    this.requiredCodeLib = num(d.requiredCodeLib, 0);
    this.requiredLevel = num(d.requiredLevel, 1) > 0 ? num(d.requiredLevel, 1) : 1;
    this.theory = arr(d.theory).map(str);
  }

  Mission.prototype.rewardTitle = function () {
    return "+" + Fmt.crypto(this.rewardAmount) + " " + this.rewardCrypto;
  };

  /** Требования миссии по уровням: код-либа и уровень игрока. */
  Mission.prototype.requirementsText = function () {
    var parts = [];
    if (this.requiredLevel > 1) parts.push("уровень " + this.requiredLevel);
    if (this.requiredCodeLib > 0) parts.push("библиотека кода ур. " + this.requiredCodeLib);
    return parts.join(" · ");
  };

  /* ------------------------------ Апгрейд --------------------------------- */
  function UpgradeInfo(d) {
    d = d || {};
    this.id = str(d.id);
    this.name = str(d.name);
    this.desc = str(d.desc);
    this.icon = str(d.icon);
    this.maxLevel = num(d.maxLevel, 0);
    this.costs = arr(d.costs).map(function (c) { return num(c, 0); });
    this.effects = arr(d.effects).map(str);
  }

  /** Стоимость следующего уровня (-1, если уже максимум). */
  UpgradeInfo.prototype.costForLevel = function (level) {
    if (level >= this.maxLevel || level < 0 || level >= this.costs.length) return -1;
    return this.costs[level];
  };

  UpgradeInfo.prototype.effectText = function (level) {
    if (level < 0 || level >= this.effects.length) return "—";
    return this.effects[level];
  };

  /* ------------------------------- Урок ----------------------------------- */
  function Lesson(d) {
    d = d || {};
    this.id = num(d.id, 0);
    this.title = str(d.title);
    this.subtitle = str(d.subtitle);
    this.duration = str(d.duration);
    this.xp = num(d.xp, 0);
    this.content = arr(d.content).map(function (b) {
      return { heading: str(b && b.heading), text: str(b && b.text) };
    });
    this.quiz = arr(d.quiz).map(function (q) {
      return {
        q: str(q && q.q),
        options: arr(q && q.options).map(str),
        answer: num(q && q.answer, 0)
      };
    });
  }

  /* ---------------------------- Хранилище --------------------------------- */
  function GameData(raw) {
    this.cryptos = arr(raw && raw.cryptos).map(function (d) { return new CryptoInfo(d); });
    this.missions = arr(raw && raw.missions).map(function (d) { return new Mission(d); });
    this.upgrades = arr(raw && raw.upgrades).map(function (d) { return new UpgradeInfo(d); });
    this.lessons = arr(raw && raw.lessons).map(function (d) { return new Lesson(d); });
    this.quotes = arr(raw && raw.quotes).map(str).filter(function (q) { return q.length > 0; });
    this.loadError = "";
  }

  /** Данные подтягиваем из глобальной переменной, которую создал gamedata.js. */
  GameData.load = function (rawOverride) {
    var raw = rawOverride;
    if (!raw && typeof root.CRYPTO_HACK_DATA !== "undefined") raw = root.CRYPTO_HACK_DATA;
    if (!raw && typeof module !== "undefined" && module.exports) {
      try { raw = require("./gamedata.js"); } catch (e) { raw = null; }
    }
    if (!raw) {
      var d = new GameData({});
      d.loadError = "Не найден js/core/gamedata.js — запусти tools/web/sync-data.py";
      return d;
    }
    return new GameData(raw);
  };

  GameData.prototype.getCrypto = function (id) {
    return this.cryptos.filter(function (c) { return c.id === id; })[0] || null;
  };

  GameData.prototype.getMission = function (id) {
    return this.missions.filter(function (m) { return m.id === Number(id); })[0] || null;
  };

  GameData.prototype.getUpgrade = function (id) {
    return this.upgrades.filter(function (u) { return u.id === id; })[0] || null;
  };

  GameData.prototype.getLesson = function (id) {
    return this.lessons.filter(function (l) { return l.id === Number(id); })[0] || null;
  };

  CH.CryptoInfo = CryptoInfo;
  CH.Mission = Mission;
  CH.UpgradeInfo = UpgradeInfo;
  CH.Lesson = Lesson;
  CH.GameData = GameData;
})(typeof globalThis !== "undefined" ? globalThis : this);
