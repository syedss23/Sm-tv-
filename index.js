document.addEventListener('DOMContentLoaded', () => {

  /* ══════════════════════════════════════════
     UTILITY — build episode watch URL
  ══════════════════════════════════════════ */
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
      return `episode.html?${p.toString()}`;
    } catch (e) { return fallback; }
  }

  /* ══════════════════════════════════════════
     UTILITY — observe element & add .vis
  ══════════════════════════════════════════ */
  function animateWhenVisible(elements) {
    if (!elements.length) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('vis');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    elements.forEach(el => obs.observe(el));
  }

  /* ══════════════════════════════════════════
     LOAD ALL EPISODE DATA (shared)
  ══════════════════════════════════════════ */
  let allEpisodesPromise = fetch('episode-data/index.json')
    .then(r => r.json())
    .then(files => Promise.all(
      files.map(path =>
        fetch(path)
          .then(res => res.ok ? res.json() : [])
          .then(data => (Array.isArray(data) ? data.map(ep => ({ ...ep, _src: path })) : []))
          .catch(() => [])
      )
    ))
    .then(arrays => {
      const all = arrays.flat().filter(ep => ep.timestamp);
      all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return all;
    })
    .catch(() => []);

  /* ══════════════════════════════════════════
     HERO — cinematic auto-rotating banner
  ══════════════════════════════════════════ */
  const heroInner = document.getElementById('hero-inner');
  const heroDots  = document.getElementById('h-dots');

  allEpisodesPromise.then(all => {
    const latest = all.slice(0, 5);
    if (!latest.length || !heroInner) return;

    heroInner.innerHTML = '';

    // Build slides
    latest.forEach((ep, i) => {
      const url  = buildWatchUrl(ep);
      const bg   = ep.thumb || ep.poster || ep.banner || '';
      const seriesName = ep.series || '';
      const epTitle    = ep.title || ('Episode ' + (ep.ep || ''));

      const slide = document.createElement('div');
      slide.className = 'h-slide' + (i === 0 ? ' on' : '');
      slide.innerHTML = `
        <div class="h-bg" style="background-image:url('${bg}')"></div>
        <div class="h-vig"></div>
        <div class="h-body">
          <div class="h-new">● NEW EPISODE</div>
          ${seriesName ? `<div class="h-title">${seriesName}</div>` : ''}
          <div class="h-sub">${epTitle}</div>
          <div class="h-btns">
            <a href="${url}" class="h-play" data-ep="1">▶ Watch Now</a>
            ${seriesName ? `<a href="series.html?series=${(ep._src||'').match(/episode-data\/(.+?)-s/)?.[1]||''}" class="h-info">ℹ More Info</a>` : ''}
          </div>
          <div id="h-dots"></div>
        </div>
      `;
      heroInner.appendChild(slide);
    });

    // Build dots (only once, in last slide's placeholder → actually build separately)
    // Re-grab dots container after DOM update
    const dotsWrap = heroInner.closest('#hero')?.querySelector('#h-dots') || document.getElementById('h-dots');
    if (dotsWrap) {
      dotsWrap.innerHTML = latest.map((_, i) =>
        `<div class="h-dot${i===0?' on':''}" data-i="${i}"></div>`
      ).join('');
    }

    const slides = heroInner.querySelectorAll('.h-slide');
    const dots   = heroInner.querySelectorAll('.h-dot');
    let cur = 0, timer;

    function goTo(n) {
      slides[cur].classList.remove('on');
      dots[cur]?.classList.remove('on');
      cur = (n + slides.length) % slides.length;
      slides[cur].classList.add('on');
      dots[cur]?.classList.add('on');
    }

    function startAuto() {
      clearInterval(timer);
      timer = setInterval(() => goTo(cur + 1), 5000);
    }

    dots.forEach(d => d.addEventListener('click', () => { goTo(+d.dataset.i); startAuto(); }));
    startAuto();
  });

  /* ══════════════════════════════════════════
     NEW EPISODES — horizontal scroll row
  ══════════════════════════════════════════ */
  const epGrid = document.getElementById('new-episodes-grid');

  allEpisodesPromise.then(all => {
    const latest = all.slice(0, 5);
    if (!epGrid) return;

    if (!latest.length) {
      epGrid.innerHTML = `<div style="color:var(--muted);padding:1em;">No new episodes found.</div>`;
      return;
    }

    epGrid.innerHTML = latest.map(ep => {
      const url   = buildWatchUrl(ep);
      const thumb = ep.thumb || ep.poster || '';
      const title = ep.title || ('Episode ' + (ep.ep || ''));
      const series = ep.series || '';
      // detect lang label from _src
      const langM = (ep._src||'').match(/-([a-z]{2,3})\.json$/i);
      const lang  = langM ? langM[1].toUpperCase() : 'DUB';

      return `
        <div class="ep-card">
          <div class="ep-tw">
            <img src="${thumb}" class="ep-th" alt="${title}" loading="lazy" decoding="async">
            <div class="ep-tg"></div>
            <span class="ep-nb">NEW</span>
            <span class="ep-lb">${lang}</span>
          </div>
          <div class="ep-info">
            ${series ? `<div class="ep-ser">${series}</div>` : ''}
            <div class="ep-ttl">${title}</div>
          </div>
          <a href="${url}" class="ep-btn" target="_blank" rel="noopener">
            <span>▶ Watch Now</span>
          </a>
        </div>
      `;
    }).join('');

    // animate cards in
    animateWhenVisible(Array.from(epGrid.querySelectorAll('.ep-card')));
  });

  /* ══════════════════════════════════════════
     SCHEDULE — vertical stacked cards
  ══════════════════════════════════════════ */
  const schedList = document.getElementById('sched-list');

  if (schedList) {
    fetch('shedule.json')
      .then(r => r.json())
      .then(schedule => {
        if (!Array.isArray(schedule) || !schedule.length) {
          schedList.innerHTML = `<div style="color:var(--muted);font-size:.88rem;padding:.8em 1em;">No upcoming schedule.</div>`;
          return;
        }

        schedList.innerHTML = schedule.map(item => {
          const title     = item.title    || '';
          const poster    = item.poster   || '';
          const day       = item.day      || '';
          const time      = item.time     || '';
          const type      = item.type     || '';
          const live      = !!item.live;
          const countdown = item.countdown || '';

          return `
            <div class="sc-card${live ? ' live-c' : ''}">
              ${poster ? `<img src="${poster}" alt="${title}" class="sc-img" loading="lazy" decoding="async">` : ''}
              <div class="sc-body">
                <div class="sc-title">${title}</div>
                <div class="sc-meta">
                  ${day  ? `<span class="sc-day">${day}</span>` : ''}
                  ${(day && time) ? `<span class="sc-dot">•</span>` : ''}
                  ${time ? `<span class="sc-day" style="color:#9fd3ff">${time}</span>` : ''}
                  ${type ? `<span class="sc-dot">•</span><span class="sc-type">${type}</span>` : ''}
                  ${live ? `<span class="sc-live">LIVE</span>` : ''}
                </div>
              </div>
              ${countdown ? `<div class="sc-cd" data-time="${countdown}">...</div>` : ''}
            </div>
          `;
        }).join('');

        // Countdown tickers
        schedList.querySelectorAll('.sc-cd').forEach(el => {
          const target = Date.parse(el.dataset.time);
          if (isNaN(target)) { el.textContent = ''; return; }
          const tick = () => {
            const diff = target - Date.now();
            if (diff <= 0) { el.textContent = '🔴 Now'; clearInterval(id); return; }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            el.textContent = `${h}h ${m}m ${s}s`;
          };
          tick();
          const id = setInterval(tick, 1000);
        });

        // Animate in
        animateWhenVisible(Array.from(schedList.querySelectorAll('.sc-card')));
      })
      .catch(() => {
        schedList.innerHTML = `<div style="color:var(--muted);font-size:.88rem;padding:.8em 1em;">Schedule unavailable.</div>`;
      });
  }

  /* ══════════════════════════════════════════
     SERIES GRID
  ══════════════════════════════════════════ */
  const grid    = document.getElementById('series-grid');
  const pillDub = document.getElementById('pill-dub');
  const pillSub = document.getElementById('pill-sub');
  const subLangs = document.getElementById('sub-langs');

  if (grid) {
    let SERIES = [];
    const qs = new URLSearchParams(location.search);
    let state = {
      track: qs.get('track') || localStorage.getItem('track')   || 'dubbed',
      lang:  qs.get('lang')  || localStorage.getItem('subLang') || 'en',
      q: ''
    };

    fetch('series.json')
      .then(r => { if (!r.ok) throw new Error('series.json not found'); return r.json(); })
      .then(data => {
        SERIES = Array.isArray(data) ? data : [];
        // remove skeletons
        grid.querySelectorAll('.skel').forEach(s => s.remove());
        hydrateUI();
        render();
      })
      .catch(err => {
        grid.querySelectorAll('.skel').forEach(s => s.remove());
        grid.innerHTML = `<div style="color:#f87171;padding:1.2em;grid-column:1/-1;">Could not load series: ${err.message}</div>`;
      });

    function hydrateUI() {
      setPrimary(state.track);
      toggleSubLangs();
      subLangs?.querySelectorAll('.pill').forEach(b => {
        const active = b.dataset.lang === state.lang;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
      });
    }

    function setPrimary(track) {
      state.track = track;
      localStorage.setItem('track', track);
      pillDub?.classList.toggle('active', track === 'dubbed');
      pillSub?.classList.toggle('active', track === 'sub');
      pillDub?.setAttribute('aria-pressed', String(track === 'dubbed'));
      pillSub?.setAttribute('aria-pressed', String(track === 'sub'));
    }

    function toggleSubLangs() {
      subLangs?.classList.toggle('hidden', state.track !== 'sub');
    }

    function setLang(lang) {
      state.lang = lang;
      localStorage.setItem('subLang', lang);
      subLangs?.querySelectorAll('.pill').forEach(b => {
        const active = b.dataset.lang === lang;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
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
      if (state.track === 'dubbed') {
        list = list.filter(s => s.track === 'dubbed');
      } else {
        list = list.filter(s => s.track === 'sub' && s.subLang === state.lang);
      }
      if (state.q) list = list.filter(s => (s.title||'').toLowerCase().includes(state.q));

      if (!list.length) {
        grid.innerHTML = `<div style="color:var(--muted);font-size:1em;padding:1.5em;grid-column:1/-1;text-align:center;">No series found.</div>`;
        return;
      }

      grid.innerHTML = list.map(s => `
        <a class="card" href="series.html?series=${s.slug}">
          <img src="${s.poster}" alt="${s.title}" loading="lazy" decoding="async">
          <div class="title">${s.title}</div>
        </a>
      `).join('');

      // staggered entrance
      const cards = Array.from(grid.querySelectorAll('.card'));
      cards.forEach((c, i) => { c.style.animationDelay = (i * 0.045) + 's'; });
      animateWhenVisible(cards);
    }
  }

  /* ══════════════════════════════════════════
     SEARCH OVERLAY — live filter from series.json
  ══════════════════════════════════════════ */
  const srchInp  = document.getElementById('srch-inp');
  const srchGrid = document.getElementById('srch-grid');
  let SERIES_ALL = [];

  fetch('series.json').then(r => r.json()).then(d => { SERIES_ALL = Array.isArray(d) ? d : []; }).catch(() => {});

  srchInp?.addEventListener('input', () => {
    const q = srchInp.value.trim().toLowerCase();
    if (!q) {
      srchGrid.innerHTML = '<div class="srch-hint">🔍 Start typing to search...</div>';
      return;
    }
    const results = SERIES_ALL.filter(s => (s.title||'').toLowerCase().includes(q));
    if (!results.length) {
      srchGrid.innerHTML = `<div class="srch-hint">No results for "<strong>${q}</strong>"</div>`;
      return;
    }
    srchGrid.innerHTML = results.map(s => `
      <a class="card vis" href="series.html?series=${s.slug}" style="opacity:1;transform:none;">
        <img src="${s.poster}" alt="${s.title}" loading="lazy" decoding="async">
        <div class="title">${s.title}</div>
      </a>
    `).join('');
  });

});
