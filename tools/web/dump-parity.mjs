/* ==========================================================================
   dump-parity.mjs — эталон контрактов из браузерной версии для проверки Unity.

   Запускает web/index.html на локальном сервере (как smoke-test), просит
   генератор собрать контракты с фиксированными seed и печатает их в JSON.
   Дальше tools/unity собирает C#-ядро и сравнивает результат: контракт с
   одинаковым seed должен совпадать поле в поле.

   Запуск:
       cd tools/web && node dump-parity.mjs > /tmp/web-contracts.json
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
  ".txt": "text/plain; charset=utf-8"
};

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

function waitFor(predicate, timeout = 8000, every = 40) {
  return new Promise((res, rej) => {
    const t0 = Date.now();
    (function poll() {
      let value;
      try { value = predicate(); } catch (e) { value = false; }
      if (value) return res(value);
      if (Date.now() - t0 > timeout) return rej(new Error("не дождались условия"));
      setTimeout(poll, every);
    })();
  });
}

/** Поля миссии, которые сравнивает tools/unity. */
const FIELDS = [
  "id", "title", "targetName", "targetIp", "os", "security", "difficulty",
  "concept", "conceptDesc", "briefing", "task", "starterCode", "solution",
  "requiredPatterns", "hints", "theory", "rewardCrypto", "rewardAmount",
  "rewardDollars", "rewardXp", "requiredCodeLib", "requiredLevel",
  "generated", "tier", "tierLabel", "tierAccent", "codename", "boss",
  "bossIndex", "bossName"
];

function pick(mission) {
  const out = {};
  FIELDS.forEach((f) => { out[f] = mission[f] === undefined ? null : mission[f]; });
  return out;
}

const dom = await JSDOM.fromURL(origin + "/", {
  runScripts: "dangerously",
  resources: "usable",
  pretendToBeVisual: true
});
const window = dom.window;

const Gen = await waitFor(() => window.CH && window.CH.Generator);
const Bosses = await waitFor(() => window.CH && window.CH.Bosses);

const data = { templates: [], contracts: [], bosses: [] };

data.templates = Gen.allTemplates().map((t) => ({
  id: t.id, tiers: t.tiers, concept: t.concept, codeLib: t.codeLib
}));

/* Все сложности × несколько номеров контрактов × разный прогресс */
Gen.TIERS.forEach((tier, tierIndex) => {
  [1, 2, 5, 9].forEach((index) => {
    [0, 3, 12].forEach((done) => {
      const seed = index * 104729 + done * 7 + tierIndex * 1000;
      const mission = Gen.generate({ index, tier: tier.key, seed, contractsDone: done, codeLib: 3 });
      data.contracts.push({
        index, tier: tier.key, seed, contractsDone: done, codeLib: 3, templateId: null,
        mission: pick(mission)
      });
    });
  });
});

/* Каждый шаблон принудительно — проверяем тексты отдельно от случайности */
data.templates.forEach((t) => {
  [1, 2].forEach((seed) => {
    const tierKey = Gen.TIERS[t.tiers[0]].key;
    const mission = Gen.generate({
      index: seed, tier: tierKey, seed: seed * 31337, contractsDone: seed,
      codeLib: 3, templateId: t.id
    });
    data.contracts.push({
      index: seed, tier: tierKey, seed: seed * 31337, contractsDone: seed,
      codeLib: 3, templateId: t.id, mission: pick(mission)
    });
  });
});

/* Боссы */
Bosses.list.forEach((boss) => {
  [boss.id * 7919, boss.id * 7919 + 13].forEach((seed) => {
    data.bosses.push({ index: boss.index, seed, mission: pick(Bosses.build(boss.index, seed)) });
  });
});

process.stdout.write(JSON.stringify(data, null, 1) + "\n");
window.close();
server.close();
