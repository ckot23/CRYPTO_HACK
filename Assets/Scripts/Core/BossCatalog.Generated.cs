/* ==========================================================================
   BossCatalog.Generated.cs — данные четырёх сюжетных боссов.

   ФАЙЛ СГЕНЕРИРОВАН: tools/web/gen-unity-templates.py
   из web/js/core/bosses.js (там же живут их тексты). Руками не править —
   правь bosses.js и запусти:
       python3 tools/web/gen-unity-templates.py

   Логика цепочки (кто открыт, кого выдать следующим) — в BossCatalog.cs.
   ========================================================================== */
using System;

namespace CryptoHack
{
    /// <summary>Один сюжетный босс: легенда, задание, награда и условие открытия.</summary>
    public class BossData
    {
        public int Index;
        public int Id;
        public string Name = "";
        public string Subtitle = "";
        public string Glyph = "";
        public string TargetName = "";
        public string Os = "";
        public int Security;
        public int Need;              // сколько контрактов должно быть закрыто
        public string Coin = "BTC";
        public float Amount;
        public float Dollars;
        public int Xp;
        public int CodeLib;
        public string TemplateId = "";  // на каком шаблоне построено задание
        public string Briefing = "";
        public string Task = "";
        public string StarterCode = "";
        public string Solution = "";
        public string[] RequiredPatterns = new string[0];
        public string[] Hints = new string[0];
        public string[] Theory = new string[0];
    }

