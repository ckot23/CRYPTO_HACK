/* ==========================================================================
   ContractTemplates.cs — 23 шаблона контрактов для Unity-версии.

   ФАЙЛ СГЕНЕРИРОВАН: tools/web/gen-unity-templates.py
   из web/js/core/generator.js (тексты заданий живут там же, где в браузере).
   Руками не править — правь generator.js и запусти:
       python3 tools/web/gen-unity-templates.py

   Каждый шаблон — функция, которая получает контекст цели (GenContext) и
   возвращает поля задания: текст, стартовый код, решение, обязательные
   конструкции, подсказки и теорию.
   ========================================================================== */
using System;

namespace CryptoHack
{
    /// <summary>Собранные поля одного задания (то, что возвращает build в JS).</summary>
    public class BuiltTemplate
    {
        public string Task = "";
        public string StarterCode = "";
        public string Solution = "";
        public string[] RequiredPatterns = new string[0];
        public string[] Hints = new string[0];
        public string[] Theory = new string[0];
    }

    /// <summary>Шаблон задания: где доступен, чему учит и как собирается.</summary>
    public class MissionTemplate
    {
        public string Id = "";
        public int[] Tiers = new int[0];
        public int CodeLib;
        public string Concept = "";
        public string ConceptDesc = "";
        public Func<GenContext, BuiltTemplate> Build;
    }

    public static class ContractTemplates
    {
        // ---------------------------------------------------------------
        //  Помощники, которыми пользуются шаблоны (аналоги функций из JS)
        // ---------------------------------------------------------------

        /// <summary>Случайное целое в диапазоне [lo, hi] — как rint() в generator.js.</summary>
        internal static int Rint(GenRng rng, int lo, int hi)
        {
            return lo + (int)Math.Floor(rng.Next() * (hi - lo + 1));
        }

        /// <summary>Первые n элементов массива — как array.slice(0, n).</summary>
        internal static T[] Take<T>(T[] src, int n)
        {
            int count = n < 0 ? 0 : (n > src.Length ? src.Length : n);
            T[] result = new T[count];
            for (int i = 0; i < count; i++) result[i] = src[i];
            return result;
        }

        /// <summary>Список адресов в виде литерала Python: "0xA1", "0xB2".</summary>
        internal static string JoinQuoted(string[] items)
        {
            string result = "";
            for (int i = 0; i < items.Length; i++)
            {
                if (i > 0) result += ", ";
                result += "\"" + items[i] + "\"";
            }
            return result;
        }

        /// <summary>Пары «адрес: сумма» для словаря: "0xA1": 0.4, "0xB2": 1.2.</summary>
        internal static string JoinPairs(string[][] pairs)
        {
            string result = "";
            for (int i = 0; i < pairs.Length; i++)
            {
                if (i > 0) result += ", ";
                result += pairs[i][0] + ": " + pairs[i][1];
            }
            return result;
        }

        /// <summary>Экранирование текста для регулярки — как escapeRe в генераторе.</summary>
        internal static string EscapeRe(string text)
        {
            return System.Text.RegularExpressions.Regex.Escape(text);
        }

        /// <summary>Последняя часть IP — как c.ip.split(".").pop().</summary>
        internal static string IpTail(string ip)
        {
            int dot = ip.LastIndexOf('.');
            return dot >= 0 ? ip.Substring(dot + 1) : ip;
        }

