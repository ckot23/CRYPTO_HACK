/* ==========================================================================
   apps/profile.js — «ПРОФИЛЬ ХАКЕРА» (перенос ProfileWindowView.cs):
   уровень, капитал, статистика и 8 достижений.
   ========================================================================== */
(function (root) {
  "use strict";

  var CH = root.CH = root.CH || {};
  var UI = CH.UI;
  var el = CH.Dom.el;
  var Fmt = CH.Fmt;

  var ACHIEVEMENTS = [
    { name: "Первый взлом", desc: "Пройди обучение", check: function (g) { return g.tutorialDone(); } },
    { name: "Серийный хакер", desc: "Закрой 4 контракта", check: function (g) { return g.contractsDone() >= 4; } },
    { name: "Легенда даркнета", desc: "Закрой 10 контрактов", check: function (g) { return g.contractsDone() >= 10; } },
    { name: "Фермер", desc: "Установи первый майнер", check: function (g) { return g.miners.length >= 1; } },
    { name: "Магнат", desc: "Держи 4+ майнера", check: function (g) { return g.miners.length >= 4; } },
    { name: "Трейдер", desc: "Соверши 5 сделок", check: function (g) { return g.totalTrades >= 5; } },
    { name: "Студент", desc: "Пройди 3 урока Python", check: function (g) { return g.completedLessons.length >= 3; } },
    { name: "Кит", desc: "Капитал $10,000+", check: function (g) { return g.netWorth() >= 10000; } }
  ];

  function profileApp(game) {
    return {
      title: "ПРОФИЛЬ ХАКЕРА",
      accent: "#ffe600",
      width: 720,
      height: 600,
      build: function (body, win) {
        var signature = "";
        var holder = el("div", { cls: "col", style: { gap: "10px" } });
        body.appendChild(holder);

        function statusText() {
          if (game.level >= 5) return "ЛЕГЕНДА ДАРКНЕТА";
          if (game.level >= 3) return "ОПЫТНЫЙ ХАКЕР";
          return "СКРИПТ-КИДДИ";
        }

        function profileCard() {
          var xpBar = UI.bar("#00ff9d");
          xpBar.setValue(game.xpProgress());
          xpBar.style.width = "240px";

          return el("div", { cls: "profile-card" },
            el("div", { cls: "avatar", text: "⌁_" }),
            el("div", {},
              el("div", { cls: "b", style: { "font-size": "14px" }, text: game.displayName() }),
              el("div", { cls: "label", text: "статус: " + statusText() }),
              el("div", { style: { "margin-top": "10px" }, text: "" }, xpBar),
              el("div", { cls: "label", style: { "margin-top": "6px" }, text: game.xp + " / " + game.xpForLevel(game.level) + " XP" })
            ),
            el("div", { style: { "text-align": "right" } },
              el("div", { cls: "label", text: "КАПИТАЛ" }),
              el("div", { cls: "b", style: { color: "#ffe600", "font-size": "20px" }, text: Fmt.dollarsFull(game.netWorth()) }),
              el("div", { style: { color: "#00ff9d", "font-size": "10px" }, text: Fmt.dollars(game.minerIncomePerMin()) + "/мин майнинг" })
            )
          );
        }

        function statsGrid() {
          var cells = [
            { v: game.totalHacked, c: "ВЗЛОМОВ", color: "#00ff9d" },
            { v: game.miners.length, c: "МАЙНЕРОВ", color: "#00e5ff" },
            { v: game.totalTrades, c: "СДЕЛОК", color: "#ffe600" },
            { v: game.completedLessons.length, c: "УРОКОВ", color: "#ff2d78" }
          ];
          var grid = el("div", { cls: "stat-grid" });
          cells.forEach(function (cell) {
            grid.appendChild(el("div", { cls: "stat" },
              el("div", { cls: "v", style: { color: cell.color }, text: String(cell.v) }),
              el("div", { cls: "c", text: cell.c })
            ));
          });
          return grid;
        }

        function achievementsCard() {
          var state = ACHIEVEMENTS.map(function (a) { return a.check(game); });
          var done = state.filter(Boolean).length;

          var card = el("div", { cls: "card", style: { padding: "10px 12px", background: "var(--panel-deep)" } },
            el("div", { cls: "b", style: { color: "#00e5ff", "font-size": "12px" }, text: "ДОСТИЖЕНИЯ · " + done + "/" + ACHIEVEMENTS.length })
          );
          ACHIEVEMENTS.forEach(function (a, i) {
            card.appendChild(el("div", { cls: "ach" + (state[i] ? " done" : "") },
              el("div", { cls: "star", text: state[i] ? "★" : "☆" }),
              el("div", {},
                el("div", { cls: "name", text: a.name }),
                el("div", { cls: "desc", text: a.desc })
              )
            ));
          });
          return card;
        }

        function render() {
          var sig = game.level + "|" + game.xp + "|" + Math.floor(game.dollars) + "|" + game.totalHacked + "|" +
            game.miners.length + "|" + game.totalTrades + "|" + game.completedLessons.length + "|" +
            Math.floor(game.portfolioValue());
          if (sig === signature) return;
          signature = sig;

          CH.Dom.clear(holder);
          holder.appendChild(profileCard());
          holder.appendChild(statsGrid());
          holder.appendChild(achievementsCard());
        }

        var onState = function () { render(); };
        game.on("state", onState);
        game.on("prices", onState);
        win.onClose(function () { game.off("state", onState); game.off("prices", onState); });
        render();
      }
    };
  }

  CH.Apps = CH.Apps || {};
  CH.Apps.profile = profileApp;
})(typeof globalThis !== "undefined" ? globalThis : this);
