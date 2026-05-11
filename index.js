document.addEventListener('DOMContentLoaded', () => {

  /* ─────────────────────────────────────────
     BUILD WATCH URL from episode _src path
  ───────────────────────────────────────── */
  function buildWatchUrl(ep) {
    const fallback = ep.shortlink || ep.download || '#';
    try {
      const raw = (ep._src || '').replace(/^\/+/, '');
      const m = raw.match(/^episode-data\/(.+?)-s(\d+)(?:-([a-z]{2,3}|dub))?\.json$/i);
      if (!m) return fallback;
      const slug = m[1], season = m[2], lang = (m[3] || '').toLowerCase();
      const p = new URLSearchParams();
      p.set('series', slug); p.set('season', season);
      if (ep.ep != null) p.set('ep', ep.ep);
      if (lang && lang !== 'dub') p.set('lang', lang);
      else if (lang === 'dub') p.set('lang', 'dub');
      return `episode.html?${p.toString()}`;
    } catch { return fallback; }
  }

  /* ─────────────────────────────────────────
     LANG LABEL — reads _src filename accurately
     e.g. episode-data/kurulus-orhan-s1-ur.json → "URDU SUB"
          episode-data/kurulus-orhan-s1.json    → "DUB"
          episode-data/kurulus-orhan-s1-dub.json→ "DUB"
  ───────────────────────────────────────── */
  function getLangLabel(ep) {
    const raw = (ep._src || '').toLowerCase();
    // match the lang code just before .json
    const m = raw.match(/-s\d+(?:-([a-z]{2,3}))?\.json$/i);
    if (!m || !m[1] || m[1] === 'dub') return 'DUB';
    const map = { en: 'ENG SUB', ur: 'URDU SUB', hi: 'HINDI SUB', ar: 'ARABIC SUB', sp: 'ESP SUB' };
    return map[m[1]] || (m[1].toUpperCase() + ' SUB');
  }

  /* series slug from _src */
  function getSlug(ep) {
    const m = (ep._src || '').match(/^episode-data\/(.+?)-s\d+/);
    return m ? m[1] : '';
  }

  /* ─────────────────────────────────────────
     INTERSECTION OBSERVER — add .vis class
  ───────────────────────────────────────── */
  function animateIn(elements) {
    if (!elements || !elements.length) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('vis'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.05 });
    elements.forEach(el => obs.observe(el));
  }

  /* ─────────────────────────────────────────
     SHARED DATA PROMISES
  ───────────────────────────────────────── */
  const episodesReady = fetch('episode-data/index.json')
    .then(r => r.json())
    .then(files => Promise.all(
      files.map(path =>
        fetch(path)
          .then(r => r.ok ? r.json() : [])
          .then(data => Array.isArray(data) ? data.map(ep => ({ ...ep, _src: path })) : [])
          .catch(() => [])
      )
    ))
    .then(arrays => {
      const all = arrays.flat().filter(ep => ep.timestamp);
      all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return all;
    })
    .catch(() => []);

  const seriesReady = fetch('series.json')
    .then(r => r.ok ? r.json() : [])
    .then(d => Array.isArray(d) ? d : [])
    .catch(() => []);

  /* ═════════════════════════════════════════
     HERO — cinematic new episodes banner
     • correct lang label per episode (DUB / URDU SUB / ENG SUB)
     • NO arrow buttons — finger swipe only
     • NO Info button — only Watch Now
     • dots for navigation
  ═════════════════════════════════════════ */
  const heroEl    = document.getElementById('hero');
  const heroInner = document.getElementById('hero-inner');

  episodesReady.then(all => {
    const latest = all.slice(0, 5);
    if (!latest.length || !heroInner) return;

    heroInner.innerHTML = '';

    latest.forEach((ep, i) => {
      const url      = buildWatchUrl(ep);
      const slug     = getSlug(ep);
      const langTxt  = getLangLabel(ep);
      const bg       = ep.thumb || ep.poster || ep.banner || '';
      const series   = ep.series || '';
      const title    = ep.title || ('Episode ' + (ep.ep || ''));

      const slide = document.createElement('div');
      slide.className = 'h-slide' + (i === 0 ? ' on' : '');
      slide.innerHTML = `
        <div class="h-bg" style="background-image:url('${bg}')"></div>
        <div class="h-vig"></div>
        <div class="h-top-label">
          <span class="h-new-badge">NEW EPISODE</span>
          <span class="h-lang-badge">${langTxt}</span>
        </div>
        <div class="h-body">
          ${series ? `<div class="h-series">${series}</div>` : ''}
          <div class="h-title">${title}</div>
          <a href="${url}" class="h-watch-btn">▶ Watch Now</a>
          ${i === 0 ? '<div id="h-dots"></div>' : ''}
        </div>
      `;
      heroInner.appendChild(slide);
    });

    /* build dots */
    const dotsEl = document.getElementById('h-dots');
    if (dotsEl) {
      dotsEl.innerHTML = latest.map((_, i) =>
        `<div class="h-dot${i === 0 ? ' on' : ''}" data-i="${i}"></div>`
      ).join('');
    }

    const slides = Array.from(heroInner.querySelectorAll('.h-slide'));
    const dots   = Array.from(heroInner.querySelectorAll('.h-dot'));
    let cur = 0, autoTimer;

    function goTo(n) {
      slides[cur].classList.remove('on');
      dots[cur]?.classList.remove('on');
      cur = ((n % slides.length) + slides.length) % slides.length;
      slides[cur].classList.add('on');
      dots[cur]?.classList.add('on');
    }
    function startAuto() {
      clearInterval(autoTimer);
      autoTimer = setInterval(() => goTo(cur + 1), 5000);
    }

    /* dot click */
    dots.forEach(d => d.addEventListener('click', () => { goTo(+d.dataset.i); startAuto(); }));

    /* finger swipe — no arrow buttons */
    let touchX = 0;
    heroEl.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
    heroEl.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 38) { goTo(cur + (dx < 0 ? 1 : -1)); startAuto(); }
    }, { passive: true });

    startAuto();
  });

  /* ═════════════════════════════════════════
     SCHEDULE — vertical stacked, above recommended
  ═════════════════════════════════════════ */
  const schedList = document.getElementById('sched-list');
  if (schedList) {
    fetch('shedule.json')
      .then(r => r.json())
      .then(schedule => {
        if (!Array.isArray(schedule) || !schedule.length) {
          schedList.innerHTML = `<div style="color:var(--muted);font-size:.86rem;padding:.7em 1em;">No upcoming schedule.</div>`;
          return;
        }
        schedList.innerHTML = schedule.map(item => `
          <div class="sc-card${item.live ? ' live-c' : ''}">
            ${item.poster ? `<img src="${item.poster}" alt="${item.title||''}" class="sc-img" loading="lazy" decoding="async">` : ''}
            <div class="sc-body">
              <div class="sc-title">${item.title || ''}</div>
              <div class="sc-meta">
                ${item.day  ? `<span class="sc-day">${item.day}</span>` : ''}
                ${item.day && item.time ? `<span class="sc-dot">•</span>` : ''}
                ${item.time ? `<span class="sc-time">${item.time}</span>` : ''}
                ${item.type ? `<span class="sc-dot">•</span><span class="sc-type">${item.type}</span>` : ''}
                ${item.live ? `<span class="sc-live">LIVE</span>` : ''}
              </div>
            </div>
            ${item.countdown ? `<div class="sc-cd" data-time="${item.countdown}">...</div>` : ''}
          </div>
        `).join('');

        schedList.querySelectorAll('.sc-cd').forEach(el => {
          const target = Date.parse(el.dataset.time);
          if (isNaN(target)) { el.textContent = ''; return; }
          const tick = () => {
            const d = target - Date.now();
            if (d <= 0) { el.textContent = '🔴 Now'; clearInterval(id); return; }
            const h = Math.floor(d / 3600000);
            const m = Math.floor((d % 3600000) / 60000);
            const s = Math.floor((d % 60000) / 1000);
            el.textContent = `${h}h ${m}m ${s}s`;
          };
          tick(); const id = setInterval(tick, 1000);
        });

        animateIn(Array.from(schedList.querySelectorAll('.sc-card')));
      })
      .catch(() => {
        schedList.innerHTML = `<div style="color:var(--muted);font-size:.86rem;padding:.7em 1em;">Schedule unavailable.</div>`;
      });
  }

  /* ═════════════════════════════════════════
     RECOMMENDED — portrait cards, horizontal scroll
     Loads from recommended.json (array of slugs)
     Falls back to first 5 from series.json
  ═════════════════════════════════════════ */
  const recInner = document.getElementById('rec-inner');

  if (recInner) {
    seriesReady.then(allSeries => {
      if (!allSeries.length) return;

      fetch('recommended.json')
        .then(r => r.ok ? r.json() : null)
        .then(slugs => {
          let list;
          if (Array.isArray(slugs) && slugs.length) {
            list = slugs.map(slug => allSeries.find(s => s.slug === slug)).filter(Boolean).slice(0, 5);
          }
          if (!list || !list.length) list = allSeries.slice(0, 5);
          renderRec(list);
        })
        .catch(() => renderRec(allSeries.slice(0, 5)));
    });
  }

  function renderRec(list) {
    if (!recInner || !list.length) return;
    recInner.innerHTML = list.map(s => `
      <a class="rec-card" href="series.html?series=${s.slug}">
        <img src="${s.poster}" alt="${s.title}" loading="lazy" decoding="async">
        <div class="rc-title">${s.title}</div>
      </a>
    `).join('');
    animateIn(Array.from(recInner.querySelectorAll('.rec-card')));
  }

  /* ═════════════════════════════════════════
     SERIES GRID
  ═════════════════════════════════════════ */
  const grid     = document.getElementById('series-grid');
  const pillDub  = document.getElementById('pill-dub');
  const pillSub  = document.getElementById('pill-sub');
  const subLangs = document.getElementById('sub-langs');

  if (grid) {
    let SERIES = [];
    const qs = new URLSearchParams(location.search);
    let state = {
      track: qs.get('track') || localStorage.getItem('track')   || 'dubbed',
      lang:  qs.get('lang')  || localStorage.getItem('subLang') || 'en',
      q: ''
    };

    seriesReady.then(data => {
      SERIES = data;
      grid.querySelectorAll('.skel').forEach(s => s.remove());
      hydrateUI(); render();
    }).catch(() => {
      grid.querySelectorAll('.skel').forEach(s => s.remove());
      grid.innerHTML = `<div style="color:#f87171;padding:1.2em;grid-column:1/-1;">Could not load series.</div>`;
    });

    function hydrateUI() {
      setPrimary(state.track); toggleSubLangs();
      subLangs?.querySelectorAll('.pill').forEach(b => {
        const a = b.dataset.lang === state.lang;
        b.classList.toggle('active', a); b.setAttribute('aria-pressed', String(a));
      });
    }
    function setPrimary(track) {
      state.track = track; localStorage.setItem('track', track);
      pillDub?.classList.toggle('active', track === 'dubbed');
      pillSub?.classList.toggle('active', track === 'sub');
      pillDub?.setAttribute('aria-pressed', String(track === 'dubbed'));
      pillSub?.setAttribute('aria-pressed', String(track === 'sub'));
    }
    function toggleSubLangs() { subLangs?.classList.toggle('hidden', state.track !== 'sub'); }
    function setLang(lang) {
      state.lang = lang; localStorage.setItem('subLang', lang);
      subLangs?.querySelectorAll('.pill').forEach(b => {
        const a = b.dataset.lang === lang;
        b.classList.toggle('active', a); b.setAttribute('aria-pressed', String(a));
      });
    }

    pillDub?.addEventListener('click', () => { setPrimary('dubbed'); toggleSubLangs(); render(); });
    pillSub?.addEventListener('click', () => { setPrimary('sub');    toggleSubLangs(); render(); });
    subLangs?.addEventListener('click', e => {
      const t = e.target;
      if (t?.matches('.pill') && t.dataset.lang) { setLang(t.dataset.lang); render(); }
    });

    function render() {
      let list = SERIES;
      if (state.track === 'dubbed') list = list.filter(s => s.track === 'dubbed');
      else list = list.filter(s => s.track === 'sub' && s.subLang === state.lang);
      if (state.q) list = list.filter(s => (s.title || '').toLowerCase().includes(state.q));

      if (!list.length) {
        grid.innerHTML = `<div style="color:var(--muted);padding:1.5em;grid-column:1/-1;text-align:center;">No series found.</div>`;
        return;
      }
      grid.innerHTML = list.map(s => `
        <a class="card" href="series.html?series=${s.slug}">
          <img src="${s.poster}" alt="${s.title}" loading="lazy" decoding="async">
          <div class="title">${s.title}</div>
        </a>
      `).join('');
      const cards = Array.from(grid.querySelectorAll('.card'));
      cards.forEach((c, i) => { c.style.animationDelay = (i * 0.04) + 's'; });
      animateIn(cards);
    }
  }

  /* ═════════════════════════════════════════
     SEARCH OVERLAY
     Results render as portrait cards (a.srch-card)
     CSS in HTML uses !important to beat style.css
  ═════════════════════════════════════════ */
  const srchInp  = document.getElementById('srch-inp');
  const srchGrid = document.getElementById('srch-grid');

  if (srchInp && srchGrid) {
    srchInp.addEventListener('input', () => {
      const q = srchInp.value.trim().toLowerCase();
      if (!q) {
        srchGrid.innerHTML = '<div class="srch-hint">🔍 Start typing to search...</div>';
        return;
      }
      seriesReady.then(series => {
        const results = series.filter(s => (s.title || '').toLowerCase().includes(q));
        if (!results.length) {
          srchGrid.innerHTML = `<div class="srch-hint">No results for "<b>${q}</b>"</div>`;
          return;
        }
        /* Use <a> tag so CSS specificity a.srch-card beats style.css .card rules */
        srchGrid.innerHTML = results.map(s => `
          <a class="srch-card" href="series.html?series=${s.slug}">
            <img src="${s.poster}" alt="${s.title}" loading="lazy" decoding="async">
            <div class="s-title">${s.title}</div>
          </a>
        `).join('');
      });
    });
  }

});
