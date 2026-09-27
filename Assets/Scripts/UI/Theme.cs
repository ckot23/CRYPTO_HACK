using UnityEngine;
using UnityEngine.UI;

namespace CryptoHack
{
    /// <summary>
    /// Палитра, шрифты и мелкие утилиты — перенос scripts/core/neon.gd.
    ///
    /// Отличие от Godot: там шрифты собирались в цепочку fallbacks (latin →
    /// cyrillic → DejaVu). В Unity у legacy Text цепочки нет, поэтому взят
    /// один шрифт с полным покрытием — DejaVu Sans Mono (кириллица, греческий,
    /// стрелки, рамки, ★ ● ▲). Единственный символ, которого в нём нет, — ₿:
    /// для него отдельный шрифт JetBrainsMono-LatinExt (см. IconFontFor).
    /// </summary>
    public static class Theme
    {
        // ---------------- Палитра (мягкая версия веб-интерфейса) ----------------
        // Те же значения, что в web/css/neon.css: приглушённый неон, тёмно-синие
        // панели, спокойный текст. Кислотные оттенки остались только в акцентах.
        public static readonly Color Bg = Hex("#0b1120");
        public static readonly Color BgDeep = Hex("#080d19");
        public static readonly Color Panel = Hex("#151e33");
        public static readonly Color PanelDark = Hex("#111a2c");
        public static readonly Color PanelDeep = Hex("#0f1728");
        public static readonly Color PanelHead = Hex("#1a2440");
        public static readonly Color PanelBar = Hex("#151e33");

        public static readonly Color Green = Hex("#4fe0a8");
        public static readonly Color GreenHover = Hex("#7ceec4");
        public static readonly Color Cyan = Hex("#6cd8f2");
        public static readonly Color CyanHover = Hex("#a6eafb");
        public static readonly Color Pink = Hex("#ff7aa8");
        public static readonly Color Yellow = Hex("#ffd479");
        public static readonly Color YellowHover = Hex("#ffe4a0");
        public static readonly Color Orange = Hex("#ffb27a");
        public static readonly Color Violet = Hex("#b095ff");

        public static readonly Color Text = Hex("#e2e9f5");
        public static readonly Color TextSoft = Hex("#c3cee1");
        public static readonly Color TextDim = Hex("#9aabc4");
        public static readonly Color TextMuted = Hex("#7286a0");
        public static readonly Color TextFaint = Hex("#546480");
        public static readonly Color Black = Hex("#070c16");

        public static readonly Color White05 = new Color(1f, 1f, 1f, 0.05f);
        public static readonly Color White10 = new Color(1f, 1f, 1f, 0.10f);
        public static readonly Color White15 = new Color(1f, 1f, 1f, 0.15f);
        public static readonly Color White20 = new Color(1f, 1f, 1f, 0.20f);
        public static readonly Color Hair = new Color(1f, 1f, 1f, 0.07f);     // почти невидимая кайма
        public static readonly Color Hair2 = new Color(1f, 1f, 1f, 0.12f);
        public static readonly Color Glass = new Color(0.082f, 0.118f, 0.2f, 0.78f);  // панели «под стеклом»

        // Скругления: как --r-sm / --r-md / --r-lg в веб-версии
        public const int RSmall = 7;
        public const int RCard = 10;
        public const int RWindow = 12;

        public static Font Mono;
        public static Font MonoBold;
        public static Font IconFont;      // для ₿
        public static Sprite Solid;
        public static Sprite Border;      // рамка 1px: спрайт-кольцо для Image.Type.Sliced
        public static Sprite Card;        // панель со скруглением RCard
        public static Sprite Window;      // окно со скруглением RWindow
        public static Sprite Button;      // кнопка со скруглением RSmall
        public static Sprite CardBorder;  // кайма 1px, повторяющая скругление
        public static Sprite WindowBorder;
        public static Sprite ButtonBorder;

        static readonly System.Collections.Generic.Dictionary<int, Sprite> RoundedCache =
            new System.Collections.Generic.Dictionary<int, Sprite>();

        /// <summary>Ширина символа моношрифта в долях от кегля (DejaVu Sans Mono: 1233/2048).</summary>
        public const float CharWidthRatio = 0.60205f;
        public const float LineHeightRatio = 1.34f;

        static bool _ready;

