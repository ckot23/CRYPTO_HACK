/* ==========================================================================
   ContractGenerator.cs — генератор случайных контрактов для Unity-версии.

   Полный аналог web/js/core/generator.js: те же сложности, те же пулы целей,
   кодовых имён и причин заказа, та же формула награды и тот же генератор
   случайных чисел (mulberry32), поэтому контракт с одинаковым seed выглядит
   в Unity и в браузере одинаково (это проверяет tools/unity).

   Сами тексты заданий лежат в ContractTemplates.cs — он генерируется из
   браузерного generator.js скриптом tools/web/gen-unity-templates.py, чтобы
   контент обеих версий не расходился.
   ========================================================================== */
using System;
using System.Collections.Generic;
using UnityEngine;

namespace CryptoHack
{
    /// <summary>Сложность контракта: требования, разброс защиты и награды.</summary>
    public class TierDef
    {
        public string Key = "";
        public string Label = "";
        public string Accent = "#4fe0a8";
        public string Coin = "BTC";
        public int Index;
        public int MinLevel = 1;
        public int CodeLib;
        public int[] Security = new int[2];
        public int[] Dollars = new int[2];
        public int[] Xp = new int[2];
        public double[] Amount = new double[2];
        public string Blurb = "";

        public bool Unlocked(int level, int codeLib)
        {
            return level >= MinLevel && codeLib >= CodeLib;
        }

        /// <summary>Чего не хватает для доступа к сложности (пусто — можно брать).</summary>
        public string Requirement(int level, int codeLib)
        {
            string text = "";
            if (level < MinLevel) text = "уровень " + MinLevel;
            if (codeLib < CodeLib)
            {
                if (text.Length > 0) text += " · ";
                text += "библиотека кода ур. " + CodeLib;
            }
            return text;
        }
    }

    /// <summary>Цель контракта: имя, ОС и «местный колорит» для брифинга.</summary>
    public class TargetInfo
    {
        public string Name = "";
        public string Os = "";
        public string Flavor = "";

        public TargetInfo(string name, string os, string flavor)
        {
            Name = name;
            Os = os;
            Flavor = flavor;
        }
    }

    /// <summary>mulberry32 — тот же ГПСЧ, что и в веб-версии (побитовая точность).</summary>
    public class GenRng
    {
        uint _a;

        public GenRng(int seed)
        {
            _a = unchecked((uint)seed);
        }

        public double Next()
        {
            unchecked
            {
                _a = _a + 0x6D2B79F5u;
                uint t = _a;
                t = (t ^ (t >> 15)) * (t | 1u);
                t ^= t + (t ^ (t >> 7)) * (t | 61u);
                return (t ^ (t >> 14)) / 4294967296.0;
            }
        }

        public int Rint(int lo, int hi)
        {
            return lo + (int)Math.Floor(Next() * (hi - lo + 1));
        }

        public double Rrange(int lo, int hi)
        {
            return lo + Next() * (hi - lo);
        }

        /// <summary>Дробный диапазон — для сумм в крипте.</summary>
        public double Rrange(double lo, double hi)
        {
            return lo + Next() * (hi - lo);
        }

        public T Pick<T>(T[] list)
        {
            return list[(int)Math.Floor(Next() * list.Length) % list.Length];
        }
    }

    /// <summary>Контекст цели, который получает шаблон задания.</summary>
    public class GenContext
    {
        public GenRng Rng;
        public TierDef Tier;
        public int Index;
        public string Ip = "";
        public string Os = "";
        public int Security;
        public string Coin = "BTC";
        public string TargetName = "";
        public string TargetOs = "";
    }

    /// <summary>Превью награды: что игрок увидит до взятия контракта.</summary>
    public class ContractPreview
    {
        public int Dollars;
        public int Xp;
        public double Amount;
        public string Coin = "BTC";
    }

    /// <summary>Краткая справка о шаблоне (для тестов и подсказок интерфейса).</summary>
    public class TemplateInfo
    {
        public string Id = "";
        public int[] Tiers = new int[0];
        public string Concept = "";
        public int CodeLib;
    }

