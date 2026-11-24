# OneThing

**Brain dump in, one clear next step out.**

OneThing is a small, accessible web app for anyone who freezes in front of a long to-do list. You type everything on your mind, say how much time and energy you have right now, and it shows **one** task to do next, with a plain-language reason why. Big tasks can be broken into small, concrete first steps, and a focus timer helps you start.

Built solo for the [Taskforge](https://taskforge.devpost.com/) student hackathon (Nov 24, 2026).

![Next step](screenshots/1-next-step.png)

**Demo video:** [demo.mp4](demo.mp4) (38 seconds, captioned walkthrough)

**Screenshots:**
- [One next step, with "Why this?"](screenshots/1-next-step.png)
- [Break it down + focus timer](screenshots/2-break-it-down-focus.png)
- [High contrast, larger text, calm mode](screenshots/3-high-contrast-calm-mode.png)

## Features

- **Brain dump parsing**: one task per line, with optional hints:
  - due dates: `today`, `tomorrow`, `fri`, `next mon`, `in 3 days`, `11/30`
  - effort: `~20m`, `45 min`, `2h`, `1.5 hours` (guessed from the wording if missing, and labeled as a guess)
  - `!` or `urgent` for important, `#tag` for tags
- **One next step**: ranks tasks by overdue/due-soon, importance, whether they fit your available time, and your energy (low energy favors quick wins, high energy favors deep work).
- **"Why this?"**: every pick comes with the reasons behind it, so the app never feels like a black box.
- **Break it down**: turns a big task (essay, application, exam, project, presentation, cleaning, email) into 3 to 5 small first steps you can check off.
- **Not now**: pushes the current task down without deleting it.
- **Focus timer**: up to 25 minutes, with a screen-reader announcement at 1 minute left and at the end.
- **Accessibility**: full keyboard use (`D` done, `N` not now, `B` break down, `F` focus), skip link, visible focus rings, ARIA live announcements, 44px touch targets, high-contrast mode, larger text, reading-friendly spacing, calm mode that hides the rest of the list, and respect for reduced-motion settings.
- **Private by default**: no account, no server, no network calls. Everything is saved in your browser's localStorage.
- **Copy plan as text** to paste your ranked list anywhere.

## Run it

No install and no build step.

```bash
# Option 1: open index.html directly in a browser
# Option 2: serve the folder locally
python3 -m http.server 8000
# then open http://localhost:8000
```

## Test it

The ranking, parsing, and breakdown logic lives in `core.js` and has unit tests using Node's built-in test runner (Node 18+):

```bash
npm test
```

## Files

| File | What it is |
| --- | --- |
| `index.html` | Page structure and accessible markup |
| `styles.css` | Styles, including high-contrast, large-text, spacing, and calm modes |
| `core.js` | Parsing, scoring, "why", and breakdown logic (no DOM, works in the browser and Node) |
| `app.js` | UI wiring, keyboard shortcuts, timer, localStorage |
| `tests/core.test.js` | Unit tests for `core.js` |
| `screenshots/` | Screenshots used in the Devpost page |
| `demo.mp4` | 38-second captioned walkthrough |

## Tech

HTML, CSS, vanilla JavaScript, localStorage, Node.js test runner. Screenshots and the walkthrough were captured with Playwright (Python) and assembled with ffmpeg.

## Limitations

- Date and effort parsing is rule-based and English-only. It understands common phrases, not every way people write dates.
- The task breakdowns come from fixed templates for common kinds of tasks, not from an AI model.
- Data lives in one browser. There is no sync between devices.
- It has not been tested with real users yet. Screen-reader support follows standard ARIA patterns but has not been checked with every screen reader.

## License

MIT
