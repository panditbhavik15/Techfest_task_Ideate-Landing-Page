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

  /* ---------- boot ---------- */
  buildControls();
  buildFilters();
  hydrateForm(state.me);
  renderPool();
  renderChannels();
  renderLog();
})();
