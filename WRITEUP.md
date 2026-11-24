# OneThing

**Tagline:** Brain dump in, one clear next step out.

## Inspiration

As a student juggling classes, applications, and everyday errands, my problem is rarely not knowing what to do. It's looking at a long list and not knowing where to start. Most to-do apps show you everything at once, and for someone who is tired, anxious, or easily overloaded, that full list is the barrier. I wanted a tool that fits the person: you tell it how much time and energy you have, and it hands you one thing.

**User:** a student (or anyone) who feels overwhelmed by a long task list, including people who get overloaded by busy screens or rely on a keyboard or screen reader.
**Barrier:** an overwhelming task list with no clear first step.
**Change:** instead of a wall of tasks, they see one next step, the reason for it, and small steps to get started.

## What it does

- You type a brain dump, one task per line, in normal words. Optional hints like `due fri`, `tomorrow`, `11/30`, `~20m`, `2h`, `!` for important, and `#tag` are picked up automatically. If you don't give a time estimate, it guesses from the wording and labels it as a guess.
- You choose how much time you have (10 to 90 minutes) and your energy (low, medium, high).
- It shows **one next step** with a plain "Why this?" explanation, for example: "Because it is due tomorrow, it fits in the 25 minutes you have, and it is a quick win for low energy."
- **Break it down** turns a big task like an essay, an application, or exam prep into 3 to 5 small first steps you can check off.
- **Not now** moves a task down without deleting it. **Done** goes straight to the next single step.
- A **focus timer** (up to 25 minutes) helps you start.
- **Accessibility:** everything works from the keyboard (D, N, B, F shortcuts), with a skip link, visible focus, screen-reader announcements through ARIA live regions, large touch targets, high-contrast mode, larger text, reading-friendly spacing, a calm mode that hides the rest of the list, and reduced-motion support.
- **Privacy:** no account and no server. Everything stays in your browser.

## How I built it

I built it solo during the hackathon as a static web app with plain HTML, CSS, and JavaScript, with no frameworks and nothing to install. I kept all the logic (parsing dates and time estimates, scoring tasks, writing the "why", and the breakdown templates) in one small `core.js` module with no DOM code, so the same file runs in the browser and in Node. That let me write unit tests for it with Node's built-in test runner. The UI in `app.js` reads from that module and saves state to localStorage. I captured the screenshots and the walkthrough video with Playwright and stitched them together with ffmpeg.

The ranking is a transparent score rather than a model: overdue and due-soon tasks score highest, tasks marked important get a boost, tasks that fit your available time get a boost, low energy favors short tasks, high energy favors deep work, and "Not now" lowers a task's score. Every factor that counts also turns into a sentence in "Why this?".

**AI assistance and pre-existing work:** I used an AI assistant heavily during the build to write code, tests, the demo video, and a first draft of this write-up, and I reviewed the result. There is no pre-existing code. The example tasks in the demo are made up.

## Challenges I ran into

- Parsing dates people actually type ("fri", "next mon", "11/30", "1/5" typed in late November) without a library, and deciding what "next Monday" means. I settled on the coming Monday, and the following week only if today is Monday.
- Making the pick feel trustworthy. A ranked list with no explanation felt arbitrary, so I made every scoring rule produce a readable reason.
- Accessibility details such as announcing changes to screen readers without being noisy, keeping keyboard shortcuts from firing while you type, and making sure high contrast still shows focus clearly.

## Accomplishments that I'm proud of

- It works fully offline with zero dependencies. You just open `index.html`.
- The core logic is covered by unit tests, which all pass.
- Calm mode and the one-task view really do make the screen feel lighter than a normal to-do list.

## What I learned

- Hiding information can be an accessibility feature. Showing less helped more than adding features.
- Explaining a recommendation matters as much as making it.
- Keeping logic separate from the UI made testing and changes much faster.

## What's next for OneThing

- Test it with real students, including screen-reader users, and adjust from their feedback.
- An optional AI breakdown for tasks that don't match a template, with the current templates kept as the offline fallback.
- Calendar import so due dates come in automatically, and optional sync between devices.
- Support for more languages and date formats.

## Limitations

Date parsing is rule-based and English-only, breakdowns come from fixed templates, data stays in one browser, and it hasn't been tested with real users yet.

## Built with

html, css, javascript, localstorage, node.js, playwright, ffmpeg
