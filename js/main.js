(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };

  // Menü
  var nav = $('#nav'), burger = $('#burger');
  if (burger) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open);
      burger.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
    });
  }

  // Einblenden beim Scrollen
  var revealEls = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  // Strecke zeichnen
  var line = $('#routeLine'), map = $('#routeMap');
  if (line && map) {
    var len = Math.ceil(line.getTotalLength());
    line.style.setProperty('--len', len);
    if (reduce || !('IntersectionObserver' in window)) {
      line.style.strokeDashoffset = 0;
    } else {
      var mo = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { map.classList.add('in'); mo.disconnect(); }
      }, { threshold: 0.3 });
      mo.observe(map);
    }
  }

  // Anzeigetafel
  var board = $('#board');
  if (board) {
    var lap = $('#b-lap'), inn = $('#b-in'), km = $('#b-km'), bar = $('#b-bar');
    var pad = function (n, l) { n = String(n); while (n.length < l) n = '0' + n; return n; };
    var set = function (t) {
      // Die ersten Starter*innen scheiden erst nach Runde 5 aus, danach bricht das Feld schnell ein.
      var l = Math.round(30 * t);
      // Bis Runde 29 bleiben mindestens 2 im Rennen, erst in Runde 30 bleibt eine Person übrig.
      var u = Math.max(0, Math.min(1, (l - 5) / 24));
      var e = 1 - Math.pow(1 - u, 2);
      var p = l >= 30 ? 1 : Math.max(2, Math.round(45 - 43 * e));
      lap.textContent = pad(l, 2); inn.textContent = pad(p, 2); km.textContent = pad(l * 6, 3);
      bar.style.transform = 'scaleX(' + (p / 45) + ')';
    };
    if (reduce || !('IntersectionObserver' in window)) { set(1); }
    else {
      set(0);
      var bo = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        bo.disconnect();
        var start = null, dur = 7000;
        (function step(ts) {
          if (start === null) start = ts;
          var t = Math.min(1, (ts - start) / dur);
          set(t);
          if (t < 1) requestAnimationFrame(step);
        })(performance.now());
      }, { threshold: 0.4 });
      bo.observe(board);
    }
  }

  // Galerie
  var gal = $('#gallery'), count = $('#galCount');
  if (gal) {
    var items = gal.children, total = items.length;
    var idx = function () {
      var w = items[0].getBoundingClientRect().width + 2;
      return Math.min(total - 1, Math.round(gal.scrollLeft / w));
    };
    var upd = function () { count.textContent = (idx() + 1) + ' / ' + total; };
    var go = function (d) {
      var w = items[0].getBoundingClientRect().width + 2;
      gal.scrollTo({ left: (idx() + d) * w, behavior: reduce ? 'auto' : 'smooth' });
    };
    $('#galPrev').addEventListener('click', function () { go(-1); });
    $('#galNext').addEventListener('click', function () { go(1); });
    gal.addEventListener('scroll', function () { window.requestAnimationFrame(upd); }, { passive: true });
    gal.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
    upd();
  }
})();
