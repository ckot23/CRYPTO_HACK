using UnityEngine;
using UnityEngine.UI;

namespace CryptoHack
{
    /// <summary>
    /// Включение компьютера — перенос screens/poweron.js: тёмный выключенный экран,
    /// кнопка питания ◉, тест железа построчно и заставка NeonOS. Дальше игра сама
    /// «открывает браузер» с логином (LoginScreen).
    /// </summary>
    public class PowerOnScreen : IGameScreen
    {
        static readonly string[] BootLines =
        {
            "NeonOS BIOS v4.2.1 · NeonTech Systems",
            "Power-On Self Test ............................ OK",
            "CPU: quantum-core 4C/8T @ 5.2GHz .............. OK",
            "Memory Test: 65536 MB ......................... OK",
            "Detecting drives: /dev/neo0 (480 GB NVMe) ..... OK",
            "Network: eth0 link up, MAC 0E:1D:7A:9C:41:FF .. OK",
            "Loading kernel modules (net, crypto, vgfx) .... OK",
            "Verifying signatures .......................... OK",
            "Starting NeonOS session ....................... OK"
        };

        const float LineDelay = 0.22f;
        const float SplashTime = 1.9f;
        const float HoldAfterLines = 0.35f;

        readonly GameBoot _boot;
        readonly Game _game;

        RectTransform _root;
        RectTransform _screen;
        Text _prompt;
        Text _hint;
        UiButton _powerButton;
        Text _log;
        Text _percent;

        // заставка
        Text _splashLogo;
        Text _splashSub;
        Text _splashLabel;
        RectTransform _splashFill;
        float _splashBarW = 420f;

        string _stage = "off";        // off → post → splash → done
        float _timer;
        int _lineIndex;
        float _splashProgress;
        float _fade;
        bool _fading;

        public PowerOnScreen(GameBoot boot)
        {
            _boot = boot;
            _game = boot.Game;
        }

        public void Build(RectTransform parent)
        {
            _root = parent;

            Image bg = Ui.Img(parent, Theme.Black, "Bg");
            Ui.Full(bg.rectTransform);

            _screen = Ui.Node("Screen", parent);
            Ui.Full(_screen);

            // ---- выключенный компьютер ----
            _prompt = Ui.Label(_screen, "НАЖМИ ПРОБЕЛ ИЛИ КЛИКНИ — ВКЛЮЧИТЬ КОМПЬЮТЕР", 15,
                Theme.TextDim, TextAnchor.MiddleCenter, true, false);
            Ui.TopLeft(_prompt.rectTransform, 0f, 300f, 1280f, 30f);

            _hint = Ui.Label(_screen, "NeonTech NeonBox 4 · кнопка питания справа снизу", 11,
                Theme.TextFaint, TextAnchor.MiddleCenter, false, false);
            Ui.TopLeft(_hint.rectTransform, 0f, 334f, 1280f, 22f);

            RectTransform wrap = Ui.Node("PowerWrap", _screen);
            Ui.TopLeft(wrap, 1120f, 596f, 96f, 96f);
            _powerButton = UiButton.New(wrap, "◉", Theme.Cyan, 26, UiButton.Solid, 72f);
            Ui.Full(_powerButton.Rt);
            _powerButton.CustomLayer = Ui.LayerDesktop;
            _powerButton.OnClick = StartBoot;

            // «дыхание» кнопки питания
            Ui.RegisterTick(new Pulse(this));
        }

        void StartBoot()
        {
            if (_stage != "off") return;
            _stage = "post";
            _timer = 0f;
            _lineIndex = 0;
            if (_powerButton != null) _powerButton.Rt.gameObject.SetActive(false);
            if (_prompt != null) _prompt.rectTransform.gameObject.SetActive(false);
            if (_hint != null) _hint.rectTransform.gameObject.SetActive(false);

            Sfx.BeepSquare(120f, 0.12f, 0.35f);

            _log = Ui.Label(_screen, "", 12, Theme.Green, TextAnchor.UpperLeft, false, false);
            Ui.TopLeft(_log.rectTransform, 60f, 60f, 1160f, 560f);
            _log.lineSpacing = 1.25f;
        }

