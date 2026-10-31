(function () {
  'use strict';
  var root = document.documentElement;
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var KEY = 'tf-motion';

  /* ---------- motion preference ---------- */
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}
  var motionOn = stored === null ? !mq.matches : stored === 'on';

  var motionBtn = document.querySelector('[data-motion-toggle]');

  function applyMotion(on) {
    motionOn = on;
    root.classList.toggle('motion-on', on);
    root.dataset.motion = on ? 'full' : 'reduced';
    if (motionBtn) {
      motionBtn.setAttribute('aria-pressed', String(on));
      motionBtn.querySelector('.motion-lbl').textContent = on ? 'Motion on' : 'Motion off';
    }
    if (on) { revealAll(); onScroll(); }
    else {
      revealAll();
      document.querySelectorAll('[data-par]').forEach(function (el) { el.style.removeProperty('--py'); });
    }
  }

  if (motionBtn) {
    motionBtn.addEventListener('click', function () {
      motionOn = !motionOn;
      try { localStorage.setItem(KEY, motionOn ? 'on' : 'off'); } catch (e) {}
      applyMotion(motionOn);
    });
  }
  mq.addEventListener && mq.addEventListener('change', function (e) {
    var explicit = false;
    try { explicit = localStorage.getItem(KEY) !== null; } catch (err) {}
    if (!explicit) applyMotion(!e.matches);
  });

  /* ---------- scroll engine: header state, progress, parallax ---------- */
  var head = document.querySelector('[data-head]');
  var parallax = Array.prototype.slice.call(document.querySelectorAll('[data-par]'));
  var moonCover = document.querySelector('.phase-mark .cover');
  var moonSat = document.querySelector('.phase-mark .sat-orbit');
  var topBtn = document.querySelector('[data-to-top]');

  function onScroll() {
    var y = window.scrollY;
    head.classList.toggle('is-stuck', y > 12);

    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    root.style.setProperty('--p', p.toFixed(4));
    /* attributes, not CSS transforms: SVG child transforms are unreliable read back */
    if (moonCover) moonCover.setAttribute('cx', (24 + p * 26).toFixed(2));
    if (moonSat) moonSat.setAttribute('transform', 'rotate(' + (p * 360).toFixed(1) + ' 24 24)');
    if (topBtn) {
      topBtn.classList.toggle('is-live', y > window.innerHeight * 0.45);
      topBtn.disabled = y < 4;
    }
    spyRead();
    /* a scroll under a still cursor moves the panel, not the light: repaint the
       spotlight so it stays where the pointer actually is inside it */
    if (lit) litQueue();

    if (motionOn) {
      var mid = window.innerHeight / 2;
      for (var i = 0; i < parallax.length; i++) {
        var el = parallax[i];
        var box = el.getBoundingClientRect();
        if (box.bottom < -200 || box.top > window.innerHeight + 200) continue;
        var off = (box.top + box.height / 2 - mid) * parseFloat(el.dataset.par);
        el.style.setProperty('--py', off.toFixed(1) + 'px');
      }
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  /* ---------- section rail ----------
     Every rect is read before anything is written, so one scroll event costs a
     single layout pass instead of eight read/write alternations. */
  var spyLinks = Array.prototype.slice.call(document.querySelectorAll('.spy a'));
  var spyTargets = spyLinks.map(function (a) { return document.querySelector(a.getAttribute('href')); });

  function spyRead() {
    if (!spyLinks.length) return;
    var line = window.innerHeight * 0.34;
    var idx = 0;
    for (var i = 0; i < spyTargets.length; i++) {
      if (spyTargets[i] && spyTargets[i].getBoundingClientRect().top <= line) idx = i;
    }
    spyWrite(idx);
  }

  function spyWrite(idx) {
    for (var k = 0; k < spyLinks.length; k++) {
      if (k === idx) spyLinks[k].setAttribute('aria-current', 'true');
      else spyLinks[k].removeAttribute('aria-current');
    }
  }

  /* applyMotion only pumps onScroll when motion is on, so the rail needs its own
     first paint: at the top of the page the first dot is the current one */
  spyRead();

  /* ---------- pointer spotlight ----------
     One delegated listener on the document instead of a handler per card: the
     page has well over a hundred glass surfaces and most of them are rebuilt by
     the platform modules. Touch is skipped — a tap has no resting position to
     light toward. */
  var LIT = '.card,.cta-card,.about-card,.plan,.mod,.pl,.np,.pay,.jq,.tab';
  var lit = null, litRaf = 0, litX = 0, litY = 0;

  function litPaint() {
    litRaf = 0;
    if (!lit) return;
    var box = lit.getBoundingClientRect();
    if (!box.width || !box.height) return;
    lit.style.setProperty('--gx', (((litX - box.left) / box.width) * 100).toFixed(1) + '%');
    lit.style.setProperty('--gy', (((litY - box.top) / box.height) * 100).toFixed(1) + '%');
  }

  function litQueue() { if (!litRaf) litRaf = requestAnimationFrame(litPaint); }

  function litSet(el) {
    if (el === lit) return;
    if (lit) {
      lit.classList.remove('is-lit');
      lit.style.removeProperty('--gx');
      lit.style.removeProperty('--gy');
    }
    lit = el;
    if (el) el.classList.add('is-lit');
  }

  document.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    var t = e.target;
    litSet(t && t.closest ? t.closest(LIT) : null);
    if (!lit) return;
    litX = e.clientX;
    litY = e.clientY;
    litQueue();
  }, { passive: true });

  document.documentElement.addEventListener('pointerleave', function () { litSet(null); });

  /* ---------- mobile nav ---------- */
  var navBtn = document.querySelector('[data-nav-toggle]');
  var navPanel = document.getElementById('mobile-nav');
  var navLbl = navBtn && navBtn.querySelector('.nav-lbl');
  var navCloseTimer = 0;
  var navIsOpen = false;

  function setNav(open, returnFocus) {
    if (!navBtn || !navPanel || open === navIsOpen) return;
    navIsOpen = open;
    window.clearTimeout(navCloseTimer);
    navBtn.setAttribute('aria-expanded', String(open));
    if (navLbl) navLbl.textContent = open ? 'Close' : 'Menu';
    root.classList.toggle('nav-open', open);
    if (open) {
      navPanel.hidden = false;
      void navPanel.offsetHeight; // commit the closed style so the slide can run
      navPanel.classList.add('is-open');
    } else {
      navPanel.classList.remove('is-open');
      // keep it in the a11y tree until the collapse finishes, then hide it
      navCloseTimer = window.setTimeout(function () {
        if (!navIsOpen) navPanel.hidden = true;
      }, 320);
      if (returnFocus) navBtn.focus();
    }
  }

  if (navBtn && navPanel) {
    navBtn.addEventListener('click', function () { setNav(!navIsOpen); });
    navPanel.addEventListener('click', function (e) {
      if (e.target.closest('a')) setNav(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setNav(false, true);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1080) setNav(false);
    });
  }

  /* ---------- tabs, scoped per tablist ----------
     More than one tablist shares this page (categories and platform modules),
     so the roving tabindex and panel switching are wired group by group. */
  document.querySelectorAll('[role="tablist"]').forEach(function (list) {
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return;
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (!panel) return;
        panel.classList.toggle('is-on', on);
        panel.hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') next = tabs[0];
        else if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); select(next, true); }
      });
    });
    var chosen = list.querySelector('[aria-selected="true"]') || tabs[0];
    select(chosen);
  });

  /* ---------- scroll reveal (rect based, no IO dependency) ---------- */
  var revealSel = '.about-lead,.about-body,.about-card,.sec-head,.disc-shell,.feat-copy,.feat-visual,.z-note,.atmo-head,.tile,.cta-lead,.cta-card,.os-shell';
  var revealNodes = [];
  function checkReveal() {
    if (!motionOn) return;
    var limit = window.innerHeight * 0.94;
    for (var i = revealNodes.length - 1; i >= 0; i--) {
      var n = revealNodes[i];
      var box = n.getBoundingClientRect();
      if (box.top < limit) {
        n.classList.add('is-in');
        revealNodes.splice(i, 1);
      }
    }
    if (!revealNodes.length) window.removeEventListener('scroll', onRevealScroll);
  }
  function onRevealScroll() { checkReveal(); }
  function revealAll() {
    if (!motionOn) {
      document.querySelectorAll(revealSel).forEach(function (n) { n.classList.remove('reveal'); n.classList.add('is-in'); });
      revealNodes = [];
      return;
    }
    revealNodes = Array.prototype.slice.call(document.querySelectorAll(revealSel))
      .filter(function (n) { return !n.classList.contains('is-in'); });
    revealNodes.forEach(function (n) { n.classList.add('reveal'); });
    window.addEventListener('scroll', onRevealScroll, { passive: true });
    window.addEventListener('resize', onRevealScroll);
    checkReveal();
  }

  /* ---------- zonal board ----------
     The fourteen hosts are plain markup in the list below; this only screens them,
     so the cities stay readable with JavaScript off and on paper. */
  var zList = document.querySelector('[data-z-list]');
  var zCount = document.querySelector('[data-z-count]');
  var zNone = document.querySelector('[data-z-none]');
  var zQ = document.querySelector('[data-z-q]');
  var zFiltersEl = document.querySelector('[data-z-filters]');
  var ZONES = ['All', 'North', 'South', 'East', 'West', 'Central', 'International'];
  var zState = { zone: 'All', q: '' };
  var hosts = [];

  (function readHosts() {
    if (!zList) return;
    Array.prototype.forEach.call(zList.children, function (li) {
      var city = li.querySelector('b');
      var who = li.querySelector('.z-host');
      var when = li.querySelector('.z-when');
      if (!city || !who || !when) return;
      hosts.push({
        el: li,
        zone: li.dataset.zone || 'Other',
        hay: (city.textContent + ' ' + who.textContent + ' ' + when.textContent).toLowerCase()
      });
    });
  })();

  function matchZ(h) {
    if (zState.zone !== 'All' && h.zone !== zState.zone) return false;
    return !zState.q || h.hay.indexOf(zState.q) > -1;
  }

  function renderZ() {
    if (!zList) return;
    var shown = 0;
    hosts.forEach(function (h) {
      var on = matchZ(h);
      h.el.hidden = !on;
      if (on) shown++;
    });
    var head = shown === hosts.length && zState.zone === 'All' && !zState.q
      ? 'Showing all ' + hosts.length + ' host campuses.'
      : 'Showing ' + shown + ' of ' + hosts.length
        + (zState.zone === 'All' ? '' : ' \u00b7 ' + zState.zone)
        + (zState.q ? ' \u00b7 \u201c' + zState.q + '\u201d' : '') + '.';
    if (zCount) zCount.textContent = head;
    if (zNone) zNone.hidden = shown > 0;
    zList.hidden = shown === 0;
  }

  function syncZFilters() {
    if (!zFiltersEl) return;
    zFiltersEl.querySelectorAll('.filt').forEach(function (x) {
      x.setAttribute('aria-pressed', String(x.dataset.zone === zState.zone));
    });
  }

  function buildZFilters() {
    if (!zFiltersEl) return;
    ZONES.forEach(function (z) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filt';
      btn.textContent = z;
      btn.dataset.zone = z;
      btn.setAttribute('aria-pressed', String(z === zState.zone));
      btn.addEventListener('click', function () {
        zState.zone = z;
        syncZFilters();
        renderZ();
      });
      zFiltersEl.appendChild(btn);
    });
  }

  if (zList) {
    buildZFilters();
    renderZ();
    if (zQ) {
      zQ.addEventListener('input', function () {
        zState.q = zQ.value.trim().toLowerCase();
        renderZ();
      });
    }
    var zReset = document.querySelector('[data-z-reset]');
    if (zReset) {
      zReset.addEventListener('click', function () {
        zState.zone = 'All';
        zState.q = '';
        if (zQ) zQ.value = '';
        syncZFilters();
        renderZ();
        if (zQ) zQ.focus();
      });
    }
  }

  /* ---------- anchored scrolling with header offset ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id === '#' || id.length < 2) return;
    var target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    var top = target.getBoundingClientRect().top + window.scrollY - (id === '#top' ? 0 : 78);
    window.scrollTo({ top: top, behavior: motionOn ? 'smooth' : 'auto' });
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  /* ---------- ambient sound: drone bed + generative score ---------- */
  var soundBtn = document.querySelector('[data-sound-toggle]');
  var levelGroup = document.querySelector('[data-level-group]');
  var sound = null;
  var soundOn = false;
  /* three listening levels. The level is remembered; whether anything plays
     at all never is — that stays a per-visit decision. */
  var LEVELS = { low: 0.032, med: 0.055, loud: 0.086 };
  var LVL_KEY = 'tf-level';
  var lvl = 'med';
  try { lvl = localStorage.getItem(LVL_KEY) || 'med'; } catch (e) {}
  if (!LEVELS[lvl]) lvl = 'med';

  var BPM = 68;
  var BEAT = 60 / BPM;
  var BAR = BEAT * 4;
  /* Am - F - C - G, one bar each, over the static A pedal in the drone */
  var CHORDS = [[45, 48, 52], [41, 45, 48], [48, 52, 55], [43, 47, 50]];
  var MELODY = [76, null, 72, 74];
  var ARP = [0, 1, 2, 3, 2, 1, 3, 2];

  function hz(note) { return 55 * Math.pow(2, (note - 33) / 12); }

  function voice(ctx, dest, freq, at, dur, peak, type, cut) {
    var o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = cut;
    lp.Q.value = 0.5;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(peak, at + Math.min(0.05, dur * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(lp); lp.connect(g); g.connect(dest);
    o.start(at);
    o.stop(at + dur + 0.05);
  }

  function playBar(at, index) {
    var ctx = sound.ctx, bus = sound.music, chord = CHORDS[index % CHORDS.length];
    var i, n;

    // sustained chord, slightly detuned across the three voices
    for (i = 0; i < chord.length; i++) {
      var o = ctx.createOscillator();
      o.type = i === 2 ? 'sine' : 'triangle';
      o.frequency.value = hz(chord[i] + 12);
      o.detune.value = (i - 1) * 6;
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 880;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(0.15, at + BAR * 0.34);
      g.gain.linearRampToValueAtTime(0.0001, at + BAR * 1.04);
      o.connect(lp); lp.connect(g); g.connect(bus);
      o.start(at); o.stop(at + BAR * 1.08);
    }

    // bass on beats 1 and 3
    voice(ctx, bus, hz(chord[0] - 12), at, BEAT * 1.7, 0.4, 'sine', 300);
    voice(ctx, bus, hz(chord[0] - 12), at + BEAT * 2, BEAT * 1.7, 0.3, 'sine', 300);

    // arpeggio in eighths, one octave above the chord
    for (i = 0; i < ARP.length; i++) {
      n = chord[ARP[i] % chord.length] + (ARP[i] > 2 ? 12 : 0);
      voice(ctx, bus, hz(n + 12), at + i * BEAT / 2, BEAT * 0.46, i % 2 ? 0.11 : 0.18, 'triangle', 2400);
    }

    // one long melodic note per bar, every other bar
    var m = MELODY[index % MELODY.length];
    if (m) voice(ctx, bus, hz(m), at + BEAT, BAR * 0.66, 0.16, 'sine', 3200);
  }

  var seq = { timer: null, bar: 0, next: 0 };
  function pump() {
    if (!sound) return;
    var now = sound.ctx.currentTime, ahead = now + 1.4;
    while (seq.next < ahead) {
      playBar(seq.next, seq.bar);
      seq.bar++;
      seq.next += BAR;
    }
  }
  function startSeq() {
    if (!sound || seq.timer) return;
    seq.next = sound.ctx.currentTime + 0.1;
    seq.timer = window.setInterval(pump, 120);
    pump();
  }
  function stopSeq() {
    window.clearInterval(seq.timer);
    seq.timer = null;
  }

  function buildAmbience() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    var ctx = new AC();
    var out = ctx.createGain();
    out.gain.value = 0;
    // keep the summed score from clipping when chord tones land together
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.attack.value = 0.008;
    comp.release.value = 0.25;
    out.connect(comp); comp.connect(ctx.destination);

    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 360;
    lp.Q.value = 0.4;
    lp.connect(out);

    [[55, 'sine', 0.55], [82.5, 'sine', 0.24], [110, 'triangle', 0.09]].forEach(function (v) {
      var o = ctx.createOscillator();
      o.type = v[1];
      o.frequency.value = v[0];
      var g = ctx.createGain();
      g.gain.value = v[2];
      o.connect(g); g.connect(lp); o.start();
    });

    // slow sweep across the low-pass so the drone breathes instead of droning flat
    var lfo = ctx.createOscillator();
    lfo.frequency.value = 0.045;
    var lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 150;
    lfo.connect(lfoAmt); lfoAmt.connect(lp.frequency); lfo.start();

    // distant crowd wash
    var len = Math.floor(ctx.sampleRate * 3);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var ch = buf.getChannelData(0);
    for (var i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * 0.4;
    var noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1250;
    bp.Q.value = 0.6;
    var nGain = ctx.createGain();
    nGain.gain.value = 0.09;
    noise.connect(bp); bp.connect(nGain); nGain.connect(out);
    noise.start();

    // the score sits below the bed so the drone still leads
    var music = ctx.createGain();
    music.gain.value = 0.8;
    music.connect(out);

    return { ctx: ctx, out: out, music: music };
  }

  function applySound(audible) {
    if (soundBtn) {
      soundBtn.setAttribute('aria-pressed', String(!!audible));
      soundBtn.querySelector('.sound-lbl').textContent = audible ? 'Ambience on' : 'Ambience';
    }
    if (!sound) return;
    var g = sound.out.gain, t = sound.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(audible ? LEVELS[lvl] : 0, t + (audible ? 1.6 : 0.7));
    if (audible) { sound.ctx.resume(); startSeq(); } else { stopSeq(); }
  }

  if (levelGroup) {
    var picked = levelGroup.querySelector('input[value="' + lvl + '"]');
    if (picked) picked.checked = true;
    levelGroup.addEventListener('change', function (e) {
      var input = e.target.closest('input[name="lvl"]');
      if (!input) return;
      lvl = input.value;
      try { localStorage.setItem(LVL_KEY, lvl); } catch (err) {}
      applySound(soundOn);
    });
  }

  /* Modules ask for a blip through this event. It is only ever heard while the
     ambience is already running, so no interaction can startle with sound. */
  document.addEventListener('tf:ping', function () {
    if (!sound || !soundOn) return;
    var t = sound.ctx.currentTime;
    voice(sound.ctx, sound.music, 1180, t, 0.16, 0.16, 'sine', 5200);
    voice(sound.ctx, sound.music, 1770, t + 0.07, 0.2, 0.1, 'sine', 5200);
  });

  if (soundBtn) {
    soundBtn.addEventListener('click', function () {
      if (!sound) {
        sound = buildAmbience();
        if (!sound) {
          soundBtn.disabled = true;
          soundBtn.querySelector('.sound-lbl').textContent = 'No audio';
          if (levelGroup) {
            levelGroup.querySelectorAll('input').forEach(function (i) { i.disabled = true; });
          }
          return;
        }
      }
      soundOn = !soundOn;
      applySound(soundOn);
    });
  }
  // duck the ambience while the tab is hidden; restore it when the visitor returns
  document.addEventListener('visibilitychange', function () {
    if (!sound) return;
    if (document.hidden) { stopSeq(); applySound(false); }
    else if (soundOn) applySound(true);
  });

  /* ---------- back to top ---------- */
  if (topBtn) {
    topBtn.addEventListener('click', function () {
      setNav(false);
      window.scrollTo({ top: 0, behavior: motionOn ? 'smooth' : 'auto' });
      var hero = document.getElementById('top');
      if (hero) {
        hero.setAttribute('tabindex', '-1');
        hero.focus({ preventScroll: true });
      }
    });
  }

  /* ---------- shortlist: built and kept on this device ---------- */
  var PLAN_KEY = 'tf-plan';
  var planBox = document.getElementById('my-plan');
  var planList = document.querySelector('[data-plan-list]');
  var planCount = document.querySelector('[data-plan-count]');
  var planClear = document.querySelector('[data-plan-clear]');
  var plan = [];
  try { plan = JSON.parse(localStorage.getItem(PLAN_KEY)) || []; } catch (e) { plan = []; }
  if (!Array.isArray(plan)) plan = [];

  function planSlug(kind, title) {
    return (kind + ' ' + title).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
  function planIndex(slug) {
    for (var i = 0; i < plan.length; i++) { if (plan[i].s === slug) return i; }
    return -1;
  }
  function storePlan() {
    try {
      if (plan.length) localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
      else localStorage.removeItem(PLAN_KEY);
    } catch (e) {}
  }
  function syncPicks() {
    document.querySelectorAll('.pick').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(planIndex(btn.dataset.slug) > -1));
    });
  }
  function renderPlan() {
    if (!planBox || !planList || !planCount) return;
    planList.textContent = '';
    plan.forEach(function (item) {
      var li = document.createElement('li');
      var kind = document.createElement('small');
      kind.textContent = item.k;
      var name = document.createElement('b');
      name.textContent = item.t;
      var x = document.createElement('button');
      x.type = 'button';
      x.className = 'plan-x';
      x.textContent = '\u00d7';
      x.setAttribute('aria-label', 'Remove ' + item.t + ' from shortlist');
      x.addEventListener('click', function () { setPlan(item.s, false); });
      li.appendChild(kind); li.appendChild(name); li.appendChild(x);
      planList.appendChild(li);
    });
    planCount.textContent = plan.length + (plan.length === 1 ? ' item saved' : ' items saved');
    planBox.classList.toggle('is-empty', !plan.length);
  }
  function setPlan(slug, add, title, kind) {
    var i = planIndex(slug);
    if (add && i < 0) plan.push({ s: slug, t: title, k: kind });
    else if (!add && i > -1) plan.splice(i, 1);
    else return;
    storePlan(); syncPicks(); renderPlan(); syncMatchRows();
  }

  /* ---------- taking the plan off the device ----------
     Without this the shortlist dies in localStorage on one browser, which defeats
     the only reason to build it: showing a friend, or a form, what you intend to
     attend. Text for a chat, CSV for a sheet. */
  var planCopy = document.querySelector('[data-plan-copy]');
  var planCsv = document.querySelector('[data-plan-csv]');
  var planStatus = document.querySelector('[data-plan-status]');

  function say(msg) {
    if (!planStatus) return;
    planStatus.textContent = '';
    window.setTimeout(function () { planStatus.textContent = msg; }, 40);
  }
  function planGroups() {
    var order = [], map = {};
    plan.forEach(function (item) {
      if (!map[item.k]) { map[item.k] = []; order.push(item.k); }
      map[item.k].push(item.t);
    });
    return { order: order, map: map };
  }
  function planText() {
    var g = planGroups();
    var lines = ['Techfest, IIT Bombay — my plan',
      plan.length + (plan.length === 1 ? ' item' : ' items'), ''];
    g.order.forEach(function (kind) {
      lines.push(kind.toUpperCase());
      g.map[kind].forEach(function (t) { lines.push('  \u2022 ' + t); });
      lines.push('');
    });
    lines.push('Times and venues are on techfest.org.');
    return lines.join('\n');
  }
  function csvCell(v) {
    return '"' + String(v).replace(/"/g, '""') + '"';
  }
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.className = 'sr-only';
    document.body.appendChild(ta);
    var ok = false;
    try { ta.select(); ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }
  function copyPlan() {
    function done(ok) {
      say(ok ? 'Copied ' + plan.length + (plan.length === 1 ? ' item' : ' items') + ' to the clipboard.'
        : 'The browser refused the clipboard. Select the list above and copy it by hand.');
    }
    var text = planText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(legacyCopy(text)); });
    } else {
      done(legacyCopy(text));
    }
  }
  function downloadPlan() {
    var rows = ['category,title'];
    plan.forEach(function (i) { rows.push(csvCell(i.k) + ',' + csvCell(i.t)); });
    var blob = new Blob([rows.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'techfest-plan.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    say('Saved techfest-plan.csv with ' + plan.length + ' rows.');
  }

  /* ---------- paper ----------
     The third exit is the one that ends up on a noticeboard. The sheet markup at
     the end of the body stays empty until this fills it, and the print stylesheet
     swaps to it — but only when there is a plan. Printing with nothing picked
     leaves the page itself, because a sheet that says "nothing" is a worse answer
     than the page the visitor meant to print. */
  var planPrint = document.querySelector('[data-plan-print]');
  var psCount = document.querySelector('[data-ps-count]');
  var psDate = document.querySelector('[data-ps-date]');
  var psBody = document.querySelector('[data-ps-body]');

  function buildSheet() {
    var on = plan.length > 0;
    root.classList.toggle('print-plan', on);
    if (!on || !psBody) return;
    var g = planGroups();
    if (psCount) psCount.textContent = plan.length + (plan.length === 1 ? ' item' : ' items') + ' \u00b7 ';
    if (psDate) psDate.textContent = new Date().toLocaleDateString();
    psBody.textContent = '';
    g.order.forEach(function (kind) {
      var sec = document.createElement('section');
      sec.className = 'ps-group';
      var h = document.createElement('h2');
      h.textContent = kind;
      var n = document.createElement('span');
      n.className = 'ps-n';
      n.textContent = String(g.map[kind].length);
      h.appendChild(n);
      var ol = document.createElement('ol');
      g.map[kind].forEach(function (t) {
        var li = document.createElement('li');
        li.textContent = t;
        ol.appendChild(li);
      });
      sec.appendChild(h);
      sec.appendChild(ol);
      psBody.appendChild(sec);
    });
  }

  /* The button lives in .plan-foot, which .is-empty hides, so an empty shortlist
     has no way to reach this. */
  function printPlan() {
    buildSheet();
    window.print();
  }

  window.addEventListener('beforeprint', buildSheet);

  if (planBox) {
    document.querySelectorAll('.cards .card').forEach(function (card) {
      var h = card.querySelector('h4');
      if (!h) return;
      var tag = card.querySelector('.card-tag');
      var kind = (tag ? tag.textContent.trim() : '') || 'Event';
      var title = h.textContent.trim();
      var slug = planSlug(kind, title);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pick';
      btn.dataset.slug = slug;
      btn.setAttribute('aria-pressed', String(planIndex(slug) > -1));
      btn.innerHTML = '<span class="plus" aria-hidden="true"></span>' +
        '<span class="lbl-off">Add to plan</span><span class="lbl-on">In your plan</span>';
      btn.addEventListener('click', function () {
        setPlan(slug, planIndex(slug) < 0, title, kind);
      });
      card.appendChild(btn);
    });
    if (planClear) {
      planClear.addEventListener('click', function () {
        plan = [];
        storePlan(); syncPicks(); renderPlan(); syncMatchRows();
        say('Shortlist cleared.');
      });
    }
    if (planCopy) planCopy.addEventListener('click', copyPlan);
    if (planCsv) planCsv.addEventListener('click', downloadPlan);
    if (planPrint) planPrint.addEventListener('click', printPlan);
    renderPlan();
  }

  /* ---------- shared text helpers ----------
     The three features below are the only things on this page that need
     JavaScript to have anything to show, so the html element carries the proof
     and the stylesheet hides those two panels until it is set.
     norm() is the only thing the search and the matcher score against: it folds
     case and turns every punctuation run into a space, so 'AI-generated' and
     'Early-bird' become searchable words without a word list having to know the
     difference. Labels are shown from the original text, never from norm(). */
  root.classList.add('js-on');

  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  /* a headline with a <br> reads as two words glued together through textContent,
     so the break is collected as a space instead */
  function txt(el) {
    if (!el) return '';
    if (el.nodeType === 3) return el.nodeValue || '';
    if (el.nodeName === 'BR') return ' ';
    var out = '';
    for (var i = 0; i < el.childNodes.length; i++) out += txt(el.childNodes[i]);
    return out;
  }
  function short(s, words) {
    var parts = String(s || '').replace(/\s+/g, ' ').trim().split(' ');
    if (parts.length <= words) return parts.join(' ');
    return parts.slice(0, words).join(' ') + '\u2026';
  }
  /* this page has eleven text fields of its own — search, chat, clue, judge
     marks, crew forms — and a global shortcut must not eat a keystroke from any
     of them */
  function isTyping(t) {
    if (!t || !t.tagName) return false;
    var tag = t.tagName.toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable === true;
  }
  /* ---------- where the page takes you ----------
     Same offset and same focus behaviour as the anchored-scroll handler above,
     plus a ring that says "this is the one the search sent you to". */
  var flashEl = null, flashTimer = 0;
  function flash(el) {
    if (flashEl && flashEl !== el) flashEl.classList.remove('is-flash');
    if (!el) return;
    flashEl = el;
    el.classList.add('is-flash');
    window.clearTimeout(flashTimer);
    flashTimer = window.setTimeout(function () {
      el.classList.remove('is-flash');
      if (flashEl === el) flashEl = null;
    }, 1600);
  }
  function goto(el) {
    if (!el) return;
    setNav(false);
    var box = el.getBoundingClientRect();
    var top = box.top + window.scrollY - 78;
    window.scrollTo({ top: top > 0 ? top : 0, behavior: motionOn ? 'smooth' : 'auto' });
    /* a panel is already tabbable; only things that were not focusable borrow a -1 */
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
    flash(el);
  }

  /* reset the zonal board through its own controls, so a hidden host cannot be
     searched to and then left invisible */
  function clearZonal() {
    if (zQ && zQ.value) {
      zQ.value = '';
      try { zQ.dispatchEvent(new Event('input')); } catch (e) {}
    }
    var all = zFiltersEl ? zFiltersEl.querySelector('.filt[data-zone="All"]') : null;
    if (all && all.getAttribute('aria-pressed') === 'false') all.click();
  }

  /* ---------- command palette ----------
     One keyboard surface over content the page already ships: the eight sections
     from the rail, the five lanes, every programme entry that has a title, the
     three featured challenges, the five Fest OS modules, the fourteen host
     campuses and the actions the buttons on the page already perform. The index
     is read from the live DOM at boot, so it cannot drift out of date with the
     copy, and rows are built from text nodes and <mark> only — a headline from
     the page can never be read back as markup. */
  var cmdk = document.getElementById('cmdk');
  var cmdkBtn = document.querySelector('[data-cmdk-open]');
  var cmdkQ = document.querySelector('[data-cmdk-q]');
  var cmdkList = document.querySelector('[data-cmdk-list]');
  var cmdkMeta = document.querySelector('[data-cmdk-meta]');
  var cmdkNone = document.querySelector('[data-cmdk-none]');
  var CMDK_MAX = 14;
  var cmdkItems = [];
  var cmdkRows = [];
  var cmdkSel = -1;
  var cmdkFrom = null;
  var cmdkGroups = {};

  /* group, label, the small line under it, the right-hand hint, extra words to
     search, what running it does, and optionally a state-aware label */
  function addItem(group, label, kicker, hint, hay, run, dyn) {
    var shown = String(label || '').trim();
    if (!shown || typeof run !== 'function') return;
    cmdkItems.push({
      g: group,
      l: shown,
      k: String(kicker || '').trim(),
      h: String(hint || '').trim(),
      run: run,
      dyn: typeof dyn === 'function' ? dyn : null,
      p: 0,
      t: norm(shown),
      a: norm(group + ' ' + kicker),
      y: norm(shown + ' ' + kicker + ' ' + hint + ' ' + hay)
    });
    if (!(group in cmdkGroups)) cmdkGroups[group] = Object.keys(cmdkGroups).length;
  }

  (function buildPalette() {
    /* sections: the rail already names them, and the rail is what a keyboard
       visitor has seen, so those names are the ones that search well */
    document.querySelectorAll('.spy a').forEach(function (a) {
      var href = a.getAttribute('href');
      var sec = href && href.length > 1 ? document.querySelector(href) : null;
      if (!sec) return;
      var head = sec.querySelector('h1, h2');
      var name = txt(a).trim();
      addItem('Sections', name, 'Section', short(txt(head), 6),
        'page ' + txt(head) + ' ' + name + ' ' + (sec.className || ''), function () { goto(sec); });
      cmdkItems[cmdkItems.length - 1].p = 1;
    });

    /* the five lanes and the five platform modules both live in a tablist, so
       running one is a click on the page's own tab */
    function laneRun(tab) {
      return function () {
        tab.click();
        var panel = document.getElementById(tab.getAttribute('aria-controls'));
        goto(panel || tab);
      };
    }
    document.querySelectorAll('#discover .tabs [role="tab"]').forEach(function (tab) {
      addItem('Lanes', txt(tab.querySelector('b')), 'Category', txt(tab.querySelector('small')),
        'lane ' + txt(tab), laneRun(tab));
      cmdkItems[cmdkItems.length - 1].p = 1;
    });
    document.querySelectorAll('[aria-label="Platform modules"] [role="tab"]').forEach(function (tab) {
      addItem('Fest OS', txt(tab.querySelector('b')), 'Prototype module', txt(tab.querySelector('small')),
        'platform os ' + txt(tab) + ' sample data browser only', laneRun(tab));
    });

    /* every programme card that has a title, with its own lane as the context */
    document.querySelectorAll('#discover .cards .card').forEach(function (card) {
      var h = card.querySelector('h4');
      if (!h) return;
      var panel = card.closest('[role="tabpanel"]');
      var laneH = panel ? panel.querySelector('.panel-top h3') : null;
      var tab = panel && panel.getAttribute('aria-labelledby')
        ? document.getElementById(panel.getAttribute('aria-labelledby')) : null;
      var tag = card.querySelector('.card-tag');
      var prize = card.querySelector('.prize');
      addItem('Programme', txt(h), txt(laneH), short(txt(prize), 5) || txt(tag),
        txt(tag) + ' ' + txt(laneH) + ' ' + txt(card), function () {
          if (tab) tab.click();
          goto(card);
        });
    });

    /* the three Pushpak rounds are not cards, so they have no Add to plan button;
       they are still the loudest thing on the page and belong in the index */
    document.querySelectorAll('.feat-list li').forEach(function (li) {
      var h = li.querySelector('h4');
      if (!h) return;
      var num = li.querySelector('span');
      addItem('Featured', txt(h), 'Pushpak Grand Challenge', short(txt(li.querySelector('p')), 5),
        'drone pushpak funded ' + txt(li), function () { goto(li); });
    });

    document.querySelectorAll('[data-z-list] .z-cell').forEach(function (cell) {
      var city = cell.querySelector('b');
      var who = cell.querySelector('.z-host');
      var when = cell.querySelector('.z-when');
      if (!city || !who || !when) return;
      addItem('Host campuses', txt(city), txt(who), txt(when) + ' \u00b7 ' + (cell.dataset.zone || ''),
        txt(who) + ' ' + (cell.dataset.zone || '') + ' zonal campus', function () {
          clearZonal();
          goto(cell);
        });
    });

    /* the actions are the buttons the page already has, reached from the keyboard.
       None of them is pinned: an empty search box shows the map of the page, not
       its whole menu — the placeholder and the meta line both name "action", so
       typing "print" or "share" is how these are found. */
    var acts = [
      ['Copy shortlist as text', 'Plain text for a chat', function () { copyPlan(); }],
      ['Copy share link', 'A link that carries your picks', function () { sharePlan(); }],
      ['Download shortlist CSV', 'techfest-plan.csv', function () { downloadPlan(); }],
      ['Print shortlist', 'The one-page paper plan', function () { printPlan(); }],
      ['Show my shortlist', 'The panel at the end of the page', function () { if (planBox) goto(planBox); }],
      ['Clear shortlist', 'Remove every pick on this device', function () { if (planClear) planClear.click(); }],
      ['Match me to events', 'The interest picker in Discover', function () { if (matchBox) goto(matchBox); }],
      ['Show all fourteen hosts', 'Reset the zonal board', function () { clearZonal(); if (zList) goto(zList); }]
    ];
    acts.forEach(function (a) {
      if (a[0].indexOf('shortlist') > -1 && !planBox) return;
      addItem('Actions', a[0], a[1], 'Runs the button on the page', a[0] + ' ' + a[1], a[2]);
    });
    if (motionBtn) {
      addItem('Actions', 'Toggle motion', 'Animation, parallax, reveal', 'Runs the button on the page',
        'motion animation parallax reduce motion on off', function () { motionBtn.click(); },
        function () { return motionOn ? 'Turn motion off' : 'Turn motion on'; });
    }
    if (soundBtn) {
      /* the bed under this score is literally called a drone, but a visitor who
         types "drone" here means the UAV challenges, not the ambience */
      addItem('Actions', 'Toggle ambience', 'Generative score, three levels', 'Runs the button on the page',
        'sound audio music ambience on off', function () { soundBtn.click(); },
        function () { return soundOn ? 'Turn ambience off' : 'Turn ambience on'; });
    }
  })();

  function cmdkScore(item, toks) {
    var total = 0;
    for (var i = 0; i < toks.length; i++) {
      var w = toks[i];
      var at = item.y.indexOf(w);
      if (at < 0) return -1;
      /* where the match came from matters more than how many there are: a title
         hit should outrank a hit buried in the card copy */
      var s = item.t.indexOf(w) > -1 ? 60 : (item.a.indexOf(w) > -1 ? 40 : 22);
      if (at === 0 || item.y.charAt(at - 1) === ' ') s += 8;
      total += s;
    }
    return total;
  }

  /* the query echo: first hit per token, merged where they overlap, emitted as
     text nodes and <mark> elements so nothing is ever parsed as HTML */
  function cmdkMark(host, label, toks) {
    var low = label.toLowerCase(), ranges = [], i;
    for (i = 0; i < toks.length; i++) {
      var at = low.indexOf(toks[i]);
      if (at > -1) ranges.push([at, at + toks[i].length]);
    }
    if (!ranges.length) {
      host.appendChild(document.createTextNode(label));
      return;
    }
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    var merged = [], cur = ranges[0];
    for (i = 1; i < ranges.length; i++) {
      if (ranges[i][0] <= cur[1]) { if (ranges[i][1] > cur[1]) cur[1] = ranges[i][1]; }
      else { merged.push(cur); cur = ranges[i]; }
    }
    merged.push(cur);
    var pos = 0;
    for (i = 0; i < merged.length; i++) {
      if (merged[i][0] > pos) host.appendChild(document.createTextNode(label.slice(pos, merged[i][0])));
      var m = document.createElement('mark');
      m.textContent = label.slice(merged[i][0], merged[i][1]);
      host.appendChild(m);
      pos = merged[i][1];
    }
    if (pos < label.length) host.appendChild(document.createTextNode(label.slice(pos)));
  }

  function cmdkTokens() {
    var parts = norm(cmdkQ ? cmdkQ.value : '').split(' '), out = [];
    for (var i = 0; i < parts.length; i++) if (parts[i]) out.push(parts[i]);
    return out;
  }

  function cmdkRender() {
    if (!cmdkList) return;
    var toks = cmdkTokens();
    var hits = [];
    cmdkItems.forEach(function (item, i) {
      var s = toks.length ? cmdkScore(item, toks) : (item.p ? 1 : -1);
      if (s > -1) hits.push({ i: i, s: s });
    });
    hits.sort(function (a, b) { return b.s - a.s || a.i - b.i; });
    var top = hits.slice(0, CMDK_MAX);
    /* ranked by score, then laid out by group, so the list reads as sections /
       lanes / programme / actions rather than as a bar chart */
    top.sort(function (a, b) {
      var ga = cmdkGroups[cmdkItems[a.i].g], gb = cmdkGroups[cmdkItems[b.i].g];
      return ga !== gb ? ga - gb : (b.s - a.s || a.i - b.i);
    });

    cmdkList.textContent = '';
    cmdkRows = [];
    var lastG = '';
    top.forEach(function (hit, n) {
      var item = cmdkItems[hit.i];
      if (item.g !== lastG) {
        var gh = document.createElement('li');
        gh.className = 'cmdk-grp';
        gh.setAttribute('role', 'presentation');
        gh.textContent = item.g;
        cmdkList.appendChild(gh);
        lastG = item.g;
      }
      var li = document.createElement('li');
      li.className = 'cmdk-opt';
      li.id = 'cmdk-o-' + n;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      var main = document.createElement('div');
      main.className = 'cmdk-main';
      var l = document.createElement('div');
      l.className = 'cmdk-l';
      cmdkMark(l, item.dyn ? item.dyn() : item.l, toks);
      var g = document.createElement('div');
      g.className = 'cmdk-o-g';
      g.textContent = item.k;
      main.appendChild(l);
      main.appendChild(g);
      var hint = document.createElement('div');
      hint.className = 'cmdk-h';
      hint.textContent = item.h;
      li.appendChild(main);
      li.appendChild(hint);
      (function (index) {
        li.addEventListener('click', function () { cmdkRun(index); });
      })(n);
      cmdkList.appendChild(li);
      cmdkRows.push({ li: li, item: item });
    });

    if (cmdkMeta) {
      cmdkMeta.textContent = !toks.length
        ? 'Jump to a section, a lane, an event, a campus or an action'
        : cmdkRows.length + ' of ' + hits.length + (hits.length === 1 ? ' match' : ' matches') + ' on this page';
    }
    if (cmdkNone) cmdkNone.hidden = hits.length > 0 || !toks.length;
    cmdkSetSel(0);
  }

  function cmdkSetSel(i) {
    if (cmdkRows.length) i = ((i % cmdkRows.length) + cmdkRows.length) % cmdkRows.length;
    else i = -1;
    cmdkSel = i;
    cmdkRows.forEach(function (row, n) {
      var on = n === i;
      row.li.classList.toggle('is-sel', on);
      row.li.setAttribute('aria-selected', String(on));
    });
    if (!cmdkQ) return;
    cmdkQ.setAttribute('aria-expanded', String(cmdkRows.length > 0));
    if (i > -1) {
      cmdkQ.setAttribute('aria-activedescendant', cmdkRows[i].li.id);
      if (cmdkRows[i].li.scrollIntoView) cmdkRows[i].li.scrollIntoView({ block: 'nearest' });
    } else {
      cmdkQ.removeAttribute('aria-activedescendant');
    }
  }

  function cmdkRun(i) {
    var row = cmdkRows[i];
    if (!row) return;
    var run = row.item.run;
    cmdkHide();
    /* let the overlay go before the page scrolls, and stay inside the same user
       activation so a toggle here can still start the audio context */
    window.setTimeout(run, motionOn ? 120 : 0);
  }

  function cmdkShow() {
    if (!cmdk || !cmdk.hidden) return;
    cmdkFrom = document.activeElement;
    cmdk.hidden = false;
    root.classList.add('cmdk-on');
    if (cmdkBtn) cmdkBtn.setAttribute('aria-expanded', 'true');
    setNav(false);
    cmdkRender();
    if (cmdkQ) {
      cmdkQ.focus();
      if (cmdkQ.select) cmdkQ.select();
    }
  }

  function cmdkHide() {
    if (!cmdk || cmdk.hidden) return;
    cmdk.hidden = true;
    root.classList.remove('cmdk-on');
    if (cmdkBtn) cmdkBtn.setAttribute('aria-expanded', 'false');
    cmdkSel = -1;
    if (cmdkFrom && cmdkFrom.focus) cmdkFrom.focus();
    cmdkFrom = null;
  }

  if (cmdk) {
    if (cmdkBtn) cmdkBtn.addEventListener('click', cmdkShow);
    document.querySelectorAll('[data-cmdk-scrim],[data-cmdk-close]').forEach(function (el) {
      el.addEventListener('click', cmdkHide);
    });
    if (cmdkQ) {
      cmdkQ.addEventListener('input', cmdkRender);
      cmdkQ.addEventListener('keydown', function (e) {
        var k = (e.key || '').toLowerCase();
        if (k === 'arrowdown') { e.preventDefault(); cmdkSetSel(cmdkSel + 1); }
        else if (k === 'arrowup') { e.preventDefault(); cmdkSetSel(cmdkSel - 1); }
        else if (k === 'home') { e.preventDefault(); cmdkSetSel(0); }
        else if (k === 'end') { e.preventDefault(); cmdkSetSel(cmdkRows.length - 1); }
        else if (k === 'enter') { e.preventDefault(); cmdkRun(cmdkSel); }
      });
    }
    /* Ctrl/Cmd+K from anywhere; "/" only when the visitor is not already typing
       in a field — the page has eleven of them and none should lose a keystroke */
    document.addEventListener('keydown', function (e) {
      var k = (e.key || '').toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'k') {
        e.preventDefault();
        if (cmdk.hidden) cmdkShow(); else cmdkHide();
        return;
      }
      if (cmdk.hidden) {
        if (k === '/' && !e.ctrlKey && !e.metaKey && !e.altKey &&
          !isTyping(e.target) && !isTyping(document.activeElement)) {
          e.preventDefault();
          cmdkShow();
        }
        return;
      }
      if (k === 'escape') { e.preventDefault(); cmdkHide(); return; }
      /* the modal keeps its own focus: two controls live inside the box */
      if (k === 'tab') {
        var f = cmdk.querySelectorAll('.cmdk-box input, .cmdk-box button');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === cmdk)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  /* ---------- interest matcher ----------
     Five lanes is a lot to read in a row, so this screens the same 17 cards and
     the three featured challenges by what a visitor came to do. Every word below
     appears in the copy on this page — the lists are the page's own vocabulary,
     not a taxonomy invented here — and the ranking runs against the DOM at boot,
     so a headline that changes changes the results too. */
  var matchBox = document.querySelector('[data-match]');
  var chipsEl = document.querySelector('[data-match-chips]');
  var matchMeta = document.querySelector('[data-match-meta]');
  var matchList = document.querySelector('[data-match-list]');
  var matchReset = document.querySelector('[data-match-reset]');
  var MATCH_TOP = 6;
  var INTERESTS = [
    ['AI & agents', ['ai', 'agentic', 'agent', 'model', 'reasoning', 'prompt', 'machine', 'learning', 'neural', 'context', 'data', 'llm']],
    ['Robotics', ['robot', 'robotics', 'bot', 'hardware', 'sensor', 'ros', 'autonomous', 'arm', 'battery', 'wireless', 'machine', 'embedded']],
    ['Drones', ['drone', 'drones', 'uav', 'bvlos', 'swarm', 'rotor', 'propulsion', 'flight', 'aero', 'pushpak', 'cycloprop', 'meity']],
    ['Code & build', ['code', 'codebase', 'codebases', 'software', 'build', 'program', 'programming', 'defect', 'api', 'framework', 'stack', 'develop']],
    ['Security', ['security', 'cybersecurity', 'ethical', 'hacking', 'exploit', 'vulnerab', 'ctf', 'intrusion', 'forensic', 'network', 'guardrail', 'safety']],
    ['Quant & finance', ['quant', 'trading', 'trade', 'finance', 'financial', 'probability', 'market', 'business', 'algorithmic', 'strategy', 'investing', 'compliance', 'signal', 'signals']],
    ['Design', ['design', 'ui', 'ux', 'user', 'research', 'architecture', 'prototype', 'prototypes', 'figma', 'visual', 'creative']],
    ['Workshops', ['workshop', 'workshops', 'training', 'certificate', 'certificates', 'early bird', 'batch', 'combo', 'combos', 'booking', 'taught']],
    ['On campus', ['campus', 'expo', 'techexpo', 'exhibition', 'exhibitions', 'pavilion', 'pavilions', 'showcase', 'showcases', 'keynote', 'keynotes', 'lecture', 'lectures', 'convocation', 'arena', 'robowars', 'ozone', 'technoholix', 'ride', 'rides', 'game', 'games', 'stage', 'fairground', 'hall', 'talk', 'talks']]
  ];
  var mCorpus = [];
  var mOn = [];
  var mFocusKey = null;

  (function readCorpus() {
    if (!matchList) return;
    document.querySelectorAll('#discover .cards .card').forEach(function (card) {
      var h = card.querySelector('h4');
      if (!h) return;
      var panel = card.closest('[role="tabpanel"]');
      var laneH = panel ? panel.querySelector('.panel-top h3') : null;
      var tab = panel && panel.getAttribute('aria-labelledby')
        ? document.getElementById(panel.getAttribute('aria-labelledby')) : null;
      var tag = card.querySelector('.card-tag');
      var pick = card.querySelector('.pick');
      mCorpus.push({
        title: txt(h).trim(),
        lane: txt(laneH).trim(),
        tag: txt(tag).trim(),
        ti: ' ' + norm(txt(h)) + ' ',
        /* the card's own copy plus its tag and lane. Not the lane's intro, which
           every card in the lane would inherit: one mention of drones in the
           Competitions header would light up all five of its cards */
        hay: ' ' + norm(txt(h) + ' ' + txt(tag) + ' ' + txt(laneH) + ' ' + txt(card)) + ' ',
        slug: pick ? pick.dataset.slug : '',
        pick: pick,
        reveal: function () {
          if (tab) tab.click();
          goto(card);
        }
      });
    });
    document.querySelectorAll('.feat-list li').forEach(function (li) {
      var h = li.querySelector('h4');
      if (!h) return;
      mCorpus.push({
        title: txt(h).trim(),
        lane: 'Pushpak Grand Challenge',
        tag: 'Featured',
        ti: ' ' + norm(txt(h)) + ' ',
        hay: ' ' + norm(txt(li) + ' pushpak drone challenge funded') + ' ',
        slug: '',
        pick: null,
        reveal: function () { goto(li); }
      });
    });
    mCorpus.forEach(function (row, i) { row.i = i; });
  })();

  function mCount(words) {
    var n = 0;
    mCorpus.forEach(function (row) {
      for (var w = 0; w < words.length; w++) {
        if (row.hay.indexOf(' ' + words[w]) > -1) { n++; return; }
      }
    });
    return n;
  }

  function buildChips() {
    if (!chipsEl) return;
    chipsEl.textContent = '';
    INTERESTS.forEach(function (it, i) {
      mOn[i] = false;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip';
      btn.setAttribute('aria-pressed', 'false');
      var name = document.createElement('span');
      name.textContent = it[0];
      var c = document.createElement('span');
      c.className = 'chip-c';
      c.textContent = String(mCount(it[1]));
      btn.appendChild(name);
      btn.appendChild(c);
      btn.addEventListener('click', function () {
        mOn[i] = !mOn[i];
        btn.setAttribute('aria-pressed', String(mOn[i]));
        renderMatch();
      });
      chipsEl.appendChild(btn);
    });
  }

  function renderMatch() {
    if (!matchList || !matchMeta) return;
    var chosen = [];
    INTERESTS.forEach(function (it, i) { if (mOn[i]) chosen.push(it); });
    chipsEl && chipsEl.querySelectorAll('.chip').forEach(function (btn, i) {
      btn.setAttribute('aria-pressed', String(!!mOn[i]));
    });
    matchList.textContent = '';

    if (!chosen.length) {
      matchMeta.textContent = mCorpus.length
        ? 'Choose one or more interests.'
        : 'The matcher needs the programme cards above, and they are not on this page.';
      return;
    }

    var scored = [];
    mCorpus.forEach(function (row) {
      var hits = 0, names = [];
      chosen.forEach(function (it) {
        var n = 0;
        for (var w = 0; w < it[1].length; w++) {
          var word = ' ' + it[1][w];
          /* a title hit counts twice: coming "for the drone event" should beat a
             card that only mentions drones in its third line of copy */
          if (row.hay.indexOf(word) > -1) n += row.ti.indexOf(word) > -1 ? 2 : 1;
        }
        if (n > 0) { hits += n; names.push(it[0]); }
      });
      if (hits) scored.push({ row: row, s: hits, names: names });
    });
    scored.sort(function (a, b) { return b.s - a.s || a.row.i - b.row.i; });

    var top = scored.slice(0, MATCH_TOP);
    matchMeta.textContent = '';
    var b = document.createElement('b');
    b.textContent = String(top.length);
    matchMeta.appendChild(b);
    matchMeta.appendChild(document.createTextNode(
      (scored.length > top.length ? ' shown of ' : ' of ') + scored.length +
      (scored.length === 1 ? ' match' : ' matches') + ' \u00b7 ' +
      chosen.map(function (it) { return it[0]; }).join(', ')
    ));

    top.forEach(function (hit, n) {
      var row = hit.row;
      var li = document.createElement('li');
      li.className = 'mrow';
      var rank = document.createElement('span');
      rank.className = 'mrow-n';
      rank.textContent = ('0' + (n + 1)).slice(-2);
      var main = document.createElement('div');
      main.className = 'mrow-main';
      var t = document.createElement('b');
      t.className = 'mrow-t';
      t.textContent = row.title;
      var w = document.createElement('small');
      w.className = 'mrow-w';
      w.textContent = hit.names.join(' \u00b7 ') + ' \u2014 ' +
        (row.tag && row.tag !== row.lane ? row.lane + ' \u00b7 ' + row.tag : row.lane);
      main.appendChild(t);
      main.appendChild(w);
      var act = document.createElement('div');
      act.className = 'mrow-act';

      var open = document.createElement('button');
      open.type = 'button';
      open.className = 'btn btn-sm btn-ghost';
      open.textContent = 'Open';
      open.dataset.mkey = n + ':open';
      open.addEventListener('click', function () { row.reveal(); });
      act.appendChild(open);

      /* the row adds to the plan through the card's own button, so a pick made
         here lands in localStorage, the shortlist panel and the CSV exactly as
         one made on the card would */
      if (row.pick) {
        var add = document.createElement('button');
        add.type = 'button';
        add.className = 'btn btn-sm btn-ghost';
        add.textContent = planIndex(row.slug) > -1 ? 'In your plan' : 'Add to plan';
        add.dataset.mkey = n + ':add';
        add.addEventListener('click', function () {
          mFocusKey = n + ':add';
          row.pick.click();
        });
        act.appendChild(add);
      }

      li.appendChild(rank);
      li.appendChild(main);
      li.appendChild(act);
      matchList.appendChild(li);
    });

    if (mFocusKey) {
      var back = matchList.querySelector('[data-mkey="' + mFocusKey + '"]');
      mFocusKey = null;
      if (back) back.focus();
    }
  }

  if (matchList && chipsEl) {
    buildChips();
    renderMatch();
    if (matchReset) {
      matchReset.addEventListener('click', function () {
        for (var i = 0; i < mOn.length; i++) mOn[i] = false;
        renderMatch();
        var first = chipsEl.querySelector('.chip');
        if (first) first.focus();
      });
    }
  } else if (matchBox) {
    matchBox.hidden = true;
  }

  /* ---------- the fourth exit: a link, not a file ----------
     Copy as text is for a chat, CSV is for a sheet, print is for a noticeboard —
     this one is for a friend. The shortlist rides in the address as a compact
     array of [category, title] pairs, so there is no server to write to and no
     account to open. Nothing but the picks you already made leaves the device,
     and the receiver reads it back into their own shortlist. */
  var planShare = document.querySelector('[data-plan-share]');
  var SHARE_MARK = '#tfplan=';

  function shareUrl() {
    var rows = plan.map(function (i) { return [i.k, i.t]; });
    return location.href.split('#')[0] + SHARE_MARK + encodeURIComponent(JSON.stringify(rows));
  }
  function sayLink(msg, url) {
    if (!planStatus) return;
    planStatus.textContent = '';
    window.setTimeout(function () {
      planStatus.textContent = msg + ' ';
      var a = document.createElement('a');
      a.href = url;
      a.textContent = 'Open it';
      planStatus.appendChild(a);
      planStatus.appendChild(document.createTextNode(
        ' The picks ride in the address, so it opens on any device.'));
    }, 40);
  }
  function sharePlan() {
    if (!planBox) return;
    if (!plan.length) {
      say('Nothing to share yet. Add something to your shortlist first.');
      return;
    }
    var url = shareUrl();
    function done(ok) {
      sayLink(ok ? 'Copied a link to ' + plan.length + (plan.length === 1 ? ' item.' : ' items.')
        : 'The browser refused the clipboard, so here is the link anyway.', url);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(legacyCopy(url)); });
    } else {
      done(legacyCopy(url));
    }
  }

  /* Reading a link is the one place this page takes a list from outside, so the
     shape is checked rather than trusted: an array of two-string pairs, bounded
     lengths, a cap on rows, and one entry per slug. Titles go into the DOM as
     textContent, never as markup. */
  function shareFromHash() {
    var h = location.hash || '';
    if (h.indexOf(SHARE_MARK) !== 0) return null;
    var json;
    try { json = decodeURIComponent(h.slice(SHARE_MARK.length)); } catch (e) { return null; }
    var data;
    try { data = JSON.parse(json); } catch (e) { return null; }
    if (!Array.isArray(data)) return null;
    var out = [], seen = {};
    for (var i = 0; i < data.length && out.length < 30; i++) {
      var row = data[i];
      if (!Array.isArray(row) || row.length !== 2) continue;
      if (typeof row[0] !== 'string' || typeof row[1] !== 'string') continue;
      var k = row[0].replace(/\s+/g, ' ').trim().slice(0, 40);
      var t = row[1].replace(/\s+/g, ' ').trim().slice(0, 120);
      if (!k || !t) continue;
      var s = planSlug(k, t);
      if (seen[s]) continue;
      seen[s] = 1;
      out.push({ s: s, k: k, t: t });
    }
    return out;
  }

  function consumeShare() {
    if (!planBox) return;
    var items = shareFromHash();
    if (!items) return;
    var before = plan.length;
    items.forEach(function (item) {
      if (planIndex(item.s) < 0 && plan.length < 60) plan.push(item);
    });
    var added = plan.length - before;
    storePlan(); syncPicks(); renderPlan(); syncMatchRows();
    /* the hash has done its job; the address bar should not keep a plan the
       visitor has already merged into their own */
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    window.setTimeout(function () {
      say(added
        ? 'Added ' + added + (added === 1 ? ' item' : ' items') + ' from a shared plan, saved on this device.'
        : 'That shared plan holds nothing your shortlist does not already have.');
      if (added) goto(planBox);
    }, 80);
  }

  /* setPlan and the clear button both call this, so a row that says "Add to plan"
     never lies after a change made somewhere else on the page */
  function syncMatchRows() {
    if (matchList && mCorpus.length) renderMatch();
  }

  if (planShare) planShare.addEventListener('click', sharePlan);
  window.addEventListener('hashchange', consumeShare);
  consumeShare();

  var yr = document.getElementById('yr');
  if (yr) yr.textContent = String(new Date().getFullYear());

  applyMotion(motionOn);
  onScroll();
})();
