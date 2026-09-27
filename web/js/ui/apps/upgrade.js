/* ==========================================================================
   apps/upgrade.js — «ЧЁРНЫЙ РЫНОК» (перенос UpgradeWindowView.cs):
   четыре апгрейда по 4–5 уровней, каждый со своей полоской прогресса.
   ========================================================================== */
(function (root) {
  "use strict";

  var CH = root.CH = root.CH || {};
  var UI = CH.UI;
  var el = CH.Dom.el;
  var Fmt = CH.Fmt;

  function iconFor(id) {
    if (id === "hackSpeed") return "⚡";
    if (id === "minerEff") return "⚙";
    if (id === "codeLib") return "✎";
    if (id === "stealth") return "○";
    return "◆";
  }

  function upgradeApp(game) {
    return {
      title: "ЧЁРНЫЙ РЫНОК // АПГРЕЙДЫ",
      accent: "#ffb27a",
      width: 720,
      height: 560,
      build: function (body, win) {
        var signature = "";
        var balance = el("div", { cls: "card card--soft", style: { padding: "8px 10px", border: "1px solid rgba(255,212,121,0.45)", background: "rgba(255,212,121,0.05)" } });
        var cards = el("div", { cls: "col", style: { gap: "10px" } });
        body.appendChild(el("div", { cls: "col", style: { gap: "10px" } }, balance, cards));

        function renderBalance() {
          CH.Dom.clear(balance);
          balance.appendChild(el("div", { cls: "row" },
            el("span", { cls: "label", text: "Баланс:" }),
            el("span", { cls: "b", style: { color: "#ffd479", "font-size": "15px" }, text: Fmt.dollarsFull(game.dollars) }),
            el("span", { cls: "label", style: { "margin-left": "auto" }, text: "продавай крипту на бирже → качайся" })
          ));
        }

        function buildCard(up) {
          var lvl = game.upgradeLevel(up.id);
          var maxed = lvl >= up.maxLevel;
          var cost = game.upgradeCost(up.id);
          var afford = cost >= 0 && game.dollars >= cost;

          var effect = "Сейчас: " + up.effectText(lvl);
          if (!maxed) effect += "  →  " + up.effectText(lvl + 1);

          var right = el("div", { cls: "buy" },
            maxed
              ? el("div", { cls: "max", text: "✓ MAX" })
              : UI.button({
                text: Fmt.dollars(cost), accent: "#ffd479", kind: "solid", height: 30,
                style: { width: "110px" },
                disabled: !afford,
                onClick: function () {
                  game.buyUpgrade(up.id);
                  signature = "";
                  render();
                }
              })
          );

          return el("div", { cls: "upgrade-card" },
            el("div", { cls: "glyph", text: iconFor(up.id) }),
            el("div", {},
              el("div", {},
                el("span", { cls: "name", text: up.name }),
                el("span", { cls: "lvl", text: "ур. " + lvl + "/" + up.maxLevel })
              ),
              el("div", { cls: "desc", text: up.desc }),
              UI.pips(up.maxLevel, lvl),
              el("div", { cls: "effect", text: effect })
            ),
            right
          );
        }

        function render() {
          var sig = Math.floor(game.dollars) + "|" + game.level + "|" +
            game.Data.upgrades.map(function (u) { return game.upgradeLevel(u.id); }).join(",");
          if (sig === signature) return;
          signature = sig;
          renderBalance();
          CH.Dom.clear(cards);
          game.Data.upgrades.forEach(function (u) { cards.appendChild(buildCard(u)); });
        }

        var onState = function () { render(); };
        game.on("state", onState);
        win.onClose(function () { game.off("state", onState); });
        render();
      }
    };
  }

  CH.Apps = CH.Apps || {};
  CH.Apps.upgrade = upgradeApp;
})(typeof globalThis !== "undefined" ? globalThis : this);
