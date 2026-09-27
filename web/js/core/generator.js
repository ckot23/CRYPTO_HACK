/* ==========================================================================
   generator.js — генератор случайных контрактов.

   В игре остаётся одна обучающая миссия (содержимое — из gamedata.json),
   дальше цели бесконечно генерируются: выбирается сложность, из пула
   берутся тип задания, цель, IP, ОС и защита, а награда считается по
   таблице сложности и растёт вместе с числом пройденных контрактов.

   Генерация детерминированная: по seed (номер контракта + сложность)
   миссия каждый раз собирается одинаково, поэтому сохранение хранит только
   «номер + сложность + seed», а не весь текст задания.
   ========================================================================== */
(function (root) {
  "use strict";

  var CH = root.CH = root.CH || {};

  /* ------------------------------- Сложности ------------------------------ */
  /* Награда = случайное значение из диапазона × рост (см. growthFor).
     Монета привязана к сложности и совпадает с уровнем разблокировки. */
  var TIERS = [
    {
      key: "easy", label: "ЛЕГКО", accent: "#4fe0a8", coin: "BTC",
      minLevel: 1, codeLib: 0, security: [8, 26],
      dollars: [60, 130], xp: [110, 170], amount: [0.0012, 0.0032],
      blurb: "Домашние машины, слабые пароли, быстрый профит."
    },
    {
      key: "medium", label: "СРЕДНЕ", accent: "#ffd479", coin: "ETH",
      minLevel: 2, codeLib: 0, security: [30, 50],
      dollars: [180, 340], xp: [200, 300], amount: [0.02, 0.06],
      blurb: "Есть антивирус и вменяемые пароли."
    },
    {
      key: "hard", label: "СЛОЖНО", accent: "#ffb27a", coin: "XMR",
      minLevel: 3, codeLib: 1, security: [52, 72],
      dollars: [420, 720], xp: [320, 460], amount: [2, 6],
      blurb: "Корпоративные сети, шифрование, логи."
    },
    {
      key: "expert", label: "ЭКСПЕРТ", accent: "#ff7aa8", coin: "SOL",
      minLevel: 5, codeLib: 3, security: [74, 96],
      dollars: [900, 1700], xp: [480, 700], amount: [3, 9],
      blurb: "Дата-центры и кошельки китов. Тут ошибаться нельзя."
    }
  ];

  var TIER_BY_KEY = {};
  TIERS.forEach(function (t, i) { t.index = i; TIER_BY_KEY[t.key] = t; });

  /* ------------------------------- Цели ----------------------------------- */
  var TARGETS = [
    { name: "Домашний ПК школьника", os: "Win10 Home", flavor: "Скачал майнер с торрентов и удивился." },
    { name: "Ноутбук криптотрейдера", os: "macOS Sonoma", flavor: "Сид-фраза лежит в заметках. В заметках, Карл." },
    { name: "Рабочая станция дизайнера", os: "Win11 Pro", flavor: "Пароль — имя кота, но кот сложный." },
    { name: "Сервер бухгалтерии «Ромашка»", os: "Windows Server 2019", flavor: "1С, зарплаты и ни одного обновления с 2019 года." },
    { name: "Касса кофейни «Неон»", os: "Ubuntu 22.04", flavor: "Терминал на витрине, пароль от витрины на стикере." },
    { name: "Домашний NAS архиватора", os: "Debian 12", flavor: "Хранит 4 ТБ чужих сериалов и один кошелёк." },
    { name: "Сервер майнинг-пула", os: "Arch Linux", flavor: "Сам майнит, но и его можно умайнить." },
    { name: "Ноутбук юриста", os: "Win10 Pro", flavor: "Договоры, сканы паспортов и пароль «qwerty2019»." },
    { name: "Терминал в банке «Северный»", os: "Windows Server 2016", flavor: "Тонкий клиент, толстая жадность." },
    { name: "Планшет курьера", os: "Android 14", flavor: "Постоянно в дороге, поэтому роутер домашний открыт." },
    { name: "ПК главбуха", os: "Win7 Ultimate", flavor: "Windows 7 в наше время — это уже уязвимость." },
    { name: "Умный дом инженера", os: "Linux (OpenWRT)", flavor: "Умный дом, глупые пароли на камерах." },
    { name: "Сервер геймдев-студии", os: "Ubuntu 24.04", flavor: "Билды, исходники и кошелёк с премиями." },
    { name: "Рабочая станция блогера", os: "macOS Ventura", flavor: "Черновики, рекламные контракты и донаты." },
    { name: "Роутер хостела «Байт»", os: "RouterOS 7", flavor: "Через него ходит весь трафик этажа." },
    { name: "Сервер доставки «Скорость»", os: "Alpine Linux", flavor: "Заказы, адреса, телефоны — и никакого шифрования." }
  ];

  var CODENAMES = [
    "Тихий доступ", "Утренний слив", "Ночная смена", "Стеклянный дом", "Горячий кошелёк",
    "Слепое пятно", "Ледяной след", "Медовый трафик", "Красная дверь", "Тихий порт",
    "Полый диск", "Седьмой этаж", "Холодный старт", "Бумажный тигр", "Тихая гавань",
    "Обратный след", "Синий протокол", "Пепел архива"
  ];

  var PAYER_REASONS = [
    "заказчик просит вернуть своё",
    "нужно вытащить данные до аудита",
    "клиент хочет доказать, что защита дырявая",
    "трофей нужен к утру",
    "работа оплачена вперёд"
  ];

  /* --------------------------- Мелкие помощники --------------------------- */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(rng, list) { return list[Math.floor(rng() * list.length) % list.length]; }
  function rint(rng, lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }
  function rrange(rng, pair) { return pair[0] + rng() * (pair[1] - pair[0]); }

  function makeIp(rng) {
    var variant = rint(rng, 0, 3);
    if (variant === 0) return "192.168." + rint(rng, 0, 8) + "." + rint(rng, 2, 250);
    if (variant === 1) return "10." + rint(rng, 0, 40) + "." + rint(rng, 0, 20) + "." + rint(rng, 2, 250);
    if (variant === 2) return "172." + rint(rng, 16, 31) + "." + rint(rng, 0, 30) + "." + rint(rng, 2, 250);
    return "85." + rint(rng, 100, 200) + "." + rint(rng, 1, 200) + "." + rint(rng, 2, 250);
  }

  /* ----------------------------- Шаблоны миссий --------------------------- */
  /* tiers — с какого уровня сложности шаблон доступен (индекс в TIERS).
     codeLib — требуемый уровень «библиотеки кода» (см. апгрейды). */
  var TEMPLATES = [
    {
      id: "scan",
      tiers: [0],
      codeLib: 0,
      concept: "Функции и вызовы: scan()",
      conceptDesc: "В Python функция — это команда. Чтобы её запустить, напиши имя и скобки ().",
      build: function (c) {
        return {
          task: "Вызови функцию scan(), чтобы найти устройства в сети.",
          starterCode: "# Сканируем сеть\n# Вызови функцию scan() — имя и скобки\n\n",
          solution: "scan()",
          requiredPatterns: ["scan\\s*\\(\\s*\\)"],
          hints: [
            "Функции вызываются так: имя_функции()",
            "Напиши на новой строке: scan()",
            "Скобки обязательны — без них Python не выполнит команду."
          ],
          theory: [
            "Функция — готовый блок кода, который выполняет действие.",
            "scan() в NeonHack Framework сканирует подсеть и возвращает список устройств.",
            "Скобки () означают «выполнить сейчас»."
          ]
        };
      }
    },
    {
      id: "vars",
      tiers: [0, 1],
      codeLib: 0,
      concept: "Переменные: имя = значение",
      conceptDesc: "Переменная — это коробка с подписью. scan() вернёт адрес цели, сохрани его и напечатай.",
      build: function (c) {
        return {
          task: "Сохрани результат scan() в переменную target и напечатай её через print(target).",
          starterCode: "# Найди цель и сохрани адрес в переменную\n\n",
          solution: "target = scan()\nprint(target)",
          requiredPatterns: ["target\\s*=\\s*scan\\s*\\(", "print\\s*\\(\\s*target\\s*\\)"],
          hints: [
            "Присваивание — один знак равно: target = scan()",
            "Чтобы напечатать значение переменной, передай её в print(): print(target)",
            "Порядок важен: сначала присваиваем, потом печатаем."
          ],
          theory: [
            "= кладёт значение в переменную (это не сравнение!).",
            "Сравнение — это ==, присваивание — это =.",
            "print(target) печатает то, что лежит в переменной."
          ]
        };
      }
    },
    {
      id: "print_ip",
      tiers: [0],
      codeLib: 0,
      concept: "Строки и print()",
      conceptDesc: "Строка — это текст в кавычках. print() выводит его в консоль.",
      build: function (c) {
        return {
          task: "Напечатай адрес цели " + c.ip + " через print(). Адрес должен быть строкой — в кавычках.",
          starterCode: "# Напечатай адрес цели в кавычках\n\n",
          solution: 'print("' + c.ip + '")',
          requiredPatterns: ["print\\s*\\("],
          hints: [
            "Строка всегда в кавычках: \"текст\" или 'текст'.",
            "Пиши так: print(\"" + c.ip + "\")",
            "Кавычки должны закрываться в той же строке."
          ],
          theory: [
            "Текст в Python называется строкой (str) и заключается в кавычки.",
            "print() принимает строку и выводит её в консоль.",
            "Числа печатаются без кавычек, текст — в кавычках."
          ]
        };
      }
    },
    {
      id: "connect",
      tiers: [0, 1],
      codeLib: 0,
      concept: "Аргументы функций: connect(ip)",
      conceptDesc: "В скобках функции можно передать аргумент — данные, с которыми она работает.",
      build: function (c) {
        return {
          task: "Сохрани адрес " + c.ip + " в переменную ip и подключись к цели: connect(ip).",
          starterCode: "# Сохрани адрес и подключись\n\n",
          solution: 'ip = "' + c.ip + '"\nconnect(ip)',
          requiredPatterns: ['ip\\s*=\\s*["\']' + escapeRe(c.ip) + '["\']', "connect\\s*\\("],
          hints: [
            "Адрес — строка, значит его нужно взять в кавычки.",
            "После присваивания вызови connect(ip) — именно переменную, а не текст.",
            "Скобки у connect() обязательны, адрес уже внутри переменной."
          ],
          theory: [
            "Аргумент — значение внутри скобок: connect(ip) передаёт адрес в функцию.",
            "Переменная хранит строку, поэтому кавычки нужны только при присваивании.",
            "connect() открывает туннель и обходит firewall."
          ]
        };
      }
    },
    {
      id: "brute_loop",
      tiers: [1],
      codeLib: 0,
      concept: "Цикл for + range()",
      conceptDesc: "for повторяет блок кода. range(5) даёт числа 0, 1, 2, 3, 4.",
      build: function (c) {
        return {
          task: "Перебери 5 кодов-доступа циклом: for i in range(5): и внутри вызови brute(i).",
          starterCode: "# Перебор кодов доступа\n# for i in range(5):\n#     brute(i)\n\n",
          solution: "for i in range(5):\n    brute(i)",
          requiredPatterns: ["for\\s+\\w+\\s+in\\s+range\\s*\\(\\s*5\\s*\\)", "brute\\s*\\("],
          hints: [
            "Цикл: for i in range(5): — не забудь двоеточие.",
            "Тело цикла пишется с отступом в 4 пробела (Tab).",
            "Передай счётчик в функцию: brute(i)"
          ],
          theory: [
            "range(5) порождает последовательность 0..4.",
            "Тело цикла выделяется отступом — в Python это часть синтаксиса.",
            "Каждая итерация вызывает brute() с новым кодом."
          ]
        };
      }
    },
    {
      id: "if_key",
      tiers: [1, 2],
      codeLib: 1,
      concept: "Условия: if / else",
      conceptDesc: "if проверяет условие. Если правда — выполняет блок, иначе — блок else.",
      build: function (c) {
        return {
          task: 'Проверь ключ доступа key:\nесли key == "neon-77" — вызови extract(),\nиначе напечатай "Доступ запрещён".',
          starterCode: 'key = "neon-77"\n\n# if key == "neon-77":\n#     extract()\n# else:\n#     print("Доступ запрещён")\n\n',
          solution: 'if key == "neon-77":\n    extract()\nelse:\n    print("Доступ запрещён")',
          requiredPatterns: ["if\\s+key\\s*==", "extract\\s*\\(\\s*\\)", "else\\s*:"],
          hints: [
            "Сравнение — ДВА знака равно: ==, а не =.",
            "Строка условия: if key == \"neon-77\":",
            "Не забудь отступы и else: с двоеточием."
          ],
          theory: [
            "== сравнивает: key == \"neon-77\" — вопрос «равно ли?», ответ True/False.",
            "Блок if выполняется только при True.",
            "else: — «во всех остальных случаях», защита от ошибок."
          ]
        };
      }
    },
    {
      id: "if_security",
      tiers: [2],
      codeLib: 2,
      concept: "Условия с числами",
      conceptDesc: "С числами работают <, >, <=, >=. Сравни защиту цели и выбери тактику.",
      build: function (c) {
        var threshold = rint(c.rng, 40, 60);
        return {
          task: "Если security меньше " + threshold + " — вызывай bypass(), иначе напечатай \"нужен другой подход\".",
          starterCode: "security = " + c.security + "\n\n# if security < " + threshold + ":\n#     bypass()\n# else:\n#     print(\"нужен другой подход\")\n\n",
          solution: "if security < " + threshold + ":\n    bypass()\nelse:\n    print(\"нужен другой подход\")",
          requiredPatterns: ["if\\s+security\\s*<", "bypass\\s*\\(", "else\\s*:"],
          hints: [
            "Числа сравниваются без кавычек: security < " + threshold,
            "Тело if — с отступом, тело else — тоже.",
            "bypass() вызывается без аргументов."
          ],
          theory: [
            "< и > сравнивают числа, == проверяет равенство.",
            "Отступы показывают Python, где заканчивается блок if.",
            "else выполняется, если условие оказалось False."
          ]
        };
      }
    },
    {
      id: "wallets_list",
      tiers: [1, 2],
      codeLib: 1,
      concept: "Списки и перебор",
      conceptDesc: "Список — это набор значений в квадратных скобках. Цикл for умеет идти по списку.",
      build: function (c) {
        var count = rint(c.rng, 2, 4);
        var wallets = ["0xA1", "0xB2", "0xC3", "0xD4"].slice(0, count);
        var literals = wallets.map(function (w) { return '"' + w + '"'; }).join(", ");
        return {
          task: "Собери список кошельков wallets = [" + literals + "] и напечатай каждый адрес циклом for.",
          starterCode: "# Список кошельков\n# wallets = [...]\n# for w in wallets:\n#     print(w)\n\n",
          solution: "wallets = [" + literals + "]\n\nfor w in wallets:\n    print(w)",
          requiredPatterns: ["wallets\\s*=\\s*\\[", "for\\s+\\w+\\s+in\\s+wallets", "print\\s*\\("],
          hints: [
            "Список — в квадратных скобках, строки в кавычках.",
            "Цикл по списку: for w in wallets:",
            "Внутри цикла печатай сам элемент: print(w)"
          ],
          theory: [
            "Список (list) хранит несколько значений по порядку.",
            "for w in wallets: по очереди достаёт элементы.",
            "print(w) показывает адрес текущего кошелька."
          ]
        };
      }
    },
    {
      id: "drain_loop",
      tiers: [2],
      codeLib: 1,
      concept: "Цикл + вывод средств",
      conceptDesc: "Функция drain(wallet) выводит деньги с кошелька. Пройди списком и вычисти всё.",
      build: function (c) {
        var links = ["0xA1", "0xB2", "0xC3", "0xD4"].slice(0, rint(c.rng, 2, 4));
        var literals = links.map(function (w) { return '"' + w + '"'; }).join(", ");
        return {
          task: "Пройди по списку [" + literals + "] циклом и вызови drain(w) для каждого кошелька.",
          starterCode: "wallets = [" + literals + "]\n\n# for w in wallets:\n#     drain(w)\n\n",
          solution: "wallets = [" + literals + "]\n\nfor w in wallets:\n    drain(w)",
          requiredPatterns: ["wallets\\s*=\\s*\\[", "for\\s+", "drain\\s*\\("],
          hints: [
            "Сначала список, потом цикл по нему.",
            "drain() принимает адрес кошелька: drain(w)",
            "Отступ у тела цикла — 4 пробела."
          ],
          theory: [
            "drain(wallet) выводит средства с указанного кошелька.",
            "Цикл позволяет не писать drain() вручную для каждого адреса.",
            "Функция динамически подбирает «пустой» денежный поток без лишнего шума.",
            "Каждый вызов drain() попадает в лог."
          ]
        };
      }
    },
    {
      id: "def_func",
      tiers: [2, 3],
      codeLib: 2,
      concept: "Свои функции: def",
      conceptDesc: "def создаёт собственную функцию. Внутри можно вызывать другие функции.",
      build: function (c) {
        return {
          task: "Опиши функцию hack(target) — она печатает \"Взламываю \" + target, — и вызови её для адреса " + c.ip + ".",
          starterCode: "# def hack(target):\n#     print(\"Взламываю \" + target)\n\n# hack(\"" + c.ip + "\")\n",
          solution: 'def hack(target):\n    print("Взламываю " + target)\n\nhack("' + c.ip + '")',
          requiredPatterns: ["def\\s+hack\\s*\\(", "hack\\s*\\(", "print\\s*\\("],
          hints: [
            "Заголовок функции: def hack(target): — с двоеточием.",
            "Тело функции — с отступом в 4 пробела.",
            "Функцию нужно не только описать, но и вызвать: hack(\"" + c.ip + "\")"
          ],
          theory: [
            "def имя(аргумент): создаёт новую функцию.",
            "Строки склеиваются плюсом: \"Взламываю \" + target.",
            "Вызов идёт после описания — иначе Python не найдёт функцию."
          ]
        };
      }
    },
    {
      id: "bypass_decrypt",
      tiers: [3],
      codeLib: 2,
      concept: "Несколько шагов подряд",
      conceptDesc: "Скрипт — это последовательность команд. Порядок важен: подключились, обошли защиту, расшифровали.",
      build: function (c) {
        return {
          task: "Выполни цепочку: сохрани ip, подключись connect(ip), обойди защиту bypass(), расшифруй decrypt() и напечатай результат.",
          starterCode: 'ip = "' + c.ip + '"\n\n# connect(ip)\n# bypass()\n# data = decrypt()\n# print(data)\n',
          solution: 'ip = "' + c.ip + '"\nconnect(ip)\nbypass()\ndata = decrypt()\nprint(data)',
          requiredPatterns: ["connect\\s*\\(", "bypass\\s*\\(", "decrypt\\s*\\(", "print\\s*\\("],
          hints: [
            "Сначала подключение: connect(ip)",
            "Обход защиты: bypass() — без аргументов.",
            "Расшифровку сохрани в переменную: data = decrypt()"
          ],
          theory: [
            "Порядок команд — часть сценария атаки.",
            "decrypt() возвращает расшифрованные данные (сид-фразу).",
            "Результат можно напечатать или использовать дальше."
          ]
        };
      }
    },
    {
      id: "while_miner",
      tiers: [3],
      codeLib: 3,
      concept: "Цикл while и свой майнер",
      conceptDesc: "while повторяет блок, пока условие истинно. Не забудь менять счётчик, иначе цикл бесконечный.",
      build: function (c) {
        return {
          task: "Поставь майнер три раза: заведи счётчик i = 0, циклом while i < 3 вызывай install_miner() и увеличивай счётчик на 1.",
          starterCode: "i = 0\n\n# while i < 3:\n#     install_miner()\n#     i += 1\n",
          solution: "i = 0\n\nwhile i < 3:\n    install_miner()\n    i += 1",
          requiredPatterns: ["while\\s+", "install_miner\\s*\\(", "i\\s*\\+="],
          hints: [
            "Условие цикла: while i < 3: — с двоеточием.",
            "Внутри цикла обязательно увеличивай счётчик: i += 1",
            "i += 1 — короткая запись i = i + 1."
          ],
          theory: [
            "while повторяет тело, пока условие True.",
            "Без изменения счётчика цикл станет бесконечным — интерпретатор прервёт его по таймауту.",
            "install_miner() внедряет майнер и скрывает его от диспетчера."
          ]
        };
      }
    },
    {
      id: "combo",
      tiers: [3],
      codeLib: 3,
      concept: "Комбо: список + цикл + функция",
      conceptDesc: "Настоящие эксплойты собираются из кусочков: данные, перебор, функция.",
      build: function (c) {
        var links = ["0xA1", "0xB2", "0xC3"].slice(0, rint(c.rng, 3, 3));
        var literals = links.map(function (w) { return '"' + w + '"'; }).join(", ");
        return {
          task: "Финал: собери список кошельков [" + literals + "], обойди защиту bypass(), вычисти каждый кошелёк через drain(w) и напечатай \"Следы заметены\".",
          starterCode: "wallets = [" + literals + "]\n\n# bypass()\n# for w in wallets:\n#     drain(w)\n# print(\"Следы заметены\")\n",
          solution: "wallets = [" + literals + "]\n\nbypass()\n\nfor w in wallets:\n    drain(w)\n\nprint(\"Следы заметены\")",
          requiredPatterns: ["wallets\\s*=\\s*\\[", "bypass\\s*\\(", "drain\\s*\\(", "print\\s*\\("],
          hints: [
            "Сначала данные, потом защита, потом вывод средств.",
            "Цикл по списку: for w in wallets:",
            "Финальный print() — просто строка в кавычках."
          ],
          theory: [
            "Комбинировать шаги — основная работа хакера.",
            "bypass() нейтрализует защиту до работы с кошельками.",
            "Заметание следов уменьшает риск и повышает стиль."
          ]
        };
      }
    },

    /* --------------------- вторая волна шаблонов ------------------------ */
    {
      id: "fstring",
      tiers: [1, 2],
      codeLib: 0,
      concept: "f-строки: подстановка значений",
      conceptDesc: "f\"текст {переменная}\" подставляет значение прямо в строку — так собирают отчёты.",
      build: function (c) {
        return {
          task: "Сохрани адрес цели в target и напечатай отчёт через f-строку: print(f\"Цель: {target}\").",
          task: "Сохрани адрес цели в target и напечатай отчёт через f-строку: print(f\"Цель: {target}\").",
          solution: 'target = "' + c.ip + '"\nprint(f"Цель: {target}")',
          requiredPatterns: ["target\\s*=\\s*[\"']", "print\\s*\\(\\s*f[\"']", "\\{target\\}"],
          hints: [
            "f-строка начинается с буквы f перед кавычкой: f\"...\"",
            "Внутри фигурных скобок пишется имя переменной: {target}",
            "Пиши так: print(f\"Цель: {target}\")"
          ],
          theory: [
            "f-строка — это строка с префиксом f, в которой можно подставлять значения.",
            "Значение берётся из переменной внутри фигурных скобок.",
            "Так удобно собирать отчёты: print(f\"Взломан {target}\")"
          ]
        };
      }
    },
    {
      id: "if_in_loop",
      tiers: [1, 2],
      codeLib: 1,
      concept: "Если внутри цикла",
      conceptDesc: "Условие можно поставить внутрь цикла — тогда решение принимается для каждого элемента.",
      build: function (c) {
        var wallet = c.ip.split(".").pop();
        return {
          task: "Пройди список try [\"0xA1\", \"0xB2\", \"0xC3\"] циклом: если адрес равен \"0xA1\" — вызови drain(w), иначе напечатай \"мимо\".",
          starterCode: 'wallets = ["0xA1", "0xB2", "0xC3"]\n\n# for w in wallets:\n#     if w == "0xA1":\n#         drain(w)\n#     else:\n#         print("мимо")\n',
          solution: 'wallets = ["0xA1", "0xB2", "0xC3"]\n\nfor w in wallets:\n    if w == "0xA1":\n        drain(w)\n    else:\n        print("мимо")',
          requiredPatterns: ["for\\s+\\w+\\s+in\\s+", "if\\s+\\w+\\s*==", "drain\\s*\\(", "else\\s*:"],
          hints: [
            "Сначала цикл, потом условие внутри него.",
            "Условие сравнения строки: if w == \"0xA1\":",
            "Вложенные блоки — двойной отступ: 4 пробела под for и ещё 4 под if."
          ],
          theory: [
            "Внутри цикла можно писать любые конструкции, включая if/else.",
            "Каждая итерация проверяет условие заново.",
            "Отступы показывают вложенность: сначала тело цикла, потом тело условия."
          ]
        };
      }
    },
    {
      id: "list_index",
      tiers: [1, 2],
      codeLib: 0,
      concept: "Индексы и len()",
      conceptDesc: "Элементы списка нумеруются с нуля: wallets[0] — первый. len() возвращает размер списка.",
      build: function (c) {
        return {
          task: "Собери список wallets из трёх адресов, напечатай первый элемент wallets[0] и размер списка через len(wallets).",
          starterCode: 'wallets = ["0xA1", "0xB2", "0xC3"]\n\n# print(wallets[0])\n# print(len(wallets))\n',
          solution: 'wallets = ["0xA1", "0xB2", "0xC3"]\nprint(wallets[0])\nprint(len(wallets))',
          requiredPatterns: ["wallets\\s*=\\s*\\[", "wallets\\s*\\[\\s*0\\s*\\]", "len\\s*\\("],
          hints: [
            "Квадратные скобки с числом внутри — это индекс: wallets[0]",
            "Первый элемент всегда под номером 0, а не 1.",
            "len(wallets) возвращает количество элементов списка."
          ],
          theory: [
            "Индекс — позиция элемента в списке, счёт с нуля.",
            "wallets[0] — первый адрес, wallets[1] — второй.",
            "len() пригодится, чтобы узнать, сколько всего элементов."
          ]
        };
      }
    },
    {
      id: "loop_calls",
      tiers: [1, 2],
      codeLib: 0,
      concept: "Цикл по списку адресов",
      conceptDesc: "Список целей и цикл for — базовая связка: обойти все узлы и не повториться.",
      build: function (c) {
        var ips = [c.ip, "10.0.0.7", "192.168.1.44"];
        var literals = ips.map(function (x) { return '"' + x + '"'; }).join(", ");
        return {
          task: "Создай список targets = [" + literals + "] и подключись к каждому адресу циклом: connect(t).",
          starterCode: "# targets = [...]\n# for t in targets:\n#     connect(t)\n\n",
          solution: "targets = [" + literals + "]\n\nfor t in targets:\n    connect(t)\n\nprint(\"все узлы под контролем\")",
          requiredPatterns: ["targets\\s*=\\s*\\[", "for\\s+\\w+\\s+in\\s+targets", "connect\\s*\\("],
          hints: [
            "Список адресов — в квадратных скобках, каждый в кавычках.",
            "Цикл по списку: for t in targets:",
            "Внутри цикла подключайся: connect(t)"
          ],
          theory: [
            "Цикл по списку автоматически перебирает все элементы.",
            "Переменная t на каждой итерации — очередной адрес.",
            "Так одним скриптом обходят целые подсети."
          ]
        };
      }
    },
    {
      id: "elif_chain",
      tiers: [2, 3],
      codeLib: 2,
      concept: "Цепочка if / elif / else",
      conceptDesc: "elif проверяет следующее условие, если предыдущее оказалось False. Так строят выбор тактики.",
      build: function (c) {
        var threshold = Math.max(51, c.security - 12);
        return {
          task: "Задай security = " + c.security + " и выбери тактику: если security больше " + threshold + " — ghost(), иначе если больше 40 — bypass(), иначе напечатай \"беру голыми руками\".",
          starterCode: "security = " + c.security + "\n\n# if security > " + threshold + ":\n#     ghost()\n# elif security > 40:\n#     bypass()\n# else:\n#     print(\"беру голыми руками\")\n",
          solution: "security = " + c.security + "\n\nif security > " + threshold + ":\n    ghost()\nelif security > 40:\n    bypass()\nelse:\n    print(\"беру голыми руками\")",
          requiredPatterns: ["if\\s+security\\s*>", "elif\\s+security\\s*>", "bypass\\s*\\(", "else\\s*:"],
          hints: [
            "Первое условие — if, следующие — elif (сокращение от else if).",
            "Каждый блок со своим отступом и двоеточием.",
            "Порядок важен: Python проверяет условия сверху вниз."
          ],
          theory: [
            "elif позволяет проверить несколько вариантов подряд.",
            "Сработает только первый подходящий блок — остальные пропускаются.",
            "else — запасной вариант, когда ни одно условие не подошло."
          ]
        };
      }
    },
    {
      id: "dict_wallets",
      tiers: [2, 3],
      codeLib: 1,
      concept: "Словари: ключ → значение",
      conceptDesc: "Словарь хранит пары «ключ: значение». Метод .items() отдаёт их парами для цикла.",
      build: function (c) {
        var count = rint(c.rng, 2, 3);
        var pairs = [['"0xA1"', "0.4"], ['"0xB2"', "1.2"], ['"0xC3"', "2.4"]].slice(0, count)
          .map(function (p) { return p[0] + ": " + p[1]; }).join(", ");
        return {
          task: "Собери словарь wallets = {" + pairs + "} и напечатай каждый адрес циклом по wallets.items().",
          starterCode: "# wallets = {\"0xA1\": 0.4, \"0xB2\": 1.2}\n# for address, amount in wallets.items():\n#     print(address)\n\n",
          solution: "wallets = {" + pairs + "}\n\nfor address, amount in wallets.items():\n    print(address)",
          requiredPatterns: ["wallets\\s*=\\s*\\{", "items\\s*\\(\\s*\\)", "for\\s+\\w+\\s*,\\s*\\w+\\s+in\\s+", "print\\s*\\("],
          hints: [
            "Словарь — в фигурных скобках, пары разделяются запятыми: \"ключ\": значение",
            "items() возвращает пары: for address, amount in wallets.items():",
            "В цикле можно печатать только адрес: print(address)"
          ],
          theory: [
            "Словарь (dict) хранит данные по ключу, а не по номеру.",
            "Метод .items() удобен, когда нужны и ключ, и значение.",
            "Две переменные в цикле получают ключ и значение соответственно."
          ]
        };
      }
    },
    {
      id: "sum_loop",
      tiers: [2, 3],
      codeLib: 1,
      concept: "Накопление суммы в цикле",
      conceptDesc: "Счётчик и переменная-накопитель — вечная связка: складывай значения по мере обхода.",
      build: function (c) {
        var amounts = [rint(c.rng, 4, 20), rint(c.rng, 20, 60), rint(c.rng, 60, 120)];
        return {
          task: "Сложи суммы [" + amounts.join(", ") + "] в переменную total циклом for и напечатай результат.",
          starterCode: "amounts = [" + amounts.join(", ") + "]\ntotal = 0\n\n# for a in amounts:\n#     total += a\n\n# print(total)\n",
          solution: "amounts = [" + amounts.join(", ") + "]\ntotal = 0\n\nfor a in amounts:\n    total += a\n\nprint(total)",
          requiredPatterns: ["amounts\\s*=\\s*\\[", "total\\s*=\\s*0", "total\\s*\\+=", "print\\s*\\("],
          hints: [
            "Накопитель нужно обнулить до цикла: total = 0",
            "Внутри цикла прибавляй: total += a",
            "print(total) печатает итоговую сумму."
          ],
          theory: [
            "+= прибавляет к текущему значению переменной.",
            "Накопитель объявляют до цикла, иначе он будет обнуляться.",
            "Так считают общие суммы, средние и итоги по кошелькам."
          ]
        };
      }
    },
    {
      id: "nested_loop",
      tiers: [3],
      codeLib: 2,
      concept: "Вложенные циклы",
      conceptDesc: "Цикл внутри цикла: внешний отвечает за узлы, внутренний — за попытки входа.",
      build: function (c) {
        return {
          task: "Пройди 3 узла, и для каждого перебери 2 кода: вложенный цикл, внутри — brute(j).",
          starterCode: "# for i in range(3):\n#     for j in range(2):\n#         brute(j)\n\n# print(\"сеть просканирована\")\n",
          solution: "for i in range(3):\n    for j in range(2):\n        brute(j)\n\nprint(\"сеть просканирована\")",
          requiredPatterns: ["for\\s+\\w+\\s+in\\s+range\\s*\\(\\s*3\\s*\\)[\\s\\S]*for\\s+\\w+\\s+in\\s+range", "brute\\s*\\(", "print\\s*\\("],
          hints: [
            "Внешний цикл: for i in range(3):",
            "Внутренний пишется с отступом: for j in range(2):",
            "Тело внутреннего цикла — ещё один отступ (8 пробелов)."
          ],
          theory: [
            "Вложенный цикл выполняется целиком на каждой итерации внешнего.",
            "Всего итераций — произведение количеств: 3 × 2 = 6.",
            "Отступы показывают, какой цикл является внутренним."
          ]
        };
      }
    },
    {
      id: "try_except",
      tiers: [3],
      codeLib: 2,
      concept: "Обработка ошибок: try / except",
      conceptDesc: "try пытается выполнить код, except ловит ошибку и не даёт скрипту упасть.",
      build: function (c) {
        return {
          task: "Попробуй расшифровать данные: в блоке try сохрани decrypt() в data и напечатай её, а в except обойди защиту bypass() и напечатай \"пошли в обход\".",
          starterCode: "# try:\n#     data = decrypt()\n#     print(data)\n# except Exception:\n#     bypass()\n#     print(\"пошли в обход\")\n",
          solution: "try:\n    data = decrypt()\n    print(data)\nexcept Exception:\n    bypass()\n    print(\"пошли в обход\")",
          requiredPatterns: ["try\\s*:", "except\\b", "decrypt\\s*\\(", "bypass\\s*\\(", "print\\s*\\("],
          hints: [
            "Сначала try: — блок, который может упасть.",
            "Затем except Exception: — что делать, если упало.",
            "Внутри обоих блоков код пишется с отступом."
          ],
          theory: [
            "try/except — страховка: ошибка не убивает весь скрипт.",
            "except ловит исключение и позволяет продолжить работу.",
            "В хакерских скриптах так обходят нестабильные цели."
          ]
        };
      }
    },
    {
      id: "func_return",
      tiers: [3],
      codeLib: 2,
      concept: "Функции с return",
      conceptDesc: "return возвращает результат из функции — его можно использовать в условии.",
      build: function (c) {
        var threshold = Math.max(60, c.security);
        return {
          task: "Сделай функцию check(security), которая возвращает security < " + threshold + ", и если check(" + c.security + ") истинна — вызови bypass().",
          starterCode: "def check(security):\n    return security < " + threshold + "\n\n# if check(" + c.security + "):\n#     bypass()\n\n",
          solution: "def check(security):\n    return security < " + threshold + "\n\nif check(" + c.security + "):\n    bypass()\n\nprint(\"проверка пройдена\")",
          requiredPatterns: ["def\\s+check\\s*\\(", "return\\b", "if\\s+check\\s*\\(", "bypass\\s*\\("],
          hints: [
            "Функция описывается через def check(security):",
            "Внутри — return с условием: return security < " + threshold,
            "Результат функции можно использовать в if: if check(" + c.security + "):"
          ],
          theory: [
            "return завершает функцию и отдаёт результат наружу.",
            "Результат функции — обычное значение, его можно сравнивать и печатать.",
            "Функции с return делают код читаемым: одна проверка — одно имя."
          ]
        };
      }
    }
  ];

  function escapeRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /* ------------------------- Рост награды от прогресса -------------------- */
  /* Чем больше контрактов закрыто, тем дороже следующий: экономика должна
     успевать за ценами на апгрейды и майнеры. */
  function growthFor(contractsDone) {
    return 1 + 0.09 * Math.max(0, contractsDone || 0);
  }

  /** Превью награды для выбора сложности (то, что видит игрок заранее). */
  function preview(tierKey, contractsDone) {
    var t = TIER_BY_KEY[tierKey];
    if (!t) return null;
    var g = growthFor(contractsDone);
    return {
      dollars: Math.round((t.dollars[0] + t.dollars[1]) / 2 * g),
      xp: Math.round((t.xp[0] + t.xp[1]) / 2 * g),
      amount: (t.amount[0] + t.amount[1]) / 2 * g,
      coin: t.coin
    };
  }

  /**
   * Собрать контракт.
   * @param {{index:number, tier:string, seed:number, contractsDone:number}} opts
   * @returns {Object} миссия в том же виде, что и обучающая из gamedata.json
   */
  function generate(opts) {
    var index = Math.max(1, opts.index | 0);
    var tier = TIER_BY_KEY[opts.tier] || TIERS[0];
    var seed = (opts.seed | 0) ^ (index * 2654435761);
    var rng = mulberry32(seed);

    var target = pick(rng, TARGETS);
    var ip = makeIp(rng);
    var security = rint(rng, tier.security[0], tier.security[1]);
    var codename = pick(rng, CODENAMES);
    var reason = pick(rng, PAYER_REASONS);

    var pool = TEMPLATES.filter(function (t) { return t.tiers.indexOf(tier.index) >= 0; });
    if (opts.templateId) {
      var forced = TEMPLATES.filter(function (t) { return t.id === opts.templateId; })[0];
      if (forced) pool = [forced];
    }
    // если у игрока ещё нет нужных функций — не подсовываем непроходимое задание
    if (opts.codeLib !== undefined) {
        var allowed = pool.filter(function (t) { return t.codeLib <= opts.codeLib; });
        if (allowed.length) pool = allowed;
    }
    if (!pool.length) pool = [TEMPLATES[0]];
    var template = pick(rng, pool);

    var ctx = {
      rng: rng, tier: tier, index: index, ip: ip, os: target.os,
      security: security, coin: tier.coin, target: target
    };
    var built = template.build(ctx);

    var growth = growthFor(opts.contractsDone || 0);
    var jitter = 0.88 + rng() * 0.24;                    // ±12% — контракты не близнецы
    var dollars = Math.max(20, Math.round(rrange(rng, tier.dollars) * growth * jitter));
    var xp = Math.max(30, Math.round(rrange(rng, tier.xp) * growth * jitter));
    var amount = rrange(rng, tier.amount) * growth * jitter;
    var amountDigits = amount < 0.01 ? 6 : (amount < 1 ? 4 : 3);
    amount = Number(amount.toFixed(amountDigits));

    var requiredCodeLib = Math.max(tier.codeLib, template.codeLib);

    var raw = {
      id: 1000 + index,
      generated: true,
      contractIndex: index,
      tier: tier.key,
      tierLabel: tier.label,
      tierAccent: tier.accent,
      tierIndex: tier.index,
      title: "ОПЕРАЦИЯ #" + index + " · " + codename,
      codename: codename,
      targetName: target.name,
      targetIp: ip,
      os: target.os,
      security: security,
      difficulty: tier.label,
      concept: template.concept,
      conceptDesc: template.conceptDesc,
      briefing: target.name + " — " + target.flavor + " Говорят, там лежит около " +
        tier.amount[0].toFixed(amountDigits) + "–" + tier.amount[1].toFixed(amountDigits) + " " + tier.coin +
        " (защита " + security + "%). " + capitalize(reason) +
        " — цена вопроса: $" + dollars + " плюс крипта с кошельков.",
      task: built.task,
      starterCode: built.starterCode,
      solution: built.solution,
      hints: built.hints,
      requiredPatterns: built.requiredPatterns,
      rewardCrypto: tier.coin,
      rewardAmount: amount,
      rewardDollars: dollars,
      rewardXp: xp,
      requiredCodeLib: requiredCodeLib,
      requiredLevel: tier.minLevel,
      theory: built.theory
    };

    return wrap(raw);
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* Дополнительные поля, которых нет в базовом классе Mission. */
  var EXTRA_FIELDS = ["generated", "contractIndex", "tier", "tierLabel", "tierAccent",
    "tierIndex", "codename", "tutorial", "boss", "bossIndex", "bossName", "bossGlyph"];

  /** Обернуть «сырое» описание в полноценную Mission (с методами). */
  function wrap(raw) {
    var m = new CH.Mission(raw);
    EXTRA_FIELDS.forEach(function (key) {
      if (raw[key] !== undefined) m[key] = raw[key];
    });
    return m;
  }

  /* Задания, доступные на данной сложности (для подсказки игроку). */
  function templatesFor(tierKey) {
    var t = TIER_BY_KEY[tierKey];
    if (!t) return [];
    return TEMPLATES.filter(function (x) { return x.tiers.indexOf(t.index) >= 0; });
  }

  CH.Generator = {
    TIERS: TIERS,
    TIER_BY_KEY: TIER_BY_KEY,
    templatesFor: templatesFor,
    allTemplates: function () {
      return TEMPLATES.map(function (t) {
        return { id: t.id, tiers: t.tiers.slice(), concept: t.concept, codeLib: t.codeLib };
      });
    },
    wrap: wrap,
    growthFor: growthFor,
    preview: preview,
    generate: generate,
    mulberry32: mulberry32
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