    public static class ContractGenerator
    {
        /* ------------------------------ Сложности ------------------------------ */
        public static readonly TierDef[] Tiers = new TierDef[]
        {
            new TierDef
            {
                Key = "easy", Label = "ЛЕГКО", Accent = "#4fe0a8", Coin = "BTC",
                MinLevel = 1, CodeLib = 0, Security = new[] { 8, 26 },
                Dollars = new[] { 60, 130 }, Xp = new[] { 110, 170 }, Amount = new[] { 0.0012, 0.0032 },
                Blurb = "Домашние машины, слабые пароли, быстрый профит."
            },
            new TierDef
            {
                Key = "medium", Label = "СРЕДНЕ", Accent = "#ffd479", Coin = "ETH",
                MinLevel = 2, CodeLib = 0, Security = new[] { 30, 50 },
                Dollars = new[] { 180, 340 }, Xp = new[] { 200, 300 }, Amount = new[] { 0.02, 0.06 },
                Blurb = "Есть антивирус и вменяемые пароли."
            },
            new TierDef
            {
                Key = "hard", Label = "СЛОЖНО", Accent = "#ffb27a", Coin = "XMR",
                MinLevel = 3, CodeLib = 1, Security = new[] { 52, 72 },
                Dollars = new[] { 420, 720 }, Xp = new[] { 320, 460 }, Amount = new[] { 2.0, 6.0 },
                Blurb = "Корпоративные сети, шифрование, логи."
            },
            new TierDef
            {
                Key = "expert", Label = "ЭКСПЕРТ", Accent = "#ff7aa8", Coin = "SOL",
                MinLevel = 5, CodeLib = 3, Security = new[] { 74, 96 },
                Dollars = new[] { 900, 1700 }, Xp = new[] { 480, 700 }, Amount = new[] { 3.0, 9.0 },
                Blurb = "Дата-центры и кошельки китов. Тут ошибаться нельзя."
            }
        };

        static readonly Dictionary<string, TierDef> TierByKey = new Dictionary<string, TierDef>();

        /* -------------------------------- Цели --------------------------------- */
        static readonly TargetInfo[] Targets = new TargetInfo[]
        {
            new TargetInfo("Домашний ПК школьника", "Win10 Home", "Скачал майнер с торрентов и удивился."),
            new TargetInfo("Ноутбук криптотрейдера", "macOS Sonoma", "Сид-фраза лежит в заметках. В заметках, Карл."),
            new TargetInfo("Рабочая станция дизайнера", "Win11 Pro", "Пароль — имя кота, но кот сложный."),
            new TargetInfo("Сервер бухгалтерии «Ромашка»", "Windows Server 2019", "1С, зарплаты и ни одного обновления с 2019 года."),
            new TargetInfo("Касса кофейни «Неон»", "Ubuntu 22.04", "Терминал на витрине, пароль от витрины на стикере."),
            new TargetInfo("Домашний NAS архиватора", "Debian 12", "Хранит 4 ТБ чужих сериалов и один кошелёк."),
            new TargetInfo("Сервер майнинг-пула", "Arch Linux", "Сам майнит, но и его можно умайнить."),
            new TargetInfo("Ноутбук юриста", "Win10 Pro", "Договоры, сканы паспортов и пароль «qwerty2019»."),
            new TargetInfo("Терминал в банке «Северный»", "Windows Server 2016", "Тонкий клиент, толстая жадность."),
            new TargetInfo("Планшет курьера", "Android 14", "Постоянно в дороге, поэтому роутер домашний открыт."),
            new TargetInfo("ПК главбуха", "Win7 Ultimate", "Windows 7 в наше время — это уже уязвимость."),
            new TargetInfo("Умный дом инженера", "Linux (OpenWRT)", "Умный дом, глупые пароли на камерах."),
            new TargetInfo("Сервер геймдев-студии", "Ubuntu 24.04", "Билды, исходники и кошелёк с премиями."),
            new TargetInfo("Рабочая станция блогера", "macOS Ventura", "Черновики, рекламные контракты и донаты."),
            new TargetInfo("Роутер хостела «Байт»", "RouterOS 7", "Через него ходит весь трафик этажа."),
            new TargetInfo("Сервер доставки «Скорость»", "Alpine Linux", "Заказы, адреса, телефоны — и никакого шифрования.")
        };

        static readonly string[] Codenames = new string[]
        {
            "Тихий доступ", "Утренний слив", "Ночная смена", "Стеклянный дом", "Горячий кошелёк",
            "Слепое пятно", "Ледяной след", "Медовый трафик", "Красная дверь", "Тихий порт",
            "Полый диск", "Седьмой этаж", "Холодный старт", "Бумажный тигр", "Тихая гавань",
            "Обратный след", "Синий протокол", "Пепел архива"
        };