    public static class BossCatalogGenerated
    {
        public static readonly BossData[] All = new BossData[]
        {
            new BossData
            {
                Index = 1,
                Id = 9001,
                Name = "ГИДРА",
                Subtitle = "сеть из двенадцати узлов",
                Glyph = "☠",
                TargetName = "Кластер «Гидра» (12 узлов)",
                Os = "Linux · Kubernetes",
                Security = 84,
                Need = 2,
                Coin = "BTC",
                Amount = 0.012f,
                Dollars = 2600,
                Xp = 900,
                CodeLib = 3,
                TemplateId = "nested_loop",
                Briefing = "Первая серьёзная цель: кластер из двенадцати узлов, отрубишь один — поднимется другой. " + "Внутри крутится ботнет и чужой майнер. Работать придётся вложенными циклами: по узлам и по кодам доступа.",
                Task = "Пройди 3 узла, и для каждого перебери 2 кода: вложенный цикл for i in range(3) → for j in range(2) → brute(j), " + "затем bypass() и печать «Гидра обезглавлена».",
                StarterCode = "# ГИДРА: вложенные циклы\n# for i in range(3):\n#     for j in range(2):\n#         brute(j)\n\n# bypass()\n# print(\"Гидра обезглавлена\")\n",
                Solution = "for i in range(3):\n    for j in range(2):\n        brute(j)\n\nbypass()\nprint(\"Гидра обезглавлена\")",
                RequiredPatterns = new[] { "for\\s+\\w+\\s+in\\s+range\\s*\\(\\s*3\\s*\\)[\\s\\S]*for\\s+\\w+\\s+in\\s+range", "brute\\s*\\(", "bypass\\s*\\(", "print\\s*\\(" },
                Hints = new[] { "Внешний цикл идёт по узлам: for i in range(3):", "Внутренний — по кодам, с отступом: for j in range(2):", "Тело внутреннего цикла с двойным отступом: brute(j)", "После циклов обойди защиту bypass() и напечатай результат." },
                Theory = new[] { "Вложенные циклы дают полный перебор: 3 узла × 2 кода = 6 попыток.", "Отступы в Python показывают, какой цикл внутренний.", "Боссы не прощают порядка команд: сначала перебор, потом обход защиты." },
            },
            new BossData
            {
                Index = 2,
                Id = 9002,
                Name = "ЧЁРНЫЙ АРХИВ",
                Subtitle = "4 ТБ компромата за шифрованием",
                Glyph = "⚔",
                TargetName = "Хранилище «Чёрный архив»",
                Os = "FreeBSD · ZFS",
                Security = 88,
                Need = 5,
                Coin = "ETH",
                Amount = 0.5f,
                Dollars = 3900,
                Xp = 1300,
                CodeLib = 3,
                TemplateId = "func_return",
                Briefing = "Архив стоит на шифровании: ключ проверяется функцией. Тебе нужна своя функция проверки, " + "которая вернёт True и пустит внутрь. Хозяева архива уверены, что до него не доберутся.",
                Task = "Напиши функцию unlock(key) с проверкой ключа через if и return, вызови её в условии if unlock(\"neon-77\"), " + "затем bypass(), сохрани decrypt() в data и напечатай его.",
                StarterCode = "# ЧЁРНЫЙ АРХИВ\n# def unlock(key):\n#     if key == \"neon-77\":\n#         return True\n#     return False\n\n# if unlock(\"neon-77\"):\n#     bypass()\n#     data = decrypt()\n#     print(data)\n",
                Solution = "def unlock(key):\n    if key == \"neon-77\":\n        return True\n    return False\n\nif unlock(\"neon-77\"):\n    bypass()\n    data = decrypt()\n    print(data)",
                RequiredPatterns = new[] { "def\\s+unlock\\s*\\(", "return\\b", "if\\s+unlock\\s*\\(", "bypass\\s*\\(", "decrypt\\s*\\(", "print\\s*\\(" },
                Hints = new[] { "Функция: def unlock(key): — внутри проверка if key == \"neon-77\":", "Верни результат через return True / return False.", "Вызови функцию в условии: if unlock(\"neon-77\"):", "Внутри блока расшифруй данные: data = decrypt(), потом print(data)." },
                Theory = new[] { "def + return позволяют вынести проверку в отдельное имя.", "Функция возвращает значение, а if решает, что делать дальше.", "decrypt() возвращает расшифрованную сид-фразу — её и печатаем." },
            },
            new BossData
            {
                Index = 3,
                Id = 9003,
                Name = "СОВЕТ ДЕВЯТИ",
                Subtitle = "кошельки девяти посредников",
                Glyph = "☣",
                TargetName = "Сеть посредников «Совет девяти»",
                Os = "Windows Server 2022",
                Security = 92,
                Need = 9,
                Coin = "XMR",
                Amount = 40,
                Dollars = 5600,
                Xp = 1800,
                CodeLib = 3,
                TemplateId = "dict_wallets",
                Briefing = "Девять посредников держат общий пул. Кошельки лежат в словаре: адрес → сумма. " + "Нужно пройти по парам, вывести средства с каждого и посчитать, сколько всего ушло.",
                Task = "Собери словарь wallets с тремя адресами и суммами, циклом по wallets.items() вызывай drain(address) " + "и суммируй в total через +=, в конце напечатай total.",
                StarterCode = "wallets = {\"0xA1\": 0.4, \"0xB2\": 1.2, \"0xC3\": 2.4}\n\ntotal = 0\n\n# for address, amount in wallets.items():\n#     drain(address)\n#     total += amount\n\n# print(total)\n",
                Solution = "wallets = {\"0xA1\": 0.4, \"0xB2\": 1.2, \"0xC3\": 2.4}\n\ntotal = 0\n\nfor address, amount in wallets.items():\n    drain(address)\n    total += amount\n\nprint(total)",
                RequiredPatterns = new[] { "wallets\\s*=\\s*\\{", "items\\s*\\(\\s*\\)", "drain\\s*\\(", "total\\s*\\+=", "print\\s*\\(" },
                Hints = new[] { "Словарь — фигурные скобки, пары через запятую: \"0xA1\": 0.4", "Цикл по парам: for address, amount in wallets.items():", "Внутри цикла два действия: drain(address) и total += amount.", "Накопитель total обнули до цикла." },
                Theory = new[] { "Словарь хранит пары «ключ: значение», .items() отдаёт их в цикл.", "Две переменные цикла получают ключ (адрес) и значение (сумму).", "total += amount накапливает итог по всем кошелькам." },
            },
            new BossData
            {
                Index = 4,
                Id = 9004,
                Name = "ТИТАН",
                Subtitle = "финальный экзамен",
                Glyph = "✦",
                TargetName = "Дата-центр «Титан»",
                Os = "Linux · bare metal",
                Security = 97,
                Need = 14,
                Coin = "SOL",
                Amount = 60,
                Dollars = 8400,
                Xp = 2600,
                CodeLib = 3,
                TemplateId = "try_except",
                Briefing = "Последняя цель в сети. Тут всё сразу: обход защиты, страховка от ошибок, майнеры и заметание следов. " + "Никто не ждёт, что ты дойдёшь до сюда.",
                Task = "Работай аккуратно: в цикле из 3 попыток поставь майнер в try/except (при ошибке печатай «промах»), " + "затем циклом while i < 2 вызови ghost() дважды и напечатай «Титан пал».",
                StarterCode = "# ТИТАН\n# for i in range(3):\n#     try:\n#         install_miner()\n#     except Exception:\n#         print(\"промах\")\n\n# i = 0\n# while i < 2:\n#     ghost()\n#     i += 1\n\n# print(\"Титан пал\")\n",
                Solution = "for i in range(3):\n    try:\n        install_miner()\n    except Exception:\n        print(\"промах\")\n\ni = 0\nwhile i < 2:\n    ghost()\n    i += 1\n\nprint(\"Титан пал\")",
                RequiredPatterns = new[] { "try\\s*:", "except\\b", "install_miner\\s*\\(", "while\\s+", "ghost\\s*\\(", "print\\s*\\(" },
                Hints = new[] { "Первая часть: цикл по попыткам for i in range(3):", "Внутри — try: install_miner() и except Exception: print(\"промах\")", "Вторая часть: счётчик i = 0 и while i < 2: с ghost() внутри.", "Не забудь увеличивать счётчик: i += 1 — иначе цикл не закончится." },
                Theory = new[] { "try/except защищает от падения: одна ошибка не срывает всю операцию.", "while повторяет блок, пока условие True — счётчик обязателен.", "ghost() заметает следы: после финальной цели это хорошая привычка." },
            },
        };
    }
}
