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

  // Streckenanimation: 45 Punkte laufen im Kreis und scheiden Runde für Runde aus
  var board = $('#board');
  if (board) {
    var simPath = $('#simPath'), dotsG = $('#simDots'), arc = $('#clockArc'), clockT = $('#clockTime');
    var inEl = $('#b-in'), barEl = $('#b-bar'), stateEl = $('#b-state');
    var NS = 'http://www.w3.org/2000/svg';
    var N = 20, LAPS = 5, LAP_MS = 3000; // 5 Runden à 3 Sekunden = 15 Sekunden
    var pad = function (n, l) { n = String(n); while (n.length < l) n = '0' + n; return n; };

    var CIRC = 2 * Math.PI * 38;
    arc.style.strokeDasharray = CIRC;
    var Lp = simPath.getTotalLength();

    // feste Zufallsfolge, damit die Animation bei jedem Aufruf gleich abläuft
    var seed = 7;
    var rnd = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

    // Wie viele sind nach Runde l noch dabei?
    var ALIVE = [N, 20, 13, 7, 3, 1]; // Läufer*innen nach Runde 0..5: vor der letzten Runde noch 3, danach 1
    var aliveAfter = function (l) { return ALIVE[Math.min(l, LAPS)]; };

    var dots = [];
    for (var i = 0; i < N; i++) {
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('r', 4.4);
      dotsG.appendChild(c);
      dots.push({
        el: c, f: 0.74 + rnd() * 0.24, o: (rnd() - 0.5) * 9, rb: rnd() * 11,
        stopP: 0.25 + rnd() * 0.6, drop: Infinity
      });
    }
    dots[0].f = 0.8; dots[0].o = 0; dots[0].rb = 0; // Index 0 gewinnt
    // Ausscheide-Reihenfolge: zufällig, Index 0 bleibt als Letzter übrig
    var order = []; for (i = 1; i < N; i++) order.push(i);
    for (i = order.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var tmp = order[i]; order[i] = order[j]; order[j] = tmp; }
    var k = 0;
    for (var l = 1; l <= LAPS; l++) {
      var n = aliveAfter(l - 1) - aliveAfter(l);
      while (n-- > 0 && k < order.length) dots[order[k++]].drop = l;
    }

    var place = function (d, s, op, cls) {
      var p = simPath.getPointAtLength(s), q = simPath.getPointAtLength(Math.min(Lp, s + 2));
      var dx = q.x - p.x, dy = q.y - p.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
      d.el.setAttribute('cx', (p.x - dy / len * d.o).toFixed(1));
      d.el.setAttribute('cy', (p.y + dx / len * d.o).toFixed(1));
      d.el.setAttribute('opacity', op);
      d.el.setAttribute('class', cls);
    };

    // Uhr: läuft pro Runde von 60:00 auf 00:00 ab
    var setClock = function (frac) {
      var sec = Math.max(0, Math.round(3600 * (1 - frac)));
      clockT.textContent = pad(Math.floor(sec / 60), 2) + ':' + pad(sec % 60, 2);
      arc.style.strokeDashoffset = (CIRC * frac).toFixed(1);
    };
    setClock(0);

    var render = function (t) {
      var done = t >= LAPS * LAP_MS;
      if (done) t = LAPS * LAP_MS - 1;
      var L = Math.floor(t / LAP_MS), lap = L + 1, ms = t - L * LAP_MS, frac = ms / LAP_MS;
      var alive = 0;
      dots.forEach(function (d, idx) {
        if (d.drop < lap) { // schon ausgeschieden: kurz ausblenden
          var fade = d.drop === lap - 1 ? 1 - ms / 600 : 0;
          if (fade > 0) place(d, d.stopS || 0, fade * 0.5, 'out'); else d.el.setAttribute('opacity', 0);
          return;
        }
        var prog = Math.min(1, frac / d.f), cls = idx === 0 ? 'win' : 'run';
        if (d.drop === lap && prog >= d.stopP) { // scheidet in dieser Runde aus
          d.stopS = d.stopP * Lp;
          place(d, d.stopS, 0.6, 'out');
          return;
        }
        alive++;
        place(d, prog >= 1 ? Lp - d.rb : prog * Lp, 1, cls);
      });
      if (done) {
        alive = 1; stateEl.textContent = '';
        dots.forEach(function (d, idx) { if (idx) d.el.setAttribute('opacity', 0); });
        dots[0].el.setAttribute('opacity', 0);
        $('#medal').classList.add('medal-in');
        $('#clock').style.opacity = 0.18;
      }
      else stateEl.textContent = '';
      inEl.textContent = pad(alive, 2);
      setClock(done ? 1 : frac);
      barEl.style.transform = 'scaleX(' + (alive / N) + ')';
      return done;
    };

    if (reduce || !('IntersectionObserver' in window)) {
      render(LAPS * LAP_MS);
      dots.forEach(function (d, idx) { if (idx) d.el.setAttribute('opacity', 0); });
    } else {
      stateEl.textContent = '';
      dots.forEach(function (d) { place(d, Lp - d.rb, 1, 'run'); });
      dots[0].el.setAttribute('class', 'win');
      var bo = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        bo.disconnect();
        var t0 = null;
        (function step(ts) {
          if (t0 === null) t0 = ts;
          if (!render(ts - t0)) requestAnimationFrame(step);
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
