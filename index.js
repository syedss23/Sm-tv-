document.addEventListener('DOMContentLoaded', () => {

  /* ══════════════════════════════════════════════════
     LANG LABEL — reads the _src filename to decide
     whether episode is DUB or which subtitle language.

     Your files are named like:
       episode-data/kurulus-orhan-s1.json       → DUB
       episode-data/kurulus-orhan-s1-ur.json    → URDU SUB
       episode-data/kurulus-orhan-s1-en.json    → ENG SUB
       episode-data/kurulus-orhan-s1-hi.json    → HINDI SUB

     Logic: take the last segment before ".json",
     split by "-", look at the very last piece.
     If it's a known lang code → subtitle.
     Otherwise → DUB.
  ══════════════════════════════════════════════════ */
  function getLangLabel(ep) {
    try {
      const src = (ep._src || '').toLowerCase().replace('.json', '');
      // last part after final hyphen, e.g. "...s1-ur" → "ur", "...s1" → "s1"
      const parts = src.split('-');
      const last = parts[parts.length - 1]; // e.g. "ur", "en", "s1", "s2"
      const subMap = { en: 'ENG SUB', ur: 'URDU SUB', hi: 'HINDI SUB', ar: 'ARABIC SUB', sp: 'ESP SUB' };
      if (subMap[last]) return subMap[last];
      // if last part is "dub" explicitly
      if (last === 'dub') return 'DUB';
      // if last part is a season number like "s1", "s2" → dubbed (no lang suffix)
      return 'DUB';
    } catch (e) {
      return 'DUB';
    }
  }

  /* ══════════════════════════════════════════════════
     BUILD WATCH URL
  ══════════════════════════════════════════════════ */
  function buildWatchUrl(ep) {
    const fallback = ep.shortlink || ep.download || '#';
    try {
      const raw = (ep._src || '').replace(/^\/+/, '');
      const m = raw.match(/^episode-data\/(.+?)-s(\d+)(?:-([a-z]{2,3}|dub))?\.json$/i);
      if (!m) return fallback;
      const slug = m[1], season = m[2], lang = (m[3] || '').toLowerCase();
      const p = new URLSearchParams();
      p.set('series', slug);
      p.set('season', season);
      if (ep.ep != null) p.set('ep', ep.ep);
      if (lang && lang !== 'dub') p.set('lang', lang);
      else if (lang === 'dub') p.set('lang', 'dub');
      return 'episode.html?' + p.toString();
    } catch (e) {
      return fallback;
    }
  }

  /* series slug from _src */
  function getSlug(ep) {
    const m = (ep._src || '').match(/^episode-data\/(.+?)-s\d+/);
    return m ? m[1] : '';
  }

  /* ══════════════════════════════════════════════════
     INTERSECTION OBSERVER — entrance animations
  ══════════════════════════════════════════════════ */
  function animateIn(elements) {
    if (!elements || !elements.length) return;
    const obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) { e.target.classList.add('vis'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.05 });
    elements.forEach(function(el) { obs.observe(el); });
  }

  /* ══════════════════════════════════════════════════
     SHARED DATA PROMISES
  ══════════════════════════════════════════════════ */
  var episodesReady = fetch('episode-data/index.json')
    .then(function(r) { return r.json(); })
    .then(function(files) {
      return Promise.all(files.map(function(path) {
        return fetch(path)
          .then(function(r) { return r.ok ? r.json() : []; })
          .then(function(data) {
            return Array.isArray(data) ? data.map(function(ep) {
              return Object.assign({}, ep, { _src: path });
            }) : [];
          })
          .catch(function() { return []; });
      }));
    })
    .then(function(arrays) {
      var all = [].concat.apply([], arrays).filter(function(ep) { return ep.timestamp; });
      all.sort(function(a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
      return all;
    })
    .catch(function() { return []; });

  var seriesReady = fetch('series.json')
    .then(function(r) { return r.ok ? r.json() : []; })
    .then(function(d) { return Array.isArray(d) ? d : []; })
    .catch(function() { return []; });

  /* ══════════════════════════════════════════════════
     HERO — new episodes cinematic banner
     - Correct DUB/SUB label per episode
     - Finger swipe only (no arrow buttons)
     - No Info button — Watch Now only
  ══════════════════════════════════════════════════ */
  var heroEl    = document.getElementById('hero');
  var heroInner = document.getElementById('hero-inner');

  episodesReady.then(function(all) {
    var latest = all.slice(0, 5);
    if (!latest.length || !heroInner) return;

    heroInner.innerHTML = '';

    latest.forEach(function(ep, i) {
      var url     = buildWatchUrl(ep);
      var lang    = getLangLabel(ep);
      var bg      = ep.thumb || ep.poster || ep.banner || '';
      var series  = ep.series || '';
      var title   = ep.title || ('Episode ' + (ep.ep || ''));
      var slug    = getSlug(ep);

      var slide = document.createElement('div');
      slide.className = 'h-slide' + (i === 0 ? ' on' : '');
      slide.innerHTML =
        '<div class="h-bg" style="background-image:url(\'' + bg + '\')"></div>' +
        '<div class="h-vig"></div>' +
        '<div class="h-top-label">' +
          '<span class="h-new-badge">NEW EPISODE</span>' +
          '<span class="h-lang-badge">' + lang + '</span>' +
        '</div>' +
        '<div class="h-body">' +
          (series ? '<div class="h-series">' + series + '</div>' : '') +
          '<div class="h-title">' + title + '</div>' +
          '<a href="' + url + '" class="h-watch-btn">\u25BA Watch Now</a>' +
          (i === 0 ? '<div id="h-dots"></div>' : '') +
        '</div>';
      heroInner.appendChild(slide);
    });

    // build dots
    var dotsEl = document.getElementById('h-dots');
    if (dotsEl) {
      dotsEl.innerHTML = latest.map(function(_, i) {
        return '<div class="h-dot' + (i === 0 ? ' on' : '') + '" data-i="' + i + '"></div>';
      }).join('');
    }

    var slides = Array.from(heroInner.querySelectorAll('.h-slide'));
    var dots   = Array.from(heroInner.querySelectorAll('.h-dot'));
    var cur = 0;
    var autoTimer;

    function goTo(n) {
      slides[cur].classList.remove('on');
      if (dots[cur]) dots[cur].classList.remove('on');
      cur = ((n % slides.length) + slides.length) % slides.length;
      slides[cur].classList.add('on');
      if (dots[cur]) dots[cur].classList.add('on');
    }
    function startAuto() {
      clearInterval(autoTimer);
      autoTimer = setInterval(function() { goTo(cur + 1); }, 5000);
    }

    dots.forEach(function(d) {
      d.addEventListener('click', function() { goTo(parseInt(d.dataset.i)); startAuto(); });
    });

    // touch swipe
    var touchX = 0;
    if (heroEl) {
      heroEl.addEventListener('touchstart', function(e) { touchX = e.touches[0].clientX; }, { passive: true });
      heroEl.addEventListener('touchend', function(e) {
        var dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 38) { goTo(cur + (dx < 0 ? 1 : -1)); startAuto(); }
      }, { passive: true });
    }

    startAuto();
  });

  /* ══════════════════════════════════════════════════
     SCHEDULE — vertical stacked cards
  ══════════════════════════════════════════════════ */
  var schedList = document.getElementById('sched-list');
  if (schedList) {
    fetch('shedule.json')
      .then(function(r) { return r.json(); })
      .then(function(schedule) {
        if (!Array.isArray(schedule) || !schedule.length) {
          schedList.innerHTML = '<div style="color:var(--muted);font-size:.86rem;padding:.7em 1em;">No upcoming schedule.</div>';
          return;
        }
        schedList.innerHTML = schedule.map(function(item) {
          return '<div class="sc-card' + (item.live ? ' live-c' : '') + '">' +
            (item.poster ? '<img src="' + item.poster + '" alt="' + (item.title || '') + '" class="sc-img" loading="lazy">' : '') +
            '<div class="sc-body">' +
              '<div class="sc-title">' + (item.title || '') + '</div>' +
              '<div class="sc-meta">' +
                (item.day  ? '<span class="sc-day">' + item.day + '</span>' : '') +
                (item.day && item.time ? '<span class="sc-dot">&bull;</span>' : '') +
                (item.time ? '<span class="sc-time">' + item.time + '</span>' : '') +
                (item.type ? '<span class="sc-dot">&bull;</span><span class="sc-type">' + item.type + '</span>' : '') +
                (item.live ? '<span class="sc-live">LIVE</span>' : '') +
              '</div>' +
            '</div>' +
            (item.countdown ? '<div class="sc-cd" data-time="' + item.countdown + '">...</div>' : '') +
          '</div>';
        }).join('');

        schedList.querySelectorAll('.sc-cd').forEach(function(el) {
          var target = Date.parse(el.dataset.time);
          if (isNaN(target)) { el.textContent = ''; return; }
          var id;
          function tick() {
            var d = target - Date.now();
            if (d <= 0) { el.textContent = 'Now'; clearInterval(id); return; }
            var h = Math.floor(d / 3600000);
            var m = Math.floor((d % 3600000) / 60000);
            var s = Math.floor((d % 60000) / 1000);
            el.textContent = h + 'h ' + m + 'm ' + s + 's';
          }
          tick(); id = setInterval(tick, 1000);
        });

        animateIn(Array.from(schedList.querySelectorAll('.sc-card')));
      })
      .catch(function() {
        schedList.innerHTML = '<div style="color:var(--muted);font-size:.86rem;padding:.7em 1em;">Schedule unavailable.</div>';
      });
  }

  /* ══════════════════════════════════════════════════
     RECOMMENDED — portrait cards, horizontal scroll
  ══════════════════════════════════════════════════ */
  var recInner = document.getElementById('rec-inner');
  if (recInner) {
    seriesReady.then(function(allSeries) {
      if (!allSeries.length) return;
      fetch('recommended.json')
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(slugs) {
          var list;
          if (Array.isArray(slugs) && slugs.length) {
            list = slugs.map(function(slug) {
              return allSeries.find(function(s) { return s.slug === slug; });
            }).filter(Boolean).slice(0, 5);
          }
          if (!list || !list.length) list = allSeries.slice(0, 5);
          renderRec(list);
        })
        .catch(function() { renderRec(allSeries.slice(0, 5)); });
    });
  }

  function renderRec(list) {
    if (!recInner || !list.length) return;
    recInner.innerHTML = list.map(function(s) {
      return '<a class="rec-card" href="series.html?series=' + s.slug + '">' +
        '<img src="' + s.poster + '" alt="' + s.title + '" loading="lazy" decoding="async">' +
        '<div class="rc-title">' + s.title + '</div>' +
      '</a>';
    }).join('');
    animateIn(Array.from(recInner.querySelectorAll('.rec-card')));
  }

  /* ══════════════════════════════════════════════════
     SERIES GRID — filter + search
  ══════════════════════════════════════════════════ */
  var grid     = document.getElementById('series-grid');
  var pillDub  = document.getElementById('pill-dub');
  var pillSub  = document.getElementById('pill-sub');
  var subLangs = document.getElementById('sub-langs');

  if (grid) {
    var SERIES = [];
    var qs = new URLSearchParams(location.search);
    var state = {
      track: qs.get('track') || localStorage.getItem('track')   || 'dubbed',
      lang:  qs.get('lang')  || localStorage.getItem('subLang') || 'en',
      q: ''
    };

    seriesReady.then(function(data) {
      SERIES = data;
      grid.querySelectorAll('.skel').forEach(function(s) { s.remove(); });
      hydrateUI();
      render();
    }).catch(function() {
      grid.querySelectorAll('.skel').forEach(function(s) { s.remove(); });
      grid.innerHTML = '<div style="color:#f87171;padding:1.2em;grid-column:1/-1;">Could not load series.</div>';
    });

    function hydrateUI() {
      setPrimary(state.track); toggleSubLangs();
      if (subLangs) subLangs.querySelectorAll('.pill').forEach(function(b) {
        var a = b.dataset.lang === state.lang;
        b.classList.toggle('active', a); b.setAttribute('aria-pressed', String(a));
      });
    }
    function setPrimary(track) {
      state.track = track; localStorage.setItem('track', track);
      if (pillDub) { pillDub.classList.toggle('active', track === 'dubbed'); pillDub.setAttribute('aria-pressed', String(track === 'dubbed')); }
      if (pillSub) { pillSub.classList.toggle('active', track === 'sub');    pillSub.setAttribute('aria-pressed', String(track === 'sub')); }
    }
    function toggleSubLangs() {
      if (subLangs) subLangs.classList.toggle('hidden', state.track !== 'sub');
    }
    function setLang(lang) {
      state.lang = lang; localStorage.setItem('subLang', lang);
      if (subLangs) subLangs.querySelectorAll('.pill').forEach(function(b) {
        var a = b.dataset.lang === lang;
        b.classList.toggle('active', a); b.setAttribute('aria-pressed', String(a));
      });
    }

    if (pillDub) pillDub.addEventListener('click', function() { setPrimary('dubbed'); toggleSubLangs(); render(); });
    if (pillSub) pillSub.addEventListener('click', function() { setPrimary('sub'); toggleSubLangs(); render(); });
    if (subLangs) subLangs.addEventListener('click', function(e) {
      var t = e.target;
      if (t && t.matches('.pill') && t.dataset.lang) { setLang(t.dataset.lang); render(); }
    });

    function render() {
      var list = SERIES;
      if (state.track === 'dubbed') list = list.filter(function(s) { return s.track === 'dubbed'; });
      else list = list.filter(function(s) { return s.track === 'sub' && s.subLang === state.lang; });
      if (state.q) list = list.filter(function(s) { return (s.title || '').toLowerCase().indexOf(state.q) >= 0; });

      if (!list.length) {
        grid.innerHTML = '<div style="color:var(--muted);padding:1.5em;grid-column:1/-1;text-align:center;">No series found.</div>';
        return;
      }
      grid.innerHTML = list.map(function(s) {
        return '<a class="card" href="series.html?series=' + s.slug + '">' +
          '<img src="' + s.poster + '" alt="' + s.title + '" loading="lazy" decoding="async">' +
          '<div class="title">' + s.title + '</div>' +
        '</a>';
      }).join('');
      var cards = Array.from(grid.querySelectorAll('.card'));
      cards.forEach(function(c, i) { c.style.animationDelay = (i * 0.04) + 's'; });
      animateIn(cards);
    }
  }

  /* ══════════════════════════════════════════════════
     SEARCH OVERLAY
     KEY FIX: all styles are INLINE on elements so
     nothing from style.css can override them.
     Images get explicit width/height so they show
     as portrait squares with title below.
  ══════════════════════════════════════════════════ */
  var srchInp  = document.getElementById('srch-inp');
  var srchGrid = document.getElementById('srch-grid');

  if (srchInp && srchGrid) {
    srchInp.addEventListener('input', function() {
      var q = srchInp.value.trim().toLowerCase();
      if (!q) {
        srchGrid.innerHTML = '<div class="srch-hint">\uD83D\uDD0D Start typing to search...</div>';
        return;
      }
      seriesReady.then(function(series) {
        var results = series.filter(function(s) {
          return (s.title || '').toLowerCase().indexOf(q) >= 0;
        });
        if (!results.length) {
          srchGrid.innerHTML = '<div class="srch-hint">No results for <b>' + q + '</b></div>';
          return;
        }

        // ALL styles inline — beats any external CSS 100%
        var cardStyle = [
          'display:flex',
          'flex-direction:column',
          'background:#111e30',
          'border:1px solid rgba(212,168,39,0.2)',
          'border-radius:12px',
          'overflow:hidden',
          'text-decoration:none',
          'width:100%'
        ].join(';');

        var imgStyle = [
          'display:block',
          'width:100%',
          'height:auto',
          'aspect-ratio:2/3',
          'object-fit:cover',
          'object-position:center top',
          'flex-shrink:0'
        ].join(';');

        var titleStyle = [
          'display:block',
          'padding:8px 10px 10px',
          'font-size:0.84rem',
          'font-weight:700',
          'color:#f8f4ee',
          'line-height:1.3',
          'font-family:DM Sans,sans-serif'
        ].join(';');

        srchGrid.innerHTML = results.map(function(s) {
          return '<a href="series.html?series=' + s.slug + '" style="' + cardStyle + '">' +
            '<img src="' + s.poster + '" alt="' + s.title + '" loading="lazy" style="' + imgStyle + '">' +
            '<span style="' + titleStyle + '">' + s.title + '</span>' +
          '</a>';
        }).join('');
      });
    });
  }

});
