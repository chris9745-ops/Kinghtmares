// Builds calendar.ics from data/schedule.json.
// Netlify runs this on every deploy, so the phone calendar always matches the site.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const TEAM = "Knightmares Flag Football";
const TZ = "America/New_York";

// Every data file is parsed here so a typo fails the deploy
// (Netlify then keeps the previous working version of the site live).
for (const f of ["team.json", "posts.json", "photos.json"]) {
  JSON.parse(fs.readFileSync(path.join(root, "data", f), "utf8"));
}
const schedule = JSON.parse(fs.readFileSync(path.join(root, "data", "schedule.json"), "utf8"));

const esc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const stamp = (date, time) => date.replace(/-/g, "") + "T" + time.replace(":", "") + "00";
const fold = (line) => {
  const out = [];
  while (line.length > 73) { out.push(line.slice(0, 73)); line = " " + line.slice(73); }
  out.push(line);
  return out.join("\r\n");
};

const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
const lines = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//Knightmares//Team Schedule//EN",
  "CALSCALE:GREGORIAN",
  "METHOD:PUBLISH",
  "X-WR-CALNAME:" + esc(TEAM),
  "X-WR-TIMEZONE:" + TZ,
  "REFRESH-INTERVAL;VALUE=DURATION:PT4H",
  "X-PUBLISHED-TTL:PT4H",
  "BEGIN:VTIMEZONE",
  "TZID:" + TZ,
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:-0500",
  "TZOFFSETTO:-0400",
  "TZNAME:EDT",
  "DTSTART:19700308T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:-0400",
  "TZOFFSETTO:-0500",
  "TZNAME:EST",
  "DTSTART:19701101T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

let count = 0;
for (const e of schedule) {
  if (e.type === "off" || !e.start || !e.end) continue;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date) || !/^\d{2}:\d{2}$/.test(e.start) || !/^\d{2}:\d{2}$/.test(e.end)) {
    throw new Error("Bad date or time in schedule.json: " + JSON.stringify(e) + ' (use "2026-10-10" and "13:30")');
  }
  const cancelled = (e.status || "").toLowerCase() === "cancelled";
  const title = e.title || "Knightmares vs " + e.opponent;
  const where = [e.location, e.field].filter(Boolean).join(", ");
  const desc = [e.homeAway ? (e.homeAway === "home" ? "Home team" : "Away team") : "", e.note].filter(Boolean).join("\n");
  lines.push(
    "BEGIN:VEVENT",
    "UID:" + e.date + "-" + (e.opponent || e.title || "event").toLowerCase().replace(/[^a-z0-9]+/g, "-") + "@knightmares-flag",
    "DTSTAMP:" + now,
    "DTSTART;TZID=" + TZ + ":" + stamp(e.date, e.start),
    "DTEND;TZID=" + TZ + ":" + stamp(e.date, e.end),
    "SUMMARY:" + esc((cancelled ? "CANCELLED: " : "") + title),
    "LOCATION:" + esc(where),
  );
  if (desc) lines.push("DESCRIPTION:" + esc(desc));
  lines.push("STATUS:" + (cancelled ? "CANCELLED" : "CONFIRMED"), "END:VEVENT");
  count++;
}
lines.push("END:VCALENDAR");

fs.writeFileSync(path.join(root, "calendar.ics"), lines.map(fold).join("\r\n") + "\r\n");
console.log("calendar.ics written with " + count + " events");
