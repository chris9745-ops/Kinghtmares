/* Knightmares team site.
   All content comes from the files in /data. Edit those, not this file. */
(function () {
  "use strict";

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MAP_URL = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Irwin Park, Irwin, PA");

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function load(file) {
    return fetch("data/" + file, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error(file);
      return r.json();
    });
  }
  function toDate(date, time) {
    var d = date.split("-"), t = (time || "00:00").split(":");
    return new Date(+d[0], +d[1] - 1, +d[2], +t[0], +t[1]);
  }
  function clock(time) {
    var t = time.split(":"), h = +t[0], m = t[1];
    return (h % 12 || 12) + ":" + m + (h < 12 ? " AM" : " PM");
  }
  function timeRange(e) {
    var a = clock(e.start), b = clock(e.end);
    if (a.slice(-2) === b.slice(-2)) a = a.slice(0, -3);
    return a + " to " + b;
  }
  function isOff(e) { return e.type === "off" || !e.start; }
  function isCancelled(e) { return String(e.status || "").toLowerCase() === "cancelled"; }
  function title(e) { return e.title ? esc(e.title) : '<span class="vs">vs ' + esc(e.opponent) + "</span>"; }

  /* ----- Schedule ----- */
  function renderSchedule(list) {
    list.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    var now = new Date();
    var next = null;
    list.forEach(function (e) {
      if (!next && !isOff(e) && !isCancelled(e) && toDate(e.date, e.end) >= now) next = e;
    });

    $("games").innerHTML = list.map(function (e) {
      var d = toDate(e.date);
      var dateBox = '<div class="date"><span>' + MONTHS[d.getMonth()] + "</span><b>" + d.getDate() + "</b></div>";
      if (isOff(e)) {
        return '<li class="game is-off">' + dateBox + '<div><p class="game-who">' + esc(e.title || "No game") + "</p></div></li>";
      }
      var past = toDate(e.date, e.end) < now;
      var cls = "game" + (past ? " is-past" : "") + (e === next ? " is-next" : "") + (isCancelled(e) ? " is-cancelled" : "");
      var tags = "";
      if (isCancelled(e)) tags += '<span class="tag tag-cancel">Cancelled</span>';
      else if (e.result) tags += '<span class="tag tag-result">' + esc(e.result) + "</span>";
      else if (e === next) tags += '<span class="tag">Next up</span>';
      var meta = timeRange(e) + (e.field ? ", " + esc(e.field) : "") + (e.homeAway ? " (" + esc(e.homeAway) + ")" : "");
      return '<li class="' + cls + '">' + dateBox + "<div>" +
        '<p class="game-who">' + title(e) + tags + "</p>" +
        '<p class="game-meta">' + meta + "</p>" +
        (e.note ? '<p class="game-note">' + esc(e.note) + "</p>" : "") +
        "</div></li>";
    }).join("");

    var box = $("next-game");
    if (!next) {
      box.innerHTML = '<p class="next-label">Season complete</p><p class="next-when">Thanks for a great fall</p>';
      return;
    }
    var nd = toDate(next.date);
    var days = Math.round((toDate(next.date) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5);
    var label = days === 0 ? "Game today" : days === 1 ? "Next game is tomorrow" : "Next game";
    box.innerHTML =
      '<p class="next-label">' + label + "</p>" +
      '<p class="next-when">' + DAYS[nd.getDay()] + ", " + MONTHS_LONG[nd.getMonth()] + " " + nd.getDate() + "</p>" +
      '<p class="next-who">' + clock(next.start) + " " + (next.title ? esc(next.title) : "vs " + esc(next.opponent)) + "</p>" +
      '<p class="next-where">' + esc([next.location, next.field].filter(Boolean).join(", ")) + "</p>" +
      (next.note ? '<p class="next-where">' + esc(next.note) + "</p>" : "") +
      '<div class="btn-row"><a class="btn" href="#calendar">Add to my calendar</a>' +
      '<a class="btn btn-ghost" href="' + MAP_URL + '" target="_blank" rel="noopener">Directions</a></div>';
  }

  /* ----- Team ----- */
  function renderTeam(team) {
    var anyNumbers = team.players.some(function (p) { return p.number !== "" && p.number != null; });
    $("players").innerHTML = team.players.map(function (p) {
      return "<li>" + (anyNumbers ? '<span class="num">' + esc(p.number) + "</span>" : "") + esc(p.name) + "</li>";
    }).join("");

    $("coach-list").innerHTML = team.coaches.map(function (c) {
      var tel = String(c.phone || "").replace(/[^0-9+]/g, "");
      return '<article class="coach"><h3>' + esc(c.name) + '</h3><p class="role">' + esc(c.role) + "</p>" +
        '<p class="contact">' +
        (c.phone ? '<a href="tel:' + tel + '">' + esc(c.phone) + "</a><br>" : "") +
        (c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + "</a>" : "") + "</p>" +
        (c.phone ? '<div class="btn-row"><a class="btn" href="sms:' + tel + '">Text</a><a class="btn btn-ghost" href="tel:' + tel + '">Call</a></div>' : "") +
        "</article>";
    }).join("");
  }

  /* ----- Posts ----- */
  function renderPosts(posts) {
    posts.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    if (!posts.length) { $("posts").innerHTML = '<p class="empty">Nothing posted yet.</p>'; return; }
    $("posts").innerHTML = posts.map(function (p) {
      var d = toDate(p.date);
      return '<article class="post"><time datetime="' + esc(p.date) + '">' + MONTHS_LONG[d.getMonth()] + " " + d.getDate() + "</time>" +
        "<h3>" + esc(p.title) + "</h3><p>" + esc(p.body) + "</p>" +
        (p.photo ? '<img src="' + esc(p.photo) + '" alt="" loading="lazy">' : "") + "</article>";
    }).join("");
  }

  /* ----- Photos ----- */
  function renderPhotos(photos) {
    if (!photos.length) return;
    $("photos").hidden = false;
    $("photos-tab").hidden = false;
    $("gallery").innerHTML = photos.map(function (p) {
      return '<figure><a href="' + esc(p.file) + '" target="_blank" rel="noopener"><img src="' + esc(p.file) +
        '" alt="' + esc(p.caption || "Team photo") + '" loading="lazy"></a>' +
        (p.caption ? "<figcaption>" + esc(p.caption) + "</figcaption>" : "") + "</figure>";
    }).join("");
  }

  /* ----- Calendar subscribe links (need the live site address) ----- */
  if (location.protocol.indexOf("http") === 0) {
    var feed = location.host + location.pathname.replace(/[^/]*$/, "") + "calendar.ics";
    $("sub-apple").href = "webcal://" + feed;
    $("sub-google").href = "https://calendar.google.com/calendar/render?cid=" + encodeURIComponent("webcal://" + feed);
  }

  function fail(id, what) {
    return function () { $(id).innerHTML = '<p class="empty">Could not load the ' + what + ". Text a coach if you need it right now.</p>"; };
  }
  load("schedule.json").then(renderSchedule).catch(function () {
    fail("games", "schedule")();
    $("next-game").innerHTML = '<p class="next-label">Schedule is below</p>';
  });
  load("team.json").then(renderTeam).catch(fail("coach-list", "team info"));
  load("posts.json").then(renderPosts).catch(fail("posts", "updates"));
  load("photos.json").then(renderPhotos).catch(function () {});
})();