        public static void Init()
        {
            if (_ready) return;
            _ready = true;

            Mono = LoadFont("Fonts/DejaVuSansMono");
            MonoBold = LoadFont("Fonts/DejaVuSansMono-Bold");
            IconFont = LoadFont("Fonts/JetBrainsMono-LatinExt");

            if (Mono == null) Mono = BuiltinFont();
            if (MonoBold == null) MonoBold = Mono;
            if (IconFont == null) IconFont = Mono;

            Texture2D tex = new Texture2D(1, 1, TextureFormat.RGBA32, false);
            tex.SetPixel(0, 0, Color.white);
            tex.filterMode = FilterMode.Point;
            tex.Apply();
            Solid = Sprite.Create(tex, new Rect(0f, 0f, 1f, 1f), new Vector2(0.5f, 0.5f), 100f);
            Border = MakeBorderSprite();

            Card = Rounded(RCard);
            Window = Rounded(RWindow);
            Button = Rounded(RSmall);
            CardBorder = RoundedBorder(RCard);
            WindowBorder = RoundedBorder(RWindow);
            ButtonBorder = RoundedBorder(RSmall);
        }

        /// <summary>Спрайт для скруглённой панели: Rounded(RCard/RWindow/RSmall).</summary>
        public static Sprite PanelFor(int radius)
        {
            if (radius == RWindow) return Window;
            if (radius == RSmall) return Button;
            return Card;
        }

        /// <summary>Спрайт для скруглённой каймы нужного радиуса.</summary>
        public static Sprite BorderFor(int radius)
        {
            if (radius == RWindow) return WindowBorder;
            if (radius == RSmall) return ButtonBorder;
            return CardBorder;
        }

        /// <summary>
        /// Спрайт «прямоугольник со скруглёнными углами» (9-slice). Рисуется один
        /// раз на радиус и переиспользуется — в uGUI нет CSS-свойства border-radius,
        /// поэтому мягкие углы делаются спрайтом.
        /// </summary>
        public static Sprite Rounded(int radius)
        {
            Sprite cached;
            if (RoundedCache.TryGetValue(radius, out cached) && cached != null) return cached;

            int size = radius * 2 + 2;
            Texture2D tex = new Texture2D(size, size, TextureFormat.RGBA32, false);
            tex.filterMode = FilterMode.Bilinear;
            tex.wrapMode = TextureWrapMode.Clamp;

            float far = size - 1 - radius;      // правая/нижняя граница прямого участка
            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    float dx = Mathf.Max(0f, Mathf.Max(radius - 0.5f - x, x - far));
                    float dy = Mathf.Max(0f, Mathf.Max(radius - 0.5f - y, y - far));
                    float dist = Mathf.Sqrt(dx * dx + dy * dy);
                    float alpha = Mathf.Clamp01(radius - dist + 0.5f);
                    tex.SetPixel(x, y, new Color(1f, 1f, 1f, alpha));
                }
            }
            tex.Apply();