        static readonly string[] PayerReasons = new string[]
        {
            "заказчик просит вернуть своё",
            "нужно вытащить данные до аудита",
            "клиент хочет доказать, что защита дырявая",
            "трофей нужен к утру",
            "работа оплачена вперёд"
        };

        static ContractGenerator()
        {
            for (int i = 0; i < Tiers.Length; i++)
            {
                Tiers[i].Index = i;
                TierByKey[Tiers[i].Key] = Tiers[i];
            }
        }

        public static TierDef Tier(string key)
        {
            TierDef t;
            if (key != null && TierByKey.TryGetValue(key, out t)) return t;
            return null;
        }

        /* --------------------------- Мелкие помощники --------------------------- */
        static string MakeIp(GenRng rng)
        {
            int variant = rng.Rint(0, 3);
            if (variant == 0) return "192.168." + rng.Rint(0, 8) + "." + rng.Rint(2, 250);
            if (variant == 1) return "10." + rng.Rint(0, 40) + "." + rng.Rint(0, 20) + "." + rng.Rint(2, 250);
            if (variant == 2) return "172." + rng.Rint(16, 31) + "." + rng.Rint(0, 30) + "." + rng.Rint(2, 250);
            return "85." + rng.Rint(100, 200) + "." + rng.Rint(1, 200) + "." + rng.Rint(2, 250);
        }

        /// <summary>Число как в JS toFixed(): всегда точка и ровно N знаков.</summary>
        static string ToFixed(double value, int digits)
        {
            return value.ToString("F" + digits, System.Globalization.CultureInfo.InvariantCulture);
        }

        static string Capitalize(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            return char.ToUpper(s[0]) + s.Substring(1);
        }

        /* ------------------------- Рост награды от прогресса -------------------- */
        public static double GrowthFor(int contractsDone)
        {
            return 1.0 + 0.09 * Math.Max(0, contractsDone);
        }

        public static ContractPreview Preview(string tierKey, int contractsDone)
        {
            TierDef t = Tier(tierKey);
            if (t == null) return null;
            double g = GrowthFor(contractsDone);
            ContractPreview p = new ContractPreview();
            p.Dollars = (int)Math.Round((t.Dollars[0] + t.Dollars[1]) / 2.0 * g, MidpointRounding.AwayFromZero);
            p.Xp = (int)Math.Round((t.Xp[0] + t.Xp[1]) / 2.0 * g, MidpointRounding.AwayFromZero);
            p.Amount = (t.Amount[0] + t.Amount[1]) / 2.0 * g;
            p.Coin = t.Coin;
            return p;
        }

        /* ------------------------------ Шаблоны -------------------------------- */
        public static MissionTemplate[] TemplatesFor(string tierKey)
        {
            TierDef t = Tier(tierKey);
            if (t == null) return new MissionTemplate[0];
            List<MissionTemplate> pool = new List<MissionTemplate>();
            for (int i = 0; i < ContractTemplates.All.Length; i++)
            {
                MissionTemplate tpl = ContractTemplates.All[i];
                for (int k = 0; k < tpl.Tiers.Length; k++)
                {
                    if (tpl.Tiers[k] == t.Index) { pool.Add(tpl); break; }
                }
            }
            return pool.ToArray();
        }

        public static TemplateInfo[] AllTemplates()
        {
            TemplateInfo[] list = new TemplateInfo[ContractTemplates.All.Length];
            for (int i = 0; i < list.Length; i++)
            {
                MissionTemplate tpl = ContractTemplates.All[i];
                TemplateInfo info = new TemplateInfo();
                info.Id = tpl.Id;
                info.Tiers = (int[])tpl.Tiers.Clone();
                info.Concept = tpl.Concept;
                info.CodeLib = tpl.CodeLib;
                list[i] = info;
            }
            return list;
        }

