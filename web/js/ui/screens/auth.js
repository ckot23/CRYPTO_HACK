/* ==========================================================================
   screens/auth.js — приветствие браузера и вход в систему.

   После включения компьютера NeonOS сама открывает браузер: на странице
   крупное название игры и поле «логин оператора». Логин сохраняется в
   профиль, попадает в BIOS, профиль, файлы и сейв.
   ========================================================================== */
(function (root) {
  "use strict";

  var CH = root.CH = root.CH || {};
  var UI = CH.UI;
  var el = CH.Dom.el;

  var LOGIN_RE = /^[A-Za-zА-Яа-яЁё0-9_.-]{3,16}$/;

  function AuthScreen(host, opts) {
    var self = this;
    var game = opts.game;
    this.root = el("div", { cls: "auth" });
    this.bg = new CH.Backgrounds(this.root);

    /* ------------------------- «окно браузера» ---------------------------- */
    var address = el("div", { cls: "browser-url", text: "https://neon.net/portal/signin" });
    var chrome = el("div", { cls: "browser-chrome" },
      el("div", { cls: "browser-tabs" },
        el("div", { cls: "browser-tab active" },
          el("span", { cls: "favicon", text: "⌁" }),
          el("span", { text: "NeonNet — вход в терминал" })
        ),
        el("div", { cls: "browser-tab" }, el("span", { text: "+" }))
      ),
      el("div", { cls: "browser-bar" },
        el("span", { cls: "nav", text: "←" }),
        el("span", { cls: "nav", text: "→" }),
        el("span", { cls: "nav", text: "↻" }),
        el("div", { cls: "browser-address" }, el("span", { cls: "lock", text: "▣" }), address),
        el("span", { cls: "browser-menu", text: "⋮" })
      )
    );

    /* --------------------------- страница --------------------------------- */
    var main = el("span", { cls: "main", text: "CRYPTO_HACK" });
    var cyan = el("span", { cls: "layer cyan", text: "CRYPTO_HACK" });
    var pink = el("span", { cls: "layer pink", text: "CRYPTO_HACK" });
    var title = el("h1", { cls: "title-glitch auth-title" }, cyan, pink, main);

    var input = el("input", {
      cls: "field login-field",
      attrs: {
        type: "text", maxlength: "16", autocomplete: "off", spellcheck: "false",
        placeholder: "например: ghost", value: game.login || ""
      }
    });
    var error = el("div", { cls: "login-error", text: "" });
    var enterBtn = UI.button({
      text: "ВОЙТИ В СИСТЕМУ", accent: "#4fe0a8", kind: "solid", height: 44,
      style: { width: "100%" },
      onClick: function () { submit(); }
    });

    var card = el("form", { cls: "login-card" },
      el("div", { cls: "login-head" },
        el("span", { cls: "glyph", text: "⌁" }),
        el("span", { text: "ВХОД В СИСТЕМУ NEONOS" })
      ),
      el("div", { cls: "login-sub", text: "Терминал защищён. Представься, оператор." }),
      el("label", { cls: "login-label", text: "ЛОГИН ОПЕРАТОРА" }),
      input,
      error,
      enterBtn,
      el("div", { cls: "login-rules", text: "3–16 символов: буквы, цифры, _ . - · Enter — войти" }),
      el("div", { cls: "login-guest" },
        UI.button({
          text: "войти как ghost", accent: "#6cd8f2", kind: "ghost", height: 24,
          onClick: function () { input.value = "ghost"; input.focus(); }
        })
      )
    );

    var page = el("div", { cls: "browser-page" },
      title,
      el("div", { cls: "auth-sub", text: "СИМУЛЯТОР ХАКЕРА · взламывай, майни, торгуй, учись" }),
      card,
      el("div", { cls: "auth-foot", text: "NeonNet portal v4.2 · соединение шифруется · узел: Амстердам" })
    );
    card.addEventListener("submit", function (e) { e.preventDefault(); submit(); });

    var browser = el("div", { cls: "browser" }, chrome, el("div", { cls: "browser-view" }, page));
    this.root.appendChild(browser);
    host.appendChild(this.root);

    /* ----------------------------- логика --------------------------------- */
    var submitted = false;

    function submit() {
      if (submitted) return;                  // клик + submit формы = один вход
      var value = String(input.value || "").trim();
      if (!value) {
        fail("Пустой логин. Как тебя звать-то, хакер?");
        return;
      }
      if (!LOGIN_RE.test(value)) {
        fail("Недопустимый логин: 3–16 символов, буквы, цифры, _ . -");
        return;
      }

      submitted = true;
      game.login = value;
      game.save();
      CH.Sfx.uiOk();

      // «входим»: короткая анимация и переход на рабочий стол
      card.classList.add("granted");
      enterBtn.setText("ДОСТУП РАЗРЕШЁН ✓");
      enterBtn.setDisabled(true);
      page.appendChild(el("div", { cls: "login-granted", text: "доступ разрешён · сеанс оператора " + value }));
      address.textContent = "https://neon.net/desktop";
      setTimeout(function () {
        self.destroy();
        opts.onDone(value);
      }, 900);
    }

    function fail(message) {
      error.textContent = message;
      card.classList.add("shake");
      setTimeout(function () { card.classList.remove("shake"); }, 420);
      CH.Sfx.hackFail();
    }

    this._onKey = function (e) {
      if (e.key === "Escape") input.focus();
    };
    root.addEventListener("keydown", this._onKey);
    setTimeout(function () { input.focus(); }, 150);
  }

  AuthScreen.prototype.destroy = function () {
    root.removeEventListener("keydown", this._onKey);
    this.bg.destroy();
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  };

  CH.Screens = CH.Screens || {};
  CH.Screens.Auth = AuthScreen;
  CH.Screens.LoginPattern = LOGIN_RE;
})(typeof globalThis !== "undefined" ? globalThis : this);
