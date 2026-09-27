/* ==========================================================================
   smoke-test.mjs — проверка браузерной версии без браузера.

   Поднимает страницу web/index.html на локальном HTTP-сервере, проходит
   путь игрока (меню → загрузка BIOS → рабочий стол), открывает все семь
   программ, решает первую миссию, ставит майнер, торгует, покупает апгрейд
   и проверяет сохранение в localStorage. Падение любого шага — ошибка.

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
const port = server.address().port;
const origin = `http://127.0.0.1:${port}`;

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
    // обработчики игровых событий ловят свои исключения сами — тоже считаем их ошибками
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
  await waitFor(() => doc.querySelector(".menu"));
  check("главное меню отрисовано", !!doc.querySelector(".menu"));
  check("заголовок и цитата на месте",
    !!doc.querySelector(".title-glitch") && (doc.querySelector(".quote").textContent || "").length > 3);

  // меню → загрузка BIOS
  click(findButton("НАЧАТЬ ИГРУ", "ПРОДОЛЖИТЬ ВЗЛОМ"));
  await waitFor(() => doc.querySelector(".boot"), 3000);
  check("экран загрузки BIOS показан", !!doc.querySelector(".boot"));

  // любая клавиша — пропустить
  window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  await waitFor(() => doc.querySelector(".desktop"), 6000);
  check("рабочий стол появился", !!doc.querySelector(".desktop"));
  check("хак-терминал открылся сам", !!doc.querySelector(".mission-list"));
  check("тикеры курсов на месте (4 монеты)", doc.querySelectorAll(".ticker").length === 4);
  check("иконок программ семь", doc.querySelectorAll(".app-icon").length === 7);
  check("панель задач и HUD отрисованы",
    !!doc.querySelector(".taskbar") && /LV 1/.test(text()));

  const modal = doc.querySelector(".modal");
  if (modal) {
    const ok = [...modal.querySelectorAll("button")].find((b) => /ПОГНАЛИ|ЗАБРАТЬ/.test(b.textContent || ""));
    if (ok) click(ok);
    await wait(50);
    check("обучающая модалка закрывается", !doc.querySelector(".modal"));
  }

  // горячие клавиши 2..7 открывают остальные программы
  for (let i = 2; i <= 7; i++) {
    window.dispatchEvent(new window.KeyboardEvent("keydown", { key: String(i), bubbles: true }));
    await wait(60);
  }
  const opened = doc.querySelectorAll(".win").length;
  check("открыты все семь окон", opened === 7, "окон: " + opened);

  // Esc закрывает верхнее окно
  window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await wait(60);
  check("Esc закрывает верхнее окно", doc.querySelectorAll(".win").length === 6);

  // возвращаем профиль (его закрыл Esc) для проверок содержимого
  window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "7", bubbles: true }));
  await wait(80);

  const game = window.CH.game;
  check("игра доступна из консоли (CH.game)", !!game);

  // ---- решение первой миссии ----
  const area = doc.querySelector("textarea.input");
  check("редактор кода на месте", !!area);
  const mission = game.Data.getMission(1);
  area.value = mission.solution;
  area.dispatchEvent(new window.Event("input", { bubbles: true }));
  click(findButton("ЗАПУСТИТЬ"));
  await waitFor(() => /ВЗЛОМ УСПЕШЕН/.test(text()), 12000);
  check("миссия №1 взломана (симулятор)", /ВЗЛОМ УСПЕШЕН/.test(text()));
  check("награда и XP начислены",
    game.isMissionCompleted(1) && game.xp > 0, "XP: " + game.xp + ", уровень: " + game.level);

  // ---- майнер ----
  game.dollars = 10000;
  const installed = game.installMiner(1, "BTC");
  check("майнер установлен", installed && game.miners.length === 1);
  const before = game.getCrypto("BTC");
  for (let i = 0; i < 10; i++) game.tickMiners();
  check("майнер добывает крипту", game.getCrypto("BTC") > before,
    "BTC: " + game.getCrypto("BTC").toFixed(10));

  // ---- биржа ----
  const usdBefore = game.dollars;
  check("покупка на бирже прошла", game.trade("BTC", 100, true) && game.totalTrades === 1);
  check("доллары списались", game.dollars < usdBefore, "остаток: " + game.dollars.toFixed(0));

  // ---- апгрейд ----
  game.dollars = 10000;
  check("апгрейд куплен", game.buyUpgrade("stealth") && game.upgradeLevel("stealth") === 1);
  check("комиссия снизилась", Math.abs(game.fee() - 0.04) < 1e-6, "fee: " + game.fee());

  // ---- сохранение ----
  game.save();
  const raw = window.localStorage.getItem("cryptohack_save.json");
  check("сейв лежит в localStorage", !!raw && JSON.parse(raw).completedMissions.includes(1));
  check("код миссии сохраняется отдельно", !!window.localStorage.getItem("cryptohack_code.json"));

  // ---- симулятор: синтаксис и требования ----
  const sim = window.CH.PySim;
  check("синтаксис: пустой скрипт не проходит", sim.simulate("", mission, 0).missing.length > 0);
  check("синтаксис: ловит пропущенное двоеточие", !!sim.checkSyntax("if x == 1\n    print(1)"));
  check("требования миссии проверяются", sim.checkPatterns(mission.solution, mission).length === 0);
  check("чужой код не проходит требования",
    sim.checkPatterns("print('привет')", mission).length > 0);

  // ---- содержимое программ ----
  check("школа Python отрисовала уроки", !!doc.querySelector(".lesson-item"));
  check("биржа нарисовала график", !!doc.querySelector("canvas.chart"));
  check("профиль показал достижения", doc.querySelectorAll(".ach").length === 8,
    "ach: " + doc.querySelectorAll(".ach").length +
    ", окна: " + [...doc.querySelectorAll(".win-title")].map((t) => t.textContent).join(" / "));
  check("файлы показали виртуальную ФС", /пароли\.txt/.test(text()));
  check("чёрный рынок показал 4 апгрейда", !!doc.querySelector(".upgrade-card"));

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
