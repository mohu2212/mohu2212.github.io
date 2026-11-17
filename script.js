(function () {
  var root = document.documentElement;

  // Theme toggle (dark by default, remembered per browser)
  var themeBtn = document.getElementById('theme-toggle');
  function setThemeLabel() {
    var light = root.getAttribute('data-theme') === 'light';
    themeBtn.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', light ? '#F7F9FC' : '#0B0F14');
  }
  if (themeBtn) {
    setThemeLabel();
    themeBtn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      setThemeLabel();
    });
  }

  // Mobile menu
  var menuBtn = document.getElementById('menu-toggle');
  var links = document.getElementById('nav-links');
  function closeMenu() {
    links.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Open menu');
  }
  if (menuBtn && links) {
    menuBtn.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') closeMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && links.classList.contains('open')) { closeMenu(); menuBtn.focus(); }
    });
  }

  // More projects: show all / show fewer
  var moreBtn = document.getElementById('more-toggle');
  var moreList = document.getElementById('more-list');
  if (moreBtn && moreList) {
    moreBtn.addEventListener('click', function () {
      var expanded = moreList.classList.toggle('expanded');
      moreBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      moreBtn.textContent = expanded ? 'Show fewer projects' : 'Show all projects';
    });
  }

  // Screenshot lightbox with previous/next
  var box = document.getElementById('lightbox');
  var boxImg = document.getElementById('lightbox-img');
  var boxCount = document.getElementById('lightbox-count');
  var shots = Array.prototype.slice.call(document.querySelectorAll('.shot'));
  var current = 0;
  var lastTrigger = null;
  function showShot(i) {
    current = (i + shots.length) % shots.length;
    var btn = shots[current];
    var img = btn.querySelector('img');
    boxImg.src = btn.getAttribute('data-full');
    boxImg.alt = img ? img.alt : '';
    if (boxCount) boxCount.textContent = (current + 1) + ' / ' + shots.length;
  }
  if (box && typeof box.showModal === 'function' && shots.length) {
    shots.forEach(function (btn, i) {
      btn.addEventListener('click', function () { lastTrigger = btn; showShot(i); box.showModal(); });
    });
    document.getElementById('lightbox-close').addEventListener('click', function () { box.close(); });
    document.getElementById('lightbox-prev').addEventListener('click', function () { showShot(current - 1); });
    document.getElementById('lightbox-next').addEventListener('click', function () { showShot(current + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) box.close(); });
    box.addEventListener('close', function () { if (lastTrigger) lastTrigger.focus(); });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); showShot(current - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); showShot(current + 1); }
    });
  }

  // Active nav link while scrolling
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-links a'));
  var sections = navLinks.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);

  // Reveal on scroll (content stays visible without JS or with reduced motion)
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    reveals.forEach(function (el) { io.observe(el); });

    var navIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          navLinks.forEach(function (a) {
            a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id);
          });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { navIo.observe(s); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }
})();
