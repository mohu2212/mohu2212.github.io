/* ==========================================================================
   Nocturne portfolio — behaviour
   Scroll progress, reveal + counters, nav state, role typewriter, theme.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- theme ---------- */

  var themeToggle = document.getElementById('themeToggle');
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var GROUND = { dark: '#161826', light: '#f4f5fb' };

  function currentTheme() {
    return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (themeMeta) themeMeta.setAttribute('content', GROUND[theme]);
    if (themeToggle) {
      themeToggle.setAttribute(
        'aria-label',
        theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'
      );
    }
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: theme } }));
  }

  applyTheme(currentTheme());

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var next = currentTheme() === 'light' ? 'dark' : 'light';
      applyTheme(next);
      try { localStorage.setItem('theme', next); } catch (e) { /* private mode */ }
    });
  }

  /* ---------- mobile navigation ---------- */

  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');

  function closeNav() {
    if (!navLinks || !navToggle) return;
    navLinks.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-open');
  }

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      var open = navLinks.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('nav-open', open);
    });

    navLinks.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeNav();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });

    /* A resize past the breakpoint must not leave the drawer latched open. */
    var wide = matchMedia('(min-width: 901px)');
    if (wide.addEventListener) {
      wide.addEventListener('change', function (e) { if (e.matches) closeNav(); });
    }
  }

  /* ---------- reveal + counters ---------- */

  function runCounter(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduced.matches || isNaN(target)) return;

    var dur = 1300;
    var t0 = performance.now();
    var step = function (now) {
      var p = Math.min(1, (now - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * e).toFixed(dec) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target.toFixed(dec) + suffix;
    };
    requestAnimationFrame(step);
  }

  var revealTargets = document.querySelectorAll('.reveal, [data-count]');

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        if (entry.target.hasAttribute('data-count')) runCounter(entry.target);
        else entry.target.classList.add('is-visible');
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    revealTargets.forEach(function (el) { io.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- scroll progress + active nav ---------- */

  var bar = document.querySelector('[data-progress]');
  var navAnchors = document.querySelectorAll('[data-nav]');
  var sectionIds = ['about', 'skills', 'build', 'experience', 'projects', 'opensource', 'contact'];
  var ticking = false;

  function onScroll() {
    var doc = document.documentElement;
    var max = Math.max(1, doc.scrollHeight - window.innerHeight);
    if (bar) bar.style.width = Math.min(100, (window.scrollY / max) * 100) + '%';

    var active = null;
    sectionIds.forEach(function (id) {
      var s = document.getElementById(id);
      if (s && s.getBoundingClientRect().top <= 160) active = id;
    });
    navAnchors.forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('data-nav') === active);
    });
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(onScroll);
  }, { passive: true });

  onScroll();

  /* ---------- hero role typewriter ---------- */

  var roleEl = document.querySelector('[data-role]');
  var ROLES = [
    'Senior Full-Stack Engineer',
    'Senior Flutter Developer',
    'Mobile Architect',
    'Co-Founder at Waslny'
  ];
  var ri = 0;
  var typeTimer = null;

  function cycleRole() {
    if (!roleEl) return;
    var next = ROLES[(ri + 1) % ROLES.length];
    var current = roleEl.textContent;
    var i = current.length;

    var type = function () {
      roleEl.textContent = next.slice(0, i);
      i += 1;
      if (i <= next.length) {
        typeTimer = setTimeout(type, 48);
      } else {
        ri = (ri + 1) % ROLES.length;
        typeTimer = setTimeout(cycleRole, 2800);
      }
    };

    var erase = function () {
      roleEl.textContent = current.slice(0, i);
      i -= 1;
      if (i >= 0) typeTimer = setTimeout(erase, 24);
      else { i = 0; type(); }
    };

    erase();
  }

  if (roleEl && !reduced.matches) {
    typeTimer = setTimeout(cycleRole, 2600);
  }

  /* Stop the typewriter if the visitor turns reduced motion on mid-visit. */
  if (reduced.addEventListener) {
    reduced.addEventListener('change', function (e) {
      if (e.matches && typeTimer) {
        clearTimeout(typeTimer);
        typeTimer = null;
        if (roleEl) roleEl.textContent = ROLES[0];
      }
    });
  }
})();
