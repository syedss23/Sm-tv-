document.addEventListener('DOMContentLoaded', () => {

  // ===== SIDEBAR =====
  const sbar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  function openSidebar() {
    sbar.classList.add('open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    sbar.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  document.getElementById('sidebarToggle')?.addEventListener('click', openSidebar);
  document.getElementById('sidebarClose')?.addEventListener('click', closeSidebar);
  overlay?.addEventListener('click', closeSidebar);

  // ===== SEARCH OVERLAY =====
  const searchOverlay = document.getElementById('search-overlay');
  const searchInput = document.getElementById('search-overlay-input');
  const searchResultsGrid = document.getElementById('search-results-grid');
  const searchResultsLabel = document.getElementById('search-results-label');
  const searchEmptyEl = document.getElementById('search-empty');

  let ALL_SERIES = []; // will be populated when series.json loads

  function openSearch() {
    searchOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => searchInput?.focus(), 80);
    renderSearchResults('');
  }
  function closeSearch() {
    searchOverlay.classList.remove('active');
    document.body.style.overflow = '';
    if (searchInput) searchInput.value = '';
    renderSearchResults('');
  }

  document.getElementById('header-search-btn')?.addEventListener('click', openSearch);
  document.getElementById('search-close-btn')?.addEventListener('click', closeSearch);

  // Close on ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (searchOverlay.classList.contains('active')) closeSearch();
      else closeSidebar();
    }
  });

  function renderSearchResults(query) {
    if (!searchResultsGrid) return;
    const q = query.trim().toLowerCase();

    let list = ALL_SERIES;
    if (q) {
      list = ALL_SERIES.filter(s => (s.title || '').toLowerCase().includes(q));
    }

    // Show label
    if (searchResultsLabel) {
      searchResultsLabel.textContent = q
        ? `${list.length} result${list.length !== 1 ? 's' : ''} for "${query}"`
        : 'All Series';
    }

    // Empty state
    if (searchEmptyEl) {
      searchEmptyEl.style.display = (q && list.length === 0) ? 'block' : 'none';
    }

    if (list.length === 0 && q) {
      searchResultsGrid.innerHTML = '';
      return;
    }

    const displayList = q ? list : list.slice(0, 40); // show all if searching, else first 40

    searchResultsGrid.innerHTML = displayList.map((s, i) => `
      <a class="search-card" href="series.html?series=${s.slug}"
         style="animation-delay:${Math.min(i * 0.04, 0.5)}s">
        <img src="${s.poster || ''}" alt="${s.title || ''}" loading="lazy" decoding="async"
             onerror="this.style.background='#1e2f42';this.style.minHeight='180px'">
        <div class="search-card-title">${s.title || ''}</div>
      </a>
    `).join('');
  }

  searchInput?.addEventListener('input', e => {
    renderSearchResults(e.target.value);
  });

  // ===== UTILITY: Build watch URL =====
  function buildEpisodeWatchUrl(ep) {
    const fallback = ep.shortlink || ep.download || '#';
    try {
      const raw = (ep._src || '').replace(/^\/+/, '');
      const m = raw.match(/^episode-data\/(.+?)-s(\d+)(?:-([a-z]{2,3}|dub))?\.json$/i);
      if (!m) return fallback;
      const slug = m[1], season = m[2], lang = (m[3] || '').toLowerCase();
      const params = new URLSearchParams();
      params.set('series', slug);
      params.set('season', season);
      if (ep.ep != null) params.set('ep', ep.ep);
      if (lang && lang !== 'dub') params.set('lang', lang);
      else if (lang === 'dub') params.set('lang', 'dub');
      return `episode.html?${params.toString()}`;
    } catch (e) {
      return fallback;
    }
  }

  // ===== NEW EPISODES =====
  const newEpisodesScroll = document.getElementById('new-episodes-scroll');
  if (newEpisodesScroll) {
    fetch('episode-data/index.json')
      .then(r => r.json())
      .then(files => Promise.all(
        files.map(path =>
          fetch(path)
            .then(res => res.ok ? res.json() : [])
            .then(data => Array.isArray(data) ? data.map(ep => ({ ...ep, _src: path })) : [])
            .catch(() => [])
        )
      ))
      .then(arrays => {
        const all = arrays.flat().filter(ep => ep.timestamp);
        all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const latest = all.slice(0, 8);

        if (!latest.length) {
          newEpisodesScroll.innerHTML = `<div style="color:#aaa;padding:20px 16px;font-size:.9rem;">No new episodes found.</div>`;
          return;
        }

        newEpisodesScroll.innerHTML = latest.map((ep, i) => {
          const thumb = ep.thumb || ep.poster || '';
          const seriesName = ep.series || ep._src?.split('/').pop()?.replace(/-s\d+.*\.json/i, '')?.replace(/-/g, ' ') || '';
          const epTitle = ep.title || `Bolum ${ep.ep || ''}`;
          const watchUrl = buildEpisodeWatchUrl(ep);

          return `
            <div class="episode-card-new" style="animation-delay:${i * 0.06}s">
              <div class="episode-thumb-wrap">
                <img src="${thumb}" alt="${epTitle}" loading="lazy" decoding="async"
                     onerror="this.style.background='#1e2f42'">
                <span class="new-badge">NEW</span>
                <div class="play-overlay">
                  <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="22" cy="22" r="22" fill="rgba(255,255,255,0.15)"/>
                    <polygon points="18,14 32,22 18,30" fill="white"/>
                  </svg>
                </div>
              </div>
              <div class="episode-card-info">
                ${seriesName ? `<div class="episode-series-name">${seriesName}</div>` : ''}
                <div class="episode-ep-title">${epTitle}</div>
                <a href="${watchUrl}" class="watch-btn-new watch-btn-pro" target="_blank" rel="noopener">
                  ▶ Watch Now
                </a>
              </div>
            </div>
          `;
        }).join('');
      })
      .catch(() => {
        newEpisodesScroll.innerHTML = `<div style="color:#aaa;padding:20px 16px;font-size:.9rem;">Could not load episodes.</div>`;
      });
  }

  // ===== SCHEDULE SECTION =====
  const scheduleCards = document.getElementById('schedule-cards');
  if (scheduleCards) {
    fetch('shedule.json')
      .then(r => r.json())
      .then(schedule => {
        if (!Array.isArray(schedule) || !schedule.length) {
          document.getElementById('schedule-section')?.style && (document.getElementById('schedule-section').style.display = 'none');
          return;
        }

        scheduleCards.innerHTML = schedule.map((item, i) => {
          const title = item.title || '';
          const poster = item.poster || '';
          const day = item.day || '';
          const time = item.time || '';
          const type = item.type || '';
          const live = !!item.live;
          const countdown = item.countdown || '';

          return `
            <div class="schedule-card" style="animation-delay:${i * 0.07}s">
              <div class="schedule-card-top">
                ${poster ? `<img src="${poster}" alt="${title}" loading="lazy" decoding="async">` : ''}
                <div class="schedule-card-meta">
                  <div class="schedule-card-title">${title}</div>
                  <div style="display:flex;align-items:center;gap:6px;margin-top:5px;flex-wrap:wrap;">
                    ${live ? `<span class="live-badge"><span class="live-dot"></span>LIVE</span>` : ''}
                    ${day ? `<span class="schedule-day-badge">📅 ${day}${time ? ' · ' + time : ''}</span>` : ''}
                  </div>
                </div>
              </div>
              <div class="schedule-card-bottom">
                ${type ? `<span class="schedule-type-pill">💬 ${type}</span>` : '<span></span>'}
                ${countdown
                  ? `<span class="schedule-countdown" data-time="${countdown}">Loading...</span>`
                  : `<span class="schedule-countdown">${time || ''}</span>`
                }
              </div>
            </div>
          `;
        }).join('');

        // Countdown tick
        scheduleCards.querySelectorAll('.schedule-countdown[data-time]').forEach(el => {
          const target = Date.parse(el.dataset.time);
          if (isNaN(target)) { el.textContent = ''; return; }
          const tick = () => {
            const diff = target - Date.now();
            if (diff <= 0) { el.textContent = '🔴 Now Playing'; clearInterval(tid); return; }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            el.textContent = `${h}h ${m}m ${s}s`;
          };
          tick();
          const tid = setInterval(tick, 1000);
        });
      })
      .catch(() => {
        const sec = document.getElementById('schedule-section');
        if (sec) sec.style.display = 'none';
      });
  }

  // ===== RECOMMENDED SECTION =====
  const recGrid = document.getElementById('recommended-grid');
  if (recGrid) {
    fetch('recommended.json')
      .then(r => r.json())
      .then(items => {
        if (!Array.isArray(items) || !items.length) {
          document.getElementById('recommended-section').style.display = 'none';
          return;
        }
        recGrid.innerHTML = items.map((s, i) => `
          <a class="rec-card" href="series.html?series=${s.slug || ''}" style="animation-delay:${i * 0.05}s">
            ${s.badge ? `<span class="rec-card-badge">${s.badge}</span>` : ''}
            <img src="${s.poster || ''}" alt="${s.title || ''}" loading="lazy" decoding="async"
                 onerror="this.style.background='#1e2f42';this.style.minHeight='200px'">
            <div class="rec-card-body">
              <div class="rec-card-title">${s.title || ''}</div>
            </div>
          </a>
        `).join('');
      })
      .catch(() => {
        const sec = document.getElementById('recommended-section');
        if (sec) sec.style.display = 'none';
      });
  }

  // ===== SERIES GRID =====
  const grid = document.getElementById('series-grid');
  if (grid) {
    const pillDub  = document.getElementById('pill-dub');
    const pillSub  = document.getElementById('pill-sub');
    const subLangs = document.getElementById('sub-langs');

    const qs = new URLSearchParams(location.search);
    let state = {
      track: qs.get('track') || localStorage.getItem('track')   || 'dubbed',
      lang:  qs.get('lang')  || localStorage.getItem('subLang') || 'en',
      q: ''
    };

    fetch('series.json')
      .then(r => { if (!r.ok) throw new Error('series.json not found'); return r.json(); })
      .then(data => {
        ALL_SERIES = Array.isArray(data) ? data : [];
        hydrateUI();
        render();
      })
      .catch(err => {
        grid.innerHTML = `<div style="color:#f55;padding:1.2em;font-size:.9rem;">Error: ${err.message}</div>`;
      });

    function hydrateUI() {
      setPrimary(state.track);
      toggleSubLangs();
      subLangs?.querySelectorAll('.pill').forEach(b => {
        b.classList.toggle('active', b.dataset.lang === state.lang);
        b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang));
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
      if (!subLangs) return;
      subLangs.classList.toggle('hidden', state.track !== 'sub');
    }

    function setLang(lang) {
      state.lang = lang;
      localStorage.setItem('subLang', lang);
      subLangs?.querySelectorAll('.pill').forEach(b => {
        b.classList.toggle('active', b.dataset.lang === lang);
        b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
      });
    }

    pillDub?.addEventListener('click', () => { setPrimary('dubbed'); toggleSubLangs(); render(); });
    pillSub?.addEventListener('click', () => { setPrimary('sub'); toggleSubLangs(); render(); });
    subLangs?.addEventListener('click', e => {
      const t = e.target.closest('.pill');
      if (t?.dataset.lang) { setLang(t.dataset.lang); render(); }
    });

    function render() {
      let list = ALL_SERIES;
      if (state.track === 'dubbed') {
        list = list.filter(s => s.track === 'dubbed');
      } else {
        list = list.filter(s => s.track === 'sub' && s.subLang === state.lang);
      }
      if (state.q) list = list.filter(s => (s.title || '').toLowerCase().includes(state.q));

      if (!list.length) {
        grid.innerHTML = `<div style="color:#aaa;font-size:.95rem;padding:1.5em;grid-column:1/-1;">No series found.</div>`;
        return;
      }

      grid.innerHTML = list.map((s, i) => `
        <a class="card" href="series.html?series=${s.slug}" style="animation-delay:${Math.min(i * 0.03, 0.6)}s">
          <img src="${s.poster}" alt="${s.title}" loading="lazy" decoding="async"
               onerror="this.style.background='#1e2f42'">
          <div class="title">${s.title}</div>
        </a>
      `).join('');
    }
  }

  // ===== MOVE FILTER BAR (keep in correct DOM position) =====
  function moveFilterBarBelowRecommended() {
    const filterBar = document.querySelector('.filter-bar');
    const recSection = document.getElementById('recommended-section');
    if (filterBar && recSection && recSection.parentNode) {
      recSection.parentNode.insertBefore(filterBar, recSection.nextSibling);
    }
  }
  moveFilterBarBelowRecommended();

});
