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
    if (on) { startMarquee(); revealAll(); onScroll(); }
    else {
      stopMarquee();
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

  /* ---------- zonal marquee ---------- */
  var track = document.querySelector('[data-marquee]');
  function startMarquee() {
    if (!track || !motionOn || track.dataset.clone === '1') return;
    var row = track.querySelector('.z-row');
    track._orig = row.innerHTML;
    row.innerHTML += row.innerHTML;
    track.dataset.clone = '1';
  }
  function stopMarquee() {
    if (!track || track.dataset.clone !== '1') return;
    track.querySelector('.z-row').innerHTML = track._orig;
    track.removeAttribute('data-clone');
  }

  /* ---------- zonal board ----------
     The ticker above is atmosphere; this is the lookup. It reads the marquee's own
     <li>s so the fourteen hosts exist once in the markup rather than twice, which
     means it must run before startMarquee() doubles that row — the seen map is the
     guard if the order ever changes. */
  var zList = document.querySelector('[data-z-list]');
  var zCount = document.querySelector('[data-z-count]');
  var zNone = document.querySelector('[data-z-none]');
  var zQ = document.querySelector('[data-z-q]');
  var zFiltersEl = document.querySelector('[data-z-filters]');
  var ZONES = ['All', 'North', 'South', 'East', 'West', 'Central', 'International'];
  var zState = { zone: 'All', q: '' };
  var hosts = [];

  (function readHosts() {
    var row = document.querySelector('.z-row');
    if (!row) return;
    var seen = {};
    Array.prototype.forEach.call(row.children, function (li) {
      var city = li.querySelector('b');
      var detail = li.querySelector('span');
      if (!city || !detail) return;
      var name = city.textContent.trim();
      if (seen[name]) return;
      seen[name] = 1;
      var bits = detail.textContent.split('·');
      hosts.push({
        city: name,
        host: (bits[0] || '').trim(),
        when: (bits[1] || '').trim(),
        zone: li.dataset.zone || 'Other',
        hay: (name + ' ' + detail.textContent).toLowerCase()
      });
    });
  })();

  function matchZ(h) {
    if (zState.zone !== 'All' && h.zone !== zState.zone) return false;
    return !zState.q || h.hay.indexOf(zState.q) > -1;
  }

  function zCell(h) {
    var li = document.createElement('li');
    li.className = 'z-cell';
    var top = document.createElement('div');
    top.className = 'z-top';
    var b = document.createElement('b');
    b.textContent = h.city;
    var zone = document.createElement('span');
    zone.className = 'z-zone';
    zone.textContent = h.zone;
    top.appendChild(b);
    top.appendChild(zone);
    var who = document.createElement('span');
    who.className = 'z-host';
    who.textContent = h.host;
    var when = document.createElement('span');
    when.className = 'z-when';
    when.textContent = h.when;
    li.appendChild(top);
    li.appendChild(who);
    li.appendChild(when);
    return li;
  }

  function renderZ() {
    if (!zList) return;
    zList.textContent = '';
    var rows = hosts.filter(matchZ);
    var head = rows.length === hosts.length && zState.zone === 'All' && !zState.q
      ? 'Showing all ' + hosts.length + ' host campuses.'
      : 'Showing ' + rows.length + ' of ' + hosts.length
        + (zState.zone === 'All' ? '' : ' \u00b7 ' + zState.zone)
        + (zState.q ? ' \u00b7 \u201c' + zState.q + '\u201d' : '') + '.';
    if (zCount) zCount.textContent = head;
    rows.forEach(function (h) { zList.appendChild(zCell(h)); });
    if (zNone) zNone.hidden = rows.length > 0;
    zList.hidden = rows.length === 0;
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
    storePlan(); syncPicks(); renderPlan();
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
        storePlan(); syncPicks(); renderPlan();
        say('Shortlist cleared.');
      });
    }
    if (planCopy) planCopy.addEventListener('click', copyPlan);
    if (planCsv) planCsv.addEventListener('click', downloadPlan);
    if (planPrint) planPrint.addEventListener('click', printPlan);
    renderPlan();
  }

  var yr = document.getElementById('yr');
  if (yr) yr.textContent = String(new Date().getFullYear());

  applyMotion(motionOn);
  onScroll();
})();
