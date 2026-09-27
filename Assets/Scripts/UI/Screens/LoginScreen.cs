using UnityEngine;
using UnityEngine.UI;

namespace CryptoHack
{
    /// <summary>
    /// Приветствие «браузера» и вход в систему — перенос screens/auth.js.
    /// На странице крупное имя игры и поле «логин оператора»; логин сохраняется
    /// в профиль и попадает в BIOS, профиль, файлы и сейв.
    /// </summary>
    public class LoginScreen : IGameScreen
    {
        /// <summary>Правило логина — то же, что в браузерной версии.</summary>
        public const string Pattern = "^[A-Za-zА-Яа-яЁё0-9_.-]{3,16}$";

        readonly GameBoot _boot;
        readonly Game _game;

        RectTransform _root;
        GridBackground _grid;
        MatrixBackground _matrix;

        UiInputField _input;
        Text _error;
        Text _sub;
        Text _address;
        Text _granted;
        UiButton _enter;
        RectTransform _card;
        Image _cardFrame;

        bool _submitted;
        float _shake;
        float _transition;
        string _login = "";

        public LoginScreen(GameBoot boot)
        {
            _boot = boot;
            _game = boot.Game;
        }

        public void Build(RectTransform parent)
        {
            _root = parent;

            Image bg = Ui.Img(parent, Theme.Bg, "Bg");
            Ui.Full(bg.rectTransform);
            _grid = GridBackground.New(parent);
            _matrix = MatrixBackground.New(parent);
            ScanBeam.New(parent, 140f);

            // ---------------- «окно браузера» ----------------
            RectTransform browser = Ui.Card(parent, Theme.WithAlpha(Theme.Cyan, 0.35f),
                Theme.WithAlpha(Theme.PanelDark, 0.94f), "Browser");
            Ui.TopLeft(browser, 150f, 40f, 980f, 640f);

            RectTransform chrome = Ui.Node("Chrome", browser);
            Ui.TopLeft(chrome, 0f, 0f, 980f, 62f);

            // ярлык вкладки
            RectTransform tab = Ui.Node("Tab", chrome);
            Ui.TopLeft(tab, 0f, 0f, 320f, 30f);
            Image tabBg = Ui.Panel(tab, Theme.PanelHead, Theme.RSmall, "TabBg");
            Ui.Full(tabBg.rectTransform);
            Text tabText = Ui.Label(tab, "⌁  NeonNet — вход в терминал", 11, Theme.Text, TextAnchor.MiddleLeft, false, false);
            Ui.Stretch(tabText.rectTransform, 12f, 0f, 8f, 0f);

            Text plus = Ui.Label(chrome, "+", 12, Theme.TextMuted, TextAnchor.MiddleCenter, false, false);
            Ui.TopLeft(plus.rectTransform, 330f, 0f, 26f, 30f);

            // адресная строка
            RectTransform urlBar = Ui.Node("UrlBar", chrome);
            Ui.TopLeft(urlBar, 10f, 34f, 960f, 24f);
            Text nav = Ui.Label(urlBar, "←   →   ↻", 11, Theme.TextMuted, TextAnchor.MiddleLeft, false, false);
            Ui.TopLeft(nav.rectTransform, 4f, 0f, 120f, 24f);
            Text lockGlyph = Ui.Label(urlBar, "▣", 10, Theme.Green, TextAnchor.MiddleLeft, false, false);
            Ui.TopLeft(lockGlyph.rectTransform, 132f, 0f, 20f, 24f);
            _address = Ui.Label(urlBar, "https://neon.net/portal/signin", 11, Theme.TextDim,
                TextAnchor.MiddleLeft, false, false);
            Ui.TopLeft(_address.rectTransform, 152f, 0f, 700f, 24f);
            Text menu = Ui.Label(urlBar, "⋮", 12, Theme.TextMuted, TextAnchor.MiddleRight, false, false);
            Ui.TopRight(menu.rectTransform, -6f, 0f, 24f, 24f);

            // ---------------- страница ----------------
            RectTransform page = Ui.Node("Page", browser);
            Ui.TopLeft(page, 0f, 62f, 980f, 578f);

            Text titleCyan = Ui.Label(page, "CRYPTO_HACK", 46, Theme.Cyan, TextAnchor.MiddleCenter, true, false);
            Ui.TopLeft(titleCyan.rectTransform, -3f, 40f, 980f, 60f);
            titleCyan.color = Theme.WithAlpha(Theme.Cyan, 0.55f);

            Text titlePink = Ui.Label(page, "CRYPTO_HACK", 46, Theme.Pink, TextAnchor.MiddleCenter, true, false);
            Ui.TopLeft(titlePink.rectTransform, 3f, 40f, 980f, 60f);
            titlePink.color = Theme.WithAlpha(Theme.Pink, 0.5f);

            Text title = Ui.Label(page, "CRYPTO_HACK", 46, Theme.Text, TextAnchor.MiddleCenter, true, false);
            Ui.TopLeft(title.rectTransform, 0f, 40f, 980f, 60f);

            _sub = Ui.Label(page, "СИМУЛЯТОР ХАКЕРА · взламывай, майни, торгуй, учись", 13, Theme.Cyan,
                TextAnchor.MiddleCenter, false, false);
            Ui.TopLeft(_sub.rectTransform, 0f, 100f, 980f, 24f);

            // ---------------- карточка входа ----------------
            _card = Ui.Card(page, Theme.WithAlpha(Theme.Green, 0.35f), Theme.WithAlpha(Theme.PanelDeep, 0.95f), "LoginCard");
            Ui.TopLeft(_card, 290f, 148f, 400f, 316f);
            _cardFrame = FindBorder(_card);

            Text head = Ui.Label(_card, "⌁  ВХОД В СИСТЕМУ NEONOS", 12, Theme.Green,
                TextAnchor.MiddleLeft, true, false);
            Ui.TopLeft(head.rectTransform, 18f, 14f, 360f, 20f);

            Text sub = Ui.Label(_card, "Терминал защищён. Представься, оператор.", 11, Theme.TextMuted,
                TextAnchor.MiddleLeft, false, false);
            Ui.TopLeft(sub.rectTransform, 18f, 36f, 360f, 18f);

            Text label = Ui.Label(_card, "ЛОГИН ОПЕРАТОРА", 10, Theme.TextDim, TextAnchor.MiddleLeft, false, false);
            Ui.TopLeft(label.rectTransform, 18f, 62f, 360f, 16f);

            _input = UiInputField.New(_card, _game.Login == null ? "" : _game.Login, 364f, 34f, Theme.Cyan);
            Ui.TopLeft(_input.Rt, 18f, 82f, 364f, 34f);
            _input.AllowLetters = true;
            _input.MaxLength = 16;
            _input.SuffixLabel.text = "";
            _input.OnSubmit = Submit;
            _input.OnChanged = delegate(string text)
            {
                if (_error != null) _error.text = "";
            };

            _error = Ui.Label(_card, "", 11, Theme.Pink, TextAnchor.MiddleLeft, false, false);
            Ui.TopLeft(_error.rectTransform, 18f, 120f, 364f, 18f);

            _enter = UiButton.New(_card, "ВОЙТИ В СИСТЕМУ", Theme.Green, 14, UiButton.Solid, 44f);
            Ui.TopLeft(_enter.Rt, 18f, 144f, 364f, 44f);
            _enter.OnClick = Submit;

            Text rules = Ui.Label(_card, "3–16 символов: буквы, цифры, _ . - · Enter — войти", 10,
                Theme.TextFaint, TextAnchor.MiddleLeft, false, false);
            Ui.TopLeft(rules.rectTransform, 18f, 196f, 364f, 16f);

            UiButton ghost = UiButton.New(_card, "войти как ghost", Theme.Cyan, 10, UiButton.Ghost, 24f);
            Ui.TopLeft(ghost.Rt, 18f, 218f, 150f, 24f);
            ghost.OnClick = delegate
            {
                _input.SetText("ghost", true);
                _input.Focus();
            };

            _granted = Ui.Label(_card, "", 11, Theme.Green, TextAnchor.MiddleLeft, false, false);
            Ui.TopLeft(_granted.rectTransform, 18f, 250f, 364f, 18f);

            Text foot = Ui.Label(page, "NeonNet portal v4.2 · соединение шифруется · узел: Амстердам", 10,
                Theme.TextFaint, TextAnchor.MiddleCenter, false, false);
            Ui.TopLeft(foot.rectTransform, 0f, 500f, 980f, 20f);

            _input.Focus();
        }

