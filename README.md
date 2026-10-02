# Knightmares flag football site

A plain static site. No framework, no database. All the content lives in four small
files in the `data/` folder, and Netlify redeploys the site every time you save a
change on GitHub (about 30 seconds).

## First-time setup

1. Create a new repository on GitHub (private is fine) and upload everything in this
   folder to it. On github.com: **Add file → Upload files**, drag the whole contents in,
   **Commit changes**.
2. In Netlify: **Add new site → Import an existing project → GitHub**, pick the repo.
   Leave the build settings alone. They are already set in `netlify.toml`.
3. Optional: in Netlify, **Site configuration → Change site name** to something easy to
   text to parents, like `knightmares-flag.netlify.app`.

Pick the site name before you share the link. The calendar subscription is tied to the
address, so renaming later means parents would have to subscribe again.

## Making updates

Edit the file on github.com (pencil icon) or in the GitHub phone app, then
**Commit changes**. That's the whole process.

| To change | Edit |
| --- | --- |
| A game time, field, score, or cancellation | `data/schedule.json` |
| A note to parents | `data/posts.json` |
| Roster or coach info | `data/team.json` |
| Photo gallery | `data/photos.json` (plus the image in `photos/`) |
| The uniform picture | replace `images/uniform.jpg` |

### Schedule

Each game looks like this. Times are 24-hour (`13:30` is 1:30 PM).

```json
{
  "date": "2026-10-10",
  "start": "13:30",
  "end": "14:30",
  "opponent": "Engler",
  "homeAway": "away",
  "location": "Irwin Park",
  "field": "Field 1",
  "note": "",
  "result": "",
  "status": ""
}
```

- **Rainout:** set `"status": "cancelled"`. The game is struck through on the site and
  marked cancelled in everyone's calendar.
- **Score:** set `"result": "W 28-14"`.
- **Reminder for one game:** set `"note": "Team photo before the game, arrive 12:45"`.
- **Practice or team event:** copy a game, delete `opponent` and `homeAway`, and add
  `"title": "Practice"`.

The phone calendar (`calendar.ics`) is rebuilt from this file on every deploy, so the
site and the calendars never disagree.

### Notes to parents

Add a new block at the top of `data/posts.json`. Newest date shows first.

```json
{
  "date": "2026-10-09",
  "title": "Jerseys are in",
  "body": "Pick up at Saturday's game.\n\nUse \\n\\n for a new paragraph.",
  "photo": ""
}
```

To attach a picture to a note, upload it to the `photos/` folder and set
`"photo": "photos/jerseys.jpg"`.

### Photos

1. Upload images to the `photos/` folder (**Add file → Upload files**).
2. List them in `data/photos.json`:

```json
[
  { "file": "photos/game1-huddle.jpg", "caption": "Week 1 huddle" },
  { "file": "photos/game1-td.jpg", "caption": "" }
]
```

The Photos section stays hidden until this list has something in it. Phone photos are
large, so shrink them first if you can (around 1600px wide is plenty).

## If you make a typo

JSON is picky about commas and quotes. If a file is broken, the Netlify deploy fails and
the last working version of the site stays up, so parents never see a broken page.
Check the red X next to the commit on GitHub, fix the comma, commit again.

## Privacy

The site asks search engines not to index it, the roster shows first name and last
initial only, and no birthdates or parent contact details are included anywhere.

## After the season

Delete the site in Netlify. Subscribed calendars will just stop updating.
