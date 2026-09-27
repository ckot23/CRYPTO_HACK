import { JSDOM } from "jsdom";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const web = "/home/user/CRYPTO_HACK/web";
const dom = await JSDOM.fromFile(resolve(web, "index.html"), {
  runScripts: "dangerously", resources: "usable", url: pathToFileURL(resolve(web,"index.html")).href,
  pretendToBeVisual: true
});
const { window } = dom;
await new Promise(r => window.addEventListener("load", r));
await new Promise(r => setTimeout(r, 200));
const screen = window.document.getElementById("screen");
window.CH.Dom.clear(screen);
try {
  const d = new window.CH.Screens.Desktop(screen, { game: window.CH.game, onExitToMenu(){} });
  console.log("desktop ok; windows:", window.document.querySelectorAll(".win").length,
              "mission-list:", !!window.document.querySelector(".mission-list"),
              "icons:", window.document.querySelectorAll(".app-icon").length);
  // попробуем открыть остальные программы
  ["miner","trade","upgrade","learn","files","profile"].forEach(id => {
    try { d.openApp(id); console.log("open", id, "ok"); }
    catch (e) { console.log("open", id, "ERROR:", e.stack.split("\n").slice(0,3).join(" | ")); }
  });
} catch (e) {
  console.log("DESKTOP ERROR:", e.stack);
}
process.exit(0);
