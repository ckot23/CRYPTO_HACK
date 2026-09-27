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
      key: "easy", label: "ЛЕГКО", accent: "#00ff9d", coin: "BTC",
      minLevel: 1, codeLib: 0, security: [8, 26],
      dollars: [60, 130], xp: [110, 170], amount: [0.0012, 0.0032],
      blurb: "Домашние машины, слабые пароли, быстрый профит."
    },
    {
      key: "medium", label: "СРЕДНЕ", accent: "#ffe600", coin: "ETH",
      minLevel: 2, codeLib: 0, security: [30, 50],
      dollars: [180, 340], xp: [200, 300], amount: [0.02, 0.06],
      blurb: "Есть антивирус и вменяемые пароли."
    },
    {
      key: "hard", label: "СЛОЖНО", accent: "#ff9f43", coin: "XMR",
      minLevel: 3, codeLib: 1, security: [52, 72],
      dollars: [420, 720], xp: [320, 460], amount: [2, 6],
      blurb: "Корпоративные сети, шифрование, логи."
    },
    {
      key: "expert", label: "ЭКСПЕРТ", accent: "#ff2d78", coin: "SOL",
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
    "tierIndex", "codename", "tutorial"];

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
    wrap: wrap,
    growthFor: growthFor,
    preview: preview,
    generate: generate,
    mulberry32: mulberry32
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
