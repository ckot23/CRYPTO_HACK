/* ==========================================================================
   smoke-test.mjs — проверка браузерной версии без браузера.

   Поднимает страницу web/index.html на локальном HTTP-сервере и проходит
   путь нового игрока: включение компьютера → приветствие браузера с логином
   → загрузка NeonOS → рабочий стол. Дальше: семь программ, обучающая миссия,
   генерация контрактов разных сложностей, награды, майнер, биржа, апгрейд
   и сохранение. Падение любого шага — ошибка.

   Запуск:
       cd tools/web && npm install && npm test
   ========================================================================== */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const here = dirname(fileURLToPath(import.meta.url));
const webDir = resolve(here, "..", "..", "web");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ttf": "font/ttf",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8"
};

let failures = 0;
function check(name, ok, extra = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${name}${extra ? " — " + extra : ""}`);
}

/* ------------------------- локальный статик-сервер ---------------------- */
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
    const file = join(webDir, rel === "/" ? "index.html" : rel);
    if (!file.startsWith(webDir)) { res.writeHead(403).end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch (e) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("not found");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;

/* ------------------------------ утилиты --------------------------------- */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function waitFor(predicate, timeout = 5000, every = 40) {
  return new Promise((res, rej) => {
    const t0 = Date.now();
    const step = () => {
      let ok = false;
      try { ok = !!predicate(); } catch (e) { /* ещё не готово */ }
      if (ok) return res(true);
      if (Date.now() - t0 > timeout) return rej(new Error("таймаут ожидания"));
      setTimeout(step, every);
    };
    step();
  });
}

/* ------------------------------- страница -------------------------------- */
const errors = [];
const dom = await JSDOM.fromURL(`${origin}/index.html`, {
  runScripts: "dangerously",
  resources: "usable",
  pretendToBeVisual: true,
  beforeParse(window) {
    window.addEventListener("error", (e) => errors.push(String(e.error || e.message)));
    window.addEventListener("unhandledrejection", (e) => errors.push("promise: " + String(e.reason)));
    const render = window.console.error;
    window.console.error = function (...args) {
      errors.push("console: " + args.map(String).join(" ").slice(0, 220));
      render.apply(window.console, args);
    };
  }
});

const { window } = dom;
const doc = window.document;
await new Promise((r) => window.addEventListener("load", r));

const click = (node) => node.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
const text = () => doc.body.textContent || "";
const findButton = (...labels) =>
  [...doc.querySelectorAll("button")].find((b) => labels.some((l) => (b.textContent || "").includes(l)));

async function run() {
  /* ---------------- 1. включение компьютера и вход ---------------------- */
  await waitFor(() => doc.querySelector(".power"));
  check("стартовый экран — выключенный компьютер", !!doc.querySelector(".power-btn"));

  click(doc.querySelector(".power-btn"));
  await waitFor(() => doc.querySelector(".post-log .post-line"), 3000);
  check("после кнопки питания идёт POST", doc.querySelectorAll(".post-log .post-line").length > 0);

  await waitFor(() => doc.querySelector(".browser"), 8000);
  check("открылся браузер с приветствием", !!doc.querySelector(".browser-page"));
  check("название игры крупно и по центру", !!doc.querySelector(".auth-title"),
    (doc.querySelector(".auth-title") || {}).textContent);

  const login = doc.querySelector("input.login-field");
  check("есть поле логина", !!login);

  // пустой логин — отказ
  click(findButton("ВОЙТИ В СИСТЕМУ"));
  await wait(80);
  check("пустой логин не пускает", !!doc.querySelector(".login-field") && !!doc.querySelector(".auth"));

  // кривой логин — тоже отказ
  login.value = "a!";
  click(findButton("ВОЙТИ В СИСТЕМУ"));
  await wait(80);
  check("некорректный логин отклонён", (doc.querySelector(".login-error") || {}).textContent.length > 0);

  // нормальный логин
  login.value = "neo";
  click(findButton("ВОЙТИ В СИСТЕМУ"));
  await waitFor(() => doc.querySelector(".boot"), 4000);
  check("после входа идёт загрузка NeonOS", !!doc.querySelector(".boot"));
  check("логин попал в профиль", window.CH.game.login === "neo");

  /* ------------------------ 2. рабочий стол ----------------------------- */
  window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  await waitFor(() => doc.querySelector(".desktop"), 8000);
  check("рабочий стол появился", !!doc.querySelector(".desktop"));
  check("хак-терминал открылся сам", !!doc.querySelector(".mission-list"));
  check("тикеры курсов на месте (4 монеты)", doc.querySelectorAll(".ticker").length === 4);
  check("иконок программ семь", doc.querySelectorAll(".app-icon").length === 7);
  check("панель задач и HUD отрисованы", !!doc.querySelector(".taskbar") && /LV 1/.test(text()));

  const modal = doc.querySelector(".modal");
  if (modal) {
    const ok = [...modal.querySelectorAll("button")].find((b) => /ПОГНАЛИ|ЗАБРАТЬ/.test(b.textContent || ""));
    if (ok) click(ok);
    await wait(60);
    check("обучающая модалка закрывается", !doc.querySelector(".modal"));
  }

  for (let i = 2; i <= 7; i++) {
    window.dispatchEvent(new window.KeyboardEvent("keydown", { key: String(i), bubbles: true }));
    await wait(60);
  }
  check("открыты все семь окон", doc.querySelectorAll(".win").length === 7,
    "окон: " + doc.querySelectorAll(".win").length);

  window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await wait(60);
  check("Esc закрывает верхнее окно", doc.querySelectorAll(".win").length === 6);
  window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "7", bubbles: true }));
  await wait(80);

  const game = window.CH.game;
  check("игра доступна из консоли (CH.game)", !!game);

  /* ---------------- 3. список целей: обучение + контракты --------------- */
  check("в игре одна обучающая миссия (id 1)", game.tutorial.id === 1 && game.Data.missions.length > 1);
  check("до старта контрактов нет", game.contracts.length === 0);
  check("в списке целей видно обучение", /ОБУЧЕНИЕ/.test(text()));
  check("панель выбора сложности на месте", !!doc.querySelector(".tier-box") && doc.querySelectorAll(".tier-chip").length === 4);
  check("сложности закрыты по уровню",
    game.tierUnlocked("easy") && !game.tierUnlocked("medium") && !game.tierUnlocked("expert"));

  /* ------------------------ 4. обучающая миссия ------------------------- */
  const area = doc.querySelector("textarea.input");
  check("редактор кода на месте", !!area);
  const tutorial = game.tutorial;
  area.value = tutorial.solution;
  area.dispatchEvent(new window.Event("input", { bubbles: true }));
  click(findButton("ЗАПУСТИТЬ"));
  await waitFor(() => /ВЗЛОМ УСПЕШЕН/.test(text()), 12000);
  check("обучающая миссия взломана", /ВЗЛОМ УСПЕШЕН/.test(text()));
  check("награда за обучение начислена", game.isMissionCompleted(1) && game.xp > 0, "XP: " + game.xp);

  await wait(900);
  check("после обучения выдан первый контракт", game.contracts.length === 1,
    "контрактов: " + game.contracts.length);
  const first = game.contracts.length ? game.contractMission(game.contracts[0]) : null;
  check("контракт — цельная миссия с заданием и наградами",
    !!first && !!first.task && !!first.solution && first.rewardDollars > 0 && first.requiredPatterns.length > 0,
    first ? first.title : "—");
  check("контракт сменил сложность на ЛЕГКО", first && first.tier === "easy", first ? first.difficulty : "");

  /* ------------------------ 5. генератор контрактов --------------------- */
  const Gen = window.CH.Generator;
  check("четыре уровня сложности с разными наградами",
    Gen.TIERS.length === 4 &&
    Gen.TIERS[0].dollars[0] < Gen.TIERS[1].dollars[0] &&
    Gen.TIERS[1].dollars[0] < Gen.TIERS[2].dollars[0] &&
    Gen.TIERS[2].dollars[0] < Gen.TIERS[3].dollars[0]);
  check("разные монеты по сложностям",
    Gen.TIERS.map((t) => t.coin).join(",") === "BTC,ETH,XMR,SOL");
  check("превью награды зависит от сложности",
    Gen.preview("expert", 0).xp > Gen.preview("easy", 0).xp * 2,
    "easy " + Gen.preview("easy", 0).xp + " XP · expert " + Gen.preview("expert", 0).xp + " XP");

  const a1 = Gen.generate({ index: 5, tier: "medium", seed: 42, contractsDone: 4 });
  const a2 = Gen.generate({ index: 5, tier: "medium", seed: 42, contractsDone: 4 });
  const b1 = Gen.generate({ index: 6, tier: "medium", seed: 43, contractsDone: 4 });
  check("генерация детерминирована по seed", a1.title === a2.title && a1.targetIp === a2.targetIp);
  check("другой seed — другая цель", a1.title !== b1.title || a1.targetIp !== b1.targetIp,
    a1.title + " / " + b1.title);
  check("тема задания берётся из пула сложности", a1.tier === "medium" && a1.requiredPatterns.length > 0);
  check("награда растёт с числом контрактов",
    Gen.generate({ index: 9, tier: "easy", seed: 7, contractsDone: 20 }).rewardDollars >
    Gen.generate({ index: 9, tier: "easy", seed: 7, contractsDone: 0 }).rewardDollars);
  check("условия сложности соблюдаются",
    Gen.generate({ index: 3, tier: "easy", seed: 11, contractsDone: 0 }).security <= 26 &&
    Gen.generate({ index: 3, tier: "expert", seed: 11, contractsDone: 0 }).security >= 74);

  /* --------------------- 6. генерация через игру ------------------------ */
  game.addXp(400);                       // поднимаем уровень до 2
  await wait(60);
  check("второй уровень открыл СРЕДНЕ", game.tierUnlocked("medium"), "уровень " + game.level);
  const medium = game.createContract("medium", 12345);
  check("контракт средней сложности создан", !!medium && medium.tier === "medium");
  check("контракты различаются по награде",
    medium.rewardDollars !== first.rewardDollars || medium.rewardXp !== first.rewardXp,
    "легко: $" + first.rewardDollars + " / средне: $" + medium.rewardDollars);

  const contractsNow = game.contracts.length;
  check("уровень всё ещё не пускает ЭКСПЕРТ", !game.tierUnlocked("expert"));
  check("генерация через UI создаёт контракт",
    (() => {
      const btn = findButton("КОНТРАКТ");
      if (!btn) return false;
      click(btn);
      return game.contracts.length === contractsNow + 1;
    })(), "контрактов: " + game.contracts.length);
  check("все цели видны в списке", game.missions().length === game.contracts.length + 1);

  /* --------------------- 7. майнер, биржа, апгрейд ---------------------- */
  game.dollars = 10000;
  check("майнер ставится на любую взломанную цель", game.installMiner(1, "BTC") && game.miners.length === 1);
  const before = game.getCrypto("BTC");
  for (let i = 0; i < 10; i++) game.tickMiners();
  check("майнер добывает крипту", game.getCrypto("BTC") > before, "BTC: " + game.getCrypto("BTC").toFixed(10));
  check("майнер виден в списке свободных компов", game.missions().some((m) => m.id === 1));

  const usdBefore = game.dollars;
  check("покупка на бирже прошла", game.trade("BTC", 100, true) && game.totalTrades === 1);
  check("доллары списались", game.dollars < usdBefore);
  game.dollars = 10000;
  check("апгрейд куплен", game.buyUpgrade("stealth") && game.upgradeLevel("stealth") === 1);
  check("комиссия снизилась", Math.abs(game.fee() - 0.04) < 1e-6, "fee: " + game.fee());

  /* ---------------------------- 8. сохранение --------------------------- */
  game.save();
  const raw = JSON.parse(window.localStorage.getItem("cryptohack_save.json"));
  check("сейв лежит в localStorage", !!raw && raw.completedMissions.includes(1));
  check("в сейве логин игрока", raw.login === "neo");
  check("в сейве список контрактов", Array.isArray(raw.contracts) && raw.contracts.length === game.contracts.length);
  check("контракты восстановились из сейва такими же", (() => {
    const copy = JSON.parse(window.localStorage.getItem("cryptohack_save.json"));
    const firstSaved = copy.contracts[0];
    const rebuilt = Gen.generate({ index: firstSaved.n, tier: firstSaved.tier, seed: firstSaved.seed, contractsDone: 0 });
    return rebuilt.title === first.title;
  })());

  /* --------------------------- 9. содержимое --------------------------- */
  check("школа Python отрисовала уроки", !!doc.querySelector(".lesson-item"));
  check("биржа нарисовала график", !!doc.querySelector("canvas.chart"));
  check("профиль показал достижения", doc.querySelectorAll(".ach").length >= 8,
    "достижений: " + doc.querySelectorAll(".ach").length);
  check("файлы показали виртуальную ФС", /пароли\.txt/.test(text()));
  check("чёрный рынок показал 4 апгрейда", !!doc.querySelector(".upgrade-card"));

  /* --------------------------- 10. симулятор --------------------------- */
  const sim = window.CH.PySim;
  const GenRef = window.CH.Generator;
  check("синтаксис: пустой скрипт не проходит", sim.simulate("", tutorial, 0).missing.length > 0);
  check("синтаксис: ловит пропущенное двоеточие", !!sim.checkSyntax("if x == 1\n    print(1)"));
  check("требования обучении проверяются", sim.checkPatterns(tutorial.solution, tutorial).length === 0);
  check("решение контракта проходит его требования",
    sim.checkPatterns(first.solution, first).length === 0,
    first ? first.template : "");
  check("чужой код не проходит требования", sim.checkPatterns("print('привет')", tutorial).length > 0);

  /* ------------- 11. все шаблоны генератора проходимы ------------------ */
  let generated = 0, broken = [];
  Gen.TIERS.forEach(function (tier) {
    for (let seed = 1; seed <= 14; seed++) {
      const m = Gen.generate({ index: seed, tier: tier.key, seed: seed * 7919, contractsDone: seed, codeLib: 3 });
      generated++;
      const result = sim.simulate(m.solution, m, 0);
      if (!result.success) broken.push(m.template + " (" + m.concept + ")");
      if (!m.task || !m.briefing || m.hints.length < 2 || m.theory.length < 2) broken.push("пустое описание " + m.title);
    }
  });
  check("56 сгенерированных контрактов проходимы своими решениями", broken.length === 0,
    generated + " шт." + (broken.length ? ", сломано: " + broken.slice(0, 3).join(", ") : ""));

  check("тексты заданий заполнены во всех шаблонах", (() => {
    const seen = new Set();
    Gen.TIERS.forEach((tier) => {
      for (let seed = 1; seed <= 30; seed++) {
        const m = Gen.generate({ index: seed, tier: tier.key, seed: seed * 104729, contractsDone: 0, codeLib: 3 });
        seen.add(m.concept);
        if (!m.task.includes("\n") && m.task.length < 20) return false;
      }
    });
    return seen.size >= 12;
  })(), "разных типов заданий: " + (() => {
    const seen = new Set();
    Gen.TIERS.forEach((tier) => {
      for (let seed = 1; seed <= 30; seed++) {
        seen.add(Gen.generate({ index: seed, tier: tier.key, seed: seed * 104729, contractsDone: 0, codeLib: 3 }).concept);
      }
    });
    return seen.size;
  })());

  /* ------------- 12. совместимость со старым сейвом ------------------- */
  window.localStorage.setItem("cryptohack_save.json", JSON.stringify({
    version: 1, dollars: 500, xp: 10, level: 3,
    completedMissions: [1, 2, 3], completedLessons: [1], miners: [],
    upgrades: { hackSpeed: 1 }, crypto: { BTC: 0.5 },
    totalHacked: 3, totalEarnedDollars: 200, totalTrades: 2,
    selectedMission: 2, soundOn: true, realPython: false
  }));
  const legacyOk = game.loadSave();
  check("старый сейв (8 ручных миссий) подхватывается",
    legacyOk && game.level === 3 && game.tutorialDone() && game.contracts.length === 0,
    "уровень " + game.level);
  check("после старого сейва сложности открываются по уровню",
    game.tierUnlocked("easy") && game.tierUnlocked("medium") && !game.tierUnlocked("expert"));
  check("после старого сейва можно взять новый контракт",
    !!game.createContract("medium", 999) && game.contracts.length === 1);

  /* ------------- 13. все шаблоны заданий ------------------------------- */
  const allTemplates = GenRef.allTemplates();
  const badTemplates = [];
  allTemplates.forEach(function (t) {
    const tierKey = GenRef.TIERS[t.tiers[0]].key;
    for (let seed = 1; seed <= 4; seed++) {
      const m = GenRef.generate({
        index: seed, tier: tierKey, seed: seed * 31337, contractsDone: seed,
        codeLib: 3, templateId: t.id
      });
      if (m.requiredPatterns.length === 0) badTemplates.push(t.id + ": нет требований");
      if (!m.solution || !sim.simulate(m.solution, m, 0).success) badTemplates.push(t.id + ": решение не проходит");
      if (m.hints.length < 3 || m.theory.length < 3) badTemplates.push(t.id + ": мало теории/подсказок");
    }
  });
  check("все " + allTemplates.length + " шаблонов заданий проходимы и заполнены",
    badTemplates.length === 0, badTemplates.slice(0, 4).join(" | "));
  check("запрошенный шаблон выдаётся принудительно",
    GenRef.generate({ index: 1, tier: "expert", seed: 5, codeLib: 3, templateId: "try_except" }).concept
      === allTemplates.filter((t) => t.id === "try_except")[0].concept);

  /* ---------------------------- 14. боссы ------------------------------ */
  const Bosses = window.CH.Bosses;
  check("в игре четыре сюжетных босса", Bosses.list.length === 4,
    Bosses.list.map((b) => b.name).join(", "));
  check("боссы идут по цепочке требований",
    Bosses.list[0].need < Bosses.list[1].need && Bosses.list[1].need < Bosses.list[2].need &&
    Bosses.list[2].need < Bosses.list[3].need,
    Bosses.list.map((b) => b.need).join(" < "));

  const bossMissions = Bosses.list.map((b) => Bosses.build(b.index, 1000 + b.index));
  const badBosses = bossMissions.filter((m) => !sim.simulate(m.solution, m, 0).success);
  check("решения всех боссов проходят их требования", badBosses.length === 0,
    badBosses.map((m) => m.bossName).join(", "));
  check("у боссов тройная награда и высокая защита",
    bossMissions.every((m) => m.rewardDollars > 2000 && m.security > 80 && m.boss === true),
    bossMissions.map((m) => m.bossName + " $" + m.rewardDollars).join(" · "));

  // доводим игрока до ЭКСПЕРТа
  game.dollars = 60000;
  game.addXp(6000);
  for (let i = 0; i < 6; i++) game.buyUpgrade("codeLib");
  check("уровень 5 и код-либа 3 открывают ЭКСПЕРТ", game.tierUnlocked("expert"),
    "уровень " + game.level + ", код-либа " + game.upgradeLevel("codeLib"));

  const statusBefore = game.bossStatus();
  check("до нужного числа контрактов босс закрыт",
    !statusBefore.ready && statusBefore.boss.name === "ГИДРА", statusBefore.reason);

  // закрываем контракты, чтобы открыть босса
  while (game.contracts.length < 4) game.createContract("hard", 4242 + game.contracts.length);
  const opened = game.contracts.map((r) => game.contractMission(r))
    .filter((m) => !game.isMissionCompleted(m.id));
  opened.slice(0, 2).forEach((m) => game.hackSuccess(m, 3));
  check("два закрытых контракта открывают босса", game.bossStatus().ready, game.bossStatus().reason);

  const bossMission = game.acceptBoss();
  check("вызов босса принят в терминал", !!bossMission && bossMission.boss === true && bossMission.id === 9001);
  check("повторный вызов не дублирует босса", game.acceptBoss().id === bossMission.id);
  game.hackSuccess(bossMission, 3);
  check("босс повержен и посчитан", game.bossesDefeated() === 1);
  check("следующим идёт ЧЁРНЫЙ АРХИВ и он пока закрыт",
    game.bossStatus().boss.name === "ЧЁРНЫЙ АРХИВ" && !game.bossStatus().ready,
    game.bossStatus().reason);

  game.save();
  const savedBoss = JSON.parse(window.localStorage.getItem("cryptohack_save.json"));
  check("в сейве отмечен поверженный босс",
    savedBoss.contracts.some((c) => c.boss === 1) && savedBoss.completedMissions.includes(9001));

  await wait(100);
  check("в терминале появился блок боссов", !!doc.querySelector(".boss-box"));

  check("нет ошибок JS на странице", errors.length === 0, errors.slice(0, 3).join(" | "));
}

try {
  await run();
} catch (e) {
  failures++;
  console.log("✗ исключение в тесте: " + e.message);
  if (errors.length) console.log("  ошибки страницы: " + errors.slice(0, 5).join(" | "));
}

server.close();
window.close();
console.log(failures === 0 ? "\nSMOKE TEST OK" : `\nSMOKE TEST FAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);
