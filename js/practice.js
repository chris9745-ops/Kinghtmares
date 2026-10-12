/* Practice time poll. The question and the choices come from data/practice-poll.json,
   the players from data/team.json. Answers are stored in Firebase, one per player. */
import { firebaseConfig } from "./firebase-config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
const $ = (id) => document.getElementById(id);

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
function keyFor(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
}
function stamp(ms) {
  return ms ? new Date(ms).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" }) : "";
}
function getJSON(file) {
  return fetch("data/" + file, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error(file);
    return r.json();
  });
}
function showError(msg) {
  $("poll-error").textContent = msg;
  $("poll-error").hidden = !msg;
}

async function start() {
  if (!firebaseConfig || !firebaseConfig.databaseURL || String(firebaseConfig.apiKey).indexOf("PASTE") === 0) {
    $("poll-question").textContent = "The poll isn't set up yet.";
    return;
  }
  const [poll, team, appSdk, dbSdk] = await Promise.all([
    getJSON("practice-poll.json"),
    getJSON("team.json"),
    import(SDK + "firebase-app.js"),
    import(SDK + "firebase-database.js"),
  ]);

  const options = poll.options || [];
  const players = team.players.map((p) => ({ name: p.name, key: keyFor(p.name) }));
  const db = dbSdk.getDatabase(appSdk.initializeApp(firebaseConfig));
  const pollRef = dbSdk.ref(db, "practicePoll/" + poll.id);
  let answers = {};

  $("poll-question").textContent = poll.question + (poll.details ? " " + poll.details : "");

  /* ----- Form ----- */
  const form = $("poll-form");
  const select = $("poll-player");
  const boxes = {};
  players.forEach((p) => select.append(new Option(p.name, p.key)));
  options.forEach((o) => {
    const label = el("label", "check");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.value = o.id;
    label.append(box, el("span", null, o.label));
    $("poll-checks").append(label);
    boxes[o.id] = box;
  });

  function fill() {
    const a = answers[select.value] || {};
    Object.keys(boxes).forEach((id) => { boxes[id].checked = !!(a.o && a.o[id]); });
    $("poll-note").value = a.n || "";
    const ready = !!select.value;
    $("poll-options").disabled = !ready;
    $("poll-note").disabled = !ready;
    $("poll-save").disabled = !ready;
    $("poll-status").textContent = a.t ? "Last saved " + stamp(a.t) + "." : "";
  }
  select.addEventListener("change", () => {
    try { localStorage.setItem("knightmares-player", select.value); } catch (e) {}
    showError("");
    fill();
  });
  try {
    const saved = localStorage.getItem("knightmares-player");
    if (saved && players.some((p) => p.key === saved)) select.value = saved;
  } catch (e) {}

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    if (!select.value) return;
    const picked = {};
    Object.keys(boxes).forEach((id) => { if (boxes[id].checked) picked[id] = true; });
    const note = $("poll-note").value.trim().slice(0, 200);
    const target = dbSdk.ref(db, "practicePoll/" + poll.id + "/" + select.value);
    let job;
    if (!Object.keys(picked).length && !note) {
      job = dbSdk.remove(target);
    } else {
      const value = { t: dbSdk.serverTimestamp() };
      if (Object.keys(picked).length) value.o = picked;
      if (note) value.n = note;
      job = dbSdk.set(target, value);
    }
    showError("");
    $("poll-save").disabled = true;
    $("poll-status").textContent = "Saving…";
    job.then(() => { $("poll-status").textContent = "Saved. Thanks!"; })
      .catch(() => { showError("That didn't save. Check your connection and try again."); $("poll-status").textContent = ""; })
      .finally(() => { $("poll-save").disabled = !select.value; });
  });

  if (poll.open) form.hidden = false;
  else $("poll-closed").hidden = false;

  /* ----- Results ----- */
  function paint() {
    const answered = players.filter((p) => answers[p.key]);
    $("poll-results").hidden = false;
    $("poll-count").textContent = answered.length + " of " + players.length + " players have answered.";

    const rows = options.map((o) => ({
      o,
      names: answered.filter((p) => answers[p.key].o && answers[p.key].o[o.id]).map((p) => p.name),
    })).sort((a, b) => b.names.length - a.names.length);
    const top = rows.length ? rows[0].names.length : 0;

    const list = $("poll-tally");
    list.textContent = "";
    rows.forEach((r) => {
      const li = el("li", "result" + (top > 0 && r.names.length === top ? " is-top" : ""));
      const head = el("div", "result-head");
      head.append(el("span", "result-label", r.o.label), el("span", "result-num", r.names.length + (r.names.length === 1 ? " player" : " players")));
      const bar = el("div", "result-bar");
      const fill = el("span");
      fill.style.width = (answered.length ? (100 * r.names.length) / answered.length : 0) + "%";
      bar.append(fill);
      li.append(head, bar);
      if (r.names.length) li.append(el("p", "result-names", r.names.join(", ")));
      list.append(li);
    });

    const missing = players.filter((p) => !answers[p.key]).map((p) => p.name);
    const m = $("poll-missing");
    m.textContent = "";
    if (missing.length && answered.length) {
      m.append(el("h3", null, "Still waiting on"), el("p", "result-names", missing.join(", ")));
    }

    const notes = answered.filter((p) => answers[p.key].n);
    const n = $("poll-notes");
    n.textContent = "";
    if (notes.length) {
      n.append(el("h3", null, "Notes"));
      const ul = el("ul", "poll-note-list");
      notes.forEach((p) => {
        const li = el("li");
        li.append(el("b", null, p.name + ": "), document.createTextNode(answers[p.key].n));
        ul.append(li);
      });
      n.append(ul);
    }
  }

  dbSdk.onValue(
    pollRef,
    (snap) => {
      answers = snap.val() || {};
      paint();
      if (document.activeElement !== $("poll-note")) fill();
    },
    () => showError("Couldn't load the poll right now. Try again in a minute."),
  );
  fill();
}

start().catch((e) => {
  console.warn(e);
  $("poll-question").textContent = "Couldn't load the poll. Try refreshing the page.";
});