        // ---------------------------------------------------------------
        //  Сами шаблоны
        // ---------------------------------------------------------------
        public static readonly MissionTemplate[] All = new MissionTemplate[]
        {
            new MissionTemplate
            {
                Id = "scan",
                Tiers = new[] { 0 },
                CodeLib = 0,
                Concept = "Функции и вызовы: scan()",
                ConceptDesc = "В Python функция — это команда. Чтобы её запустить, напиши имя и скобки ().",
                Build = delegate (GenContext c)
                {
                    BuiltTemplate b = new BuiltTemplate();
                    b.Task = "Вызови функцию scan(), чтобы найти устройства в сети.";
                    b.StarterCode = "# Сканируем сеть\n# Вызови функцию scan() — имя и скобки\n\n";
                    b.Solution = "scan()";
                    b.RequiredPatterns = new[] { "scan\\s*\\(\\s*\\)" };
                    b.Hints = new[] { "Функции вызываются так: имя_функции()", "Напиши на новой строке: scan()", "Скобки обязательны — без них Python не выполнит команду." };
                    b.Theory = new[] { "Функция — готовый блок кода, который выполняет действие.", "scan() в NeonHack Framework сканирует подсеть и возвращает список устройств.", "Скобки () означают «выполнить сейчас»." };
                    return b;
                }
            },
            new MissionTemplate
            {
                Id = "vars",
                Tiers = new[] { 0, 1 },
                CodeLib = 0,
                Concept = "Переменные: имя = значение",
                ConceptDesc = "Переменная — это коробка с подписью. scan() вернёт адрес цели, сохрани его и напечатай.",
                Build = delegate (GenContext c)
                {
                    BuiltTemplate b = new BuiltTemplate();
                    b.Task = "Сохрани результат scan() в переменную target и напечатай её через print(target).";
                    b.StarterCode = "# Найди цель и сохрани адрес в переменную\n\n";
                    b.Solution = "target = scan()\nprint(target)";
                    b.RequiredPatterns = new[] { "target\\s*=\\s*scan\\s*\\(", "print\\s*\\(\\s*target\\s*\\)" };
                    b.Hints = new[] { "Присваивание — один знак равно: target = scan()", "Чтобы напечатать значение переменной, передай её в print(): print(target)", "Порядок важен: сначала присваиваем, потом печатаем." };
                    b.Theory = new[] { "= кладёт значение в переменную (это не сравнение!).", "Сравнение — это ==, присваивание — это =.", "print(target) печатает то, что лежит в переменной." };
                    return b;
                }
            },
            new MissionTemplate
            {
                Id = "print_ip",
                Tiers = new[] { 0 },
                CodeLib = 0,
                Concept = "Строки и print()",
                ConceptDesc = "Строка — это текст в кавычках. print() выводит его в консоль.",
                Build = delegate (GenContext c)
                {
                    BuiltTemplate b = new BuiltTemplate();
                    b.Task = "Напечатай адрес цели " + c.Ip + " через print(). Адрес должен быть строкой — в кавычках.";
                    b.StarterCode = "# Напечатай адрес цели в кавычках\n\n";
                    b.Solution = "print(\"" + c.Ip + "\")";
                    b.RequiredPatterns = new[] { "print\\s*\\(" };
                    b.Hints = new[] { "Строка всегда в кавычках: \"текст\" или 'текст'.", "Пиши так: print(\"" + c.Ip + "\")", "Кавычки должны закрываться в той же строке." };
                    b.Theory = new[] { "Текст в Python называется строкой (str) и заключается в кавычки.", "print() принимает строку и выводит её в консоль.", "Числа печатаются без кавычек, текст — в кавычках." };
                    return b;
                }
            },
            new MissionTemplate
            {
                Id = "connect",
                Tiers = new[] { 0, 1 },
                CodeLib = 0,
                Concept = "Аргументы функций: connect(ip)",
                ConceptDesc = "В скобках функции можно передать аргумент — данные, с которыми она работает.",
                Build = delegate (GenContext c)
                {
                    BuiltTemplate b = new BuiltTemplate();
                    b.Task = "Сохрани адрес " + c.Ip + " в переменную ip и подключись к цели: connect(ip).";
                    b.StarterCode = "# Сохрани адрес и подключись\n\n";
                    b.Solution = "ip = \"" + c.Ip + "\"\nconnect(ip)";
                    b.RequiredPatterns = new[] { "ip\\s*=\\s*[\"\']" + EscapeRe(c.Ip) + "[\"\']", "connect\\s*\\(" };
                    b.Hints = new[] { "Адрес — строка, значит его нужно взять в кавычки.", "После присваивания вызови connect(ip) — именно переменную, а не текст.", "Скобки у connect() обязательны, адрес уже внутри переменной." };
                    b.Theory = new[] { "Аргумент — значение внутри скобок: connect(ip) передаёт адрес в функцию.", "Переменная хранит строку, поэтому кавычки нужны только при присваивании.", "connect() открывает туннель и обходит firewall." };
                    return b;
                }
            },
            new MissionTemplate
            {
                Id = "brute_loop",
                Tiers = new[] { 1 },
                CodeLib = 0,
                Concept = "Цикл for + range()",
                ConceptDesc = "for повторяет блок кода. range(5) даёт числа 0, 1, 2, 3, 4.",
                Build = delegate (GenContext c)
                {
                    BuiltTemplate b = new BuiltTemplate();
                    b.Task = "Перебери 5 кодов-доступа циклом: for i in range(5): и внутри вызови brute(i).";
                    b.StarterCode = "# Перебор кодов доступа\n# for i in range(5):\n#     brute(i)\n\n";
                    b.Solution = "for i in range(5):\n    brute(i)";
                    b.RequiredPatterns = new[] { "for\\s+\\w+\\s+in\\s+range\\s*\\(\\s*5\\s*\\)", "brute\\s*\\(" };
                    b.Hints = new[] { "Цикл: for i in range(5): — не забудь двоеточие.", "Тело цикла пишется с отступом в 4 пробела (Tab).", "Передай счётчик в функцию: brute(i)" };
                    b.Theory = new[] { "range(5) порождает последовательность 0..4.", "Тело цикла выделяется отступом — в Python это часть синтаксиса.", "Каждая итерация вызывает brute() с новым кодом." };
                    return b;
                }
            },
            new MissionTemplate
            {
                Id = "if_key",
                Tiers = new[] { 1, 2 },
                CodeLib = 1,
                Concept = "Условия: if / else",
                ConceptDesc = "if проверяет условие. Если правда — выполняет блок, иначе — блок else.",
                Build = delegate (GenContext c)
                {
                    BuiltTemplate b = new BuiltTemplate();
                    b.Task = "Проверь ключ доступа key:\nесли key == \"neon-77\" — вызови extract(),\nиначе напечатай \"Доступ запрещён\".";
                    b.StarterCode = "key = \"neon-77\"\n\n# if key == \"neon-77\":\n#     extract()\n# else:\n#     print(\"Доступ запрещён\")\n\n";
                    b.Solution = "if key == \"neon-77\":\n    extract()\nelse:\n    print(\"Доступ запрещён\")";
                    b.RequiredPatterns = new[] { "if\\s+key\\s*==", "extract\\s*\\(\\s*\\)", "else\\s*:" };
                    b.Hints = new[] { "Сравнение — ДВА знака равно: ==, а не =.", "Строка условия: if key == \"neon-77\":", "Не забудь отступы и else: с двоеточием." };
                    b.Theory = new[] { "== сравнивает: key == \"neon-77\" — вопрос «равно ли?», ответ True/False.", "Блок if выполняется только при True.", "else: — «во всех остальных случаях», защита от ошибок." };
                    return b;
                }
            },
            new MissionTemplate
            {
                Id = "if_security",
                Tiers = new[] { 2 },
                CodeLib = 2,
                Concept = "Условия с числами",
                ConceptDesc = "С числами работают <, >, <=, >=. Сравни защиту цели и выбери тактику.",
                Build = delegate (GenContext c)
                {
                    int threshold = Rint(c.Rng, 40, 60);
                    BuiltTemplate b = new BuiltTemplate();
                    b.Task = "Если security меньше " + threshold + " — вызывай bypass(), иначе напечатай \"нужен другой подход\".";
                    b.StarterCode = "security = " + c.Security + "\n\n# if security < " + threshold + ":\n#     bypass()\n# else:\n#     print(\"нужен другой подход\")\n\n";
                    b.Solution = "if security < " + threshold + ":\n    bypass()\nelse:\n    print(\"нужен другой подход\")";
                    b.RequiredPatterns = new[] { "if\\s+security\\s*<", "bypass\\s*\\(", "else\\s*:" };
                    b.Hints = new[] { "Числа сравниваются без кавычек: security < " + threshold, "Тело if — с отступом, тело else — тоже.", "bypass() вызывается без аргументов." };
                    b.Theory = new[] { "< и > сравнивают числа, == проверяет равенство.", "Отступы показывают Python, где заканчивается блок if.", "else выполняется, если условие оказалось False." };
                    return b;
                }
            },
            new MissionTemplate
            {
                Id = "wallets_list",
                Tiers = new[] { 1, 2 },
                CodeLib = 1,
                Concept = "Списки и перебор",
                ConceptDesc = "Список — это набор значений в квадратных скобках. Цикл for умеет идти по списку.",
                Build = delegate (GenContext c)
                {
                    int count = Rint(c.Rng, 2, 4);
                    string[] wallets = Take(new[] { "0xA1", "0xB2", "0xC3", "0xD4" }, count);
                    string literals = JoinQuoted(wallets);
                    BuiltTemplate b = new BuiltTemplate();
                    b.Task = "Собери список кошельков wallets = [" + literals + "] и напечатай каждый адрес циклом for.";
                    b.StarterCode = "# Список кошельков\n# wallets = [...]\n# for w in wallets:\n#     print(w)\n\n";
                    b.Solution = "wallets = [" + literals + "]\n\nfor w in wallets:\n    print(w)";
                    b.RequiredPatterns = new[] { "wallets\\s*=\\s*\\[", "for\\s+\\w+\\s+in\\s+wallets", "print\\s*\\(" };
                    b.Hints = new[] { "Список — в квадратных скобках, строки в кавычках.", "Цикл по списку: for w in wallets:", "Внутри цикла печатай сам элемент: print(w)" };
                    b.Theory = new[] { "Список (list) хранит несколько значений по порядку.", "for w in wallets: по очереди достаёт элементы.", "print(w) показывает адрес текущего кошелька." };
                    return b;
                }
            },
            new MissionTemplate
            {
                Id = "drain_loop",
                Tiers = new[] { 2 },
                CodeLib = 1,
                Concept = "Цикл + вывод средств",
                ConceptDesc = "Функция drain(wallet) выводит деньги с кошелька. Пройди списком и вычисти всё.",
                Build = delegate (GenContext c)
                {
                    string[] links = Take(new[] { "0xA1", "0xB2", "0xC3", "0xD4" }, Rint(c.Rng, 2, 4));
                    string literals = JoinQuoted(links);
                    BuiltTemplate b = new BuiltTemplate();
                    b.Task = "Пройди по списку [" + literals + "] циклом и вызови drain(w) для каждого кошелька.";
                    b.StarterCode = "wallets = [" + literals + "]\n\n# for w in wallets:\n#     drain(w)\n\n";
                    b.Solution = "wallets = [" + literals + "]\n\nfor w in wallets:\n    drain(w)";
                    b.RequiredPatterns = new[] { "wallets\\s*=\\s*\\[", "for\\s+", "drain\\s*\\(" };
                    b.Hints = new[] { "Сначала список, потом цикл по нему.", "drain() принимает адрес кошелька: drain(w)", "Отступ у тела цикла — 4 пробела." };
                    b.Theory = new[] { "drain(wallet) выводит средства с указанного кошелька.", "Цикл позволяет не писать drain() вручную для каждого адреса.", "Функция динамически подбирает «пустой» денежный поток без лишнего шума.", "Каждый вызов drain() попадает в лог." };
                    return b;
                }
            },
            new MissionTemplate
            {
                Id = "def_func",
                Tiers = new[] { 2, 3 },
                CodeLib = 2,
                Concept = "Свои функции: def",
                ConceptDesc = "def создаёт собственную функцию. Внутри можно вызывать другие функции.",
                Build = delegate (GenContext c)
                {
                    BuiltTemplate b = new BuiltTemplate();
                    b.Task = "Опиши функцию hack(target) — она печатает \"Взламываю \" + target, — и вызови её для адреса " + c.Ip + ".";
                    b.StarterCode = "# def hack(target):\n#     print(\"Взламываю \" + target)\n\n# hack(\"" + c.Ip + "\")\n";
                    b.Solution = "def hack(target):\n    print(\"Взламываю \" + target)\n\nhack(\"" + c.Ip + "\")";
                    b.RequiredPatterns = new[] { "def\\s+hack\\s*\\(", "hack\\s*\\(", "print\\s*\\(" };
                    b.Hints = new[] { "Заголовок функции: def hack(target): — с двоеточием.", "Тело функции — с отступом в 4 пробела.", "Функцию нужно не только описать, но и вызвать: hack(\"" + c.Ip + "\")" };
                    b.Theory = new[] { "def имя(аргумент): создаёт новую функцию.", "Строки склеиваются плюсом: \"Взламываю \" + target.", "Вызов идёт после описания — иначе Python не найдёт функцию." };
                    return b;
                }
            },
            new MissionTemplate
            {
                Id = "bypass_decrypt",
                Tiers = new[] { 3 },
                CodeLib = 2,
                Concept = "Несколько шагов подряд",
                ConceptDesc = "Скрипт — это последовательность команд. Порядок важен: подключились, обошли защиту, расшифровали.",
                Build = delegate (GenContext c)
                {
                    BuiltTemplate b = new BuiltTemplate();
                    b.Task = "Выполни цепочку: сохрани ip, подключись connect(ip), обойди защиту bypass(), расшифруй decrypt() и напечатай результат.";
                    b.StarterCode = "ip = \"" + c.Ip + "\"\n\n# connect(ip)\n# bypass()\n# data = decrypt()\n# print(data)\n";
                    b.Solution = "ip = \"" + c.Ip + "\"\nconnect(ip)\nbypass()\ndata = decrypt()\nprint(data)";
                    b.RequiredPatterns = new[] { "connect\\s*\\(", "bypass\\s*\\(", "decrypt\\s*\\(", "print\\s*\\(" };
                    b.Hints = new[] { "Сначала подключение: connect(ip)", "Обход защиты: bypass() — без аргументов.", "Расшифровку сохрани в переменную: data = decrypt()" };
                    b.Theory = new[] { "Порядок команд — часть сценария атаки.", "decrypt() возвращает расшифрованные данные (сид-фразу).", "Результат можно напечатать или использовать дальше." };
                    return b;
                }
            },
            new MissionTemplate
            {
                Id = "while_miner",
                Tiers = new[] { 3 },
                CodeLib = 3,
                Concept = "Цикл while и свой майнер",
                ConceptDesc = "while повторяет блок, пока условие истинно. Не забудь менять счётчик, иначе цикл бесконечный.",
                Build = delegate (GenContext c)
                {
                    BuiltTemplate b = new BuiltTemplate();
                    b.Task = "Поставь майнер три раза: заведи счётчик i = 0, циклом while i < 3 вызывай install_miner() и увеличивай счётчик на 1.";
                    b.StarterCode = "i = 0\n\n# while i < 3:\n#     install_miner()\n#     i += 1\n";
                    b.Solution = "i = 0\n\nwhile i < 3:\n    install_miner()\n    i += 1";
                    b.RequiredPatterns = new[] { "while\\s+", "install_miner\\s*\\(", "i\\s*\\+=" };
                    b.Hints = new[] { "Условие цикла: while i < 3: — с двоеточием.", "Внутри цикла обязательно увеличивай счётчик: i += 1", "i += 1 — короткая запись i = i + 1." };
                    b.Theory = new[] { "while повторяет тело, пока условие True.", "Без изменения счётчика цикл станет бесконечным — интерпретатор прервёт его по таймауту.", "install_miner() внедряет майнер и скрывает его от диспетчера." };
                    return b;
                }
            },
            new MissionTemplate
            {
                Id = "combo",
                Tiers = new[] { 3 },
                CodeLib = 3,
                Concept = "Комбо: список + цикл + функция",
                ConceptDesc = "Настоящие эксплойты собираются из кусочков: данные, перебор, функция.",
                Build = delegate (GenContext c)
                {
                    string[] links = Take(new[] { "0xA1", "0xB2", "0xC3" }, Rint(c.Rng, 3, 3));
                    string literals = JoinQuoted(links);
                    BuiltTemplate b = new BuiltTemplate();
                    b.Task = "Финал: собери список кошельков [" + literals + "], обойди защиту bypass(), вычисти каждый кошелёк через drain(w) и напечатай \"Следы заметены\".";
                    b.StarterCode = "wallets = [" + literals + "]\n\n# bypass()\n# for w in wallets:\n#     drain(w)\n# print(\"Следы заметены\")\n";
                    b.Solution = "wallets = [" + literals + "]\n\nbypass()\n\nfor w in wallets:\n    drain(w)\n\nprint(\"Следы заметены\")";
                    b.RequiredPatterns = new[] { "wallets\\s*=\\s*\\[", "bypass\\s*\\(", "drain\\s*\\(", "print\\s*\\(" };
                    b.Hints = new[] { "Сначала данные, потом защита, потом вывод средств.", "Цикл по списку: for w in wallets:", "Финальный print() — просто строка в кавычках." };
                    b.Theory = new[] { "Комбинировать шаги — основная работа хакера.", "bypass() нейтрализует защиту до работы с кошельками.", "Заметание следов уменьшает риск и повышает стиль." };
                    return b;
                }
            },
            new MissionTemplate
            {
                Id = "fstring",
                Tiers = new[] { 1, 2 },
                CodeLib = 0,
                Concept = "f-строки: подстановка значений",
                ConceptDesc = "f\"текст {переменная}\" подставляет значение прямо в строку — так собирают отчёты.",
                Build = delegate (GenContext c)
                {
                    BuiltTemplate b = new BuiltTemplate();
                    b.Task = "Сохрани адрес цели в target и напечатай отчёт через f-строку: print(f\"Цель: {target}\").";
                    b.StarterCode = "# f-строка: буква f перед кавычками\n# target = \"" + c.Ip + "\"\n# print(f\"Цель: {target}\")\n\n";
                    b.Solution = "target = \"" + c.Ip + "\"\nprint(f\"Цель: {target}\")";
                    b.RequiredPatterns = new[] { "target\\s*=\\s*[\"']", "print\\s*\\(\\s*f[\"']", "\\{target\\}" };
                    b.Hints = new[] { "f-строка начинается с буквы f перед кавычкой: f\"...\"", "Внутри фигурных скобок пишется имя переменной: {target}", "Пиши так: print(f\"Цель: {target}\")" };
                    b.Theory = new[] { "f-строка — это строка с префиксом f, в которой можно подставлять значения.", "Значение берётся из переменной внутри фигурных скобок.", "Так удобно собирать отчёты: print(f\"Взломан {target}\")" };
                    return b;
                }
            },
            new MissionTemplate
            {
                Id = "if_in_loop",
                Tiers = new[] { 1, 2 },
                CodeLib = 1,
                Concept = "Если внутри цикла",
                ConceptDesc = "Условие можно поставить внутрь цикла — тогда решение принимается для каждого элемента.",
                Build = delegate (GenContext c)
                {
                    string wallet = IpTail(c.Ip);
                    BuiltTemplate b = new BuiltTemplate();
                    b.Task = "Пройди список try [\"0xA1\", \"0xB2\", \"0xC3\"] циклом: если адрес равен \"0xA1\" — вызови drain(w), иначе напечатай \"мимо\".";
                    b.StarterCode = "wallets = [\"0xA1\", \"0xB2\", \"0xC3\"]\n\n# for w in wallets:\n#     if w == \"0xA1\":\n#         drain(w)\n#     else:\n#         print(\"мимо\")\n";
                    b.Solution = "wallets = [\"0xA1\", \"0xB2\", \"0xC3\"]\n\nfor w in wallets:\n    if w == \"0xA1\":\n        drain(w)\n    else:\n        print(\"мимо\")";
                    b.RequiredPatterns = new[] { "for\\s+\\w+\\s+in\\s+", "if\\s+\\w+\\s*==", "drain\\s*\\(", "else\\s*:" };
                    b.Hints = new[] { "Сначала цикл, потом условие внутри него.", "Условие сравнения строки: if w == \"0xA1\":", "Вложенные блоки — двойной отступ: 4 пробела под for и ещё 4 под if." };
                    b.Theory = new[] { "Внутри цикла можно писать любые конструкции, включая if/else.", "Каждая итерация проверяет условие заново.", "Отступы показывают вложенность: сначала тело цикла, потом тело условия." };
                    return b;
                }
            },
            new MissionTemplate
            {
                Id = "list_index",
                Tiers = new[] { 1, 2 },
                CodeLib = 0,
                Concept = "Индексы и len()",
                ConceptDesc = "Элементы списка нумеруются с нуля: wallets[0] — первый. len() возвращает размер списка.",
                Build = delegate (GenContext c)
                {
                    BuiltTemplate b = new BuiltTemplate();
                    b.Task = "Собери список wallets из трёх адресов, напечатай первый элемент wallets[0] и размер списка через len(wallets).";
                    b.StarterCode = "wallets = [\"0xA1\", \"0xB2\", \"0xC3\"]\n\n# print(wallets[0])\n# print(len(wallets))\n";
                    b.Solution = "wallets = [\"0xA1\", \"0xB2\", \"0xC3\"]\nprint(wallets[0])\nprint(len(wallets))";
                    b.RequiredPatterns = new[] { "wallets\\s*=\\s*\\[", "wallets\\s*\\[\\s*0\\s*\\]", "len\\s*\\(" };
                    b.Hints = new[] { "Квадратные скобки с числом внутри — это индекс: wallets[0]", "Первый элемент всегда под номером 0, а не 1.", "len(wallets) возвращает количество элементов списка." };
                    b.Theory = new[] { "Индекс — позиция элемента в списке, счёт с нуля.", "wallets[0] — первый адрес, wallets[1] — второй.", "len() пригодится, чтобы узнать, сколько всего элементов." };
                    return b;
                }
            },
            new MissionTemplate
            {
                Id = "loop_calls",
                Tiers = new[] { 1, 2 },
                CodeLib = 0,
                Concept = "Цикл по списку адресов",
                ConceptDesc = "Список целей и цикл for — базовая связка: обойти все узлы и не повториться.",
                Build = delegate (GenContext c)
                {
                    string[] ips = new[] { c.Ip, "10.0.0.7", "192.168.1.44" };
                    string literals = JoinQuoted(ips);
                    BuiltTemplate b = new BuiltTemplate();
                    b.Task = "Создай список targets = [" + literals + "] и подключись к каждому адресу циклом: connect(t).";
                    b.StarterCode = "# targets = [...]\n# for t in targets:\n#     connect(t)\n\n";
                    b.Solution = "targets = [" + literals + "]\n\nfor t in targets:\n    connect(t)\n\nprint(\"все узлы под контролем\")";
                    b.RequiredPatterns = new[] { "targets\\s*=\\s*\\[", "for\\s+\\w+\\s+in\\s+targets", "connect\\s*\\(" };
                    b.Hints = new[] { "Список адресов — в квадратных скобках, каждый в кавычках.", "Цикл по списку: for t in targets:", "Внутри цикла подключайся: connect(t)" };
                    b.Theory = new[] { "Цикл по списку автоматически перебирает все элементы.", "Переменная t на каждой итерации — очередной адрес.", "Так одним скриптом обходят целые подсети." };
                    return b;
                }
            },
            new MissionTemplate
            {
                Id = "elif_chain",
                Tiers = new[] { 2, 3 },
                CodeLib = 2,
                Concept = "Цепочка if / elif / else",
                ConceptDesc = "elif проверяет следующее условие, если предыдущее оказалось False. Так строят выбор тактики.",
                Build = delegate (GenContext c)
                {
                    int threshold = System.Math.Max(51, c.Security - 12);
                    BuiltTemplate b = new BuiltTemplate();
                    b.Task = "Задай security = " + c.Security + " и выбери тактику: если security больше " + threshold + " — ghost(), иначе если больше 40 — bypass(), иначе напечатай \"беру голыми руками\".";
                    b.StarterCode = "security = " + c.Security + "\n\n# if security > " + threshold + ":\n#     ghost()\n# elif security > 40:\n#     bypass()\n# else:\n#     print(\"беру голыми руками\")\n";
                    b.Solution = "security = " + c.Security + "\n\nif security > " + threshold + ":\n    ghost()\nelif security > 40:\n    bypass()\nelse:\n    print(\"беру голыми руками\")";
                    b.RequiredPatterns = new[] { "if\\s+security\\s*>", "elif\\s+security\\s*>", "bypass\\s*\\(", "else\\s*:" };
                    b.Hints = new[] { "Первое условие — if, следующие — elif (сокращение от else if).", "Каждый блок со своим отступом и двоеточием.", "Порядок важен: Python проверяет условия сверху вниз." };
                    b.Theory = new[] { "elif позволяет проверить несколько вариантов подряд.", "Сработает только первый подходящий блок — остальные пропускаются.", "else — запасной вариант, когда ни одно условие не подошло." };
                    return b;
                }
            },
            new MissionTemplate
            {
                Id = "dict_wallets",
                Tiers = new[] { 2, 3 },
                CodeLib = 1,
                Concept = "Словари: ключ → значение",
                ConceptDesc = "Словарь хранит пары «ключ: значение». Метод .items() отдаёт их парами для цикла.",
                Build = delegate (GenContext c)
                {
                    int count = Rint(c.Rng, 2, 3);
                    string pairs = JoinPairs(Take(new[] { new[] { "\"0xA1\"", "0.4" }, new[] { "\"0xB2\"", "1.2" }, new[] { "\"0xC3\"", "2.4" } }, count));
                    BuiltTemplate b = new BuiltTemplate();
                    b.Task = "Собери словарь wallets = {" + pairs + "} и напечатай каждый адрес циклом по wallets.items().";
                    b.StarterCode = "# wallets = {\"0xA1\": 0.4, \"0xB2\": 1.2}\n# for address, amount in wallets.items():\n#     print(address)\n\n";
                    b.Solution = "wallets = {" + pairs + "}\n\nfor address, amount in wallets.items():\n    print(address)";
                    b.RequiredPatterns = new[] { "wallets\\s*=\\s*\\{", "items\\s*\\(\\s*\\)", "for\\s+\\w+\\s*,\\s*\\w+\\s+in\\s+", "print\\s*\\(" };
                    b.Hints = new[] { "Словарь — в фигурных скобках, пары разделяются запятыми: \"ключ\": значение", "items() возвращает пары: for address, amount in wallets.items():", "В цикле можно печатать только адрес: print(address)" };
                    b.Theory = new[] { "Словарь (dict) хранит данные по ключу, а не по номеру.", "Метод .items() удобен, когда нужны и ключ, и значение.", "Две переменные в цикле получают ключ и значение соответственно." };
                    return b;
                }
            },
            new MissionTemplate
            {
                Id = "sum_loop",
                Tiers = new[] { 2, 3 },
                CodeLib = 1,
                Concept = "Накопление суммы в цикле",
                ConceptDesc = "Счётчик и переменная-накопитель — вечная связка: складывай значения по мере обхода.",
                Build = delegate (GenContext c)
                {
                    int[] amounts = new[] { Rint(c.Rng, 4, 20), Rint(c.Rng, 20, 60), Rint(c.Rng, 60, 120) };
                    BuiltTemplate b = new BuiltTemplate();
                    b.Task = "Сложи суммы [" + string.Join(", ", amounts) + "] в переменную total циклом for и напечатай результат.";
                    b.StarterCode = "amounts = [" + string.Join(", ", amounts) + "]\ntotal = 0\n\n# for a in amounts:\n#     total += a\n\n# print(total)\n";
                    b.Solution = "amounts = [" + string.Join(", ", amounts) + "]\ntotal = 0\n\nfor a in amounts:\n    total += a\n\nprint(total)";
                    b.RequiredPatterns = new[] { "amounts\\s*=\\s*\\[", "total\\s*=\\s*0", "total\\s*\\+=", "print\\s*\\(" };
                    b.Hints = new[] { "Накопитель нужно обнулить до цикла: total = 0", "Внутри цикла прибавляй: total += a", "print(total) печатает итоговую сумму." };
                    b.Theory = new[] { "+= прибавляет к текущему значению переменной.", "Накопитель объявляют до цикла, иначе он будет обнуляться.", "Так считают общие суммы, средние и итоги по кошелькам." };
                    return b;
                }
            },
            new MissionTemplate
            {
                Id = "nested_loop",
                Tiers = new[] { 3 },
                CodeLib = 2,
                Concept = "Вложенные циклы",
                ConceptDesc = "Цикл внутри цикла: внешний отвечает за узлы, внутренний — за попытки входа.",
                Build = delegate (GenContext c)
                {
                    BuiltTemplate b = new BuiltTemplate();
                    b.Task = "Пройди 3 узла, и для каждого перебери 2 кода: вложенный цикл, внутри — brute(j).";
                    b.StarterCode = "# for i in range(3):\n#     for j in range(2):\n#         brute(j)\n\n# print(\"сеть просканирована\")\n";
                    b.Solution = "for i in range(3):\n    for j in range(2):\n        brute(j)\n\nprint(\"сеть просканирована\")";
                    b.RequiredPatterns = new[] { "for\\s+\\w+\\s+in\\s+range\\s*\\(\\s*3\\s*\\)[\\s\\S]*for\\s+\\w+\\s+in\\s+range", "brute\\s*\\(", "print\\s*\\(" };
                    b.Hints = new[] { "Внешний цикл: for i in range(3):", "Внутренний пишется с отступом: for j in range(2):", "Тело внутреннего цикла — ещё один отступ (8 пробелов)." };
                    b.Theory = new[] { "Вложенный цикл выполняется целиком на каждой итерации внешнего.", "Всего итераций — произведение количеств: 3 × 2 = 6.", "Отступы показывают, какой цикл является внутренним." };
                    return b;
                }
            },
            new MissionTemplate
            {
                Id = "try_except",
                Tiers = new[] { 3 },
                CodeLib = 2,
                Concept = "Обработка ошибок: try / except",
                ConceptDesc = "try пытается выполнить код, except ловит ошибку и не даёт скрипту упасть.",
                Build = delegate (GenContext c)
                {
                    BuiltTemplate b = new BuiltTemplate();
                    b.Task = "Попробуй расшифровать данные: в блоке try сохрани decrypt() в data и напечатай её, а в except обойди защиту bypass() и напечатай \"пошли в обход\".";
                    b.StarterCode = "# try:\n#     data = decrypt()\n#     print(data)\n# except Exception:\n#     bypass()\n#     print(\"пошли в обход\")\n";
                    b.Solution = "try:\n    data = decrypt()\n    print(data)\nexcept Exception:\n    bypass()\n    print(\"пошли в обход\")";
                    b.RequiredPatterns = new[] { "try\\s*:", "except\\b", "decrypt\\s*\\(", "bypass\\s*\\(", "print\\s*\\(" };
                    b.Hints = new[] { "Сначала try: — блок, который может упасть.", "Затем except Exception: — что делать, если упало.", "Внутри обоих блоков код пишется с отступом." };
                    b.Theory = new[] { "try/except — страховка: ошибка не убивает весь скрипт.", "except ловит исключение и позволяет продолжить работу.", "В хакерских скриптах так обходят нестабильные цели." };
                    return b;
                }
            },
            new MissionTemplate
            {
                Id = "func_return",
                Tiers = new[] { 3 },
                CodeLib = 2,
                Concept = "Функции с return",
                ConceptDesc = "return возвращает результат из функции — его можно использовать в условии.",
                Build = delegate (GenContext c)
                {
                    int threshold = System.Math.Max(60, c.Security);
                    BuiltTemplate b = new BuiltTemplate();
                    b.Task = "Сделай функцию check(security), которая возвращает security < " + threshold + ", и если check(" + c.Security + ") истинна — вызови bypass().";
                    b.StarterCode = "def check(security):\n    return security < " + threshold + "\n\n# if check(" + c.Security + "):\n#     bypass()\n\n";
                    b.Solution = "def check(security):\n    return security < " + threshold + "\n\nif check(" + c.Security + "):\n    bypass()\n\nprint(\"проверка пройдена\")";
                    b.RequiredPatterns = new[] { "def\\s+check\\s*\\(", "return\\b", "if\\s+check\\s*\\(", "bypass\\s*\\(" };
                    b.Hints = new[] { "Функция описывается через def check(security):", "Внутри — return с условием: return security < " + threshold, "Результат функции можно использовать в if: if check(" + c.Security + "):" };
                    b.Theory = new[] { "return завершает функцию и отдаёт результат наружу.", "Результат функции — обычное значение, его можно сравнивать и печатать.", "Функции с return делают код читаемым: одна проверка — одно имя." };
                    return b;
                }
            },
        };
    }
}
