/* ==========================================================================
   apps/miner.js — «МАЙНИНГ-ФЕРМА» (перенос MinerWindowView.cs).
   Взломанные компьютеры приносят крипту каждую секунду, даже при закрытом
   окне — считает это Game.tickMiners().
   ========================================================================== */
(function (root) {
  "use strict";

  var CH = root.CH = root.CH || {};
  var UI = CH.UI;
  var el = CH.Dom.el;
  var Fmt = CH.Fmt;

  function minerApp(game) {
    return {
      title: "МАЙНИНГ-ФЕРМА",
      accent: "#00e5ff",
      width: 700,
      height: 560,
      build: function (body, win) {
        var selectedCrypto = "BTC";
        var signature = "";
        var unsubscribe = [];

        var head = el("div", { cls: "card card--soft", style: { padding: "10px", border: "1px solid rgba(0,229,255,0.45)", background: "rgba(0,229,255,0.05)" } });
        var list = el("div", { cls: "col" });
        var pickerRow = el("div", { cls: "row wrap" });
        var costLabel = el("div", { cls: "label" });
        var installBox = el("div", { cls: "col" });

        body.appendChild(el("div", { cls: "col", style: { gap: "10px" } },
          head,
          list,
          el("div", { cls: "label b", text: "УСТАНОВИТЬ МАЙНЕР" }),
          pickerRow,
          costLabel,
          installBox,
          el("div", { cls: "label", text: "Майнеры капают крипту каждую секунду, даже когда окно закрыто." })
        ));

        function renderHead() {
          CH.Dom.clear(head);
          var row = el("div", { cls: "row" },
            el("div", { cls: "b", style: { color: "#00e5ff", "font-size": "13px" }, text: "МАЙНИНГ-ФЕРМА · " + game.miners.length + " РИГ(ОВ)" }),
            el("div", { cls: "label", style: { "margin-left": "auto" }, text: "мощность x" + game.minerEffMultNow().toFixed(1) })
          );
          var income = el("div", { style: { color: "#00ff9d", "font-size": "11px", "margin-top": "6px" },
            text: "Доход: ~" + Fmt.dollarsFull(game.minerIncomePerMin()) + "/мин пассивно" });
          head.appendChild(row);
          head.appendChild(income);
        }

        function renderMiners() {
          CH.Dom.clear(list);
          if (!game.miners.length) {
            list.appendChild(el("div", { cls: "label", text: "Пока ни одного рига. Взломай цель и поставь майнер ниже." }));
            return;
          }
          game.miners.slice().forEach(function (m) {
            var info = game.Data.getCrypto(m.crypto);
            var card = el("div", { cls: "miner-card", style: { "--accent": info ? info.color : "#00e5ff" } },
              el("div", { cls: "glyph", style: { color: info ? info.color : "#00e5ff" }, text: info ? info.icon : "?" }),
              el("div", {},
                el("div", { cls: "name", text: m.pcName }),
                el("div", { cls: "meta", text: m.ip + " · майнит " + m.crypto }),
                el("div", { cls: "earned", text: "добыто: " + Fmt.crypto(m.earned) + " " + m.crypto })
              ),
              el("div", { cls: "actions" },
                el("span", { cls: "live", text: "● LIVE" }),
                " ",
                UI.button({
                  text: "снять", accent: "#ff2d78", kind: "outline", height: 24,
                  onClick: function () { game.removeMiner(m.id); }
                })
              )
            );
            list.appendChild(card);
          });
        }

        function renderPicker() {
          CH.Dom.clear(pickerRow);
          game.Data.cryptos.forEach(function (c) {
            var unlocked = game.cryptoUnlocked(c.id);
            pickerRow.appendChild(UI.button({
              text: c.icon + " " + c.id,
              accent: c.color,
              kind: c.id === selectedCrypto ? "solid" : "outline",
              height: 30,
              style: { width: "82px" },
              disabled: !unlocked,
              onClick: function () {
                selectedCrypto = c.id;
                signature = "";
                render();
              }
            }));
          });
          costLabel.textContent = "Стоимость установки: " + Fmt.dollarsFull(game.minerInstallCost()) +
            " · режим: " + game.pythonModeText();
        }

        function renderInstall() {
          CH.Dom.clear(installBox);
          var free = game.Data.missions.filter(function (m) {
            return game.isMissionCompleted(m.id) && !game.minersOn(m.id);
          });

          if (!free.length) {
            installBox.appendChild(el("div", {
              cls: "label",
              text: "Нет свободных взломанных компов. Взломай новую цель в Хак-терминале."
            }));
            return;
          }

          var cost = game.minerInstallCost();
          free.forEach(function (m) {
            installBox.appendChild(el("div", { cls: "miner-card" },
              el("div", {},
                el("div", { cls: "name", text: m.targetName }),
                el("div", { cls: "meta", text: m.targetIp + " · " + m.os })
              ),
              el("div", { cls: "actions" },
                UI.button({
                  text: "+ " + selectedCrypto,
                  accent: "#00e5ff",
                  kind: "solid",
                  height: 26,
                  style: { width: "130px" },
                  disabled: game.dollars < cost,
                  onClick: function () {
                    game.installMiner(m.id, selectedCrypto);
                    signature = "";
                    render();
                  }
                })
              )
            ));
          });
        }

        function render() {
          var sig = game.miners.length + "|" + game.level + "|" + selectedCrypto + "|" +
            Math.floor(game.dollars) + "|" + Math.floor(game.minerInstallCost()) + "|" +
            game.completedMissions.length;
          if (sig === signature) return;
          signature = sig;
          renderHead();
          renderMiners();
          renderPicker();
          renderInstall();
        }

        var onState = function () { render(); };
        game.on("state", onState);
        game.on("miners", onState);
        unsubscribe.push(function () { game.off("state", onState); game.off("miners", onState); });

        win.onClose(function () { unsubscribe.forEach(function (fn) { fn(); }); });
        render();
      }
    };
  }

  CH.Apps = CH.Apps || {};
  CH.Apps.miner = minerApp;
})(typeof globalThis !== "undefined" ? globalThis : this);
