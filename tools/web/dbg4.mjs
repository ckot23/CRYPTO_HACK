import { JSDOM } from "jsdom";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const web = "/home/user/CRYPTO_HACK/web";
const dom = await JSDOM.fromFile(resolve(web, "index.html"), {
  runScripts: "dangerously", resources: "usable", url: pathToFileURL(resolve(web,"index.html")).href,
  pretendToBeVisual: true
});
const { window } = dom;
const doc = window.document;
await new Promise(r => window.addEventListener("load", r));
await new Promise(r => setTimeout(r, 200));
const btn = [...doc.querySelectorAll("button")].find(b => (b.textContent||"").includes("НАЧАТЬ"));
console.log("start button found:", !!btn);
btn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await new Promise(r => setTimeout(r, 300));
console.log("boot?", !!doc.querySelector(".boot"));
window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
await new Promise(r => setTimeout(r, 100));
console.log("after key: boot?", !!doc.querySelector(".boot"), "log text len", (doc.querySelector(".boot .log")||{}).textContent?.length);
await new Promise(r => setTimeout(r, 1500));
console.log("after 1.5s: desktop?", !!doc.querySelector(".desktop"), "boot?", !!doc.querySelector(".boot"), "screen children", doc.getElementById("screen").children.length);
process.exit(0);