            float b = radius + 1f;
            Sprite sprite = Sprite.Create(tex, new Rect(0f, 0f, size, size), new Vector2(0.5f, 0.5f),
                100f, 0, SpriteMeshType.FullRect, new Vector4(b, b, b, b));
            RoundedCache[radius] = sprite;
            return sprite;
        }

        /// <summary>Кайма толщиной 1px с тем же скруглением — «мягкая» рамка панелей.</summary>
        public static Sprite RoundedBorder(int radius)
        {
            Sprite cached;
            int key = -radius - 1;                  // отрицательный ключ, чтобы не путать с заливкой
            if (RoundedCache.TryGetValue(key, out cached) && cached != null) return cached;

            int size = radius * 2 + 2;
            Texture2D tex = new Texture2D(size, size, TextureFormat.RGBA32, false);
            tex.filterMode = FilterMode.Bilinear;
            tex.wrapMode = TextureWrapMode.Clamp;

            float far = size - 1 - radius;
            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    float dx = Mathf.Max(0f, Mathf.Max(radius - 0.5f - x, x - far));
                    float dy = Mathf.Max(0f, Mathf.Max(radius - 0.5f - y, y - far));
                    float dist = Mathf.Sqrt(dx * dx + dy * dy);
                    float outer = Mathf.Clamp01(radius - dist + 0.5f);
                    float inner = Mathf.Clamp01(radius - 1f - dist + 0.5f);
                    tex.SetPixel(x, y, new Color(1f, 1f, 1f, Mathf.Clamp01(outer - inner)));
                }
            }
            tex.Apply();

            float b = radius + 1f;
            Sprite sprite = Sprite.Create(tex, new Rect(0f, 0f, size, size), new Vector2(0.5f, 0.5f),
                100f, 0, SpriteMeshType.FullRect, new Vector4(b, b, b, b));
            RoundedCache[key] = sprite;
            return sprite;
        }

        /// <summary>Спрайт-рамка 3x3: белое кольцо, прозрачная середина (тип Sliced, border = 1px).</summary>
        static Sprite MakeBorderSprite()
        {
            Texture2D tex = new Texture2D(3, 3, TextureFormat.RGBA32, false);
            tex.filterMode = FilterMode.Point;
            tex.wrapMode = TextureWrapMode.Clamp;
            for (int y = 0; y < 3; y++)
            {
                for (int x = 0; x < 3; x++)
                {
                    bool edge = x == 0 || y == 0 || x == 2 || y == 2;
                    tex.SetPixel(x, y, edge ? Color.white : new Color(1f, 1f, 1f, 0f));
                }
            }
            tex.Apply();
            return Sprite.Create(tex, new Rect(0f, 0f, 3f, 3f), new Vector2(0.5f, 0.5f), 100f,
                0, SpriteMeshType.FullRect, new Vector4(1f, 1f, 1f, 1f));
        }

        static Font LoadFont(string path)
        {
            Font f = Resources.Load<Font>(path);
            if (f == null) Debug.LogWarning("Не найден шрифт Assets/Resources/" + path + ".ttf");
            return f;
        }

        static Font BuiltinFont()
        {
            // запасной вариант, если шрифты из Resources почему-то не импортировались
            try { return Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"); }
            catch (System.Exception) { }
            try { return Resources.GetBuiltinResource<Font>("Arial.ttf"); }
            catch (System.Exception) { }
            return null;
        }

        /// <summary>
        /// Шрифт для текста с иконкой: если основного моношрифта не хватает
        /// (например нет глифа ₿), берём JetBrainsMono-LatinExt.
        /// Важно: тексты на кириллице так подменять нельзя — в сабсете JetBrains
        /// кириллицы нет (см. INSTALL.md в корне репозитория).
        /// </summary>
        public static Font IconFontFor(string text)
        {
            if (string.IsNullOrEmpty(text) || IconFont == null || Mono == null) return Mono;
            for (int i = 0; i < text.Length; i++)
            {
                char c = text[i];
                if (c < 128) continue;
                if (!Mono.HasCharacter(c) && IconFont.HasCharacter(c)) return IconFont;
            }
            return Mono;
        }

        public static Color Hex(string hex)
        {
            Color c;
            if (!string.IsNullOrEmpty(hex) && ColorUtility.TryParseHtmlString(hex, out c)) return c;
            return Color.white;
        }

        public static Color WithAlpha(Color c, float a)
        {
            return new Color(c.r, c.g, c.b, a);
        }

        public static Color Brightness(Color c, float mul)
        {
            return new Color(Mathf.Clamp01(c.r * mul), Mathf.Clamp01(c.g * mul), Mathf.Clamp01(c.b * mul), c.a);
        }

        public static Color Mix(Color a, Color b, float t)
        {
            return new Color(Mathf.Lerp(a.r, b.r, t), Mathf.Lerp(a.g, b.g, t),
                Mathf.Lerp(a.b, b.b, t), Mathf.Lerp(a.a, b.a, t));
        }

        /// <summary>Цвет по «ключу» из данных (green/cyan/pink/yellow/orange).</summary>
        public static Color ByKey(string key)
        {
            if (key == "cyan") return Cyan;
            if (key == "pink") return Pink;
            if (key == "yellow") return Yellow;
            if (key == "orange") return Orange;
            if (key == "red") return Pink;
            return Green;
        }

        public static Color KindColor(string kind)
        {
            if (kind == "ok") return Green;
            if (kind == "gold") return Yellow;
            if (kind == "err") return Pink;
            if (kind == "warn") return Orange;
            return Cyan;
        }

        // ---------------- Измерение текста (моношрифт!) ----------------
        public static float CharWidth(int fontSize)
        {
            return (float)fontSize * CharWidthRatio;
        }

        public static float LineHeight(int fontSize)
        {
            return (float)fontSize * LineHeightRatio;
        }

        /// <summary>Сколько строк займёт текст при заданной ширине (жадная переноска слов).</summary>
        public static int WrappedLineCount(string text, int fontSize, float width)
        {
            if (string.IsNullOrEmpty(text)) return 1;
            float charW = CharWidth(fontSize);
            if (charW <= 0f) return 1;
            int perLine = Mathf.Max(1, (int)(width / charW));
            int lines = 0;
            string[] paragraphs = text.Split('\n');
            for (int p = 0; p < paragraphs.Length; p++)
            {
                string para = paragraphs[p];
                if (para.Length == 0)
                {
                    lines++;
                    continue;
                }
                int cur = 0;
                string[] words = para.Split(' ');
                for (int w = 0; w < words.Length; w++)
                {
                    int len = words[w].Length;
                    if (cur == 0)
                    {
                        cur = len;
                        if (len > perLine)   // очень длинное слово рвём по символам
                        {
                            lines += (len - 1) / perLine;
                            cur = len % perLine;
                        }
                    }
                    else if (cur + 1 + len <= perLine)
                    {
                        cur += 1 + len;
                    }
                    else
                    {
                        lines++;
                        cur = len;
                    }
                }
                lines++;
            }
            return Mathf.Max(1, lines);
        }

        public static float WrappedHeight(string text, int fontSize, float width)
        {
            return (float)WrappedLineCount(text, fontSize, width) * LineHeight(fontSize);
        }
    }
}
