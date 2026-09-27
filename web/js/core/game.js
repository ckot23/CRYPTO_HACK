/* ==========================================================================
   game.js — состояние и экономика игры (перенос Core/Game.cs).

   В Unity это обычный C#-класс с событиями (Action), который тикает GameBoot.
   Здесь ровно то же: класс Game с крошечным эмиттером, а тикает его main.js
   через requestAnimationFrame.
   ========================================================================== */
(function (root) {
  "use strict";

  var CH = root.CH = root.CH || {};
  var Fmt = CH.Fmt;

  /* --------------------------- Хранилище сейва ---------------------------- */
  var Storage = {
    key: "cryptohack_save.json",
    mem: {},
    get: function () {
      try {
        if (root.localStorage) return root.localStorage.getItem(Storage.key);
      } catch (e) { /* приватный режим — молча уходим в память */ }
      return Object.prototype.hasOwnProperty.call(Storage.mem, Storage.key) ? Storage.mem[Storage.key] : null;
    },
    set: function (text) {
      try {
        if (root.localStorage) { root.localStorage.setItem(Storage.key, text); return; }
      } catch (e) { /* см. выше */ }
      Storage.mem[Storage.key] = text;
    },
    remove: function () {
      try { if (root.localStorage) root.localStorage.removeItem(Storage.key); } catch (e) { /* ок */ }
      delete Storage.mem[Storage.key];
    }
  };

  /* ------------------------------- Эмиттер -------------------------------- */
  function Emitter() { this._handlers = {}; }
  Emitter.prototype.on = function (type, fn) {
    (this._handlers[type] = this._handlers[type] || []).push(fn);
    return fn;
  };
  Emitter.prototype.off = function (type, fn) {
    var list = this._handlers[type];
    if (!list) return;
    var i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  };
  Emitter.prototype.emit = function (type) {
    var args = Array.prototype.slice.call(arguments, 1);
    var list = this._handlers[type];
    if (!list || !list.length) return;
    list.slice().forEach(function (fn) {
      try { fn.apply(null, args); } catch (e) { console.error("[game] обработчик " + type, e); }
    });
  };

  /* -------------------------------- Игра ---------------------------------- */
  var MINER_BASE_RATE = { BTC: 0.000000018, ETH: 0.00000036, XMR: 0.0000084, SOL: 0.0000062 };
  var MINER_EFF = [1, 1.5, 2.2, 3.2, 4.5, 6];
  var HACK_REWARD_BONUS = [0, 0.05, 0.1, 0.2, 0.35, 0.5];
  var STEALTH_FEE = [0.05, 0.04, 0.03, 0.02, 0];
  var STEALTH_XP = [0, 0.1, 0.2, 0.35, 0.5];
  var UPGRADE_IDS = ["hackSpeed", "minerEff", "codeLib", "stealth"];

  function Game(data) {
    Emitter.call(this);
    this.Data = data || CH.GameData.load();

    /* ---- экономика ---- */
    this.MINER_BASE_RATE = MINER_BASE_RATE;
    this.MINER_EFF = MINER_EFF;
    this.HACK_REWARD_BONUS = HACK_REWARD_BONUS;
    this.STEALTH_FEE = STEALTH_FEE;
    this.STEALTH_XP = STEALTH_XP;
    this.PRICE_TICK_SEC = 2.5;
    this.HISTORY_LEN = 40;
    this.MINER_INSTALL_BASE = 120;
    this.MINER_INSTALL_STEP = 80;
    this.LESSON_STIPEND = 40;
    this.SAVE_VERSION = 1;
    this.SAVE_FILE = Storage.key;

    /* ---- состояние игрока ---- */
    this.dollars = 150;
    this.crypto = {};
    this.xp = 0;
    this.level = 1;
    this.completedMissions = [];
    this.miners = [];
    this.upgrades = {};
    this.completedLessons = [];
    this.totalHacked = 0;
    this.totalEarnedDollars = 0;
    this.totalTrades = 0;

    /* ---- игрок ---- */
    this.login = "";             // ник, который вводят на экране приветствия
    this.tutorial = this.makeTutorial();
    this.contracts = [];         // [{n, tier, seed}] — сгенерированные цели

    /* ---- настройки ---- */
    this.onboarded = false;      // показывалась ли новичку вводная
    this.soundOn = true;
    this.realPython = false;          // в браузере реальный Python — опция (Pyodide)
    this.selectedMission = 1;

    /* ---- рынок ---- */
    this.prices = {};
    this.history = {};

    this.hasSave = false;

    this._priceTimer = 0;
    this._mineTimer = 0;
    this._saveTimer = 0;
    this._dirty = false;
    this.rng = Math.random;
  }
  Game.prototype = Object.create(Emitter.prototype);
  Game.prototype.constructor = Game;

  /* ======================= ИНИЦИАЛИЗАЦИЯ ================================= */
  Game.prototype.init = function () {
    this.initState();
    this.initMarket();
    this.loadSave();
    return this;
  };

  Game.prototype.initState = function () {
    var self = this;
    this.crypto = {};
    this.upgrades = {};
    this.Data.cryptos.forEach(function (c) { self.crypto[c.id] = 0; });
    UPGRADE_IDS.forEach(function (id) { self.upgrades[id] = 0; });
  };

  Game.prototype.initMarket = function () {
    var self = this;
    this.prices = {};
    this.history = {};
    this.Data.cryptos.forEach(function (c) {
      self.prices[c.id] = c.basePrice;
      var hist = [];
      for (var k = 0; k < 30; k++) hist.push(c.basePrice * (1 + (self.rng() - 0.5) * 0.02));
      self.history[c.id] = hist;
    });
  };

  /* ============================= ТАКТЫ =================================== */
  Game.prototype.tick = function (dt) {
    if (!(dt > 0)) return;
    this._priceTimer += dt;
    if (this._priceTimer >= this.PRICE_TICK_SEC) {
      this._priceTimer -= this.PRICE_TICK_SEC;
      this.tickPrices();
    }
    this._mineTimer += dt;
    if (this._mineTimer >= 1) {
      this._mineTimer -= 1;
      this.tickMiners();
    }
    this._saveTimer += dt;
    if (this._dirty && this._saveTimer >= 20) {   // автосейв раз в 20 секунд
      this._saveTimer = 0;
      this.save();
    }
  };

  Game.prototype.tickPrices = function () {
    var self = this;
    var now = (root.performance && root.performance.now ? root.performance.now() : Date.now()) / 1000;
    this.Data.cryptos.forEach(function (c) {
      var drift = (self.rng() - 0.5) * 2 * c.volatility + Math.sin(now / 60 + c.basePrice) * 0.002;
      var price = clamp(self.prices[c.id] * (1 + drift), c.basePrice * 0.5, c.basePrice * 2);
      self.prices[c.id] = price;
      var hist = self.history[c.id] || (self.history[c.id] = []);
      hist.push(price);
      while (hist.length > self.HISTORY_LEN) hist.shift();
    });
    this.emit("prices");
  };

  Game.prototype.tickMiners = function () {
    if (!this.miners.length) return;
    var self = this;
    var eff = this.minerEffMultNow();
    this.miners.forEach(function (m) {
      var rate = MINER_BASE_RATE[m.crypto] || 0;
      var gain = rate * eff;
      self.crypto[m.crypto] = self.getCrypto(m.crypto) + gain;
      m.earned += gain;
    });
    this._dirty = true;
    this.emit("state");
  };

  /* ========================== ОПЫТ И УРОВНИ ============================== */
  Game.prototype.xpForLevel = function (lvl) { return lvl * 300; };

  Game.prototype.xpProgress = function () {
    return clamp(this.xp / this.xpForLevel(this.level), 0, 1);
  };

  Game.prototype.addXp = function (amount) {
    var bonus = 1 + STEALTH_XP[clamp(this.upgradeLevel("stealth"), 0, STEALTH_XP.length - 1)];
    this.xp += Math.round(amount * bonus);

    var leveled = false;
    while (this.xp >= this.xpForLevel(this.level)) {
      this.xp -= this.xpForLevel(this.level);
      this.level++;
      leveled = true;
    }

    if (leveled) {
      var unlocked = this.cryptoForLevel(this.level);
      var text = unlocked
        ? "Разблокирована монета " + unlocked.name + " (" + unlocked.id + ")!"
        : "Открыты новые возможности.";
      this.notify("Уровень " + this.level + "!", text, "gold");
      this.emit("levelup", this.level);
      if (this.soundOn) CH.Sfx.levelUp();
    }
    this.emit("state");
    this.save();
  };

  Game.prototype.cryptoForLevel = function (lvl) {
    return this.Data.cryptos.filter(function (c) { return c.unlockLevel === lvl; })[0] || null;
  };

  /* ============================= МИССИИ ================================== */
  /** Обучающая миссия — единственная «ручная» цель в игре (из gamedata.json). */
  Game.prototype.makeTutorial = function () {
    var src = (this.Data.missions && this.Data.missions[0]) || {};
    var m = new CH.Mission(src);            // копия с методами (requirementsText и др.)
    m.tutorial = true;
    m.difficulty = "ОБУЧЕНИЕ";
    m.tierAccent = "#6cd8f2";
    m.title = "ОБУЧЕНИЕ · " + (m.title || "Первый скан");
    return m;
  };

  /** Все доступные цели: обучение + сгенерированные контракты. */
  Game.prototype.missions = function () {
    var self = this;
    return [this.tutorial].concat(this.contracts.map(function (c) { return self.contractMission(c); }));
  };

  /** Восстановить объект миссии из компактной записи сейва. */
  Game.prototype.contractMission = function (record) {
    if (record.boss) {
      if (!record.mission) record.mission = CH.Bosses.build(record.boss, record.seed);
      return record.mission;
    }
    if (!record.mission) {
      record.mission = CH.Generator.generate({
        index: record.n,
        tier: record.tier,
        seed: record.seed,
        contractsDone: record.n - 1,
        codeLib: this.upgradeLevel("codeLib")
      });
    }
    return record.mission;
  };

  Game.prototype.getMission = function (id) {
    id = Number(id);
    if (this.tutorial && this.tutorial.id === id) return this.tutorial;
    var boss = CH.Bosses.byId(id);
    if (boss) return this.contractMission({ n: 0, tier: "expert", seed: boss.id * 7919, boss: boss.index });
    for (var i = 0; i < this.contracts.length; i++) {
      var m = this.contractMission(this.contracts[i]);
      if (m.id === id) return m;
    }
    return this.Data.getMission(id);          // на случай старых сейвов
  };

  /** Сколько контрактов игрок уже закрыл (без обучения). */
  Game.prototype.contractsDone = function () {
    var self = this;
    return this.contracts.filter(function (c) { return self.isMissionCompleted(c.mission.id); }).length;
  };

  /** Последний сгенерированный, но ещё не взломанный контракт. */
  Game.prototype.activeContract = function () {
    for (var i = this.contracts.length - 1; i >= 0; i--) {
      var m = this.contractMission(this.contracts[i]);
      if (!this.isMissionCompleted(m.id)) return m;
    }
    return null;
  };

  Game.prototype.tutorialDone = function () {
    return this.isMissionCompleted(this.tutorial.id);
  };

  /** Доступна ли сложность: уровень + библиотека кода. */
  Game.prototype.tierUnlocked = function (tierKey) {
    var t = CH.Generator.TIER_BY_KEY[tierKey];
    if (!t) return false;
    return this.level >= t.minLevel && this.upgradeLevel("codeLib") >= t.codeLib;
  };

  Game.prototype.tierRequirement = function (tierKey) {
    var t = CH.Generator.TIER_BY_KEY[tierKey];
    if (!t) return "";
    var parts = [];
    if (this.level < t.minLevel) parts.push("уровень " + t.minLevel);
    if (this.upgradeLevel("codeLib") < t.codeLib) parts.push("библиотека кода ур. " + t.codeLib);
    return parts.join(" · ");
  };

  /**
   * Сгенерировать новый контракт выбранной сложности.
   * Возвращает миссию или null, если сложность ещё закрыта.
   */
  Game.prototype.createContract = function (tierKey, seedOverride) {
    if (!this.tierUnlocked(tierKey)) return null;
    if (!this.tutorialDone()) return null;        // сначала обучение
    var n = this.contracts.length + 1;
    var seed = seedOverride === undefined
      ? Math.floor(Math.random() * 0x7fffffff)
      : (seedOverride | 0);
    var record = { n: n, tier: tierKey, seed: seed };
    this.contracts.push(record);
    var mission = this.contractMission(record);
    this.selectedMission = mission.id;
    this.emit("state");
    this.save();
    return mission;
  };

  /** Следующий босс и готовность к бою (см. bosses.js). */
  Game.prototype.bossStatus = function () {
    return CH.Bosses.availability(this);
  };

  /** Принять вызов босса: он встаёт в очередь контрактов как особая цель. */
  Game.prototype.acceptBoss = function () {
    var status = this.bossStatus();
    if (!status.ready) return null;

    var boss = status.boss;
    var record = { n: this.contracts.length + 1, tier: "expert", seed: boss.id * 7919, boss: boss.index };
    var existing = this.contracts.filter(function (r) { return r.boss === boss.index; })[0];
    if (existing) {
      var already = this.contractMission(existing);
      this.selectedMission = already.id;
      return already;
    }

    this.contracts.push(record);
    var mission = this.contractMission(record);
    this.selectedMission = mission.id;
    this.emit("state");
    this.save();
    return mission;
  };

  Game.prototype.bossesDefeated = function () {
    return CH.Bosses.defeatedCount(this);
  };

  Game.prototype.bossAvailable = function () {
    return this.bossStatus().ready;
  };

  Game.prototype.missionUnlocked = function (m) {
    if (!m) return false;
    if (m.tutorial) return true;
    return this.level >= m.requiredLevel && this.upgradeLevel("codeLib") >= m.requiredCodeLib;
  };

  Game.prototype.isMissionCompleted = function (id) {
    return this.completedMissions.indexOf(Number(id)) >= 0;
  };

  Game.prototype.hackSuccess = function (m, stars) {
    var bonus = 1 + HACK_REWARD_BONUS[clamp(this.upgradeLevel("hackSpeed"), 0, HACK_REWARD_BONUS.length - 1)];
    this.crypto[m.rewardCrypto] = this.getCrypto(m.rewardCrypto) + m.rewardAmount * bonus;
    this.dollars += m.rewardDollars;
    this.totalEarnedDollars += m.rewardDollars;
    this.totalHacked++;
    if (!this.isMissionCompleted(m.id)) this.completedMissions.push(m.id);

    this.notify("Взлом успешен!",
      "+" + Fmt.crypto(m.rewardAmount * bonus) + " " + m.rewardCrypto
      + " · +" + Fmt.dollars(m.rewardDollars) + " · +" + m.rewardXp + " XP", "ok");

    this.emit("mission", m, stars || 0);
    this.addXp(m.rewardXp);

    // боссы — отдельная строка в истории
    if (m.boss) {
      this.notify("БОСС ПОВЕРЖЕН: " + m.bossName, "Награда в тройном размере. Осталось боссов: " +
        (CH.Bosses.list.length - this.bossesDefeated()), "gold");
      if (this.bossesDefeated() >= CH.Bosses.list.length) {
        this.notify("ТЫ — ЛЕГЕНДА ДАРКНЕТА!",
          "Повержены все боссы: ГИДРА, ЧЁРНЫЙ АРХИВ, СОВЕТ ДЕВЯТИ и ТИТАН. Сеть твоя.", "gold");
      }
      if (this.soundOn) CH.Sfx.levelUp();
    } else {
      // вехи за длинную серию контрактов
      var done = this.contractsDone();
      if (m.generated && done > 0 && done % 5 === 0) {
        this.notify("СЕРИЯ " + done, "Пять контрактов закрыто. Сложность можно поднять — награда выше.", "gold");
      }
      // и весть о том, что открылся босс
      var status = this.bossStatus();
      var alreadyTaken = this.contracts.some(function (r) { return r.boss === status.boss.index; });
      if (status.ready && !alreadyTaken) {
        this.notify("БОСС ЖДЁТ ВЫЗОВА: " + status.boss.name,
          "Открой хак-терминал и прими вызов — награда в разы выше обычной.", "err");
      }
    }
    this.save();
  };

  /* ============================= МАЙНЕРЫ ================================= */
  Game.prototype.minerInstallCost = function () {
    return this.MINER_INSTALL_BASE + this.miners.length * this.MINER_INSTALL_STEP;
  };

  Game.prototype.minerEffMultNow = function () {
    return MINER_EFF[clamp(this.upgradeLevel("minerEff"), 0, MINER_EFF.length - 1)];
  };

  Game.prototype.minersOn = function (missionId) {
    return this.miners.some(function (m) { return m.missionId === missionId; });
  };

  Game.prototype.installMiner = function (missionId, cryptoId) {
    var cost = this.minerInstallCost();
    if (this.dollars < cost) {
      this.notify("Нет денег", "Продай крипту на бирже.", "err");
      return false;
    }
    var m = this.getMission(missionId);
    if (!m) return false;

    this.dollars -= cost;
    this.miners.push({
      id: "rig_" + Date.now().toString(36) + "_" + this.miners.length,
      missionId: missionId,
      pcName: m.targetName,
      ip: m.targetIp,
      crypto: cryptoId,
      earned: 0
    });

    this.notify("Майнер установлен", m.targetName + " теперь майнит " + cryptoId, "ok");
    if (this.soundOn) CH.Sfx.beepSquare(500, 0.08, 0.3);
    this.emit("miners");
    this.emit("state");
    this.addXp(30);
    this.save();
    return true;
  };

  Game.prototype.removeMiner = function (minerId) {
    this.miners = this.miners.filter(function (m) { return m.id !== minerId; });
    this.emit("miners");
    this.emit("state");
    this.save();
  };

  /** Пассивный доход всех майнеров в минуту (в долларах по текущим курсам). */
  Game.prototype.minerIncomePerMin = function () {
    var self = this;
    var eff = this.minerEffMultNow();
    var total = 0;
    this.miners.forEach(function (m) {
      var rate = MINER_BASE_RATE[m.crypto] || 0;
      total += rate * eff * 60 * self.getPrice(m.crypto);
    });
    return total;
  };

  /* ============================== БИРЖА ================================== */
  Game.prototype.fee = function () {
    return STEALTH_FEE[clamp(this.upgradeLevel("stealth"), 0, STEALTH_FEE.length - 1)];
  };

  Game.prototype.cryptoValue = function (cid) {
    return this.getCrypto(cid) * this.getPrice(cid);
  };

  Game.prototype.portfolioValue = function () {
    var self = this;
    return this.Data.cryptos.reduce(function (sum, c) { return sum + self.cryptoValue(c.id); }, 0);
  };

  Game.prototype.cryptoUnlocked = function (cid) {
    var c = this.Data.getCrypto(cid);
    return !!c && this.level >= c.unlockLevel;
  };

  Game.prototype.trade = function (cid, usd, isBuy) {
    usd = Number(usd) || 0;
    if (usd <= 0 || !this.cryptoUnlocked(cid)) return false;
    var price = this.getPrice(cid);
    if (price <= 0) return false;

    if (isBuy) {
      if (usd > this.dollars) return false;
      var got = (usd / price) * (1 - this.fee());
      this.dollars -= usd;
      this.crypto[cid] = this.getCrypto(cid) + got;
      this.notify("Покупка", "Куплено " + Fmt.crypto(got) + " " + cid + " за " + Fmt.dollarsFull(usd), "info");
    } else {
      var need = usd / price;
      if (need > this.getCrypto(cid)) return false;
      var gotUsd = usd * (1 - this.fee());
      this.dollars += gotUsd;
      this.crypto[cid] = this.getCrypto(cid) - need;
      this.totalEarnedDollars += gotUsd;
      this.notify("Продажа", "Продано " + Fmt.crypto(need) + " " + cid + " → " + Fmt.dollarsFull(gotUsd), "ok");
    }

    this.totalTrades++;
    if (this.soundOn) CH.Sfx.trade();
    this.emit("state");
    this.addXp(10);
    this.save();
    return true;
  };

  /* ============================ АПГРЕЙДЫ ================================= */
  Game.prototype.upgradeLevel = function (id) {
    return this.upgrades[id] || 0;
  };

  Game.prototype.upgradeCost = function (id) {
    var u = this.Data.getUpgrade(id);
    if (!u) return -1;
    return u.costForLevel(this.upgradeLevel(id));
  };

  Game.prototype.buyUpgrade = function (id) {
    var u = this.Data.getUpgrade(id);
    if (!u) return false;
    var lvl = this.upgradeLevel(id);
    var cost = u.costForLevel(lvl);
    if (cost < 0) return false;
    if (this.dollars < cost) {
      this.notify("Не хватает долларов", "Нужно " + Fmt.dollarsFull(cost), "err");
      return false;
    }

    this.dollars -= cost;
    this.upgrades[id] = lvl + 1;
    this.notify("Апгрейд куплен", u.name + " → уровень " + (lvl + 1), "gold");
    if (this.soundOn) CH.Sfx.buy();
    if (id === "codeLib") {
      this.notify("Новые функции!", "Открыты: " + u.effectText(lvl + 1), "info");
    }
    this.emit("state");
    this.save();
    return true;
  };

  /* ============================== УРОКИ ================================== */
  Game.prototype.isLessonCompleted = function (id) {
    return this.completedLessons.indexOf(Number(id)) >= 0;
  };

  Game.prototype.completeLesson = function (id) {
    if (this.isLessonCompleted(id)) return false;
    var l = this.Data.getLesson(id);
    if (!l) return false;

    this.completedLessons.push(Number(id));
    this.dollars += this.LESSON_STIPEND;
    this.notify("Урок пройден!", "+" + l.xp + " XP · +$" + this.LESSON_STIPEND + " стипендия", "ok");
    if (this.soundOn) CH.Sfx.uiOk();
    this.addXp(l.xp);
    this.emit("state");
    this.save();
    return true;
  };

  /* =========================== ВСПОМОГАТЕЛЬНОЕ =========================== */
  Game.prototype.notify = function (title, text, kind) {
    this.emit("toast", title, text, kind || "info");
  };

  Game.prototype.getCrypto = function (id) {
    var v = this.crypto[id];
    return typeof v === "number" && isFinite(v) ? v : 0;
  };

  Game.prototype.getPrice = function (id) {
    var v = this.prices[id];
    return typeof v === "number" && isFinite(v) ? v : 0;
  };

  Game.prototype.pythonModeText = function () {
    if (this.realPython && CH.PyRunner && CH.PyRunner.available) {
      return "РЕАЛЬНЫЙ PYTHON (" + CH.PyRunner.describe() + ")";
    }
    if (this.realPython && CH.PyRunner && CH.PyRunner.status === "loading") {
      return "ЗАГРУЗКА PYTHON...";
    }
    return "СИМУЛЯТОР ТЕРМИНАЛА";
  };

  /** Суммарный капитал: доллары + крипта по текущим курсам. */
  Game.prototype.netWorth = function () {
    return this.dollars + this.portfolioValue();
  };

  /* ========================== СОХРАНЕНИЕ ================================= */
  Game.prototype.save = function () {
    try {
      var dto = {
        version: this.SAVE_VERSION,
        dollars: this.dollars,
        crypto: this.crypto,
        xp: this.xp,
        level: this.level,
        login: this.login,
        contracts: this.contracts.map(function (c) {
          return { n: c.n, tier: c.tier, seed: c.seed, boss: c.boss || 0 };
        }),
        bossSlain: this.completedMissions.slice(),
        completedMissions: this.completedMissions.slice(),
        miners: this.miners.map(function (m) {
          return { id: m.id, missionId: m.missionId, pcName: m.pcName, ip: m.ip, crypto: m.crypto, earned: m.earned };
        }),
        upgrades: this.upgrades,
        completedLessons: this.completedLessons.slice(),
        totalHacked: this.totalHacked,
        totalEarnedDollars: this.totalEarnedDollars,
        totalTrades: this.totalTrades,
        soundOn: this.soundOn,
        onboarded: this.onboarded,
        realPython: this.realPython,
        selectedMission: this.selectedMission,
        savedAt: new Date().toISOString()
      };
      Storage.set(JSON.stringify(dto));
      this.hasSave = true;
      this._dirty = false;
      return true;
    } catch (e) {
      console.warn("[game] не удалось сохранить: " + e.message);
      return false;
    }
  };

  Game.prototype.loadSave = function () {
    try {
      var text = Storage.get();
      if (!text) return false;
      var dto = JSON.parse(text);
      if (!dto) return false;

      if (typeof dto.dollars === "number") this.dollars = dto.dollars;
      if (typeof dto.xp === "number") this.xp = dto.xp;
      if (typeof dto.level === "number") this.level = Math.max(1, dto.level);
      if (typeof dto.soundOn === "boolean") this.soundOn = dto.soundOn;
      if (typeof dto.onboarded === "boolean") this.onboarded = dto.onboarded;
      if (typeof dto.login === "string") this.login = dto.login;
      // контракты всегда перечитываются из сейва (в старых сейвах их просто нет)
      this.contracts = Array.isArray(dto.contracts)
        ? dto.contracts.filter(function (c) { return c && c.tier; }).map(function (c) {
          return {
            n: Number(c.n) || 1, tier: String(c.tier), seed: Number(c.seed) | 0,
            boss: Number(c.boss) || 0
          };
        })
        : [];
      if (typeof dto.realPython === "boolean") this.realPython = dto.realPython;
      if (typeof dto.selectedMission === "number") this.selectedMission = dto.selectedMission;
      if (typeof dto.totalHacked === "number") this.totalHacked = dto.totalHacked;
      if (typeof dto.totalEarnedDollars === "number") this.totalEarnedDollars = dto.totalEarnedDollars;
      if (typeof dto.totalTrades === "number") this.totalTrades = dto.totalTrades;

      var self = this;
      if (dto.crypto) {
        Object.keys(dto.crypto).forEach(function (id) {
          if (Object.prototype.hasOwnProperty.call(self.crypto, id)) self.crypto[id] = Number(dto.crypto[id]) || 0;
        });
      }
      if (dto.upgrades) {
        Object.keys(dto.upgrades).forEach(function (id) {
          if (Object.prototype.hasOwnProperty.call(self.upgrades, id)) self.upgrades[id] = Number(dto.upgrades[id]) || 0;
        });
      }
      this.completedMissions = Array.isArray(dto.completedMissions) ? dto.completedMissions.map(Number) : [];
      this.completedLessons = Array.isArray(dto.completedLessons) ? dto.completedLessons.map(Number) : [];
      this.miners = Array.isArray(dto.miners) ? dto.miners.map(function (m) {
        return {
          id: String(m.id || "rig"),
          missionId: Number(m.missionId) || 0,
          pcName: String(m.pcName || "unknown-pc"),
          ip: String(m.ip || "0.0.0.0"),
          crypto: String(m.crypto || "BTC"),
          earned: Number(m.earned) || 0
        };
      }) : [];

      this.hasSave = true;
      this.emit("state");
      this.emit("prices");
      return true;
    } catch (e) {
      console.warn("[game] не удалось загрузить сохранение: " + e.message);
      return false;
    }
  };

  Game.prototype.resetProgress = function () {
    Storage.remove();
    this.dollars = 150;
    this.initState();
    this.xp = 0;
    this.level = 1;
    this.completedMissions = [];
    this.completedLessons = [];
    this.miners = [];
    this.totalHacked = 0;
    this.totalEarnedDollars = 0;
    this.totalTrades = 0;
    this.selectedMission = 1;
    this.hasSave = false;
    this.onboarded = false;
    this.login = "";
    this.contracts = [];        // боссы живут в completedMissions — тоже чистим
    this.initMarket();
    this.emit("state");
    this.emit("prices");
    this.emit("miners");
  };

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  Game.Storage = Storage;
  Game.UPGRADE_IDS = UPGRADE_IDS;
  CH.Emitter = Emitter;
  CH.Game = Game;
})(typeof globalThis !== "undefined" ? globalThis : this);
