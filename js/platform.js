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

  /* ============================================================
     judging — a weighted rubric sheet and a sandboxed code runner
     ============================================================ */
  var JD_KEY = 'tf-judge';

  var CRITERIA = [
    { k: 'innovation', name: 'Innovation', w: 30 },
    { k: 'execution', name: 'Execution', w: 30 },
    { k: 'docs', name: 'Documentation', w: 20 },
    { k: 'pitch', name: 'Presentation', w: 20 }
  ];

  /* the same four machines the live boards already rank */
  var ENTRIES = [
    { id: 'e1', team: 'Torque & Co', event: 'The Wrecking Ball Challenge',
      brief: 'Hydraulic arm, four runs, no penalty hits.' },
    { id: 'e2', team: 'Null Pointer', event: 'Code Auditor',
      brief: 'Found the injection in the sample service and wrote the patch.' },
    { id: 'e3', team: 'Ferrous Foxes', event: 'National Probability Challenge',
      brief: 'Live derivation round against the clock.' },
    { id: 'e4', team: 'Kitbash', event: 'RoboReach',
      brief: 'Cable-driven picker, printed parts only.' }
  ];

  function blankRow() {
    var marks = {}, weights = {};
    CRITERIA.forEach(function (c) { marks[c.k] = 6; weights[c.k] = c.w; });
    return { marks: marks, weights: weights, note: '', flag: false, locked: false, score: null };
  }

  var judge = { sel: 'e1', rows: {} };
  ENTRIES.forEach(function (en) { judge.rows[en.id] = blankRow(); });
  try {
    var jraw = JSON.parse(localStorage.getItem(JD_KEY));
    if (jraw && typeof jraw === 'object' && jraw.rows) {
      if (typeof jraw.sel === 'string') judge.sel = jraw.sel;
      ENTRIES.forEach(function (en) {
        var r = jraw.rows[en.id];
        /* every field is re-checked against the shape: a hand-edited store must
           not put a non-number into the score maths */
        if (!r || typeof r !== 'object') return;
        var row = blankRow();
        CRITERIA.forEach(function (c) {
          /* typeof first: isFinite(null) and isFinite('') are both true, and a
             coerced 0 would quietly re-score a sheet that was never filled */
          var m = typeof r.marks === 'object' && r.marks ? r.marks[c.k] : null;
          if (typeof m === 'number' && isFinite(m)) row.marks[c.k] = Math.min(10, Math.max(0, Math.round(m)));
          var w = typeof r.weights === 'object' && r.weights ? r.weights[c.k] : null;
          if (typeof w === 'number' && isFinite(w)) row.weights[c.k] = Math.min(100, Math.max(0, Math.round(w)));
        });
        row.note = typeof r.note === 'string' ? r.note.slice(0, 300) : '';
        row.flag = !!r.flag;
        row.locked = !!r.locked;
        row.score = typeof r.score === 'number' && isFinite(r.score) ? r.score : null;
        judge.rows[en.id] = row;
      });
    }
  } catch (e) {}
  if (!judge.rows[judge.sel]) judge.sel = 'e1';

  function persistJudge() {
    try { localStorage.setItem(JD_KEY, JSON.stringify(judge)); } catch (e) {}
  }

  function entryName(id) {
    for (var i = 0; i < ENTRIES.length; i++) if (ENTRIES[i].id === id) return ENTRIES[i].team;
    return id;
  }

  /* the weights are editable, so the denominator is whatever they add up to */
  function scoreOf(row) {
    var num = 0, den = 0;
    CRITERIA.forEach(function (c) {
      num += (row.marks[c.k] / 10) * row.weights[c.k];
      den += row.weights[c.k];
    });
    return den > 0 ? Math.round((num / den) * 1000) / 10 : 0;
  }
  function weightSum(row) {
    var s = 0;
    CRITERIA.forEach(function (c) { s += row.weights[c.k]; });
    return s;
  }

  var jdListEl = document.querySelector('[data-jd-list]');
  var jdSideEl = document.querySelector('[data-jd-side]');
  var jdFormEl = document.querySelector('[data-jd-form]');
  var jdEntryEl = document.querySelector('[data-jd-entry]');
  var rubricEl = document.querySelector('[data-jd-rubric]');
  var scoreEl = document.querySelector('[data-jd-score]');
  var warnEl = document.querySelector('[data-jd-warn]');
  var noteEl = document.querySelector('[data-jd-note]');
  var flagEl = document.querySelector('[data-jd-flag]');
  var jdStatus = document.querySelector('[data-jd-status]');
  var jdRows = {};

  function buildEntries() {
    ENTRIES.forEach(function (en) {
      var b = node('button', 'jq');
      b.type = 'button';
      b.dataset.entry = en.id;
      b.appendChild(node('b', null, en.team));
      b.appendChild(node('small', null, en.event));
      b.appendChild(node('span', 'jq-state', ''));
      jdListEl.appendChild(b);
      b.addEventListener('click', function () { selectEntry(en.id); });
    });
  }

  function markList() {
    ENTRIES.forEach(function (en) {
      var row = judge.rows[en.id];
      var btn = jdListEl.querySelector('[data-entry="' + en.id + '"]');
      if (!btn) return;
      var chip = btn.querySelector('.jq-state');
      var label = row.locked ? 'Locked' : (row.score !== null ? 'Draft saved' : 'Not scored');
      chip.className = 'jq-state' + (row.locked ? ' locked' : (row.score !== null ? ' draft' : ''));
      chip.textContent = row.locked ? 'Locked' : (row.score !== null ? 'Draft' : 'Not scored');
      /* the three runs of text inside the button would otherwise read as one
         mashed sentence, so the name is set deliberately */
      btn.setAttribute('aria-label', en.team + ', ' + en.event + ' — ' + label);
      btn.setAttribute('aria-pressed', String(judge.sel === en.id));
    });
    var saved = 0, locked = 0;
    ENTRIES.forEach(function (en) {
      if (judge.rows[en.id].score !== null) saved++;
      if (judge.rows[en.id].locked) locked++;
    });
    jdSideEl.textContent = saved + ' of ' + ENTRIES.length + ' sheets written up, ' + locked + ' locked.';
  }

  function selectEntry(id) {
    judge.sel = id;
    persistJudge();
    fillForm();
    markList();
  }

  function buildRubric() {
    CRITERIA.forEach(function (c) {
      var row = node('div', 'ru');
      var name = node('span', 'ru-name', c.name);
      name.id = 'ru-n-' + c.k;
      var range = node('input');
      range.type = 'range';
      range.min = '0'; range.max = '10'; range.step = '1';
      range.value = String(judge.rows[judge.sel].marks[c.k]);
      range.dataset.k = c.k;
      range.setAttribute('aria-labelledby', name.id);
      var mark = node('span', 'ru-mark');
      mark.dataset.mark = c.k;
      var ten = node('i', null, '/10');
      mark.appendChild(document.createTextNode(range.value));
      mark.appendChild(ten);
      var cell = node('span', 'ru-wcell');
      var wIn = node('input', 'ru-w');
      wIn.type = 'number';
      wIn.min = '0'; wIn.max = '100'; wIn.step = '5';
      wIn.value = String(judge.rows[judge.sel].weights[c.k]);
      wIn.dataset.k = c.k;
      wIn.setAttribute('aria-label', c.name + ' weight, percent of the sheet');
      cell.appendChild(wIn);
      cell.appendChild(node('i', null, '%'));
      var pts = node('b', 'ru-p', '');
      pts.dataset.pts = c.k;
      row.appendChild(name); row.appendChild(range); row.appendChild(mark);
      row.appendChild(cell); row.appendChild(pts);
      rubricEl.appendChild(row);
      range.addEventListener('input', function () { editMark(c.k, range.value, mark); liveScore(); });
      wIn.addEventListener('input', function () { liveScore(); });
    });
  }

  function editMark(k, value, mark) {
    while (mark.firstChild) mark.removeChild(mark.firstChild);
    mark.appendChild(document.createTextNode(value));
    mark.appendChild(node('i', null, '/10'));
  }

  /* the form is rebuilt from the store whenever the entry changes */
  function fillForm() {
    var en = null;
    for (var i = 0; i < ENTRIES.length; i++) if (ENTRIES[i].id === judge.sel) en = ENTRIES[i];
    var row = judge.rows[judge.sel];
    while (jdEntryEl.firstChild) jdEntryEl.removeChild(jdEntryEl.firstChild);
    jdEntryEl.appendChild(node('b', null, en.team));
    jdEntryEl.appendChild(document.createTextNode(' — ' + en.event + ' · ' + en.brief));
    CRITERIA.forEach(function (c) {
      var range = rubricEl.querySelector('[data-k="' + c.k + '"][type=range]');
      var wIn = rubricEl.querySelector('input.ru-w[data-k="' + c.k + '"]');
      range.value = String(row.marks[c.k]);
      editMark(c.k, String(row.marks[c.k]), rubricEl.querySelector('[data-mark="' + c.k + '"]'));
      wIn.value = String(row.weights[c.k]);
    });
    noteEl.value = row.note;
    flagEl.checked = row.flag;
    jdFormEl.classList.toggle('is-locked', row.locked);
    setControls(!row.locked);
    lockBtn.textContent = row.locked ? 'Unlock to edit' : 'Lock verdict';
    liveScore();
  }

  function setControls(on) {
    rubricEl.querySelectorAll('input').forEach(function (el) { el.disabled = !on; });
    noteEl.disabled = !on;
    flagEl.disabled = !on;
  }

  function readForm() {
    var row = judge.rows[judge.sel];
    CRITERIA.forEach(function (c) {
      var range = rubricEl.querySelector('[data-k="' + c.k + '"][type=range]');
      var wIn = rubricEl.querySelector('input.ru-w[data-k="' + c.k + '"]');
      var m = Number(range.value);
      row.marks[c.k] = isFinite(m) ? Math.min(10, Math.max(0, m)) : 0;
      var w = Number(wIn.value);
      row.weights[c.k] = isFinite(w) ? Math.min(100, Math.max(0, w)) : 0;
    });
    row.note = noteEl.value.slice(0, 300);
    row.flag = flagEl.checked;
    return row;
  }

  function liveScore() {
    var row = readForm();
    var s = scoreOf(row);
    scoreEl.textContent = s.toFixed(1);
    var sum = weightSum(row);
    if (sum !== 100) {
      warnEl.hidden = false;
      warnEl.textContent = 'Weights add to ' + sum + '% — the score is normalised across them.';
    } else {
      warnEl.hidden = true;
    }
    CRITERIA.forEach(function (c) {
      var pts = rubricEl.querySelector('[data-pts="' + c.k + '"]');
      pts.textContent = ((row.marks[c.k] / 10) * row.weights[c.k]).toFixed(1);
    });
  }

  var saveBtn = document.querySelector('[data-jd-save]');
  var lockBtn = document.querySelector('[data-jd-lock]');
  var csvBtn = document.querySelector('[data-jd-csv]');

  saveBtn.addEventListener('click', function () {
    var row = readForm();
    row.score = scoreOf(row);
    persistJudge();
    markList();
    jdStatus.textContent = 'Draft saved for ' + entryName(judge.sel) + ': ' + row.score.toFixed(1) +
      ' / 100' + (row.flag ? ', flagged for appeal review.' : '.');
  });

  lockBtn.addEventListener('click', function () {
    var row = readForm();
    row.score = scoreOf(row);
    row.locked = !row.locked;
    persistJudge();
    fillForm();
    markList();
    jdStatus.textContent = row.locked
      ? 'Verdict locked for ' + entryName(judge.sel) + ' at ' + row.score.toFixed(1) +
        ' / 100. A live portal would refuse any further edit; this one lets you back out.'
      : 'Re-opened ' + entryName(judge.sel) + ' for editing. Nothing is filed until you lock it again.';
  });

  function cell(v) {
    var s = String(v === null || v === undefined ? '' : v);
    return '"' + s.replace(/"/g, '""') + '"';
  }

  csvBtn.addEventListener('click', function () {
    var lines = [];
    var head = ['Team', 'Event', 'Status'];
    CRITERIA.forEach(function (c) { head.push(c.name + ' mark', c.name + ' weight %'); });
    head.push('Weighted score', 'Flagged for appeal', 'Judge note');
    lines.push(head.map(cell).join(','));
    var n = 0;
    ENTRIES.forEach(function (en) {
      var row = judge.rows[en.id];
      if (row.score === null) return;
      var out = [en.team, en.event, row.locked ? 'Locked' : 'Draft'];
      CRITERIA.forEach(function (c) { out.push(row.marks[c.k], row.weights[c.k]); });
      out.push(row.score.toFixed(1), row.flag ? 'yes' : 'no', row.note);
      lines.push(out.map(cell).join(','));
      n++;
    });
    if (!n) {
      jdStatus.textContent = 'Nothing to export yet — save or lock a sheet first.';
      return;
    }
    var url = '';
    try {
      var a = node('a');
      url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/csv' }));
      a.href = url;
      a.download = 'techfest-judging-sample.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      jdStatus.textContent = 'Wrote ' + n + ' verdict' + (n === 1 ? '' : 's') +
        ' to techfest-judging-sample.csv — sample columns only, no judge identity is recorded.';
    } catch (e) {
      jdStatus.textContent = 'This browser blocked the download, so the CSV could not be written.';
    }
    setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) {} }, 500);
  });

  /* ============================================================
     automated code evaluation
     ============================================================ */
  var CASES = [
    { in: [[1, 2, 3, 4]], want: 6, why: 'two even, two odd' },
    { in: [[2, 4, 6]], want: 12, why: 'every number is even' },
    { in: [[1, 3]], want: 0, why: 'no even numbers at all' },
    { in: [[]], want: 0, why: 'the empty array' },
    { in: [[-2, 4, 7]], want: 2, why: 'a negative even number' },
    { in: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]], want: 30, why: 'one through ten' }
  ];

  var SAMPLES = [
    { label: 'Loop that adds evens', code: 'function sumEven(nums) {\n  var total = 0;\n  for (var i = 0; i < nums.length; i++) {\n    if (nums[i] % 2 === 0) total += nums[i];\n  }\n  return total;\n}' },
    { label: 'Guard against negatives', code: 'function sumEven(nums) {\n  var total = 0;\n  for (var i = 0; i < nums.length; i++) {\n    if (nums[i] > 0 && nums[i] % 2 === 0) total += nums[i];\n  }\n  return total;\n}' },
    { label: 'Never returns', code: 'function sumEven(nums) {\n  var i = 0;\n  while (i < 1e18) { i = i + nums.length; }\n  return i;\n}' },
    { label: 'Does not compile', code: 'function sumEven(nums {  return nums.filter(function (n) { return n % 2 === 0; });\n}' }
  ];

  /* the worker holds nothing but the submitted function: no DOM, no cookies,
     no storage. It is a watchdog, not a jail, and the note under the module
     says so. */
  var WORKER_SRC = [
    'var fn = null;',
    'self.onmessage = function (e) {',
    '  var msg = e.data;',
    '  if (msg.step === "compile") {',
    '    try {',
    '      var made = (new Function("return (" + msg.code + ");"))();',
    '      if (typeof made !== "function") {',
    '        fn = null;',
    '        self.postMessage({ step: "compile", ok: false, error: "the box does not hold a function" });',
    '        return;',
    '      }',
    '      fn = made;',
    '      self.postMessage({ step: "compile", ok: true });',
    '    } catch (err) {',
    '      fn = null;',
    '      self.postMessage({ step: "compile", ok: false, error: String(err && err.message ? err.message : err) });',
    '    }',
    '    return;',
    '  }',
    '  if (typeof fn !== "function") { self.postMessage({ step: "case", id: msg.id, error: "no function to call" }); return; }',
    '  try {',
    '    var out = fn.apply(null, msg.args);',
    '    self.postMessage({ step: "case", id: msg.id, out: out });',
    '  } catch (err2) {',
    '    self.postMessage({ step: "case", id: msg.id, error: String(err2 && err2.message ? err2.message : err2) });',
    '  }',
    '};'
  ].join('\n');

  var CASE_MS = 1500;

  var codeEl = document.querySelector('[data-ce-code]');
  var loadEl = document.querySelector('[data-ce-load]');
  var runBtn = document.querySelector('[data-ce-run]');
  var stopBtn = document.querySelector('[data-ce-stop]');
  var sumEl = document.querySelector('[data-ce-sum]');
  var testsEl = document.querySelector('[data-ce-tests]');
  var ceStatus = document.querySelector('[data-ce-status]');

  var worker = null, workerUrl = '', watchdog = null, ceRunning = false, cePass = 0, ceRowEls = [];

  function argText(c) {
    return 'sumEven([' + c.in[0].join(', ') + '])';
  }
  function show(v) {
    if (v === undefined) return 'undefined';
    if (v === null) return 'null';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'boolean' || typeof v === 'string') return JSON.stringify(v);
    return 'an object (' + Object.prototype.toString.call(v) + ')';
  }

  function buildTests() {
    CASES.forEach(function (c) {
      var li = node('li', 'tu is-wait');
      var name = node('p', 'tu-name', c.why);
      var io = node('p', 'tu-io');
      io.dataset.io = String(testsEl.childElementCount);
      io.appendChild(document.createTextNode(argText(c) + ' '));
      io.appendChild(node('b', null, 'expected ' + show(c.want)));
      var chip = node('span', 'tu-chip', 'queued');
      li.appendChild(name); li.appendChild(io); li.appendChild(chip);
      testsEl.appendChild(li);
    });
    ceRowEls = testsEl.querySelectorAll('.tu');
  }

  function setRow(i, state, detail) {
    var li = ceRowEls[i];
    if (!li) return;
    li.className = 'tu';
    var chip = li.querySelector('.tu-chip');
    var io = li.querySelector('.tu-io');
    var c = CASES[i];
    io.textContent = argText(c) + ' ';
    io.appendChild(node('b', null, 'expected ' + show(c.want)));
    if (detail) {
      io.appendChild(document.createTextNode(' · '));
      io.appendChild(node('b', null, detail));
    }
    if (state === 'pass') { chip.className = 'tu-chip pass'; chip.textContent = '✓ Pass'; }
    else if (state === 'fail') { chip.className = 'tu-chip fail'; chip.textContent = '✕ Fail'; }
    else if (state === 'time') { chip.className = 'tu-chip time'; chip.textContent = '⏱ Over 1.5 s'; }
    else if (state === 'wait') { li.className = 'tu is-wait'; chip.className = 'tu-chip'; chip.textContent = 'queued'; }
    else { chip.className = 'tu-chip'; chip.textContent = 'not run'; }
  }

  function stopWorker() {
    if (watchdog) { clearTimeout(watchdog); watchdog = null; }
    if (worker) { try { worker.terminate(); } catch (e) {} worker = null; }
    if (workerUrl) { try { URL.revokeObjectURL(workerUrl); } catch (e) {} workerUrl = ''; }
  }

  function setRunning(on) {
    ceRunning = on;
    runBtn.hidden = on;
    stopBtn.hidden = !on;
    codeEl.disabled = on;
    loadEl.querySelectorAll('button').forEach(function (b) { b.disabled = on; });
  }

  function finishRun(msg) {
    stopWorker();
    setRunning(false);
    if (msg) sumEl.textContent = msg;
  }

  function runCase(i) {
    if (!worker) return;
    var c = CASES[i];
    setRow(i, 'wait', null);
    watchdog = setTimeout(function () {
      watchdog = null;
      setRow(i, 'time', null);
      for (var k = i + 1; k < CASES.length; k++) setRow(k, null, 'worker stopped');
      finishRun('Cut off after 1.5 s on ' + argText(c) + ' — the worker was terminated' +
        (cePass ? ', with ' + cePass + ' of the earlier cases green.' : ' before any case came back.'));
      ceStatus.textContent = 'The submission never returned, so the worker was terminated and the rest of the sheet was marked as not run.';
    }, CASE_MS);
    try {
      worker.postMessage({ step: 'case', id: i, args: [c.in[0].slice()] });
    } catch (e) {
      if (watchdog) { clearTimeout(watchdog); watchdog = null; }
      setRow(i, 'fail', 'could not send the case');
      finishRun('The runner could not be reached on this device.');
    }
  }

  function nextCase(i) {
    if (i + 1 < CASES.length) runCase(i + 1);
    else {
      var line = cePass + ' of ' + CASES.length + ' cases passed.';
      finishRun(line);
      ceStatus.textContent = cePass === CASES.length
        ? 'All six green. A live evaluator would still cap memory, time and output before it filed a score.'
        : (CASES.length - cePass) + ' case' + (CASES.length - cePass === 1 ? '' : 's') + ' did not agree with the expected value.';
    }
  }

  function startRun() {
    var code = codeEl.value;
    if (!/\S/.test(code)) { ceStatus.textContent = 'The answer box is empty — load a sample or write a function.'; return; }
    if (typeof Worker !== 'function' || typeof Blob !== 'function' || !URL || !URL.createObjectURL) {
      ceStatus.textContent = 'The sandboxed runner is not available in this browsing context, so nothing was executed.';
      return;
    }
    stopWorker();
    cePass = 0;
    for (var i = 0; i < CASES.length; i++) setRow(i, 'wait', null);
    setRunning(true);
    sumEl.textContent = 'Running in a worker on this device…';
    ceStatus.textContent = '';
    try {
      workerUrl = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
      worker = new Worker(workerUrl);
    } catch (e) {
      stopWorker();
      setRunning(false);
      sumEl.textContent = 'Nothing has run yet.';
      ceStatus.textContent = 'The browser refused to start a worker here, so the code was not executed.';
      return;
    }
    worker.onmessage = function (e) {
      var msg = e.data;
      if (!msg) return;
      if (msg.step === 'compile') {
        if (watchdog) { clearTimeout(watchdog); watchdog = null; }
        if (!msg.ok) {
          for (var k = 0; k < CASES.length; k++) setRow(k, 'fail', msg.error || 'did not compile');
          finishRun('Rejected before the first case: ' + (msg.error || 'unknown syntax error'));
          ceStatus.textContent = 'A real checker files this as a compile error and scores nothing.';
          return;
        }
        runCase(0);
        return;
      }
      if (msg.step !== 'case' || !watchdog) return;
      clearTimeout(watchdog); watchdog = null;
      var c = CASES[msg.id];
      if (msg.error) setRow(msg.id, 'fail', 'threw ' + msg.error);
      else {
        var ok = typeof msg.out === 'number' ? msg.out === c.want : show(msg.out) === show(c.want);
        if (ok) { cePass++; setRow(msg.id, 'pass', 'got ' + show(msg.out)); }
        else setRow(msg.id, 'fail', 'got ' + show(msg.out));
      }
      sumEl.textContent = cePass + ' of ' + CASES.length + ' passed so far.';
      nextCase(msg.id);
    };
    worker.onerror = function () {
      finishRun('The runner stopped unexpectedly.');
      ceStatus.textContent = 'The worker raised an error the prototype could not read — that is exactly why a live evaluator needs its own logs.';
    };
    watchdog = setTimeout(function () {
      watchdog = null;
      finishRun('The submission did not compile within 1.5 s, so it was dropped.');
    }, CASE_MS);
    try {
      worker.postMessage({ step: 'compile', code: code });
    } catch (e) {
      finishRun('The runner could not be reached on this device.');
    }
  }

  function buildSamples() {
    SAMPLES.forEach(function (s) {
      var b = node('button', 'filt');
      b.type = 'button';
      b.textContent = s.label;
      loadEl.appendChild(b);
      b.addEventListener('click', function () {
        codeEl.value = s.code;
        for (var i = 0; i < CASES.length; i++) setRow(i, 'wait', null);
        sumEl.textContent = 'Loaded "' + s.label + '". Run the 6 cases.';
        ceStatus.textContent = '';
      });
    });
  }

  runBtn.addEventListener('click', startRun);
  stopBtn.addEventListener('click', function () {
    var done = cePass;
    for (var i = 0; i < ceRowEls.length; i++) {
      if (/queued|wait/.test(ceRowEls[i].querySelector('.tu-chip').textContent)) setRow(i, null, 'stopped by you');
    }
    finishRun('Stopped by you after ' + done + ' pass' + (done === 1 ? '' : 'es') + '.');
    ceStatus.textContent = 'The worker was terminated, so nothing left the page. Earlier results are still on the sheet.';
  });

  /* ============================================================
     engage — campus treasure hunt
     ============================================================ */
  var HUNT_KEY = 'tf-hunt';

  /* the same six zones the venue map draws, so the two modules share a campus */
  var STOPS = [
    { id: 'gate', n: '01', place: 'Main gate', x: 40, y: 370, code: 'AETH',
      riddle: 'Start where the queue forms before the doors open. The placard hangs on the pillar you walk under.',
      print: 'The placard on the gate pillar reads' },
    { id: 'arena', n: '02', place: 'Arena floor', x: 156, y: 114, code: 'TORQ',
      riddle: 'Follow the smell of burnt flux to where the machines are weighed. Count the pits from the crowd side.',
      print: 'Third pit, chalked on the kerb:' },
    { id: 'convocation', n: '03', place: 'Convocation Hall', x: 350, y: 76, code: 'VERB',
      riddle: 'A room of chairs facing a lectern nobody uses today. The clue is on the aisle you are not allowed to sit in.',
      print: 'Taped under the centre seat:' },
    { id: 'expo', n: '04', place: 'TechExpo floor', x: 505, y: 130, code: 'FLUX',
      riddle: 'Where the colleges hang their banners. Find the one with no banner yet.',
      print: 'On the empty booth number plate:' },
    { id: 'labs', n: '05', place: 'Workshop Labs', x: 255, y: 286, code: 'KILN',
      riddle: 'Ear protection, a soldering row, and a machine that never switched off overnight.',
      print: 'Printed on the 3D printer queue:' },
    { id: 'stage', n: '06', place: 'Main Stage', x: 540, y: 300, code: 'NOVA',
      riddle: 'The last stop. Somewhere the lights are aimed at a crowd of chairs, and the set list is still on a clipboard.',
      print: 'On the clipboard at stage left:' }
  ];

  var hunt = { solved: {}, start: null };
  try {
    var hraw = JSON.parse(localStorage.getItem(HUNT_KEY));
    if (hraw && typeof hraw === 'object') {
      if (hraw.solved && typeof hraw.solved === 'object') hunt.solved = hraw.solved;
      if (typeof hraw.start === 'number') hunt.start = hraw.start;
    }
  } catch (e) {}
  /* a hand-edited store must not unlock a stop that is not in the sheet */
  Object.keys(hunt.solved).forEach(function (id) {
    if (typeof hunt.solved[id] !== 'number') delete hunt.solved[id];
  });

  function persistHunt() {
    try { localStorage.setItem(HUNT_KEY, JSON.stringify(hunt)); } catch (e) {}
  }
  function solvedCount() {
    var n = 0;
    STOPS.forEach(function (s) { if (typeof hunt.solved[s.id] === 'number') n++; });
    return n;
  }
  function nextStop() {
    for (var i = 0; i < STOPS.length; i++) if (typeof hunt.solved[STOPS[i].id] !== 'number') return STOPS[i];
    return null;
  }
  function stopById(id) {
    for (var i = 0; i < STOPS.length; i++) if (STOPS[i].id === id) return STOPS[i];
    return null;
  }
  function dur(ms) {
    var s = Math.max(0, Math.round(ms / 1000));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m ? m + ' min ' + (r < 10 ? '0' : '') + r + ' s' : r + ' s';
  }

  var huntEl = document.querySelector('[data-hunt-stops]');
  var huntPinsEl = document.querySelector('[data-hunt-pins]');
  var huntRouteEl = document.querySelector('[data-hunt-route]');
  var huntInfoEl = document.querySelector('[data-hunt-info]');
  var huntCountEl = document.querySelector('[data-hunt-count]');
  var huntFillEl = document.querySelector('[data-hunt-fill]');
  var huntTimeEl = document.querySelector('[data-hunt-time]');
  var huntSel = null;
  var huntNote = '';

  function buildHunt() {
    STOPS.forEach(function (s) {
      var li = node('li', 'clue');
      li.dataset.stop = s.id;
      var top = node('p', 'clue-top');
      top.appendChild(node('b', null, s.place));
      top.appendChild(node('span', 'clue-num', 'Stop ' + s.n));
      var riddle = node('p', 'clue-riddle', s.riddle);
      var print = node('p', 'clue-print');
      print.appendChild(document.createTextNode(s.print + ' '));
      print.appendChild(node('code', null, s.code));
      var form = node('div', 'clue-form');
      var lab = node('label', 'fld clue-in');
      lab.appendChild(document.createTextNode('Placard code'));
      var input = node('input');
      input.type = 'text';
      input.maxLength = 4;
      input.autocomplete = 'off';
      input.placeholder = '4 letters';
      input.setAttribute('aria-label', 'Placard code for stop ' + s.n + ' at ' + s.place);
      lab.appendChild(input);
      var btn = node('button', 'btn btn-gold btn-sm');
      btn.type = 'button';
      btn.textContent = 'Check in';
      form.appendChild(lab); form.appendChild(btn);
      var out = node('p', 'clue-out');
      out.setAttribute('aria-live', 'polite');
      li.appendChild(top); li.appendChild(riddle); li.appendChild(print);
      li.appendChild(form); li.appendChild(out);
      huntEl.appendChild(li);
      btn.addEventListener('click', function () { checkIn(s, input, out); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); checkIn(s, input, out); }
      });
    });
    STOPS.forEach(function (s) {
      var pin = node('button', 'pin');
      pin.type = 'button';
      pin.style.left = (s.x / 640 * 100) + '%';
      pin.style.top = (s.y / 400 * 100) + '%';
      if (s.x < 100) pin.classList.add('l-l');
      if (s.x > 500) pin.classList.add('l-r');
      pin.appendChild(node('span', 'pin-dot'));
      pin.appendChild(node('span', 'pin-lbl', 'Stop ' + s.n + ' · ' + s.place));
      huntPinsEl.appendChild(pin);
      pin.dataset.stop = s.id;
      pin.addEventListener('click', function () { focusStop(s.id); });
    });
  }

  function checkIn(s, input, out) {
    var given = (input.value || '').trim().toUpperCase();
    if (!given) { out.textContent = 'Type what the placard says.'; return; }
    if (given !== s.code) {
      out.textContent = 'That is not it — the placard here is four letters.';
      input.select();
      return;
    }
    if (typeof hunt.solved[s.id] === 'number') {
      out.textContent = 'Already cleared at ' + clock(hunt.solved[s.id]) + '.';
      return;
    }
    if (!hunt.start) hunt.start = Date.now();
    hunt.solved[s.id] = Date.now();
    persistHunt();
    var nx = nextStop();
    if (!nx) huntSel = null;
    drawHunt();
    if (nx) {
      var card = huntEl.querySelector('[data-stop="' + nx.id + '"]');
      if (card) card.querySelector('input').focus();
      huntInfoEl.textContent = (huntNote ? huntNote + ' ' : '') + 'Stop ' + nx.n + ' at ' + nx.place + ' is open.';
    } else {
      huntInfoEl.textContent = huntNote + ' All six cleared.';
    }
  }

  function focusStop(id) {
    huntSel = id;
    drawHuntPins();
    var card = huntEl.querySelector('[data-stop="' + id + '"]');
    if (card) {
      card.scrollIntoView({ block: 'nearest' });
      var s = stopById(id);
      huntInfoEl.textContent = (huntNote ? huntNote + ' ' : '') + 'Stop ' + s.n + ' · ' + s.place +
        (typeof hunt.solved[id] === 'number' ? ' — cleared at ' + clock(hunt.solved[id]) + '.'
          : nextStopId() === id ? ' — open now.' : ' — not open yet.');
    }
  }
  function nextStopId() { var n = nextStop(); return n ? n.id : null; }

  function drawHuntPins() {
    huntPinsEl.querySelectorAll('.pin').forEach(function (pin) {
      var id = pin.dataset.stop;
      var done = typeof hunt.solved[id] === 'number';
      pin.className = 'pin' + (id === huntSel ? ' is-sel' : '') + (done ? ' is-done' : '');
      pin.setAttribute('aria-pressed', String(id === huntSel));
    });
    /* the walk follows the same single corridor as the venue map */
    var order = STOPS.filter(function (s) { return typeof hunt.solved[s.id] === 'number'; });
    var pts = [];
    order.forEach(function (s, i) {
      if (i > 0) pts.push([order[i - 1].x, STREET], [s.x, STREET]);
      pts.push([s.x, s.y]);
    });
    huntRouteEl.setAttribute('points', pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' '));
    var len = 0;
    for (var k = 1; k < pts.length; k++) {
      len += Math.abs(pts[k][0] - pts[k - 1][0]) + Math.abs(pts[k][1] - pts[k - 1][1]);
    }
    var m = Math.round(len * UNIT_M);
    huntNote = order.length > 1
      ? 'Route so far ≈ ' + m + ' m · ' + Math.ceil(m / 1.25 / 60) + ' min on foot, through ' + order.length + ' cleared stops.'
      : '';
    if (order.length < 2) huntInfoEl.textContent = 'Tap a stop on the plan to read its clue.';
  }

  function drawHunt() {
    var n = solvedCount();
    var nx = nextStop();
    huntCountEl.textContent = n + ' of ' + STOPS.length + ' stops checked in';
    huntFillEl.style.width = (n / STOPS.length * 100) + '%';
    huntTimeEl.textContent = !hunt.start
      ? 'The clock starts at your first check-in.'
      : (nx ? dur(Date.now() - hunt.start) + ' on the board so far.'
            : 'Board closed in ' + dur((hunt.solved[STOPS[STOPS.length - 1].id] || Date.now()) - hunt.start) + '.');
    STOPS.forEach(function (s) {
      var card = huntEl.querySelector('[data-stop="' + s.id + '"]');
      if (!card) return;
      var done = typeof hunt.solved[s.id] === 'number';
      var open = !done && nx && nx.id === s.id;
      card.className = 'clue' + (done ? ' is-done' : (open ? ' is-next' : ' is-shut'));
      card.querySelectorAll('input,button').forEach(function (el) { el.disabled = !open; });
      card.querySelector('.clue-riddle').textContent = done || open ? s.riddle
        : 'Locked until stop ' + (openForIndex(s) ) + ' is cleared.';
      card.querySelector('.clue-print').hidden = !(done || open);
      if (done) card.querySelector('.clue-out').textContent = 'Cleared at ' + clock(hunt.solved[s.id]) +
        (hunt.start ? ' · ' + dur(hunt.solved[s.id] - hunt.start) + ' into the board.' : '.');
    });
    drawHuntPins();
    if (!huntSel) {
      huntInfoEl.textContent = huntNote || 'Tap a stop on the plan to read its clue.';
    }
  }

  function openForIndex(s) {
    for (var i = 0; i < STOPS.length; i++) if (STOPS[i].id === s.id) return i > 0 ? STOPS[i - 1].n : '01';
    return '01';
  }

  document.querySelector('[data-hunt-reset]').addEventListener('click', function () {
    hunt = { solved: {}, start: null };
    huntSel = null;
    persistHunt();
    huntEl.querySelectorAll('input').forEach(function (i) { i.value = ''; });
    huntEl.querySelectorAll('.clue-out').forEach(function (o) { o.textContent = ''; });
    drawHunt();
    huntInfoEl.textContent = 'Board reset — stop 01 is open again.';
  });

  window.setInterval(function () {
    if (document.hidden || !hunt.start || !nextStop()) return;
    if (!document.getElementById('p-os-engage').classList.contains('is-on')) return;
    huntTimeEl.textContent = dur(Date.now() - hunt.start) + ' on the board so far.';
  }, 1000);

  /* ============================================================
     engage — alumni and recruiter board
     ============================================================ */
  var NET_KEY = 'tf-net';

  /* invented profiles: handles only, employers described rather than named */
  var NET = [
    { id: 'n1', kind: 'alum', handle: '@fourth_year', who: 'Alumni, 2018 · Mechanical',
      org: 'a satellite propulsion team, Bengaluru',
      ask: 'Mentors two crews a year and replies to build-log questions.',
      tags: ['Aerospace', 'Mentoring', 'Hardware'] },
    { id: 'n2', kind: 'alum', handle: '@null_terminal', who: 'Alumni, 2021 · Computer',
      org: 'a payments engineering team, Pune',
      ask: 'Runs a Saturday practice set for ContextCon entrants.',
      tags: ['Software', 'Mentoring', 'Hiring'] },
    { id: 'n3', kind: 'rec', handle: '@campus_hire_desk', who: 'Recruiter, early-career programmes',
      org: 'a semiconductor design house, Noida',
      ask: 'Wants six interns who have documented a hardware build.',
      tags: ['Hardware', 'Hiring'] },
    { id: 'n4', kind: 'alum', handle: '@solder_and_say', who: 'Alumni, 2016 · Electronics',
      org: 'an agritech robotics startup, Hyderabad',
      ask: 'Judges the RoboReach bracket and gives teardown feedback.',
      tags: ['Hardware', 'Mentoring'] },
    { id: 'n5', kind: 'rec', handle: '@people_first_ai', who: 'Recruiter, applied AI',
      org: 'a modelling services firm, remote-first',
      ask: 'Collects hackathon repos with a written rationale, not just a demo.',
      tags: ['Software', 'Hiring'] },
    { id: 'n6', kind: 'alum', handle: '@exhibit_one', who: 'Alumni, 2014 · Production',
      org: 'a museum fabrication studio, Ahmedabad',
      ask: 'Helps TechExpo booths with rigging, print and booth layout.',
      tags: ['Design', 'Mentoring'] },
    { id: 'n7', kind: 'rec', handle: '@growth_desk_ind', who: 'Recruiter, product marketing',
      org: 'a consumer app company, Mumbai',
      ask: 'Looks for delegates who ran a college event, not only internships.',
      tags: ['Business', 'Hiring'] },
    { id: 'n8', kind: 'alum', handle: '@night_shift_uav', who: 'Alumni, 2020 · Aerospace',
      org: 'a survey drone operator, Delhi NCR',
      ask: 'Answers BVLOS link-budget questions from the drone track.',
      tags: ['Aerospace', 'Hardware', 'Mentoring'] }
  ];

  var NET_FILTERS = ['All', 'Alumni', 'Recruiters', 'Mentoring', 'Hiring', 'Hardware', 'Software', 'Design', 'Aerospace', 'Business'];

  var net = { asks: [], filt: 'All', q: '' };
  try {
    var nraw = JSON.parse(localStorage.getItem(NET_KEY));
    if (nraw && Array.isArray(nraw.asks)) {
      net.asks = nraw.asks.filter(function (id) {
        for (var i = 0; i < NET.length; i++) if (NET[i].id === id) return true;
        return false;
      });
    }
  } catch (e) {}

  function persistNet() {
    try { localStorage.setItem(NET_KEY, JSON.stringify({ asks: net.asks })); } catch (e) {}
  }
  function profile(id) {
    for (var i = 0; i < NET.length; i++) if (NET[i].id === id) return NET[i];
    return null;
  }
  function asked(id) { return net.asks.indexOf(id) > -1; }

  var netListEl = document.querySelector('[data-net-list]');
  var netChipsEl = document.querySelector('[data-net-chips]');
  var netNoneEl = document.querySelector('[data-net-none]');
  var netStatus = document.querySelector('[data-net-status]');
  var netFilterEl = document.querySelector('[data-net-filters]');
  var netQEl = document.querySelector('[data-net-q]');

  function buildNetFilters() {
    NET_FILTERS.forEach(function (f) {
      var b = node('button', 'filt');
      b.type = 'button';
      b.textContent = f;
      b.dataset.filt = f;
      b.setAttribute('aria-pressed', String(f === net.filt));
      netFilterEl.appendChild(b);
      b.addEventListener('click', function () {
        net.filt = f;
        netFilterEl.querySelectorAll('.filt').forEach(function (x) {
          x.setAttribute('aria-pressed', String(x.dataset.filt === f));
        });
        renderNet();
      });
    });
  }

  function matchesNet(p) {
    if (net.filt !== 'All') {
      if (net.filt === 'Alumni' && p.kind !== 'alum') return false;
      if (net.filt === 'Recruiters' && p.kind !== 'rec') return false;
      if (net.filt !== 'Alumni' && net.filt !== 'Recruiters' && p.tags.indexOf(net.filt) < 0) return false;
    }
    if (!net.q) return true;
    var hay = (p.handle + ' ' + p.who + ' ' + p.org + ' ' + p.ask + ' ' + p.tags.join(' ')).toLowerCase();
    return hay.indexOf(net.q) > -1;
  }

  function renderNet() {
    var shown = 0;
    netListEl.textContent = '';
    NET.forEach(function (p) {
      if (!matchesNet(p)) return;
      shown++;
      var li = node('li', 'np');
      var top = node('p', 'np-top');
      top.appendChild(node('b', null, p.handle));
      top.appendChild(node('span', 'np-kind' + (p.kind === 'rec' ? ' rec' : ''), p.kind === 'rec' ? 'Recruiter' : 'Alumni'));
      li.appendChild(top);
      li.appendChild(node('p', 'np-who', p.who));
      li.appendChild(node('p', 'np-org', p.org));
      li.appendChild(node('p', 'np-ask', p.ask));
      var tags = node('div', 'np-tags');
      p.tags.forEach(function (t) { tags.appendChild(node('i', null, t)); });
      li.appendChild(tags);
      var act = node('div', 'np-act');
      var btn = node('button', 'btn btn-ghost btn-sm');
      btn.type = 'button';
      btn.textContent = asked(p.id) ? 'Intro requested' : 'Ask for an intro';
      btn.setAttribute('aria-pressed', String(asked(p.id)));
      btn.addEventListener('click', function () { toggleAsk(p.id); });
      act.appendChild(btn);
      li.appendChild(act);
      netListEl.appendChild(li);
    });
    if (!shown) {
      var empty = node('li', 'net-empty', 'No profile on the board matches that screen. Try All, or clear the search.');
      netListEl.appendChild(empty);
    }
    renderNetSaved();
  }

  function renderNetSaved() {
    netChipsEl.textContent = '';
    net.asks.forEach(function (id) {
      var p = profile(id);
      if (!p) return;
      var chip = node('li', 'net-chip');
      chip.appendChild(document.createTextNode(p.handle + ' · ' + (p.kind === 'rec' ? 'recruiter' : 'alumni')));
      var x = node('button');
      x.type = 'button';
      x.textContent = '\u00d7';
      x.setAttribute('aria-label', 'Withdraw the intro request for ' + p.handle);
      x.addEventListener('click', function () { toggleAsk(id); });
      chip.appendChild(x);
      netChipsEl.appendChild(chip);
    });
    netNoneEl.hidden = !!net.asks.length;
  }

  function toggleAsk(id) {
    var p = profile(id);
    var i = net.asks.indexOf(id);
    if (i > -1) {
      net.asks.splice(i, 1);
      netStatus.textContent = 'Withdrew the request for ' + p.handle + '. Nothing was sent anywhere.';
    } else {
      net.asks.push(id);
      netStatus.textContent = 'Saved ' + p.handle + ' as a request. A real intro needs both sides to opt in, and a verified account to read this row.';
    }
    persistNet();
    renderNet();
  }

  netQEl.addEventListener('input', function () {
    net.q = netQEl.value.trim().toLowerCase();
    renderNet();
  });
  document.querySelector('[data-net-clear]').addEventListener('click', function () {
    net.asks = [];
    persistNet();
    renderNet();
    netStatus.textContent = 'List cleared.';
  });

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

  buildEntries();
  buildRubric();
  fillForm();
  markList();
  buildTests();
  buildSamples();

  buildHunt();
  drawHunt();
  buildNetFilters();
  renderNet();

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
