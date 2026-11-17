(function () {
  'use strict';
  window.__motionInit = true;
  if (window.__motionFallback) clearTimeout(window.__motionFallback);

  var root = document.documentElement;
  var body = document.body;
  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // --------------------------------------------------
  // THEME
  // --------------------------------------------------

  var themeBtn = document.getElementById('theme-toggle');
  var themeTimer;

  function setThemeLabel() {
    if (!themeBtn) return;

    var light = root.getAttribute('data-theme') === 'light';
    themeBtn.setAttribute(
      'aria-label',
      light ? 'Switch to dark theme' : 'Switch to light theme'
    );

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', light ? '#F7F9FC' : '#0B0F14');
    }
  }

  if (themeBtn) {
    setThemeLabel();

    themeBtn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light'
        ? 'dark'
        : 'light';

      if (!reduceMotion) {
        root.classList.add('theme-transition');
        clearTimeout(themeTimer);
        themeTimer = setTimeout(function () {
          root.classList.remove('theme-transition');
        }, 500);
      }

      root.setAttribute('data-theme', next);

      try {
        localStorage.setItem('theme', next);
      } catch (e) {}

      setThemeLabel();
    });
  }

  // --------------------------------------------------
  // MOBILE NAVIGATION
  // --------------------------------------------------

  var menuBtn = document.getElementById('menu-toggle');
  var links = document.getElementById('nav-links');

  function closeMenu() {
    if (!links || !menuBtn) return;

    links.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Open menu');
  }

  if (menuBtn && links) {
    menuBtn.addEventListener('click', function () {
      var open = links.classList.toggle('open');

      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute(
        'aria-label',
        open ? 'Close menu' : 'Open menu'
      );
    });

    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && links.classList.contains('open')) {
        closeMenu();
        menuBtn.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) closeMenu();
    });
  }

  // --------------------------------------------------
  // MORE PROJECTS
  // --------------------------------------------------

  var moreBtn = document.getElementById('more-toggle');
  var moreList = document.getElementById('more-list');

  if (moreBtn && moreList) {
    moreBtn.addEventListener('click', function () {
      var expanded = moreList.classList.toggle('expanded');

      moreBtn.setAttribute('aria-expanded', String(expanded));
      moreBtn.textContent = expanded
        ? 'Show fewer projects'
        : 'Show all projects';

      if (!reduceMotion && expanded) {
        moreList.querySelectorAll('.extra').forEach(function (item, i) {
          item.style.setProperty('--item-i', i);
        });
      }
    });
  }

  // --------------------------------------------------
  // SCROLL PROGRESS + STICKY NAV
  // --------------------------------------------------

  var nav = document.querySelector('.nav');
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll('.nav-links a')
  );

  var sections = navLinks.map(function (a) {
    return document.querySelector(a.getAttribute('href'));
  }).filter(Boolean);

  var progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  progress.innerHTML = '<span></span>';

  body.appendChild(progress);

  var progressFill = progress.firstElementChild;
  var scrollQueued = false;

  function updateScrollUI() {
    var scrollTop = window.scrollY || root.scrollTop;
    var scrollable = root.scrollHeight - window.innerHeight;
    var percentage = scrollable > 0
      ? Math.min(100, Math.max(0, scrollTop / scrollable * 100))
      : 0;

    progressFill.style.transform = 'scaleX(' + percentage / 100 + ')';

    if (nav) nav.classList.toggle('scrolled', scrollTop > 24);

    scrollQueued = false;
  }

  function requestScrollUpdate() {
    if (scrollQueued) return;

    scrollQueued = true;
    requestAnimationFrame(updateScrollUI);
  }

  window.addEventListener('scroll', requestScrollUpdate, {
    passive: true
  });

  window.addEventListener('resize', requestScrollUpdate);
  updateScrollUI();

  // Active section tracking
  if ('IntersectionObserver' in window && sections.length) {
    var activeObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        navLinks.forEach(function (a) {
          var active = a.getAttribute('href') === '#' + entry.target.id;
          a.classList.toggle('active', active);

          if (active) {
            a.setAttribute('aria-current', 'location');
          } else {
            a.removeAttribute('aria-current');
          }
        });
      });
    }, {
      rootMargin: '-25% 0px -65% 0px',
      threshold: 0
    });

    sections.forEach(function (section) {
      activeObserver.observe(section);
    });
  }

  // --------------------------------------------------
  // REVEALS + HERO CHOREOGRAPHY
  // --------------------------------------------------

  if (!reduceMotion && 'IntersectionObserver' in window) {
    // Include section headings in the reveal system.
    document.querySelectorAll('.section-head').forEach(function (el) {
      el.classList.add('reveal');
    });

    var revealElements = document.querySelectorAll('.reveal');

    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        entry.target.classList.add('in');
        entry.target.querySelectorAll('.diagram').forEach(function (diagram) {
          diagram.classList.add('is-visible');
        });
        revealObserver.unobserve(entry.target);
      });
    }, {
      rootMargin: '0px 0px -7% 0px',
      threshold: 0.04
    });

    revealElements.forEach(function (el) {
      revealObserver.observe(el);
    });

    // Hero elements enter independently.
    var heroSelectors = [
      '.hero-text > .eyebrow',
      '.hero-name',
      '.hero-title',
      '.hero-stack',
      '.hero-lede',
      '.proof',
      '.hero-cta',
      '.hero-photo'
    ];

    heroSelectors.forEach(function (selector, i) {
      document.querySelectorAll(selector).forEach(function (el) {
        el.style.setProperty('--hero-i', i);
        el.classList.add('hero-enter');
      });
    });

    // Architecture diagrams.
    document.querySelectorAll('.diagram').forEach(function (diagram) {
      var items = diagram.querySelectorAll(
        '.d-node, .d-arrow, .d-badge, .d-link'
      );

      items.forEach(function (item, i) {
        item.style.setProperty('--diagram-i', i);
      });
    });

    // Enable the CSS motion system (usually already set in <head>).
    root.classList.add('motion-ready');

  } else {
    // Never leave content hidden.
    root.classList.remove('motion-ready');
    document.querySelectorAll('.reveal').forEach(function (el) {
      el.classList.add('in');
    });
  }

  // --------------------------------------------------
  // METRIC COUNTERS
  // --------------------------------------------------

  function animateCounter(element) {
    if (element.dataset.counted === 'true') return;

    var original = element.textContent.trim();
    var match = original.match(/^(\d+)(.*)$/);

    if (!match) return;

    var target = parseInt(match[1], 10);
    var suffix = match[2];

    element.dataset.counted = 'true';

    if (reduceMotion) return;

    var start = performance.now();
    var duration = 1100;

    function tick(now) {
      var elapsed = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - elapsed, 4);
      var value = Math.round(target * eased);

      element.textContent = value + suffix;

      if (elapsed < 1) {
        requestAnimationFrame(tick);
      } else {
        element.textContent = original;
      }
    }

    element.textContent = '0' + suffix;
    requestAnimationFrame(tick);
  }

  var metricElements = document.querySelectorAll(
    '.metric-num, .d-badge strong'
  );

  if ('IntersectionObserver' in window && !reduceMotion) {
    var metricObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        animateCounter(entry.target);
        metricObserver.unobserve(entry.target);
      });
    }, { threshold: 0.65 });

    metricElements.forEach(function (el) {
      metricObserver.observe(el);
    });
  } else {
    metricElements.forEach(function (el) {
      el.dataset.counted = 'true';
    });
  }

  // --------------------------------------------------
  // PROJECT CARD SPOTLIGHT
  // --------------------------------------------------

  if (finePointer && !reduceMotion) {
    document.querySelectorAll('.project').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var rect = card.getBoundingClientRect();

        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;

        card.style.setProperty('--spot-x', x + 'px');
        card.style.setProperty('--spot-y', y + 'px');
      });

      card.addEventListener('pointerenter', function () {
        card.classList.add('pointer-active');
      });

      card.addEventListener('pointerleave', function () {
        card.classList.remove('pointer-active');
      });
    });

    // Subtle magnetic response on primary CTAs.
    document.querySelectorAll('.hero-cta .btn-primary').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var rect = btn.getBoundingClientRect();
        var dx = (e.clientX - rect.left - rect.width / 2) / rect.width;
        var dy = (e.clientY - rect.top - rect.height / 2) / rect.height;

        btn.style.transform =
          'translate3d(' + (dx * 4) + 'px,' + (dy * 4) + 'px,0)';
      });

      btn.addEventListener('pointerleave', function () {
        btn.style.transform = '';
      });
    });
  }

  // --------------------------------------------------
  // LIGHTBOX
  // --------------------------------------------------

  var box = document.getElementById('lightbox');
  var boxImg = document.getElementById('lightbox-img');
  var boxCount = document.getElementById('lightbox-count');
  var closeBtn = document.getElementById('lightbox-close');
  var prevBtn = document.getElementById('lightbox-prev');
  var nextBtn = document.getElementById('lightbox-next');

  var shots = Array.prototype.slice.call(
    document.querySelectorAll('.shot')
  );

  var current = 0;
  var lastTrigger = null;
  var closeTimer = null;
  var boxClosing = false;

  function showShot(index) {
    current = (index + shots.length) % shots.length;

    var btn = shots[current];
    var img = btn.querySelector('img');

    boxImg.src = btn.getAttribute('data-full');
    boxImg.alt = img ? img.alt : '';

    if (boxCount) {
      boxCount.textContent = (current + 1) + ' / ' + shots.length;
    }
  }

  function openLightbox(index, trigger) {
    if (!box || box.open) return;

    lastTrigger = trigger;
    boxClosing = false;

    showShot(index);
    box.showModal();

    if (!reduceMotion) {
      requestAnimationFrame(function () {
        box.classList.add('is-open');
      });
    } else {
      box.classList.add('is-open');
    }

    if (closeBtn) closeBtn.focus();
  }

  function finishLightboxClose() {
    clearTimeout(closeTimer);

    if (box && box.open) {
      box.close();
    }

    box.classList.remove('is-open');
    boxClosing = false;

    if (lastTrigger) lastTrigger.focus();
  }

  function closeLightbox() {
    if (!box || !box.open || boxClosing) return;

    boxClosing = true;
    box.classList.remove('is-open');

    if (reduceMotion) {
      finishLightboxClose();
    } else {
      closeTimer = setTimeout(finishLightboxClose, 190);
    }
  }

  if (box && typeof box.showModal === 'function' && shots.length) {
    shots.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        openLightbox(i, btn);
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', closeLightbox);
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        showShot(current - 1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        showShot(current + 1);
      });
    }

    box.addEventListener('cancel', function (e) {
      e.preventDefault();
      closeLightbox();
    });

    box.addEventListener('click', function (e) {
      if (e.target === box) closeLightbox();
    });

    box.addEventListener('close', function () {
      box.classList.remove('is-open');
      boxClosing = false;

      if (lastTrigger) lastTrigger.focus();
    });

    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        showShot(current - 1);
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        showShot(current + 1);
      }
    });
  }

})();