        /* ---------------------------- Генерация -------------------------------- */
        /// <summary>
        /// Собрать контракт. index — номер контракта (1, 2, 3…), tierKey — сложность,
        /// seed — «зерно» (одинаковое зерно даёт одинаковый контракт в обеих версиях).
        /// </summary>
        public static Mission Generate(int index, string tierKey, int seed, int contractsDone,
            int codeLib, string templateId)
        {
            if (index < 1) index = 1;
            TierDef tier = Tier(tierKey);
            if (tier == null) tier = Tiers[0];

            int mixed = seed ^ unchecked((int)((uint)index * 2654435761u));
            GenRng rng = new GenRng(mixed);

            TargetInfo target = rng.Pick(Targets);
            string ip = MakeIp(rng);
            int security = rng.Rint(tier.Security[0], tier.Security[1]);
            string codename = rng.Pick(Codenames);
            string reason = rng.Pick(PayerReasons);

            List<MissionTemplate> pool = new List<MissionTemplate>(TemplatesFor(tier.Key));
            if (!string.IsNullOrEmpty(templateId))
            {
                for (int i = 0; i < ContractTemplates.All.Length; i++)
                {
                    if (ContractTemplates.All[i].Id == templateId)
                    {
                        pool = new List<MissionTemplate>();
                        pool.Add(ContractTemplates.All[i]);
                        break;
                    }
                }
            }
            // если у игрока ещё нет нужных функций — не подсовываем непроходимое задание
            List<MissionTemplate> allowed = new List<MissionTemplate>();
            for (int i = 0; i < pool.Count; i++)
            {
                if (pool[i].CodeLib <= codeLib) allowed.Add(pool[i]);
            }
            if (allowed.Count > 0) pool = allowed;
            if (pool.Count == 0) pool.Add(ContractTemplates.All[0]);

            MissionTemplate template = rng.Pick(pool.ToArray());

            GenContext ctx = new GenContext();
            ctx.Rng = rng;
            ctx.Tier = tier;
            ctx.Index = index;
            ctx.Ip = ip;
            ctx.Os = target.Os;
            ctx.Security = security;
            ctx.Coin = tier.Coin;
            ctx.TargetName = target.Name;
            ctx.TargetOs = target.Os;

            BuiltTemplate built = template.Build(ctx);

            double growth = GrowthFor(contractsDone);
            double jitter = 0.88 + rng.Next() * 0.24;                 // ±12% — контракты не близнецы
            int dollars = Math.Max(20, (int)Math.Round(rng.Rrange(tier.Dollars[0], tier.Dollars[1]) * growth * jitter,
                MidpointRounding.AwayFromZero));
            int xp = Math.Max(30, (int)Math.Round(rng.Rrange(tier.Xp[0], tier.Xp[1]) * growth * jitter,
                MidpointRounding.AwayFromZero));
            double amount = rng.Rrange(tier.Amount[0], tier.Amount[1]) * growth * jitter;
            int digits = amount < 0.01 ? 6 : (amount < 1 ? 4 : 3);
            amount = Math.Round(amount, digits, MidpointRounding.AwayFromZero);

            Mission m = new Mission();
            m.Id = 1000 + index;
            m.Generated = true;
            m.ContractIndex = index;
            m.TierKey = tier.Key;
            m.TierLabel = tier.Label;
            m.TierAccent = tier.Accent;
            m.TierIndex = tier.Index;
            m.Codename = codename;
            m.Title = "ОПЕРАЦИЯ #" + index + " · " + codename;
            m.TargetName = target.Name;
            m.TargetIp = ip;
            m.Os = target.Os;
            m.Security = security;
            m.Difficulty = tier.Label;
            m.Concept = template.Concept;
            m.ConceptDesc = template.ConceptDesc;
            m.Briefing = target.Name + " — " + target.Flavor + " Говорят, там лежит около "
                + ToFixed(tier.Amount[0], digits) + "–" + ToFixed(tier.Amount[1], digits) + " " + tier.Coin
                + " (защита " + security + "%). " + Capitalize(reason)
                + " — цена вопроса: $" + dollars + " плюс крипта с кошельков.";
            m.Task = built.Task;
            m.StarterCode = built.StarterCode;
            m.Solution = built.Solution;
            m.Hints = built.Hints;
            m.RequiredPatterns = built.RequiredPatterns;
            m.RewardCrypto = tier.Coin;
            m.RewardAmount = (float)amount;
            m.RewardDollars = dollars;
            m.RewardXp = xp;
            m.RequiredCodeLib = Math.Max(tier.CodeLib, template.CodeLib);
            m.RequiredLevel = tier.MinLevel;
            m.Theory = built.Theory;
            return m;
        }

        /// <summary>Сгенерировать контракт со случайным зерном — как в игре.</summary>
        public static Mission GenerateRandom(int index, string tierKey, int contractsDone, int codeLib)
        {
            return Generate(index, tierKey, UnityEngine.Random.Range(0, int.MaxValue), contractsDone, codeLib, null);
        }
    }
}
