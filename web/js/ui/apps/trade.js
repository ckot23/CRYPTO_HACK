/* ==========================================================================
   apps/trade.js — «БИРЖА DARKEX» (перенос TradeWindowView.cs):
   карточки монет, живой график, покупка/продажа с комиссией.
   ========================================================================== */
(function (root) {
  "use strict";

  var CH = root.CH = root.CH || {};
  var UI = CH.UI;
  var el = CH.Dom.el;
  var Fmt = CH.Fmt;

  function tradeApp(game) {
    return {
      title: "БИРЖА DARKEX",
      accent: "#ffe600",
      width: 760,
      height: 600,
      build: function (body, win) {
        var selected = "BTC";
        var signature = "";
        var unsubscribe = [];
        var sellHasResult = false;
        var buyHasResult = false;

        var cardsRow = el("div", { cls: "coin-cards" });
        var chartTitle = el("div", { cls: "b", style: { color: "#00ff9d", "font-size": "12px" } });
        var chartChange = el("div", { cls: "b", style: { "font-size": "12px", "margin-left": "auto" } });
        var chart = new UI.Chart(null, 112);
        var feeLabel = el("div", { cls: "label" });
        var chartBox = el("div", { cls: "card", style: { padding: "10px", background: "rgba(0,0,0,0.5)" } },
          el("div", { cls: "row", style: { "margin-bottom": "6px" } }, chartTitle, chartChange),
          chart.canvas, feeLabel);

        var amount = UI.field({ value: "100", width: 130, accent: "#00e5ff", onInput: function () { refreshInfo(); } });
        amount.addEventListener("keydown", function (e) {
          if (e.key === "Enter") { e.preventDefault(); fillMax(); }
        });
        var amountRow = el("div", { cls: "row" },
          el("span", { cls: "label", text: "Сумма в $:" }),
          amount,
          UI.button({ text: "MAX", accent: "#00e5ff", kind: "outline", height: 28, onClick: fillMax }),
          el("span", { cls: "faint", style: { "font-size": "10px" }, text: "Enter — подставить весь баланс монеты" })
        );

        var sellInfo = el("div", { cls: "info" });
        var sellResult = el("div", { cls: "result" });
        var buyInfo = el("div", { cls: "info" });
        var buyResult = el("div", { cls: "result" });
        var sellBtn = UI.button({ text: "ПРОДАТЬ ЗА $", accent: "#00ff9d", kind: "solid", height: 30, style: { width: "100%" }, onClick: function () { doTrade(false); } });
        var buyBtn = UI.button({ text: "КУПИТЬ", accent: "#00e5ff", kind: "solid", height: 30, style: { width: "100%" }, onClick: function () { doTrade(true); } });

        var panels = el("div", { cls: "trade-panels" },
          el("div", { cls: "trade-panel sell" },
            el("div", { cls: "head", style: { color: "#00ff9d" }, text: "ПРОДАТЬ → $" }),
            sellInfo, sellResult, sellBtn),
          el("div", { cls: "trade-panel buy" },
            el("div", { cls: "head", style: { color: "#00e5ff" }, text: "КУПИТЬ $ → монета" }),
            buyInfo, buyResult, buyBtn)
        );

        body.appendChild(el("div", { cls: "col", style: { gap: "10px" } },
          cardsRow, chartBox, amountRow, panels,
          el("div", { cls: "label", text: "Совет трейдера: покупай на падении, продавай на росте. Стелс-модуль снижает комиссию вплоть до 0%." })
        ));

        function fillMax() {
          var price = Math.max(game.getPrice(selected), 1e-9);
          var usd = Math.floor(game.getCrypto(selected) * price);
          amount.value = String(usd);
          refreshInfo();
        }

        function doTrade(isBuy) {
          var usd = amount.getValue();
          var ok = game.trade(selected, usd, isBuy);
          if (ok) {
            var price = Math.max(game.getPrice(selected), 0.000001);
            var text = isBuy
              ? "Куплено " + Fmt.crypto(usd / price * (1 - game.fee())) + " " + selected
              : "Продано " + Fmt.dollarsFull(usd * (1 - game.fee())) + " $";
            if (isBuy) { buyResult.textContent = text; sellResult.textContent = ""; buyHasResult = true; sellHasResult = false; }
            else { sellResult.textContent = text; buyResult.textContent = ""; sellHasResult = true; buyHasResult = false; }
            CH.Sfx.trade();
            signature = "";
            render();
          } else {
            var warn = "Недостаточно средств или монета заблокирована.";
            if (isBuy) buyResult.textContent = warn;
            else sellResult.textContent = warn;
          }
        }

        function renderCards() {
          CH.Dom.clear(cardsRow);
          game.Data.cryptos.forEach(function (c) {
            var unlocked = game.cryptoUnlocked(c.id);
            var price = game.getPrice(c.id);
            var hist = game.history[c.id] || [];
            var change = hist.length >= 2 ? (hist[hist.length - 1] - hist[0]) / hist[0] * 100 : 0;
            var card = el("div", {
              cls: "coin-card" + (c.id === selected ? " active" : "") + (unlocked ? "" : " locked"),
              style: { "--accent": c.color },
              on: { click: function () {
                if (!unlocked) return;
                selected = c.id;
                signature = "";
                sellHasResult = false;
                buyHasResult = false;
                sellResult.textContent = "";
                buyResult.textContent = "";
                render();
              } }
            },
              el("div", { cls: "top" },
                el("span", { cls: "glyph", style: { color: unlocked ? c.color : "#5b6b85" }, text: unlocked ? c.icon : "○" }),
                el("span", { cls: "id", text: c.id })
              ),
              unlocked
                ? el("div", { cls: "price", text: Fmt.price(price) })
                : el("div", { cls: "lock", text: "заблокировано · нужен уровень " + c.unlockLevel }),
              unlocked ? el("div", {
                cls: "change",
                style: { color: change >= 0 ? "#00ff9d" : "#ff2d78" },
                text: (change >= 0 ? "▲ " : "▼ ") + Math.abs(change).toFixed(2) + "%"
              }) : null
            );
            cardsRow.appendChild(card);
          });
        }

        function refreshInfo() {
          var price = Math.max(game.getPrice(selected), 0.000001);
          var balance = game.getCrypto(selected);
          var usd = amount.getValue();

          sellInfo.textContent = "Баланс: " + Fmt.crypto(balance) + " " + selected + " ≈ " + Fmt.dollarsFull(balance * price);
          buyInfo.textContent = "Доллары: " + Fmt.dollarsFull(game.dollars) + " · 1 " + selected + " = " + Fmt.price(price);

          if (!sellHasResult) sellResult.textContent = "Получишь: " + Fmt.dollarsFull(usd * (1 - game.fee()));
          if (!buyHasResult) buyResult.textContent = "Получишь: " + Fmt.crypto(usd / price * (1 - game.fee())) + " " + selected;

          sellBtn.setDisabled(usd <= 0 || usd / price > balance);
          buyBtn.setDisabled(usd <= 0 || usd > game.dollars);
        }

        function render() {
          var sig = selected + "|" + Math.floor(game.dollars) + "|" + game.level + "|" +
            game.Data.cryptos.map(function (c) { return Math.floor(game.getPrice(c.id)); }).join(",");
          if (sig === signature) return;
          signature = sig;

          renderCards();

          var info = game.Data.getCrypto(selected);
          chartTitle.textContent = info ? info.icon + " " + info.name + " / USD" : selected;

          var hist = game.history[selected] || [];
          if (hist.length >= 2) {
            var change = (hist[hist.length - 1] - hist[0]) / hist[0] * 100;
            chartChange.textContent = (change >= 0 ? "▲ " : "▼ ") + Math.abs(change).toFixed(2) + "%";
            chartChange.style.color = change >= 0 ? "#00ff9d" : "#ff2d78";
          } else {
            chartChange.textContent = "";
          }
          chart.setValues(hist, info ? info.color : "#00ff9d");

          feeLabel.textContent = "● живой график · обновляется каждые " + game.PRICE_TICK_SEC.toFixed(0) +
            " сек · комиссия " + (game.fee() * 100).toFixed(0) + "%";

          refreshInfo();
        }

        var onUpdate = function () { render(); };
        game.on("prices", onUpdate);
        game.on("state", onUpdate);
        unsubscribe.push(function () { game.off("prices", onUpdate); game.off("state", onUpdate); });

        win.onClose(function () {
          unsubscribe.forEach(function (fn) { fn(); });
          chart.destroy();
        });
        render();
      }
    };
  }

  CH.Apps = CH.Apps || {};
  CH.Apps.trade = tradeApp;
})(typeof globalThis !== "undefined" ? globalThis : this);
