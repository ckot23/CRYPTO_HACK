/* ==========================================================================
   bosses.js — сюжетные боссы.

   Обычные контракты генерируются бесконечно, а это четыре именные цели:
   идут по цепочке, открываются за закрытые контракты и требуют всего
   арсенала сразу (вложенные циклы, словари, свои функции, try/except).
   Награда в разы выше, защита почти максимальная, провал не откатывает
   прогресс — просто пробуешь снова.
   ========================================================================== */
(function (root) {
  "use strict";

  var CH = root.CH = root.CH || {};

  /* Порядок важен: боссы открываются по очереди.
     need — сколько контрактов должно быть закрыто, coin/amount/dollars/xp — награда. */
  var BOSSES = [
    {
      index: 1,
      id: 9001,
      name: "ГИДРА",
      subtitle: "сеть из двенадцати узлов",
      glyph: "☠",
      targetName: "Кластер «Гидра» (12 узлов)",
      os: "Linux · Kubernetes",
      security: 84,
      need: 2,
      coin: "BTC", amount: 0.012, dollars: 2600, xp: 900,
      codeLib: 3,
      templateId: "nested_loop",
      briefing: "Первая серьёзная цель: кластер из двенадцати узлов, отрубишь один — поднимется другой. " +
        "Внутри крутится ботнет и чужой майнер. Работать придётся вложенными циклами: по узлам и по кодам доступа.",
      task: "Пройди 3 узла, и для каждого перебери 2 кода: вложенный цикл for i in range(3) → for j in range(2) → brute(j), " +
        "затем bypass() и печать «Гидра обезглавлена».",
      starterCode: "# ГИДРА: вложенные циклы\n# for i in range(3):\n#     for j in range(2):\n#         brute(j)\n\n# bypass()\n# print(\"Гидра обезглавлена\")\n",
      solution: "for i in range(3):\n    for j in range(2):\n        brute(j)\n\nbypass()\nprint(\"Гидра обезглавлена\")",
      requiredPatterns: [
        "for\\s+\\w+\\s+in\\s+range\\s*\\(\\s*3\\s*\\)[\\s\\S]*for\\s+\\w+\\s+in\\s+range",
        "brute\\s*\\(", "bypass\\s*\\(", "print\\s*\\("
      ],
      hints: [
        "Внешний цикл идёт по узлам: for i in range(3):",
        "Внутренний — по кодам, с отступом: for j in range(2):",
        "Тело внутреннего цикла с двойным отступом: brute(j)",
        "После циклов обойди защиту bypass() и напечатай результат."
      ],
      theory: [
        "Вложенные циклы дают полный перебор: 3 узла × 2 кода = 6 попыток.",
        "Отступы в Python показывают, какой цикл внутренний.",
        "Боссы не прощают порядка команд: сначала перебор, потом обход защиты."
      ]
    },
    {
      index: 2,
      id: 9002,
      name: "ЧЁРНЫЙ АРХИВ",
      subtitle: "4 ТБ компромата за шифрованием",
      glyph: "⚔",
      targetName: "Хранилище «Чёрный архив»",
      os: "FreeBSD · ZFS",
      security: 88,
      need: 5,
      coin: "ETH", amount: 0.5, dollars: 3900, xp: 1300,
      codeLib: 3,
      templateId: "func_return",
      briefing: "Архив стоит на шифровании: ключ проверяется функцией. Тебе нужна своя функция проверки, " +
        "которая вернёт True и пустит внутрь. Хозяева архива уверены, что до него не доберутся.",
      task: "Напиши функцию unlock(key) с проверкой ключа через if и return, вызови её в условии if unlock(\"neon-77\"), " +
        "затем bypass(), сохрани decrypt() в data и напечатай его.",
      starterCode: "# ЧЁРНЫЙ АРХИВ\n# def unlock(key):\n#     if key == \"neon-77\":\n#         return True\n#     return False\n\n# if unlock(\"neon-77\"):\n#     bypass()\n#     data = decrypt()\n#     print(data)\n",
      solution: "def unlock(key):\n    if key == \"neon-77\":\n        return True\n    return False\n\nif unlock(\"neon-77\"):\n    bypass()\n    data = decrypt()\n    print(data)",
      requiredPatterns: [
        "def\\s+unlock\\s*\\(", "return\\b", "if\\s+unlock\\s*\\(",
        "bypass\\s*\\(", "decrypt\\s*\\(", "print\\s*\\("
      ],
      hints: [
        "Функция: def unlock(key): — внутри проверка if key == \"neon-77\":",
        "Верни результат через return True / return False.",
        "Вызови функцию в условии: if unlock(\"neon-77\"):",
        "Внутри блока расшифруй данные: data = decrypt(), потом print(data)."
      ],
      theory: [
        "def + return позволяют вынести проверку в отдельное имя.",
        "Функция возвращает значение, а if решает, что делать дальше.",
        "decrypt() возвращает расшифрованную сид-фразу — её и печатаем."
      ]
    },
    {
      index: 3,
      id: 9003,
      name: "СОВЕТ ДЕВЯТИ",
      subtitle: "кошельки девяти посредников",
      glyph: "☣",
      targetName: "Сеть посредников «Совет девяти»",
      os: "Windows Server 2022",
      security: 92,
      need: 9,
      coin: "XMR", amount: 40, dollars: 5600, xp: 1800,
      codeLib: 3,
      templateId: "dict_wallets",
      briefing: "Девять посредников держат общий пул. Кошельки лежат в словаре: адрес → сумма. " +
        "Нужно пройти по парам, вывести средства с каждого и посчитать, сколько всего ушло.",
      task: "Собери словарь wallets с тремя адресами и суммами, циклом по wallets.items() вызывай drain(address) " +
        "и суммируй в total через +=, в конце напечатай total.",
      starterCode: "wallets = {\"0xA1\": 0.4, \"0xB2\": 1.2, \"0xC3\": 2.4}\n\ntotal = 0\n\n# for address, amount in wallets.items():\n#     drain(address)\n#     total += amount\n\n# print(total)\n",
      solution: "wallets = {\"0xA1\": 0.4, \"0xB2\": 1.2, \"0xC3\": 2.4}\n\ntotal = 0\n\nfor address, amount in wallets.items():\n    drain(address)\n    total += amount\n\nprint(total)",
      requiredPatterns: [
        "wallets\\s*=\\s*\\{", "items\\s*\\(\\s*\\)", "drain\\s*\\(",
        "total\\s*\\+=", "print\\s*\\("
      ],
      hints: [
        "Словарь — фигурные скобки, пары через запятую: \"0xA1\": 0.4",
        "Цикл по парам: for address, amount in wallets.items():",
        "Внутри цикла два действия: drain(address) и total += amount.",
        "Накопитель total обнули до цикла."
      ],
      theory: [
        "Словарь хранит пары «ключ: значение», .items() отдаёт их в цикл.",
        "Две переменные цикла получают ключ (адрес) и значение (сумму).",
        "total += amount накапливает итог по всем кошелькам."
      ]
    },
    {
      index: 4,
      id: 9004,
      name: "ТИТАН",
      subtitle: "финальный экзамен",
      glyph: "✦",
      targetName: "Дата-центр «Титан»",
      os: "Linux · bare metal",
      security: 97,
      need: 14,
      coin: "SOL", amount: 60, dollars: 8400, xp: 2600,
      codeLib: 3,
      templateId: "try_except",
      briefing: "Последняя цель в сети. Тут всё сразу: обход защиты, страховка от ошибок, майнеры и заметание следов. " +
        "Никто не ждёт, что ты дойдёшь до сюда.",
      task: "Работай аккуратно: в цикле из 3 попыток поставь майнер в try/except (при ошибке печатай «промах»), " +
        "затем циклом while i < 2 вызови ghost() дважды и напечатай «Титан пал».",
      starterCode: "# ТИТАН\n# for i in range(3):\n#     try:\n#         install_miner()\n#     except Exception:\n#         print(\"промах\")\n\n# i = 0\n# while i < 2:\n#     ghost()\n#     i += 1\n\n# print(\"Титан пал\")\n",
      solution: "for i in range(3):\n    try:\n        install_miner()\n    except Exception:\n        print(\"промах\")\n\ni = 0\nwhile i < 2:\n    ghost()\n    i += 1\n\nprint(\"Титан пал\")",
      requiredPatterns: [
        "try\\s*:", "except\\b", "install_miner\\s*\\(",
        "while\\s+", "ghost\\s*\\(", "print\\s*\\("
      ],
      hints: [
        "Первая часть: цикл по попыткам for i in range(3):",
        "Внутри — try: install_miner() и except Exception: print(\"промах\")",
        "Вторая часть: счётчик i = 0 и while i < 2: с ghost() внутри.",
        "Не забудь увеличивать счётчик: i += 1 — иначе цикл не закончится."
      ],
      theory: [
        "try/except защищает от падения: одна ошибка не срывает всю операцию.",
        "while повторяет блок, пока условие True — счётчик обязателен.",
        "ghost() заметает следы: после финальной цели это хорошая привычка."
      ]
    }
  ];

  function byIndex(index) {
    return BOSSES.filter(function (b) { return b.index === Number(index); })[0] || null;
  }

  function byId(id) {
    return BOSSES.filter(function (b) { return b.id === Number(id); })[0] || null;
  }

  /**
   * Собрать миссию-босс.
   * Босс берёт шаблон задания у генератора и добавляет свою легенду и награду.
   */
  function build(index, seed) {
    var boss = byIndex(index);
    if (!boss) return null;
    seed = Number(seed) || boss.id * 7919;

    var base = CH.Generator.generate({
      index: boss.index,                 // влияет только на seed-шум шаблона
      tier: "expert",
      seed: seed,
      contractsDone: 0,                  // награда босса фиксированная
      templateId: boss.templateId,
      codeLib: boss.codeLib
    });

    var raw = {
      id: boss.id,
      generated: true,
      boss: true,
      bossIndex: boss.index,
      bossName: boss.name,
      bossGlyph: boss.glyph,
      contractIndex: 0,
      tier: "expert",
      tierLabel: "БОСС",
      tierAccent: "#ff2d78",
      title: boss.glyph + " БОСС: " + boss.name,
      codename: boss.name,
      targetName: boss.targetName,
      targetIp: base.targetIp,
      os: boss.os,
      security: boss.security,
      difficulty: "БОСС",
      concept: base.concept,
      conceptDesc: base.conceptDesc,
      briefing: boss.briefing,
      task: boss.task,
      starterCode: boss.starterCode,
      solution: boss.solution,
      hints: boss.hints,
      // требования — из задания плюс базовые шаблонные (на случай правок)
      requiredPatterns: boss.requiredPatterns || base.requiredPatterns,
      rewardCrypto: boss.coin,
      rewardAmount: boss.amount,
      rewardDollars: boss.dollars,
      rewardXp: boss.xp,
      requiredCodeLib: boss.codeLib,
      requiredLevel: 5,
      theory: boss.theory
    };
    return CH.Generator.wrap(raw);
  }

  /** Следующий неповерженный босс (по порядку цепочки). */
  function next(game) {
    for (var i = 0; i < BOSSES.length; i++) {
      if (!game.isMissionCompleted(BOSSES[i].id)) return BOSSES[i];
    }
    return null;
  }

  function defeatedCount(game) {
    return BOSSES.filter(function (b) { return game.isMissionCompleted(b.id); }).length;
  }

  /** Готов ли следующий босс: закрыто достаточно контрактов и есть арсенал. */
  function availability(game) {
    var boss = next(game);
    if (!boss) return { boss: null, ready: false, reason: "все боссы повержены" };
    if (!game.tierUnlocked("expert")) {
      return { boss: boss, ready: false, reason: "нужен доступ к ЭКСПЕРТу: " + game.tierRequirement("expert") };
    }
    var done = game.contractsDone();
    if (done < boss.need) {
      return { boss: boss, ready: false, reason: "нужно закрыть контрактов: " + boss.need + " (сейчас " + done + ")" };
    }
    return { boss: boss, ready: true, reason: "" };
  }

  CH.Bosses = {
    list: BOSSES,
    byIndex: byIndex,
    byId: byId,
    build: build,
    next: next,
    defeatedCount: defeatedCount,
    availability: availability
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
