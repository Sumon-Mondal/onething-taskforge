/* OneThing core logic: parse a brain dump, score tasks, pick one next step,
   and break big tasks into small first steps. No network, no dependencies.
   Works in the browser (window.OneThing) and in Node (module.exports). */
(function (root) {
  'use strict';

  var DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  var DAY_ABBR = { sun: 0, mon: 1, tue: 2, tues: 2, wed: 3, thu: 4, thur: 4, thurs: 4, fri: 5, sat: 6 };

  function startOfDay(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function addDays(d, n) { var x = startOfDay(d); x.setDate(x.getDate() + n); return x; }
  function daysBetween(a, b) { return Math.round((startOfDay(b) - startOfDay(a)) / 86400000); }

  // Find a due date in free text. Returns {date, match} or null.
  function parseDue(text, now) {
    var t = text.toLowerCase();
    var m;
    if ((m = t.match(/\b(today|tonight|asap)\b/))) return { date: startOfDay(now), match: m[0] };
    if ((m = t.match(/\b(tomorrow|tmrw|tmr)\b/))) return { date: addDays(now, 1), match: m[0] };
    if ((m = t.match(/\bin (\d{1,2}) days?\b/))) return { date: addDays(now, parseInt(m[1], 10)), match: m[0] };
    if ((m = t.match(/\bnext week\b/))) return { date: addDays(now, 7), match: m[0] };
    if ((m = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
      var mo = parseInt(m[1], 10) - 1, da = parseInt(m[2], 10);
      if (mo >= 0 && mo < 12 && da >= 1 && da <= 31) {
        var yr = m[3] ? parseInt(m[3], 10) : now.getFullYear();
        if (yr < 100) yr += 2000;
        var d = new Date(yr, mo, da);
        if (!m[3] && daysBetween(now, d) < -60) d.setFullYear(yr + 1); // e.g. "1/5" typed in December
        return { date: startOfDay(d), match: m[0] };
      }
    }
    var dayRe = /\b(?:(?:due|by|on|this|next)\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tues|tue|wed|thurs|thur|thu|fri|sat)\b/;
    if ((m = t.match(dayRe))) {
      var name = m[1];
      var idx = DAYS.indexOf(name);
      if (idx === -1) idx = DAY_ABBR[name];
      var diff = (idx - now.getDay() + 7) % 7;
      if (/\bnext\s/.test(m[0]) && diff === 0) diff = 7;
      return { date: addDays(now, diff), match: m[0] };
    }
    return null;
  }

  // Find an effort estimate like "~30m", "2h", "45 min", "1.5 hours". Returns minutes or null.
  function parseMinutes(text) {
    var t = text.toLowerCase();
    var m = t.match(/~?\b(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\b/);
    if (m) return { minutes: Math.round(parseFloat(m[1]) * 60), match: m[0] };
    m = t.match(/~?\b(\d+)\s*(m|min|mins|minute|minutes)\b/);
    if (m) return { minutes: parseInt(m[1], 10), match: m[0] };
    return null;
  }

  // Rough guess when no estimate is typed, based on the kind of task.
  var BIG_WORDS = /\b(project|essay|paper|report|application|apply|study|exam|presentation|build|research|thesis|portfolio|resume|move|taxes)\b/;
  var SMALL_WORDS = /\b(email|text|call|reply|pay|book|order|schedule|send|sign|print|submit|check|buy|rsvp)\b/;
  function guessMinutes(text) {
    var t = text.toLowerCase();
    if (BIG_WORDS.test(t)) return 90;
    if (SMALL_WORDS.test(t)) return 10;
    return 30;
  }

  function cleanTitle(text, removals) {
    var s = text;
    removals.forEach(function (r) { if (r) s = s.replace(new RegExp(r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), ' '); });
    s = s.replace(/#[\w-]+/g, ' ').replace(/!+/g, ' ').replace(/^\s*[-*•\d.)\]]+\s*/, '');
    s = s.replace(/\s+/g, ' ').replace(/\s+([,.;:])/g, '$1').trim();
    s = s.replace(/\b(due|by|on)\s*$/i, '').trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  var idCounter = 0;
  function parseLine(line, now) {
    var raw = line.trim();
    if (!raw) return null;
    var due = parseDue(raw, now);
    var est = parseMinutes(raw);
    var bangs = (raw.match(/!/g) || []).length;
    var important = bangs > 0 || /\b(urgent|important|asap|critical)\b/i.test(raw);
    var tags = (raw.match(/#[\w-]+/g) || []).map(function (s) { return s.slice(1).toLowerCase(); });
    var title = cleanTitle(raw, [due && due.match, est && est.match]).replace(/\b(urgent|important)\b/i, '').replace(/\s+/g, ' ').trim();
    if (!title) title = raw;
    idCounter += 1;
    return {
      id: 't' + Date.now().toString(36) + idCounter,
      raw: raw,
      title: title,
      due: due ? due.date.toISOString() : null,
      minutes: est ? est.minutes : guessMinutes(raw),
      estimated: !est,
      important: important,
      tags: tags,
      done: false,
      snoozed: 0
    };
  }

  function parseBrainDump(text, now) {
    now = now || new Date();
    return text.split(/\r?\n|;/).map(function (l) { return parseLine(l, now); }).filter(Boolean);
  }

  // Score a task for "what should I do next" given the time and energy available.
  // Returns {score, reasons[]} so the UI can always explain the pick.
  function scoreTask(task, ctx) {
    var now = ctx.now || new Date();
    var available = ctx.minutes || 30;
    var energy = ctx.energy || 'medium'; // low | medium | high
    var score = 0, reasons = [];

    if (task.due) {
      var d = daysBetween(now, new Date(task.due));
      if (d < 0) { score += 60; reasons.push('it is overdue by ' + (-d) + (d === -1 ? ' day' : ' days')); }
      else if (d === 0) { score += 50; reasons.push('it is due today'); }
      else if (d === 1) { score += 35; reasons.push('it is due tomorrow'); }
      else if (d <= 3) { score += 20; reasons.push('it is due in ' + d + ' days'); }
      else if (d <= 7) { score += 8; reasons.push('it is due this week'); }
    }
    if (task.important) { score += 25; reasons.push('you marked it important'); }

    if (task.minutes <= available) {
      score += 10;
      reasons.push('it fits in the ' + available + ' minutes you have');
    } else {
      score -= 5;
      reasons.push('it is bigger than your time, so start with the first small step');
    }

    if (energy === 'low') {
      if (task.minutes <= 15) { score += 15; reasons.push('it is a quick win for low energy'); }
      else if (task.minutes >= 60) score -= 10;
    } else if (energy === 'high' && task.minutes >= 45) {
      score += 10; reasons.push('you have the energy for deep work');
    }

    score -= task.snoozed * 12; // respect "not now"
    return { score: score, reasons: reasons };
  }

  function rankTasks(tasks, ctx) {
    return tasks
      .filter(function (t) { return !t.done; })
      .map(function (t, i) { var s = scoreTask(t, ctx); return { task: t, score: s.score, reasons: s.reasons, order: i }; })
      .sort(function (a, b) { return b.score - a.score || a.order - b.order; });
  }

  function pickNext(tasks, ctx) {
    var ranked = rankTasks(tasks, ctx);
    return ranked.length ? ranked[0] : null;
  }

  // Break a task into a few concrete first steps using simple templates.
  var TEMPLATES = [
    { re: /\b(essay|paper|report|write|writeup|write-up|thesis|cover letter)\b/, steps: [
      'Open a blank doc and title it', 'Write 3 bullet points of what you want to say',
      'Write a rough first paragraph (messy is fine)', 'Fill in one bullet as a paragraph', 'Read it once and fix the worst sentence'] },
    { re: /\b(apply|application|job|internship|scholarship)\b/, steps: [
      'Open the posting and save the link', 'List the required documents', 'Update one resume line to match the posting',
      'Fill in the basic contact fields', 'Note any question you need help with'] },
    { re: /\b(study|exam|quiz|test|midterm|final)\b/, steps: [
      'List the topics that will be covered', 'Pick the one topic you feel weakest on',
      'Do 5 practice problems or flashcards on it', 'Write down one question to ask', 'Take a 5 minute break'] },
    { re: /\b(project|build|code|app|hackathon|assignment|lab)\b/, steps: [
      'Write one sentence on what "done" looks like', 'List the 3 smallest pieces', 'Open the files or tools you need',
      'Finish the first piece only', 'Write a note on where to start next time'] },
    { re: /\b(clean|tidy|laundry|room|organize)\b/, steps: [
      'Set a 10 minute timer', 'Clear one surface', 'Put away anything that has a home', 'Take out trash or recycling'] },
    { re: /\b(email|reply|message|text|call)\b/, steps: [
      'Open the thread or contact', 'Write the one sentence you need to say', 'Add a greeting and send'] },
    { re: /\b(presentation|slides|deck|talk)\b/, steps: [
      'Write the one main point', 'Sketch 5 slide titles', 'Fill the first slide', 'Practice the first minute out loud'] }
  ];
  function breakDown(task) {
    var t = (task.title || '').toLowerCase();
    for (var i = 0; i < TEMPLATES.length; i++) {
      if (TEMPLATES[i].re.test(t)) return TEMPLATES[i].steps.slice();
    }
    return ['Write down what "done" means for this', 'Gather what you need in one place', 'Do the first 10 minutes', 'Decide the very next action and write it down'];
  }

  function formatDue(iso, now) {
    if (!iso) return 'No due date';
    var d = daysBetween(now || new Date(), new Date(iso));
    if (d < 0) return 'Overdue (' + (-d) + 'd)';
    if (d === 0) return 'Due today';
    if (d === 1) return 'Due tomorrow';
    var dt = new Date(iso);
    return 'Due ' + DAYS[dt.getDay()].charAt(0).toUpperCase() + DAYS[dt.getDay()].slice(1, 3) + ' ' + (dt.getMonth() + 1) + '/' + dt.getDate();
  }

  function explain(pick) {
    if (!pick) return '';
    var r = pick.reasons;
    if (!r.length) return 'It is the next item on your list.';
    if (r.length === 1) return 'Because ' + r[0] + '.';
    return 'Because ' + r.slice(0, -1).join(', ') + ', and ' + r[r.length - 1] + '.';
  }

  var api = { parseDue: parseDue, parseMinutes: parseMinutes, parseLine: parseLine, parseBrainDump: parseBrainDump,
    scoreTask: scoreTask, rankTasks: rankTasks, pickNext: pickNext, breakDown: breakDown, formatDue: formatDue, explain: explain };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OneThing = api;
})(this);
