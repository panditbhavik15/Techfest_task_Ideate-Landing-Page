/* ============================================================
   Fest OS — platform module prototypes
   Every record here is sample data written for this review. Nothing is sent
   anywhere: state lives in localStorage on this device only.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'tf-crew';

  var SKILLS = ['Mechanical', 'Electronics', 'Software', 'AI / ML', 'Design', 'Aerospace', 'Business'];

  /* real event names already listed elsewhere on this page */
  var LANES = {
    'Competitions': ['The Wrecking Ball Challenge', 'National Probability Challenge',
      'ContextCon: The Agentic Services Hackathon', 'Code Auditor', 'RoboReach'],
    'Pushpak drone track': ['UAV-X: Resilient BVLOS Swarm', 'CycloProp: Advanced UAV Propulsion',
      'Security of Drones'],
    'Workshops': ['Robotics', 'Agentic AI', 'Ethical Hacking', 'Algorithmic Trading', 'UI/UX Design'],
    'Arena & stage': ['RoboWars', 'Keynote lectures', 'Ozone performances', 'Technoholix rides'],
    'Exhibitions': ['TechExpo student floor', 'International pavilions']
  };

  var POOL = [
    { id: 'p1', name: 'Aarav', city: 'Pune · mechanics bench', skills: ['Mechanical', 'Design'],
      lane: 'The Wrecking Ball Challenge', need: 'Two-person chassis crew already built, looking for one vision coder' },
    { id: 'p2', name: 'Sana', city: 'Delhi · South Asian University', skills: ['Electronics', 'Software'],
      lane: 'UAV-X: Resilient BVLOS Swarm', need: 'Can fly and tune a link, needs an airframe and someone for the write-up' },
    { id: 'p3', name: 'Rithik', city: 'Hyderabad · JNTU', skills: ['AI / ML'],
      lane: 'ContextCon: The Agentic Services Hackathon', need: 'Solo until the hackathon starts, wants three more builders' },
    { id: 'p4', name: 'Meera', city: 'Kochi · CUSAT', skills: ['Design', 'Business'],
      lane: 'TechExpo student floor', need: 'Has a pavilion slot to fill, needs two people who can demo hardware' },
    { id: 'p5', name: 'Devansh', city: 'Patna · IIT Patna', skills: ['Aerospace', 'Mechanical'],
      lane: 'CycloProp: Advanced UAV Propulsion', need: 'CAE-heavy team, still short on electronics and testing' },
    { id: 'p6', name: 'Kabir', city: 'Nagpur · Priyadarshini COE', skills: ['Software', 'Electronics'],
      lane: 'RoboWars', need: 'Welding a second bot, wants a driver and a spare-parts budget plan' }
  ];

  var REPLIES = [
    'Copy. Send the build log and I will check whether the mount fits before we commit.',
    'We have budget for one more sensor run if we book the arena slot today.',
    'I am on the expo floor till 6 — ping the pit channel and I will walk over.'
  ];

  var M = 60000;
  var now = Date.now();

  /* ---------- state ---------- */
  function fresh() {
    return {
      me: null,
      open: 'pit',
      unread: {},
      threads: {
        pit: [
          { who: 'Nikhil · pit lead', text: 'Arena registration closes at 4. Chassis is done, wiring is not.', t: now - 46 * M, kind: 'sample' },
          { who: 'Sana · electronics', text: 'Two ESCs are still on the bench. I need a spare receiver.', t: now - 31 * M, kind: 'sample' },
          { who: 'You', text: 'Posting a crew call for a coder now — see the matchmaking tab.', t: now - 22 * M, me: true, kind: 'sample' }
        ]
      }
    };
  }

  var state = fresh();
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.threads) state = parsed;
    }
  } catch (e) {}
  if (!state.unread) state.unread = {};

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* ---------- helpers ---------- */
  function node(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }
  function clock(ts) {
    var d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  function person(id) {
    for (var i = 0; i < POOL.length; i++) if (POOL[i].id === id) return POOL[i];
    return null;
  }
  function titleOf(id) { return id === 'pit' ? 'Pit crew' : person(id) ? person(id).name : 'Thread'; }
  function ping() {
    try { document.dispatchEvent(new CustomEvent('tf:ping')); } catch (e) {}
  }

  /* ============================================================
     matchmaking
     ============================================================ */
  var mmForm = document.querySelector('[data-mm]');
  var skillBox = document.querySelector('[data-mm-skills]');
  var laneSel = document.querySelector('[data-mm-lane]');
  var statusEl = document.querySelector('[data-mm-status]');
  var poolEl = document.querySelector('[data-pool]');
  var filterEl = document.querySelector('[data-filters]');
  var screen = null;

  function buildControls() {
    SKILLS.forEach(function (s) {
      var label = node('label', 'chip');
      var input = node('input');
      input.type = 'checkbox';
      input.name = 'skills';
      input.value = s;
      label.appendChild(input);
      label.appendChild(node('span', null, s));
      skillBox.appendChild(label);
    });
    Object.keys(LANES).forEach(function (group) {
      var og = node('optgroup');
      og.label = group;
      LANES[group].forEach(function (l) {
        var o = node('option', null, l);
        o.value = l;
        og.appendChild(o);
      });
      laneSel.appendChild(og);
    });
  }

  function buildFilters() {
    var all = node('button', 'filt', 'All skills');
    all.type = 'button';
    all.setAttribute('aria-pressed', 'true');
    all.addEventListener('click', function () { screen = null; syncFilters(); renderPool(); });
    filterEl.appendChild(node('span', null, 'Screen the pool'));
    filterEl.appendChild(all);
    SKILLS.forEach(function (s) {
      var b = node('button', 'filt', s);
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        screen = screen === s ? null : s;
        syncFilters();
        renderPool();
      });
      filterEl.appendChild(b);
    });
  }

  function syncFilters() {
    var btns = filterEl.querySelectorAll('.filt');
    for (var i = 0; i < btns.length; i++) {
      var isAll = i === 0;
      btns[i].setAttribute('aria-pressed', String(isAll ? !screen : btns[i].textContent === screen));
    }
  }

  function cardFor(p, isYou) {
    var li = node('li', 'pl' + (isYou ? ' is-you' : ''));
    var top = node('div', 'pl-top');
    top.appendChild(node('b', null, p.name));
    top.appendChild(node('span', null, isYou ? 'your card' : 'sample'));
    li.appendChild(top);
    if (p.city) li.appendChild(node('p', 'pl-where', p.city));
    var skills = node('div', 'pl-skills');
    p.skills.forEach(function (s) { skills.appendChild(node('i', null, s)); });
    li.appendChild(skills);
    li.appendChild(node('p', 'pl-need', p.need));
    li.appendChild(node('p', 'pl-where', p.lane));
    var act = node('div', 'pl-act');
    if (isYou) {
      var out = node('button', 'filt', 'Withdraw my card');
      out.type = 'button';
      out.addEventListener('click', function () {
        state.me = null;
        persist();
        renderPool();
        say('Withdrawn. Your card is off this device only.');
      });
      act.appendChild(out);
    } else {
      var open = node('button', 'filt', 'Ask to join');
      open.type = 'button';
      open.addEventListener('click', function () {
        openThread(p.id, true);
        say('Thread with ' + p.name + ' is open below — the draft is yours to edit and send.');
      });
      act.appendChild(open);
    }
    li.appendChild(act);
    return li;
  }

  function renderPool() {
    while (poolEl.firstChild) poolEl.removeChild(poolEl.firstChild);
    if (state.me) poolEl.appendChild(cardFor(state.me, true));
    POOL.forEach(function (p) {
      if (screen && p.skills.indexOf(screen) === -1) return;
      poolEl.appendChild(cardFor(p, false));
    });
    if (!poolEl.firstChild) poolEl.appendChild(node('li', 'chat-empty', 'No sample card lists that skill right now.'));
  }

  function say(msg) { statusEl.textContent = msg; }

  function readForm() {
    var picked = [];
    var boxes = mmForm.querySelectorAll('input[name="skills"]:checked');
    for (var i = 0; i < boxes.length; i++) picked.push(boxes[i].value);
    return {
      id: 'me',
      name: mmForm.elements.name.value.trim().slice(0, 26) || 'Unnamed delegate',
      city: mmForm.elements.city.value.trim().slice(0, 30),
      skills: picked,
      lane: mmForm.elements.lane.value || LANES.Competitions[0],
      need: mmForm.elements.need.value
    };
  }

  function hydrateForm(me) {
    if (!me) return;
    mmForm.elements.name.value = me.name;
    mmForm.elements.city.value = me.city || '';
    mmForm.elements.need.value = me.need;
    var boxes = mmForm.querySelectorAll('input[name="skills"]');
    for (var i = 0; i < boxes.length; i++) boxes[i].checked = me.skills.indexOf(boxes[i].value) > -1;
    var opts = mmForm.elements.lane.options;
    for (var j = 0; j < opts.length; j++) if (opts[j].value === me.lane) mmForm.elements.lane.selectedIndex = j;
  }

  mmForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var card = readForm();
    if (!card.skills.length) {
      say('Pick at least one thing you build — that is what the other side searches for.');
      return;
    }
    state.me = card;
    persist();
    renderPool();
    say('Published: ' + card.name + ' · ' + card.skills.join(', ') + '. Kept on this device.');
  });

  mmForm.addEventListener('reset', function () {
    window.setTimeout(function () {
      state.me = null;
      screen = null;
      syncFilters();
      persist();
      renderPool();
      say('');
    }, 0);
  });

  /* ============================================================
     team chat
     ============================================================ */
  var chanEl = document.querySelector('[data-channels]');
  var logEl = document.querySelector('[data-chat-log]');
  var nameEl = document.querySelector('[data-chat-name]');
  var subEl = document.querySelector('[data-chat-sub]');
  var chatForm = document.querySelector('[data-chat-form]');
  var chatInput = chatForm.querySelector('input');
  var chatSend = chatForm.querySelector('button');
  var replyCount = 0;

  function threadIds() {
    var ids = ['pit'];
    POOL.forEach(function (p) {
      /* an empty thread still belongs in the rail while it is the open one */
      if (state.threads[p.id] && (state.threads[p.id].length || state.open === p.id)) ids.push(p.id);
    });
    return ids;
  }

  function renderChannels() {
    while (chanEl.firstChild) chanEl.removeChild(chanEl.firstChild);
    threadIds().forEach(function (id) {
      var b = node('button', 'chan');
      b.type = 'button';
      b.setAttribute('aria-pressed', String(state.open === id));
      b.appendChild(node('span', null, titleOf(id)));
      var unread = state.unread[id] || 0;
      var badge = node('b', unread ? null : 'is-quiet', unread ? String(unread) : 'read');
      b.appendChild(badge);
      b.addEventListener('click', function () { openThread(id, false); });
      chanEl.appendChild(b);
    });
    var reset = node('button', 'filt', 'Reset crew data');
    reset.type = 'button';
    reset.addEventListener('click', function () {
      state = fresh();
      screen = null;
      persist();
      renderChannels();
      renderLog();
      syncFilters();
      renderPool();
      say('Sample threads restored on this device.');
    });
    chanEl.appendChild(reset);
  }

  function renderLog() {
    var msgs = state.threads[state.open] || [];
    while (logEl.firstChild) logEl.removeChild(logEl.firstChild);
    var p = person(state.open);
    nameEl.textContent = titleOf(state.open) + (state.open === 'pit' ? ' · shared channel' : ' · direct');
    subEl.textContent = p
      ? 'Sample contact: ' + p.city + ' · ' + p.lane
      : 'Your three-person crew channel, kept in this browser';
    if (!msgs.length) {
      logEl.appendChild(node('li', 'chat-empty', 'No messages in this thread yet. Say what you need.'));
    }
    msgs.forEach(function (m) {
      var li = node('li', m.me ? 'me' : 'them');
      var meta = node('p', 'msg-meta');
      meta.appendChild(node('span', null, (m.me ? 'You' : m.who) + ' · ' + clock(m.t)));
      if (m.kind) {
        meta.appendChild(document.createTextNode(' · '));
        meta.appendChild(node('b', null, m.kind === 'sample' ? 'sample post' : 'demo reply'));
      }
      li.appendChild(meta);
      li.appendChild(node('p', 'msg-body', m.text));
      logEl.appendChild(li);
    });
    logEl.scrollTop = logEl.scrollHeight;
    chatInput.disabled = false;
    chatSend.disabled = false;
  }

  function openThread(id, draft) {
    if (!state.threads[id]) state.threads[id] = [];
    state.open = id;
    state.unread[id] = 0;
    persist();
    renderChannels();
    renderLog();
    if (draft) {
      var p = person(id);
      var mine = state.me && state.me.skills.length ? state.me.skills.join(' + ') : 'a build role';
      chatInput.value = 'Hi ' + p.name + ' — your card says ' + p.need.charAt(0).toLowerCase() +
        p.need.slice(1) + '. We cover ' + mine + '. Is there a slot?';
    }
    chatInput.focus();
  }

  chatForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = chatInput.value.trim();
    if (!text) return;
    var id = state.open;
    state.threads[id].push({ me: true, text: text, t: Date.now() });
    chatInput.value = '';
    persist();
    renderChannels();
    renderLog();
    window.setTimeout(function () {
      var from = person(id);
      var line = REPLIES[replyCount++ % REPLIES.length];
      state.threads[id].push({
        who: from ? from.name : 'Nikhil · pit lead',
        text: line,
        t: Date.now(),
        kind: 'reply'
      });
      if (state.open === id) {
        persist();
        renderChannels();
        renderLog();
      } else {
        state.unread[id] = (state.unread[id] || 0) + 1;
        persist();
        renderChannels();
      }
      ping();
    }, 1200);
  });

  /* ============================================================
     live day — demo clock, corridor timetable, venue map, boards
     ============================================================ */
  var LIVE_KEY = 'tf-live';
  var PLAN_KEY = 'tf-plan';
  var DAY_HALT = 19 * 60;
  var STREET = 210;
  var UNIT_M = 0.9;

  var SPEEDS = [
    { v: 1 / 60, l: 'Real time' },
    { v: 1, l: '1 min/sec' },
    { v: 5, l: '5 min/sec' }
  ];

  /* one walk corridor, so the delay genuinely ripples. The drift is the share
     of each session's own length it is expected to run over: the sample sheet
     adds up to a finale day that closes about half an hour late. */
  var SCHEDULE = [
    { at: 570, dur: 30, drift: 0.1, title: 'Crew briefing, arena doors open', venue: 'Arena' },
    { at: 600, dur: 75, drift: 0.06, title: 'UAV-X BVLOS qualifying runs', venue: 'Arena' },
    { at: 675, dur: 45, drift: 0.1, title: 'Keynote session', venue: 'Convocation Hall' },
    { at: 720, dur: 60, drift: 0.05, title: 'TechExpo student floor, block 1', venue: 'TechExpo' },
    { at: 780, dur: 40, drift: 0.2, title: 'RoboWars heat 1', venue: 'Arena' },
    { at: 820, dur: 90, drift: 0.03, title: 'Agentic AI workshop lab', venue: 'Workshop Labs' },
    { at: 915, dur: 45, drift: 0.06, title: 'ContextCon build check-in', venue: 'Workshop Labs' },
    { at: 960, dur: 40, drift: 0.15, title: 'RoboWars heat 2', venue: 'Arena' },
    { at: 1005, dur: 35, drift: 0.08, title: 'Prize ceremony', venue: 'Main Stage' }
  ];

  var PLACES = [
    { id: 'gate', name: 'Entry Gate', kind: 'gate', x: 40, y: 370, note: 'Delegate check-in and badge desk.' },
    { id: 'aid', name: 'First Aid', kind: 'util', x: 40, y: 248, note: 'Camp medical desk, staffed all day.' },
    { id: 'arena', name: 'Arena', kind: 'arena', x: 156, y: 114, note: 'Caged ring, standing room around it.' },
    { id: 'wash', name: 'Washrooms', kind: 'util', x: 140, y: 336, note: 'Blocks on either side of the street.' },
    { id: 'labs', name: 'Workshop Labs', kind: 'lab', x: 255, y: 286, note: 'Five tracks, small batches, hardware on the bench.' },
    { id: 'convocation', name: 'Convocation Hall', kind: 'lecture', x: 350, y: 76, note: 'Keynotes, reserved seating for passes.' },
    { id: 'food', name: 'Food Court', kind: 'food', x: 360, y: 336, note: 'Stall rows, two queues, water points.' },
    { id: 'expo', name: 'TechExpo', kind: 'expo', x: 505, y: 130, note: 'Student floor and industry pavilions.' },
    { id: 'stage', name: 'Main Stage', kind: 'stage', x: 540, y: 300, note: 'Ozone sets and the closing ceremony.' }
  ];

  var KINDS = {
    arena: 'Arena', lecture: 'Lecture', expo: 'Exhibition', lab: 'Workshop',
    stage: 'Stage', food: 'Food', util: 'Facilities', gate: 'Gates'
  };

  var BASE_TEAMS = [
    { id: 't1', name: 'Torque & Co', pts: 148, hist: [96, 118, 131, 148] },
    { id: 't2', name: 'BVLOS Bandits', pts: 141, hist: [102, 119, 130, 141] },
    { id: 't3', name: 'Null Pointer', pts: 133, hist: [88, 101, 120, 133] },
    { id: 't4', name: 'Ferrous Foxes', pts: 127, hist: [95, 108, 119, 127] },
    { id: 't5', name: 'Signal & Sortie', pts: 118, hist: [70, 88, 102, 118] },
    { id: 't6', name: 'Kitbash', pts: 104, hist: [81, 90, 99, 104] },
    { id: 't7', name: 'Recursion', pts: 97, hist: [60, 74, 88, 97] },
    { id: 't8', name: 'Zero Gravity', pts: 88, hist: [52, 66, 79, 88] }
  ];

  var SEED_QF = [['t1', 't8'], ['t4', 't5'], ['t3', 't6'], ['t2', 't7']];

  var live = { spd: 1, running: true, board: null, win: null };
  try {
    var lraw = JSON.parse(localStorage.getItem(LIVE_KEY));
    if (lraw && typeof lraw === 'object') {
      if (lraw.spd) live.spd = lraw.spd;
      if (Array.isArray(lraw.board) && lraw.board.length === BASE_TEAMS.length) live.board = lraw.board;
      if (Array.isArray(lraw.win) && lraw.win.length === 7) live.win = lraw.win;
    }
  } catch (e) {}
  if (!live.board) live.board = BASE_TEAMS.map(function (t) { return { id: t.id, pts: t.pts, hist: t.hist.slice() }; });
  if (!live.win) live.win = [null, null, null, null, null, null, null];

  function persistLive() {
    try { localStorage.setItem(LIVE_KEY, JSON.stringify({ spd: live.spd, board: live.board, win: live.win })); } catch (e) {}
  }

  function teamName(id) {
    for (var i = 0; i < BASE_TEAMS.length; i++) if (BASE_TEAMS[i].id === id) return BASE_TEAMS[i].name;
    return id || '';
  }

  function fmt(minute) {
    var total = Math.max(0, Math.round(minute));
    var h = Math.floor(total / 60) % 24;
    var m = total % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function planTitles() {
    var out = [];
    try {
      var raw = JSON.parse(localStorage.getItem(PLAN_KEY));
      if (Array.isArray(raw)) raw.forEach(function (it) { if (it && it.t) out.push(String(it.t).toLowerCase()); });
    } catch (e) {}
    return out;
  }

  /* a shortlist pick matches a session when the session title carries the
     pick's leading word — 'ContextCon: The Agentic Services Hackathon' is
     stored under its card heading, the corridor only says 'build check-in' */
  function isPicked(title, plan) {
    var low = title.toLowerCase();
    for (var i = 0; i < plan.length; i++) {
      var head = plan[i].split(/[:·,—]/)[0].trim().split(' ')[0];
      if (head.length > 3 && low.indexOf(head) > -1) return true;
    }
    return false;
  }

  /* ---------- the delay chain: each heat hands its overrun to the next ---------- */
  function chain(t) {
    var carry = 0;
    return SCHEDULE.map(function (s) {
      var start = s.at + carry;
      var prog = t <= start ? 0 : Math.min(1, (t - start) / s.dur);
      var slip = carry + s.dur * s.drift * prog;
      var endAt = start + s.dur * (1 + s.drift);
      var st = t >= endAt ? 'wrapped' : t >= start ? 'running' : t >= start - 20 ? 'upnext' : 'later';
      carry = slip;
      return { s: s, start: start, endAt: endAt, slip: slip, st: st };
    });
  }

  var clockEl = document.querySelector('[data-clock]');
  var behindEl = document.querySelector('[data-behind]');
  var speedEl = document.querySelector('[data-speed]');
  var transportEl = document.querySelector('[data-transport]');
  var schedEl = document.querySelector('[data-sched]');
  var carryEl = document.querySelector('[data-carry]');
  var panelLive = document.getElementById('p-os-live');

  var t = 11 * 60 + 12;
  var rows = [];

  function buildSpeed() {
    SPEEDS.forEach(function (sp) {
      var b = node('button', 'filt', sp.l);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(sp.v === live.spd));
      b.addEventListener('click', function () {
        live.spd = sp.v;
        live.running = true;
        persistLive();
        draw();
      });
      speedEl.appendChild(b);
    });
    var play = node('button', 'filt', 'Pause');
    play.type = 'button';
    play.setAttribute('data-play', '');
    play.addEventListener('click', function () {
      if (dayDone()) { t = 570; live.running = true; }
      else live.running = !live.running;
      draw();
    });
    transportEl.appendChild(play);
    var back = node('button', 'filt', 'Restart the day');
    back.type = 'button';
    back.addEventListener('click', function () {
      t = 570;
      live.running = true;
      draw();
    });
    transportEl.appendChild(back);
  }

  function speedV() {
    for (var i = 0; i < SPEEDS.length; i++) if (SPEEDS[i].v === live.spd) return SPEEDS[i].v;
    return SPEEDS[1].v;
  }

  /* the day is over when the last session on the sheet has wrapped */
  function dayDone() {
    var rows = chain(t);
    return rows[rows.length - 1].st === 'wrapped' || t >= DAY_HALT;
  }

  function syncSpeed() {
    var btns = speedEl.querySelectorAll('.filt');
    for (var i = 0; i < btns.length; i++) btns[i].setAttribute('aria-pressed', String(SPEEDS[i].v === live.spd));
    var play = transportEl.querySelector('[data-play]');
    play.textContent = dayDone() ? 'Run it again' : live.running ? 'Pause' : 'Play';
  }

  function buildSched() {
    SCHEDULE.forEach(function () {
      var li = node('li', 'sc');
      var time = node('p', 'sc-time');
      var body = node('div', 'sc-body');
      var title = node('p', 'sc-title');
      var venue = node('p', 'sc-venue');
      var pick = node('p', 'sc-pick', 'on your shortlist');
      pick.hidden = true;
      body.appendChild(title);
      body.appendChild(venue);
      body.appendChild(pick);
      var chip = node('p', 'sc-chip');
      li.appendChild(time);
      li.appendChild(body);
      li.appendChild(chip);
      schedEl.appendChild(li);
      rows.push({ li: li, time: time, title: title, venue: venue, pick: pick, chip: chip });
    });
  }

  function draw() {
    var rowsC = chain(t);
    clockEl.textContent = fmt(t);
    var open = null;
    for (var i = 0; i < rowsC.length; i++) if (rowsC[i].st !== 'wrapped') { open = rowsC[i]; break; }
    var last = rowsC[rowsC.length - 1];
    var behind = open ? Math.round(open.start - open.s.at) : Math.round(last.slip);
    var trend = Math.round(last.slip);
    var done = last.st === 'wrapped' || t >= DAY_HALT;
    if (done) behindEl.textContent = 'Corridor wrapped for the day — the ceremony landed ' + trend + ' min behind the sheet.';
    else if (behind >= 1) behindEl.textContent = 'Corridor is running ' + behind + ' min behind at ' + fmt(t) + '.';
    else if (trend >= 1) behindEl.textContent = 'On time at ' + fmt(t) + ', but the day is already trending +' + trend + ' min by the ceremony.';
    else behindEl.textContent = 'On time at ' + fmt(t) + ', nothing has slipped yet.';

    var plan = planTitles();
    var picked = 0, pickedLate = 0, firstLate = '', firstLateStart = t;
    rowsC.forEach(function (r, i) {
      var row = rows[i];
      row.li.className = 'sc' + (r.st === 'running' ? ' is-now' : r.st === 'wrapped' ? ' is-past' : '');
      row.time.textContent = fmt(r.start);
      row.title.textContent = r.s.title;
      row.venue.textContent = r.s.venue + ' · planned ' + fmt(r.s.at);
      var hit = isPicked(r.s.title, plan);
      row.pick.hidden = !hit;
      if (hit) {
        picked++;
        if (r.slip >= 1) {
          pickedLate++;
          if (!firstLate) { firstLate = r.s.title; firstLateStart = r.start; }
        }
      }
      var label = r.st === 'wrapped' ? 'Wrapped' : r.st === 'running' ? 'Running' : r.st === 'upnext' ? 'Up next' : 'Scheduled';
      var slip = Math.round(r.slip);
      row.chip.textContent = label + (slip >= 1 ? ' · +' + slip + ' min' : ' · on time');
      row.chip.className = 'sc-chip' + (slip >= 1 ? ' late' : '') + (r.st === 'running' ? ' run' : '') + (r.st === 'upnext' ? ' next' : '');
    });

    while (carryEl.firstChild) carryEl.removeChild(carryEl.firstChild);
    if (!picked) {
      carryEl.textContent = 'No event from your shortlist sits on this corridor. Add one under “Pick your lane” and the tracker flags the rows it lands on.';
    } else {
      carryEl.appendChild(document.createTextNode(
        picked + (picked === 1 ? ' pick' : ' picks') + ' from your shortlist are on this corridor'));
      carryEl.appendChild(node('b', null, pickedLate
        ? ' — ' + pickedLate + (pickedLate === 1 ? ' of them is' : ' of them are') + ' slipping. ' +
          firstLate + ' has moved to ' + fmt(firstLateStart) + '.'
        : ' — none of them is late right now.'));
    }
    syncPins();
    syncSpeed();
  }

  /* ============================================================
     venue map
     ============================================================ */
  var pinsEl = document.querySelector('[data-pins]');
  var routeEl = document.querySelector('[data-route]');
  var infoEl = document.querySelector('[data-map-info]');
  var actEl = document.querySelector('[data-map-act]');
  var qEl = document.querySelector('[data-map-q]');
  var mapFilterEl = document.querySelector('[data-map-filters]');
  var mapSel = null;
  var mapMe = null;
  var mapKind = null;
  var mapQuery = '';
  var pinEls = {};

  function place(id) {
    for (var i = 0; i < PLACES.length; i++) if (PLACES[i].id === id) return PLACES[i];
    return null;
  }

  /* the arena pin would otherwise read 'Arena — Arena' */
  function pinName(p) {
    return p.name + (KINDS[p.kind] === p.name ? '' : ' — ' + KINDS[p.kind]);
  }

  function matches(p) {
    if (mapKind && p.kind !== mapKind) return false;
    if (mapQuery) {
      var hay = (p.name + ' ' + KINDS[p.kind] + ' ' + p.note).toLowerCase();
      if (hay.indexOf(mapQuery) === -1) return false;
    }
    return true;
  }

  function buildMap() {
    var all = node('button', 'filt', 'All kinds');
    all.type = 'button';
    all.setAttribute('aria-pressed', 'true');
    all.addEventListener('click', function () { mapKind = null; syncMapFilters(); drawMap(); });
    mapFilterEl.appendChild(node('span', null, 'Show'));
    mapFilterEl.appendChild(all);
    Object.keys(KINDS).forEach(function (k) {
      var b = node('button', 'filt', KINDS[k]);
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        mapKind = mapKind === k ? null : k;
        syncMapFilters();
        drawMap();
      });
      mapFilterEl.appendChild(b);
    });

    PLACES.forEach(function (p) {
      var b = node('button', 'pin');
      b.type = 'button';
      b.setAttribute('aria-label', pinName(p));
      b.style.left = (p.x / 640 * 100) + '%';
      b.style.top = (p.y / 400 * 100) + '%';
      b.appendChild(node('span', 'pin-dot'));
      b.appendChild(node('span', 'pin-lbl', p.name));
      b.addEventListener('click', function () {
        mapSel = mapSel === p.id ? null : p.id;
        drawMap();
      });
      pinsEl.appendChild(b);
      pinEls[p.id] = b;
    });
  }

  function syncMapFilters() {
    var btns = mapFilterEl.querySelectorAll('.filt');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed', String(i === 0 ? !mapKind : mapKind === Object.keys(KINDS)[i - 1]));
    }
  }

  function onSpot(p) {
    if (p.kind === 'gate' || p.kind === 'util' || p.kind === 'food') return null;
    var rowsC = chain(t);
    for (var i = 0; i < rowsC.length; i++) {
      if (rowsC[i].s.venue === p.name && (rowsC[i].st === 'running' || rowsC[i].st === 'upnext')) return rowsC[i];
    }
    return null;
  }

  function routeTo(a, b) {
    var pts = [[a.x, a.y], [a.x, STREET], [b.x, STREET], [b.x, b.y]];
    var len = 0;
    for (var i = 1; i < pts.length; i++) len += Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]);
    return { pts: pts, metres: Math.round(len * UNIT_M), secs: Math.round(len * UNIT_M / 1.25) };
  }

  function walkText(secs) {
    var m = Math.floor(secs / 60);
    var s = secs % 60;
    return m ? m + ' min ' + s + ' s' : s + ' s';
  }

  /* pins only change class here — replacing the action buttons on every clock
     tick would move focus out from under anyone using them */
  function syncPins() {
    PLACES.forEach(function (p) {
      var b = pinEls[p.id];
      if (!b) return;
      var hit = onSpot(p);
      b.className = 'pin' + (p.x < 100 ? ' l-l' : '') + (p.x > 500 ? ' l-r' : '') +
        (mapSel === p.id ? ' is-sel' : '') + (mapMe === p.id ? ' is-you' : '') +
        (hit && hit.st === 'running' ? ' is-live' : '') + (matches(p) ? '' : ' is-off');
      if (matches(p)) { b.removeAttribute('aria-hidden'); b.removeAttribute('tabindex'); }
      else { b.setAttribute('aria-hidden', 'true'); b.setAttribute('tabindex', '-1'); }
      b.setAttribute('aria-pressed', String(mapSel === p.id));
      b.setAttribute('aria-label', pinName(p) + (mapMe === p.id ? ', my position' : ''));
    });
  }

  function drawMap() {
    syncPins();

    while (actEl.firstChild) actEl.removeChild(actEl.firstChild);

    if (!mapSel) {
      routeEl.setAttribute('points', '');
      infoEl.textContent = mapMe
        ? 'Your position is set at ' + place(mapMe).name + '. Tap any other pin to route to it.'
        : 'Tap a pin for what is there and what is on now.';
      return;
    }

    var p = place(mapSel);
    var hit = onSpot(p);
    /* the arena pin would otherwise read 'Arena · Arena' */
    var line = p.name + (KINDS[p.kind] === p.name ? '' : ' · ' + KINDS[p.kind]);
    if (hit) {
      line += hit.st === 'running'
        ? ' — on this spot now: ' + hit.s.title + ', planned finish ' + fmt(hit.endAt) +
          (Math.round(hit.slip) >= 1 ? ' (+' + Math.round(hit.slip) + ' min).' : '.')
        : ' — next here: ' + hit.s.title + ' at ' + fmt(hit.start) + '.';
    } else {
      line += ' — ' + p.note;
    }
    infoEl.textContent = line;

    var mk = function (label, fn) {
      var b = node('button', 'filt', label);
      b.type = 'button';
      b.addEventListener('click', fn);
      actEl.appendChild(b);
    };
    if (mapMe === p.id) {
      mk('Clear my position', function () { mapMe = null; drawMap(); });
    } else {
      mk('Set as my position', function () { mapMe = p.id; drawMap(); });
    }
    if (mapMe && mapMe !== p.id) {
      var r = routeTo(place(mapMe), p);
      routeEl.setAttribute('points', r.pts.map(function (q) { return q[0] + ',' + q[1]; }).join(' '));
      mk('Clear route', function () { mapMe = null; drawMap(); });
      actEl.appendChild(node('span', 'map-est', '≈ ' + walkText(r.secs) + ' on foot · ' + r.metres + ' m'));
    } else {
      routeEl.setAttribute('points', '');
    }
  }

  /* ============================================================
     leaderboard + bracket
     ============================================================ */
  var bodyEl = document.querySelector('[data-board-body]');
  var resStatus = document.querySelector('[data-res-status]');
  var brEl = document.querySelector('[data-bracket]');
  var brStatus = document.querySelector('[data-br-status]');
  var prevRank = {};

  function rankMap() {
    var sorted = live.board.slice().sort(function (a, b) { return b.pts - a.pts; });
    var map = {};
    sorted.forEach(function (tm, i) { map[tm.id] = i + 1; });
    return { sorted: sorted, map: map };
  }

  function spark(hist) {
    var svgns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgns, 'svg');
    svg.setAttribute('class', 'spark');
    svg.setAttribute('viewBox', '0 0 58 18');
    svg.setAttribute('aria-hidden', 'true');
    var lo = Math.min.apply(null, hist);
    var hi = Math.max.apply(null, hist);
    var span = Math.max(1, hi - lo);
    var pts = hist.map(function (v, i) {
      return (2 + i * (54 / Math.max(1, hist.length - 1))).toFixed(1) + ',' + (16 - ((v - lo) / span) * 14).toFixed(1);
    }).join(' ');
    var pl = document.createElementNS(svgns, 'polyline');
    pl.setAttribute('points', pts);
    pl.setAttribute('fill', 'none');
    pl.setAttribute('stroke', '#FFD700');
    pl.setAttribute('stroke-width', '1.6');
    pl.setAttribute('stroke-linecap', 'round');
    svg.appendChild(pl);
    return svg;
  }

  function buildBoard() {
    var rk = rankMap();
    while (bodyEl.firstChild) bodyEl.removeChild(bodyEl.firstChild);
    rk.sorted.forEach(function (tm) {
      var tr = node('tr');
      var moved = prevRank[tm.id] && prevRank[tm.id] !== rk.map[tm.id];
      if (moved) tr.className = 'is-jump';
      var d = prevRank[tm.id] ? prevRank[tm.id] - rk.map[tm.id] : 0;
      var c1 = node('td', 'bd-rank', rk.map[tm.id]);
      var c2 = node('td', 'bd-team', teamName(tm.id));
      var c3 = node('td', 'bd-score', tm.pts);
      var c4 = node('td', 'bd-delta' + (d > 0 ? ' up' : d < 0 ? ' down' : ''), d > 0 ? '+' + d : d < 0 ? '−' + Math.abs(d) : '—');
      var c5 = node('td');
      c5.appendChild(spark(tm.hist));
      tr.appendChild(c1); tr.appendChild(c2); tr.appendChild(c3); tr.appendChild(c4); tr.appendChild(c5);
      bodyEl.appendChild(tr);
    });
    rk.sorted.forEach(function (tm) { prevRank[tm.id] = rk.map[tm.id]; });
  }

  function logEntry() {
    var i = Math.floor(Math.random() * live.board.length);
    var tm = live.board[i];
    var add = 6 + Math.floor(Math.random() * 19);
    var before = rankMap().map[tm.id];
    tm.pts += add;
    tm.hist.push(tm.pts);
    if (tm.hist.length > 6) tm.hist.shift();
    var after = rankMap().map[tm.id];
    persistLive();
    buildBoard();
    var move = after < before ? ' (up from #' + before + ')' : after > before ? ' (down from #' + before + ')' : '';
    resStatus.textContent = 'Judge entry logged for ' + teamName(tm.id) + ': +' + add + ' → ' + tm.pts +
      ' pts, now #' + after + move + '.';
    ping();
  }

  function bracketPairs() {
    return [
      { i: 0, slots: SEED_QF[0] }, { i: 1, slots: SEED_QF[1] }, { i: 2, slots: SEED_QF[2] }, { i: 3, slots: SEED_QF[3] },
      { i: 4, slots: [live.win[0], live.win[1]] }, { i: 5, slots: [live.win[2], live.win[3]] },
      { i: 6, slots: [live.win[4], live.win[5]] }
    ];
  }

  /* changing an earlier heat invalidates every later slot that named the
     team it just un-seated */
  function fixBracket() {
    for (var pass = 0; pass < 3; pass++) {
      var changed = false;
      bracketPairs().forEach(function (m) {
        var w = live.win[m.i];
        if (w && m.slots.indexOf(w) === -1) { live.win[m.i] = null; changed = true; }
      });
      if (!changed) break;
    }
  }

  function buildBracket() {
    while (brEl.firstChild) brEl.removeChild(brEl.firstChild);
    var rounds = [
      { h: 'Quarter-finals', ms: bracketPairs().slice(0, 4) },
      { h: 'Semi-finals', ms: bracketPairs().slice(4, 6) },
      { h: 'Final', ms: bracketPairs().slice(6) }
    ];
    rounds.forEach(function (rd) {
      var col = node('div', 'rd');
      col.appendChild(node('p', 'rd-h', rd.h));
      rd.ms.forEach(function (m) {
        var box = node('div', 'mt');
        m.slots.forEach(function (slot) {
          var b = node('button', 'mt-slot');
          b.type = 'button';
          if (!slot) {
            b.disabled = true;
            b.textContent = 'Awaiting a heat';
          } else {
            b.textContent = teamName(slot);
            if (live.win[m.i] === slot) b.className += ' is-win';
            b.setAttribute('aria-label', 'Mark ' + teamName(slot) + ' as the winner');
            b.addEventListener('click', function () {
              live.win[m.i] = slot;
              fixBracket();
              persistLive();
              buildBracket();
            });
          }
          box.appendChild(b);
        });
        col.appendChild(box);
      });
      brEl.appendChild(col);
    });
    var called = live.win.filter(Boolean).length;
    if (live.win[6]) {
      brStatus.textContent = 'Sample champion: ' + teamName(live.win[6]) +
        '. These heats were called by you, not by an arena.';
    } else if (live.win[4] && live.win[5]) {
      brStatus.textContent = 'Both semi-finals called — the final is set, tap the machine that wins it.';
    } else if (called === 4) {
      brStatus.textContent = 'All four quarters called — the two semi-finals are set.';
    } else {
      brStatus.textContent = called + ' of 7 heats called.';
    }
  }

  window.setInterval(function () {
    if (!live.running || document.hidden || !panelLive.classList.contains('is-on')) return;
    if (dayDone()) { live.running = false; draw(); return; }
    t = Math.min(DAY_HALT, t + speedV() * 0.25);
    draw();
  }, 250);

  /* ---------- boot ---------- */
  buildControls();
  buildFilters();
  hydrateForm(state.me);
  renderPool();
  renderChannels();
  renderLog();

  buildSpeed();
  buildSched();
  buildMap();
  draw();
  drawMap();
  buildBoard();
  buildBracket();

  qEl.addEventListener('input', function () {
    mapQuery = qEl.value.trim().toLowerCase();
    drawMap();
  });
  document.querySelector('[data-res-push]').addEventListener('click', logEntry);
  document.querySelector('[data-res-reset]').addEventListener('click', function () {
    live.board = BASE_TEAMS.map(function (bt) { return { id: bt.id, pts: bt.pts, hist: bt.hist.slice() }; });
    prevRank = {};
    persistLive();
    buildBoard();
    resStatus.textContent = 'Standings back to the seeded sheet.';
  });
  document.querySelector('[data-br-reset]').addEventListener('click', function () {
    live.win = [null, null, null, null, null, null, null];
    persistLive();
    buildBracket();
  });
})();
