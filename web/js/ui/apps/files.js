/* ==========================================================================
   apps/files.js — «ФАЙЛЫ // /home/ghost» (перенос FilesWindowView.cs).
   Виртуальная файловая система собирается из состояния игры: пройденные
   миссии → эксплойты, монеты в кошельке → *.dat, майнеры → *.log.
   ========================================================================== */
(function (root) {
  "use strict";

  var CH = root.CH = root.CH || {};
  var UI = CH.UI;
  var el = CH.Dom.el;
  var Fmt = CH.Fmt;

  function slug(s) {
    return String(s).replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "");
  }

  function addressFor(id) {
    // детерминированный «кошелёк»: одинаковый для одинакового id
    var seed = 0;
    for (var i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
    var abc = "0123456789abcdef";
    var out = "0x";
    for (var k = 0; k < 16; k++) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      out += abc.charAt(seed % 16);
    }
    return out;
  }

  var PASSWORDS =
    "# найденные пароли (реальные люди, реальные ошибки)\n" +
    "admin@darkmail.io   : qwerty2019\n" +
    "crypto_exchange_ru  : Pa$$w0rd!\n" +
    "neon_net_router     : 12345678\n" +
    "director@corp.local : Summer2024\n" +
    "\n# вывод: длина пароля не спасает, если это дата рождения.\n";

  var CHEATSHEET =
    "# Шпаргалка Python для хакера\n\n" +
    "scan(target)           # сканировать цель\n" +
    "connect(ip)            # подключиться\n" +
    "brute(pin)             # перебор пароля\n" +
    "bypass(firewall)       # обход защиты\n" +
    "decrypt(data)          # расшифровка\n" +
    "extract(target)        # вытащить данные\n" +
    "drain(wallet)          # вывести деньги\n" +
    "install_miner(target)  # поставить майнер\n" +
    "wallets()              # список кошельков\n\n" +
    "Циклы:      for i in range(3):\n" +
    "Условия:    if security < 50:\n" +
    "Печать:     print('OK')\n" +
    "Списки:     for w in wallets():\n";

  function filesApp(game) {
    return {
      title: "ФАЙЛЫ // /home/ghost",
      accent: "#00e5ff",
      width: 860,
      height: 560,
      build: function (body, win) {
        var opened = "";
        var signature = "";

        var treeItems = el("div", { cls: "items scroll" });
        var tree = el("div", { cls: "file-tree" },
          el("div", { cls: "head", text: "/home/ghost" }), treeItems);

        var fileTitle = el("div", { cls: "title", text: "выбери файл" });
        var fileMeta = el("div", { cls: "meta", text: "" });
        var fileBody = el("pre");
        var view = el("div", { cls: "file-view" }, fileTitle, fileMeta, fileBody);

        var layout = el("div", { cls: "files-layout" }, tree, view);
        layout.style.height = "100%";
        body.appendChild(layout);

        function entries() {
          var list = [];
          list.push({ folder: "docs", name: "пароли.txt", content: PASSWORDS, color: "#00e5ff" });
          list.push({ folder: "docs", name: "шпаргалка_python.txt", content: CHEATSHEET, color: "#00e5ff" });

          game.missions().forEach(function (m) {
            if (!game.isMissionCompleted(m.id)) return;
            var code = CH.CodeStore.get(m.id, m.solution);
            list.push({
              folder: "exploits",
              name: "exploit_" + m.id + "_" + slug(m.title) + ".py",
              content: code,
              color: "#00ff9d"
            });
          });

          game.Data.cryptos.forEach(function (c) {
            var amount = game.getCrypto(c.id);
            if (amount <= 0) return;
            var text = "# Кошелёк " + c.name + " (" + c.id + ")\n" +
              "address: " + addressFor(c.id) + "\n" +
              "balance: " + Fmt.crypto(amount) + " " + c.id + "\n" +
              "usd: " + Fmt.dollarsFull(amount * game.getPrice(c.id)) + "\n" +
              "note: ключ восстановления потерян при взломе. так бывает.\n";
            list.push({ folder: "wallets", name: c.id.toLowerCase() + "_wallet.dat", content: text, color: "#ffe600" });
          });

          game.miners.forEach(function (m) {
            var text = "rig: " + m.pcName + "\n" +
              "ip: " + m.ip + "\n" +
              "coin: " + m.crypto + "\n" +
              "earned: " + Fmt.crypto(m.earned) + " " + m.crypto + "\n" +
              "uptime: постоянно, пока комп жертвы включён\n" +
              "log:\n  [ok] miner installed\n  [ok] payouts every second\n  [ok] tracker not detected\n";
            list.push({ folder: "miners", name: slug(m.pcName) + ".log", content: text, color: "#ff2d78" });
          });

          return list;
        }

        function open(entry) {
          opened = entry.name;
          fileTitle.textContent = "▸ " + entry.folder + "/" + entry.name;
          fileTitle.style.color = entry.color;
          var lines = entry.content.split("\n").length;
          fileMeta.textContent = lines + " строк · " + entry.content.length + " байт · изменён только что";
          fileBody.textContent = entry.content;
        }

        function find(name) {
          var all = entries();
          for (var i = 0; i < all.length; i++) if (all[i].name === name) return all[i];
          return null;
        }

        function render() {
          var sig = game.completedMissions.join(",") + "|" + game.miners.length + "|" + game.totalTrades + "|" +
            Math.floor(game.dollars) + "|" + game.Data.cryptos.map(function (c) {
              return game.getCrypto(c.id).toFixed(4);
            }).join(",");
          if (sig === signature) return;
          signature = sig;

          var all = entries();
          CH.Dom.clear(treeItems);

          var folder = "";
          all.forEach(function (e) {
            if (e.folder !== folder) {
              folder = e.folder;
              treeItems.appendChild(el("div", { cls: "folder", text: "▶ " + folder + "/" }));
            }
            var item = UI.button({
              text: "• " + e.name,
              accent: e.color,
              kind: "ghost",
              cls: "file",
              style: { "justify-content": "flex-start", "text-align": "left" },
              onClick: function () { open(e); }
            });
            treeItems.appendChild(item);
          });

          var again = opened ? find(opened) : null;
          if (again) open(again);
          else if (all.length) open(all[0]);
        }

        var onState = function () { render(); };
        game.on("state", onState);
        game.on("miners", onState);
        win.onClose(function () { game.off("state", onState); game.off("miners", onState); });
        render();
      }
    };
  }

  CH.Apps = CH.Apps || {};
  CH.Apps.files = filesApp;
})(typeof globalThis !== "undefined" ? globalThis : this);
