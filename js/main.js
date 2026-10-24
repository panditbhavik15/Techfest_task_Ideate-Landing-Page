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

  /* ---------- sticky header state ---------- */
  var head = document.querySelector('[data-head]');
  function onScroll() { head.classList.toggle('is-stuck', window.scrollY > 12); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

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

  var yr = document.getElementById('yr');
  if (yr) yr.textContent = String(new Date().getFullYear());

  applyMotion(motionOn);
})();
