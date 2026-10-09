/* "Who's in" section. Stores one In/Out answer per player per game in Firebase.
   Players and games come from data/team.json and data/schedule.json, so there
   is nothing to edit here when the roster or schedule changes. */
import { firebaseConfig } from "./firebase-config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
const section = document.getElementById("whos-in");
const tab = document.getElementById("avail-tab");
const box = document.getElementById("avail");
const errorBox = document.getElementById("avail-error");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const configured = firebaseConfig && firebaseConfig.databaseURL &&
  firebaseConfig.apiKey && firebaseConfig.apiKey.indexOf("PASTE") !== 0;

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
function toDate(date, time) {
  const d = date.split("-"), t = (time || "00:00").split(":");
  return new Date(+d[0], +d[1] - 1, +d[2], +t[0], +t[1]);
}
function clock(time) {
  const t = time.split(":"), h = +t[0];
  return (h % 12 || 12) + ":" + t[1] + (h < 12 ? " AM" : " PM");
}
function keyFor(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
}
function stamp(ms) {
  if (!ms) return "";
  return new Date(ms).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" });
}
function getJSON(file) {
  return fetch("data/" + file, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error(file);
    return r.json();
  });
}

async function start() {
  const [schedule, team, appSdk, dbSdk] = await Promise.all([
    getJSON("schedule.json"),
    getJSON("team.json"),
    import(SDK + "firebase-app.js"),
    import(SDK + "firebase-database.js"),
  ]);

  const now = new Date();
  const games = schedule
    .filter((g) => g.type !== "off" && g.start && g.end && String(g.status || "").toLowerCase() !== "cancelled")
    .filter((g) => toDate(g.date, g.end) >= now)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const players = team.players.map((p) => ({ name: p.name, number: p.number, key: keyFor(p.name) }));
  const anyNumbers = players.some((p) => p.number !== "" && p.number != null);
  if (!games.length || !players.length) return;

  const db = dbSdk.getDatabase(appSdk.initializeApp(firebaseConfig));
  let answers = {};
  const views = [];

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.hidden = !msg;
  }

  function choose(game, player, value) {
    const current = ((answers[game.date] || {})[player.key] || {}).s;
    const target = dbSdk.ref(db, "availability/" + game.date + "/" + player.key);
    const job = current === value
      ? dbSdk.remove(target)
      : dbSdk.set(target, { s: value, t: dbSdk.serverTimestamp() });
    showError("");
    job.catch(() => showError("That didn't save. Check your connection and tap again."));
  }

  games.forEach((game, i) => {
    const d = toDate(game.date);
    const details = el("details", "avail-game");
    details.open = i === 0;
    const summary = el("summary");
    const head = el("span", "avail-head");
    head.append(
      el("b", null, DAYS[d.getDay()] + ", " + MONTHS[d.getMonth()] + " " + d.getDate()),
      el("span", null, " " + clock(game.start) + " " + (game.title || "vs " + game.opponent)),
    );
    const counts = el("span", "avail-counts");
    const cIn = el("span", "count count-in");
    const cOut = el("span", "count count-out");
    const cNone = el("span", "count");
    counts.append(cIn, cOut, cNone);
    summary.append(head, counts);
    details.append(summary);

    const list = el("ul", "avail-list");
    const rows = players.map((player) => {
      const li = el("li");
      const who = el("div", "avail-who");
      const name = el("span", "avail-name");
      if (anyNumbers) name.append(el("span", "num", player.number == null ? "" : String(player.number)));
      name.append(document.createTextNode(player.name));
      const when = el("span", "avail-when");
      who.append(name, when);

      const group = el("div", "avail-btns");
      group.setAttribute("role", "group");
      group.setAttribute("aria-label", player.name + ", " + MONTHS[d.getMonth()] + " " + d.getDate());
      const bIn = el("button", "pick pick-in", "In");
      const bOut = el("button", "pick pick-out", "Out");
      bIn.type = bOut.type = "button";
      bIn.addEventListener("click", () => choose(game, player, "in"));
      bOut.addEventListener("click", () => choose(game, player, "out"));
      group.append(bIn, bOut);
      li.append(who, group);
      list.append(li);
      return { player, bIn, bOut, when };
    });
    details.append(list);
    box.append(details);
    views.push({ game, rows, cIn, cOut, cNone });
  });

  function paint() {
    views.forEach((v) => {
      const forGame = answers[v.game.date] || {};
      let nIn = 0, nOut = 0;
      v.rows.forEach((r) => {
        const a = forGame[r.player.key] || {};
        if (a.s === "in") nIn++;
        if (a.s === "out") nOut++;
        r.bIn.setAttribute("aria-pressed", a.s === "in" ? "true" : "false");
        r.bOut.setAttribute("aria-pressed", a.s === "out" ? "true" : "false");
        r.when.textContent = a.s ? "Marked " + stamp(a.t) : "";
      });
      const none = v.rows.length - nIn - nOut;
      v.cIn.textContent = nIn + " in";
      v.cOut.textContent = nOut + " out";
      v.cNone.textContent = none + " no answer";
      v.cNone.hidden = none === 0;
    });
  }

  paint();
  section.hidden = false;
  tab.hidden = false;

  dbSdk.onValue(
    dbSdk.ref(db, "availability"),
    (snap) => { answers = snap.val() || {}; paint(); },
    () => showError("Couldn't load answers right now. Text a coach if your player will miss a game."),
  );
}

if (configured) {
  start().catch((e) => console.warn("Availability is off:", e));
}