        void ShowSplash()
        {
            _stage = "splash";
            _timer = 0f;
            Ui.DestroyChildren(_screen);

            _splashLogo = Ui.Label(_screen, "NEON_OS", 54, Theme.Green, TextAnchor.MiddleCenter, true, false);
            Ui.TopLeft(_splashLogo.rectTransform, 0f, 300f, 1280f, 70f);

            _splashSub = Ui.Label(_screen, "NeonOS 4.2 · загрузка сеанса оператора", 13,
                Theme.TextDim, TextAnchor.MiddleCenter, false, false);
            Ui.TopLeft(_splashSub.rectTransform, 0f, 372f, 1280f, 24f);

            RectTransform bar = Ui.Node("SplashBar", _screen);
            Ui.TopLeft(bar, 430f, 418f, _splashBarW, 8f);
            Image track = Ui.Panel(bar, Theme.White10, Theme.RSmall, "Track");
            Ui.Full(track.rectTransform);

            _splashFill = Ui.Node("Fill", bar);
            _splashFill.anchorMin = new Vector2(0f, 0f);
            _splashFill.anchorMax = new Vector2(0f, 1f);
            _splashFill.pivot = new Vector2(0f, 0.5f);
            _splashFill.sizeDelta = new Vector2(0f, 0f);
            _splashFill.anchoredPosition = Vector2.zero;
            Image fill = Ui.Panel(_splashFill, Theme.Green, Theme.RSmall, "FillImg");
            Ui.Full(fill.rectTransform);

            _splashLabel = Ui.Label(_screen, "готовим сеанс...", 12, Theme.TextMuted, TextAnchor.MiddleCenter, false, false);
            Ui.TopLeft(_splashLabel.rectTransform, 0f, 440f, 1280f, 24f);
        }

        void Finish()
        {
            _stage = "done";
            _boot.ShowLogin();
        }

        public void Tick()
        {
            float dt = Time.unscaledDeltaTime;

            if (_fading)
            {
                _fade += dt;
                if (_fade > 0.25f) Finish();
                return;
            }

            if (_stage == "off")
            {
                bool power = UiInput.SpaceDown || UiInput.KeyDown(UiKey.Enter) || UiInput.MouseDown;
                if (power) StartBoot();
                return;
            }

            if (_stage == "post")
            {
                _timer += dt;
                int want = Mathf.FloorToInt(_timer / LineDelay);
                while (_lineIndex < BootLines.Length && _lineIndex < want)
                {
                    _lineIndex++;
                    string[] lines = new string[_lineIndex];
                    for (int i = 0; i < _lineIndex; i++) lines[i] = BootLines[i];
                    _log.text = string.Join("\n", lines);
                    Sfx.BootLine(_lineIndex);
                }
                if (_lineIndex >= BootLines.Length && _timer > LineDelay * BootLines.Length + HoldAfterLines)
                {
                    ShowSplash();
                }
                return;
            }

            if (_stage == "splash")
            {
                _timer += dt;
                _splashProgress = Mathf.Clamp01(_timer / SplashTime);
                if (_splashFill != null) _splashFill.sizeDelta = new Vector2(_splashBarW * _splashProgress, 0f);

                string login = string.IsNullOrEmpty(_game.Login) ? "ghost" : _game.Login;
                if (_splashLabel != null)
                {
                    if (_splashProgress > 0.7f) _splashLabel.text = "оператор: " + login;
                    else if (_splashProgress > 0.35f) _splashLabel.text = "проверка оператора...";
                }
                if (_splashProgress >= 1f)
                {
                    _fading = true;
                    _fade = 0f;
                }
            }
        }

        public void Dispose() { }

        /// <summary>Мягкое «дыхание» кнопки питания, пока компьютер выключен.</summary>
        class Pulse : IUiTick
        {
            readonly PowerOnScreen _owner;
            float _t;

            public Pulse(PowerOnScreen owner) { _owner = owner; }

            public void Tick()
            {
                if (_owner._powerButton == null || _owner._stage != "off") return;
                _t += Time.unscaledDeltaTime;
                float k = 0.75f + 0.25f * Mathf.Sin(_t * 1.8f);
                _owner._powerButton.SetAccent(Theme.WithAlpha(Theme.Cyan, k), UiButton.Solid);
            }
        }
    }
}
