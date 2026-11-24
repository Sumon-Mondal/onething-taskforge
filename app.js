(function () {
  'use strict';
  var OT = window.OneThing;
  var KEY = 'onething.v1';
  var state = load();
  var timer = null;
  var $ = function (id) { return document.getElementById(id); };

  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.tasks) return s; } catch (e) {}
    return { tasks: [], prefs: {}, expanded: null, steps: {} };
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
  function announce(msg) { var a = $('announce'); a.textContent = ''; setTimeout(function () { a.textContent = msg; }, 30); }
  function ctx() {
    var e = document.querySelector('input[name="energy"]:checked');
    return { now: new Date(), minutes: parseInt($('minutes').value, 10), energy: e ? e.value : 'medium' };
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function render() {
    var c = ctx();
    var ranked = OT.rankTasks(state.tasks, c);
    var pick = ranked[0];
    var body = $('next-body');
    var doneCount = state.tasks.filter(function (t) { return t.done; }).length;
    if (!pick) {
      body.innerHTML = state.tasks.length
        ? '<p class="done-msg">Everything on your list is done (' + doneCount + '). Nice work. Take a break.</p>'
        : '<p class="empty">Add a few tasks above and your one next step shows up here.</p>';
    } else {
      var t = pick.task;
      var steps = state.expanded === t.id ? (state.steps[t.id] || (state.steps[t.id] = OT.breakDown(t).map(function (s) { return { text: s, done: false }; }))) : null;
      var html = '<p class="big">' + esc(t.title) + '</p>' +
        '<div class="meta"><span class="pill">' + esc(OT.formatDue(t.due, c.now)) + '</span>' +
        '<span class="pill">' + (t.estimated ? 'about ' : '') + t.minutes + ' min' + (t.estimated ? ' (guess)' : '') + '</span>' +
        (t.important ? '<span class="pill">Important</span>' : '') +
        t.tags.map(function (g) { return '<span class="pill">#' + esc(g) + '</span>'; }).join('') + '</div>' +
        '<p class="why"><strong>Why this?</strong> ' + esc(OT.explain(pick)) + '</p>';
      if (steps) {
        html += '<h3 id="steps-h">Small steps</h3><ol class="steps" aria-labelledby="steps-h">' + steps.map(function (s, i) {
          return '<li><label><input type="checkbox" data-step="' + i + '"' + (s.done ? ' checked' : '') + '>' + esc(s.text) + '</label></li>';
        }).join('') + '</ol>';
      }
      html += '<div class="row">' +
        '<button type="button" id="btn-done">Done (D)</button>' +
        '<button type="button" id="btn-later" class="secondary">Not now (N)</button>' +
        '<button type="button" id="btn-break" class="secondary" aria-expanded="' + (!!steps) + '">' + (steps ? 'Hide steps (B)' : 'Break it down (B)') + '</button>' +
        '<button type="button" id="btn-focus" class="secondary">' + (timer ? 'Stop timer (F)' : 'Focus ' + Math.min(c.minutes, 25) + ' min (F)') + '</button>' +
        '</div><p class="timer" id="timer" aria-live="off">' + (timer ? fmt(timer.left) : '') + '</p>';
      body.innerHTML = html;
      $('btn-done').onclick = markDone;
      $('btn-later').onclick = notNow;
      $('btn-break').onclick = toggleBreak;
      $('btn-focus').onclick = toggleFocus;
      Array.prototype.forEach.call(body.querySelectorAll('input[data-step]'), function (cb) {
        cb.onchange = function () { state.steps[t.id][+cb.dataset.step].done = cb.checked; save(); };
      });
    }
    var rest = ranked.slice(1);
    $('count').textContent = '(' + rest.length + ' waiting, ' + doneCount + ' done)';
    $('list').innerHTML = rest.map(function (r) {
      return '<li><span class="t">' + esc(r.task.title) + '</span> <span class="muted">· ' + esc(OT.formatDue(r.task.due, c.now)) + ' · ' + r.task.minutes + ' min</span></li>';
    }).join('') || '<li class="empty">Nothing else waiting.</li>';
  }

  function current() { var p = OT.pickNext(state.tasks, ctx()); return p && p.task; }
  function markDone() {
    var t = current(); if (!t) return;
    t.done = true; state.expanded = null; stopTimer(); save(); render();
    var n = current();
    announce('Marked done: ' + t.title + '. ' + (n ? 'Next: ' + n.title : 'All done.'));
    $('next').focus();
  }
  function notNow() {
    var t = current(); if (!t) return;
    t.snoozed += 1; state.expanded = null; save(); render();
    var n = current(); announce('Moved ' + t.title + ' down. Next: ' + (n ? n.title : 'nothing'));
  }
  function toggleBreak() {
    var t = current(); if (!t) return;
    state.expanded = state.expanded === t.id ? null : t.id; save(); render();
    announce(state.expanded ? 'Showing small steps for ' + t.title : 'Steps hidden');
  }
  function fmt(s) { return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function stopTimer() { if (timer) { clearInterval(timer.id); timer = null; } }
  function toggleFocus() {
    if (timer) { stopTimer(); render(); announce('Timer stopped'); return; }
    var mins = Math.min(ctx().minutes, 25);
    timer = { left: mins * 60 };
    timer.id = setInterval(function () {
      timer.left -= 1;
      var el = $('timer'); if (el) el.textContent = fmt(timer.left);
      if (timer.left === 60) announce('One minute left');
      if (timer.left <= 0) { stopTimer(); render(); announce('Focus time is up. Mark it done or take a short break.'); }
    }, 1000);
    render(); announce('Focus timer started for ' + mins + ' minutes');
  }

  function addFromDump() {
    var text = $('dump').value;
    var added = OT.parseBrainDump(text, new Date());
    if (!added.length) { announce('Nothing to add. Type at least one task.'); return; }
    state.tasks = state.tasks.concat(added); $('dump').value = ''; save(); render();
    announce('Added ' + added.length + ' tasks. Your next step: ' + current().title);
  }
  var EXAMPLE = 'Finish CS essay due fri !\nemail professor about lab ~5m\nstudy for calc exam 11/30 2h\npay phone bill tomorrow\nlaundry #home\nupdate resume for internship applications next week';

  function applyPrefs() {
    ['contrast', 'large', 'spacing', 'calm'].forEach(function (p) {
      document.body.classList.toggle(p, !!state.prefs[p]); $('pref-' + p).checked = !!state.prefs[p];
    });
  }
  ['contrast', 'large', 'spacing', 'calm'].forEach(function (p) {
    $('pref-' + p).onchange = function (e) { state.prefs[p] = e.target.checked; save(); applyPrefs(); };
  });
  $('add').onclick = addFromDump;
  $('example').onclick = function () { $('dump').value = EXAMPLE; $('dump').focus(); };
  $('clear').onclick = function () { if (confirm('Remove all tasks?')) { state.tasks = []; state.steps = {}; state.expanded = null; stopTimer(); save(); render(); announce('All tasks cleared'); } };
  $('minutes').onchange = render;
  Array.prototype.forEach.call(document.querySelectorAll('input[name="energy"]'), function (r) { r.onchange = render; });
  $('export').onclick = function () {
    var c = ctx();
    var lines = OT.rankTasks(state.tasks, c).map(function (r, i) { return (i + 1) + '. ' + r.task.title + ' (' + OT.formatDue(r.task.due, c.now) + ', ' + r.task.minutes + ' min)'; });
    var txt = 'My plan\n' + lines.join('\n');
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { announce('Plan copied'); }, function () { window.prompt('Copy your plan:', txt); });
  };
  $('dump').addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addFromDump(); });
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'textarea' || tag === 'input' || tag === 'select' || e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key.toLowerCase();
    if (k === 'd') markDone(); else if (k === 'n') notNow(); else if (k === 'b') toggleBreak(); else if (k === 'f') toggleFocus();
  });

  applyPrefs(); render();
})();
