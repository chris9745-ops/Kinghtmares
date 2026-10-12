# Knightmares flag football site

A plain static site. All the content lives in small files in the `data/` folder, and
Netlify redeploys the site every time you save a change on GitHub (about 30 seconds).
The one live piece is the "Who's in" section, which stores answers in Firebase.

## Making updates

Edit the file on github.com (pencil icon) or in the GitHub phone app, then
**Commit changes**.

| To change | Edit |
| --- | --- |
| A game time, field, score, or cancellation | `data/schedule.json` |
| A note to parents | `data/posts.json` |
| Roster, jersey numbers, or coach info | `data/team.json` |
| Photo gallery | `data/photos.json` (plus the image in `photos/`) |
| The uniform picture | replace `images/uniform-final.jpg` |
| League rules | `rules.html` |
| Practice poll question and choices | `data/practice-poll.json` |

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

- **Rainout:** set `"status": "cancelled"`. The game is struck through on the site,
  marked cancelled in everyone's calendar, and dropped from "Who's in".
- **Score:** set `"result": "W 28-14"`.
- **Reminder for one game:** set `"note": "Team photo before the game, arrive 12:45"`.
- **Practice or team event:** copy a game, delete `opponent` and `homeAway`, and add
  `"title": "Practice"`. It gets its own "Who's in" list too.

### Notes to parents

Add a new block at the top of `data/posts.json`. Newest date shows first.

```json
{
  "date": "2026-10-09",
  "title": "Jerseys are in",
  "body": "Pick up at Saturday's game.",
  "photo": ""
}
```

### Photos

Upload images to the `photos/` folder, then list them in `data/photos.json`:

```json
[
  { "file": "photos/game1-huddle.jpg", "caption": "Week 1 huddle" }
]
```

## Who's in (availability)

Parents tap In or Out for their player on each upcoming game. No logins: anyone with
the site link can mark any player, and each answer shows when it was last changed.
The player list and game list come from `data/team.json` and `data/schedule.json`,
so there is nothing extra to maintain. Past and cancelled games drop off on their own.

Answers are stored by player name. If you rename a player in `team.json` after
parents have answered, that player's earlier answers no longer show.

### One-time Firebase setup (about 5 minutes)

Do these in order. Creating the database before the web app matters, because that is
what puts the `databaseURL` line in your settings.

1. Go to console.firebase.google.com and **Add project**. Any name works. You can turn
   Google Analytics off.
2. In the left menu: **Build → Realtime Database → Create database**. Pick a United
   States location and **Start in locked mode**.
3. Open the database's **Rules** tab. Replace everything there with the contents of
   `database.rules.json` from this repo, then **Publish**.
4. Click the gear icon → **Project settings → General**. Under **Your apps**, click the
   web icon (`</>`), give it a nickname, and register it. Skip Firebase Hosting.
5. Firebase shows a `firebaseConfig` block. Copy the values into
   `js/firebase-config.js` in this repo, keeping the word `export` at the start of the
   line. Check that the `databaseURL` line is there.
6. Commit. When the deploy finishes, "Who's in" appears on the site.

Until step 5 is done the section stays hidden, so the site is safe to deploy before
Firebase is set up.

The config values are meant to be public. The rules from step 3 are what protect the
data: the public can only read and write In/Out answers, nothing else.

### Seeing or clearing answers

In the Firebase console, **Realtime Database → Data** shows every answer under
`availability`, grouped by game date. Hover a row and click the trash icon to clear it.

## Practice time poll

The poll page is `practice.html` (linked from the "Practice poll" tab). Each family picks
their player, checks every time that works, adds an optional note, and taps Save. They
can come back and change it. Results update live for everyone, with the most popular
time marked in gold, a list of who hasn't answered yet, and any notes.

Edit `data/practice-poll.json` to change the question or the choices:

```json
{ "id": "mon_530", "label": "Monday, 5:30 PM" }
```

- `label` is what parents see. Change it freely.
- `id` is how answers are stored. Don't change an `id` after people have answered,
  or their answers to that choice stop counting. To add a choice, give it a new `id`.
- To close the poll, set `"open": false`. The form goes away and the results stay.
- To run a fresh poll later, change `"id"` at the top (for example to `"fall2026_b"`).

Answers live in Firebase under `practicePoll`, separate from "Who's in".

## If you make a typo

JSON is picky about commas and quotes. If a file is broken, the Netlify deploy fails and
the last working version of the site stays up. Check the red X next to the commit on
GitHub, fix the comma, commit again.

## Privacy

The site asks search engines not to index it, the roster shows first name and last
initial only, and no birthdates or parent contact details are included anywhere.

## After the season

Delete the site in Netlify and the project in Firebase.