        static Image FindBorder(RectTransform card)
        {
            Image[] images = card.GetComponentsInChildren<Image>(true);
            for (int i = 0; i < images.Length; i++)
            {
                if (images[i].gameObject.name == "Border") return images[i];
            }
            return null;
        }

        void Fail(string message)
        {
            if (_error != null) _error.text = message;
            _shake = 0.4f;
            Sfx.HackFail();
        }

        void Submit()
        {
            if (_submitted) return;

            string value = _input == null ? "" : _input.Text.Trim();
            if (value.Length == 0)
            {
                Fail("Пустой логин. Как тебя звать-то, хакер?");
                return;
            }
            if (!System.Text.RegularExpressions.Regex.IsMatch(value, Pattern))
            {
                Fail("Недопустимый логин: 3–16 символов, буквы, цифры, _ . -");
                return;
            }

            _submitted = true;
            _login = value;
            _game.Login = value;
            _game.Onboarded = true;
            _game.Save();
            Sfx.UiOk();

            if (_error != null) _error.text = "";
            if (_enter != null)
            {
                _enter.SetText("ДОСТУП РАЗРЕШЁН ✓");
                _enter.SetDisabled(true);
            }
            if (_granted != null) _granted.text = "доступ разрешён · сеанс оператора " + value;
            if (_address != null) _address.text = "https://neon.net/desktop";
            if (_cardFrame != null) _cardFrame.color = Theme.WithAlpha(Theme.Green, 0.75f);
        }

        public void Tick()
        {
            if (_grid != null) _grid.Refresh();
            if (_matrix != null) _matrix.Refresh();

            if (_shake > 0f)
            {
                _shake -= Time.unscaledDeltaTime;
                float k = _shake > 0f ? Mathf.Abs(Mathf.Sin(_shake * 40f)) : 0f;
                if (_card != null) _card.anchoredPosition = new Vector2(290f + 5f * k, -148f);
                if (_shake <= 0f && _card != null) _card.anchoredPosition = new Vector2(290f, -148f);
            }

            if (!_submitted) return;

            _transition += Time.unscaledDeltaTime;
            if (_transition >= 0.9f)
            {
                _transition = -999f;                 // страховка от повторного вызова
                _boot.ShowBoot(_login);
            }
        }

        public void Dispose() { }
    }
}
