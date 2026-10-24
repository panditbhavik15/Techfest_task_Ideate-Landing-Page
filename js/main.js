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
    if (!on) {
      document.querySelectorAll('[data-par]').forEach(function (el) { el.style.removeProperty('--py'); });
    }
    if (on) { startMarquee(); revealAll(); } else { stopMarquee(); revealAll(); }
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

  function onScroll() {
    var y = window.scrollY;
    head.classList.toggle('is-stuck', y > 12);

    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    root.style.setProperty('--p', p.toFixed(4));
    /* attributes, not CSS transforms: SVG child transforms are unreliable read back */
    if (moonCover) moonCover.setAttribute('cx', (24 + p * 26).toFixed(2));
    if (moonSat) moonSat.setAttribute('transform', 'rotate(' + (p * 360).toFixed(1) + ' 24 24)');

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

  /* ---------- mobile nav ---------- */
  var navBtn = document.querySelector('[data-nav-toggle]');
  var navPanel = document.getElementById('mobile-nav');
  if (navBtn && navPanel) {
    navBtn.addEventListener('click', function () {
      var open = navBtn.getAttribute('aria-expanded') === 'true';
      navBtn.setAttribute('aria-expanded', String(!open));
      navPanel.hidden = open;
    });
    navPanel.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        navBtn.setAttribute('aria-expanded', 'false');
        navPanel.hidden = true;
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !navPanel.hidden) {
        navPanel.hidden = true;
        navBtn.setAttribute('aria-expanded', 'false');
        navBtn.focus();
      }
    });
  }

  /* ---------- category tabs ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  function select(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
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

  /* ---------- scroll reveal (rect based, no IO dependency) ---------- */
  var revealSel = '.about-lead,.about-body,.about-card,.sec-head,.disc-shell,.feat-copy,.feat-visual,.z-note,.atmo-head,.tile,.cta-lead,.cta-card';
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

  /* ---------- ambient sound (WebAudio, gesture-started, never remembered) ---------- */
  var soundBtn = document.querySelector('[data-sound-toggle]');
  var sound = null;
  var soundOn = false;
  var LEVEL = 0.055;

  function buildAmbience() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    var ctx = new AC();
    var out = ctx.createGain();
    out.gain.value = 0;
    out.connect(ctx.destination);

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

    return { ctx: ctx, out: out };
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
    g.linearRampToValueAtTime(audible ? LEVEL : 0, t + (audible ? 1.6 : 0.7));
    if (audible) sound.ctx.resume();
  }

  if (soundBtn) {
    soundBtn.addEventListener('click', function () {
      if (!sound) {
        sound = buildAmbience();
        if (!sound) {
          soundBtn.disabled = true;
          soundBtn.querySelector('.sound-lbl').textContent = 'No audio';
          return;
        }
      }
      soundOn = !soundOn;
      applySound(soundOn);
    });
  }
  // duck the ambience while the tab is hidden; restore it when the visitor returns
  document.addEventListener('visibilitychange', function () {
    if (sound) applySound(!document.hidden && soundOn);
  });

  var yr = document.getElementById('yr');
  if (yr) yr.textContent = String(new Date().getFullYear());

  applyMotion(motionOn);
  onScroll();
})();
