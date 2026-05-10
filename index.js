document.addEventListener('DOMContentLoaded', () => {

  // ── Utility: move filter bar below New Episodes section ──
  function moveFilterBarBelowNewEpisodes() {
    const filterBar = document.querySelector('.filter-bar');
    const newEpisodesSection = document.querySelector('.new-episodes-section');
    if (filterBar && newEpisodesSection && newEpisodesSection.parentNode) {
      newEpisodesSection.parentNode.insertBefore(filterBar, newEpisodesSection.nextSibling);
    }
  }
  moveFilterBarBelowNewEpisodes();

  // ── Build streaming URL for New Episodes "Watch Now" button ──
  function buildEpisodeWatchUrl(ep) {
    const fallback = ep.shortlink || ep.download || '#';
    try {
      const raw = (ep._src || '').replace(/^\/+/, '');
      const m = raw.match(/^episode-data\/(.+?)-s(\d+)(?:-([a-z]{2,3}|dub))?\.json$/i);
      if (!m) return fallback;
      const slug   = m[1];
      const season = m[2];
      const lang   = (m[3] || '').toLowerCase();
      const params = new URLSearchParams();
      params.set('series', slug);
      params.set('season', season);
      if (ep.ep != null) params.set('ep', ep.ep);
      if (lang && lang !== 'dub') {
        params.set('lang', lang);
      } else if (lang === 'dub') {
        params.set('lang', 'dub');
      }
      return `episode.html?${params.toString()}`;
    } catch (e) {
      console.warn('buildEpisodeWatchUrl error', e);
      return fallback;
    }
  }

  // ══════════════════════════════════════════════
  // SCHEDULE BAR — compact cinematic style
  // ══════════════════════════════════════════════
  const scheduleBar = document.getElementById('schedule-bar');
  if (scheduleBar) {
    fetch('shedule.json')
      .then(r => r.json())
      .then(schedule => {
        if (!Array.isArray(schedule) || !schedule.length) {
          scheduleBar.innerHTML = `<div style="color:var(--text-muted);font-size:.9em;padding:.8em 1em;">No upcoming schedule.</div>`;
          return;
        }

        const inner = document.createElement('div');
        inner.className = 'schedule-inner';

        inner.innerHTML = schedule.map(item => {
          const title    = item.title    || '';
          const poster   = item.poster   || '';
          const day      = item.day      || '';
          const time     = item.time     || '';
          const type     = item.type     || '';
          const live     = !!item.live;
          const countdown = item.countdown || '';

          return `
            <div class="schedule-entry">
              ${poster ? `<img src="${poster}" alt="${title}" loading="lazy" decoding="async">` : ''}
              <div style="display:flex;flex-direction:column;min-width:0;">
                <div class="sched-title" style="display:flex;align-items:center;gap:6px;">
                  ${title}
                  ${live ? `<span style="background:var(--red-live);color:#fff;padding:1px 6px;border-radius:5px;font-size:.65em;font-weight:800;letter-spacing:.06em;">LIVE</span>` : ''}
                </div>
                <div class="sched-meta">
                  ${day  ? `<span class="sched-day">${day}</span>` : ''}
                  ${(day && time) ? '<span style="opacity:.4;">•</span>' : ''}
                  ${time ? `<span class="sched-time">${time}</span>` : ''}
                  ${type ? `<span style="opacity:.4;">•</span><span class="sched-type">${type}</span>` : ''}
                </div>
                ${countdown ? `<div class="countdown" data-time="${countdown}"></div>` : ''}
              </div>
            </div>
          `;
        }).join('');

        scheduleBar.innerHTML = '';
        scheduleBar.appendChild(inner);

        // Countdown tickers
        scheduleBar.querySelectorAll('.countdown').forEach(el => {
          const targetTime = Date.parse(el.dataset.time);
          if (isNaN(targetTime)) { el.textContent = ''; return; }
          const tick = () => {
            const diff = targetTime - Date.now();
            if (diff <= 0) { el.textContent = '🔴 Now Playing'; clearInterval(id); return; }
            const hrs  = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);
            el.textContent = `⏳ ${hrs}h ${mins}m ${secs}s`;
          };
          tick();
          const id = setInterval(tick, 1000);
        });
      })
      .catch(() => {
        scheduleBar.innerHTML = `<div style="color:var(--text-muted);font-size:.9em;padding:.8em 1em;">Schedule unavailable.</div>`;
      });
  }

  // ══════════════════════════════════════════════
  // NEW EPISODES — horizontal scroll cards
  // ══════════════════════════════════════════════
  const newGrid = document.getElementById('new-episodes-grid');
  if (newGrid) {
    fetch('episode-data/index.json')
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
        const allEpisodes = arrays.flat().filter(ep => ep.timestamp);
        allEpisodes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const latestEps = allEpisodes.slice(0, 5);

        if (!latestEps.length) {
          newGrid.innerHTML = `<div style="color:var(--text-muted);font-size:.9em;padding:1em 1.2em;">No new episodes found.</div>`;
          moveFilterBarBelowNewEpisodes();
          return;
        }

        const inner = document.createElement('div');
        inner.className = 'new-eps-inner';
        inner.innerHTML = latestEps.map(ep => `
          <div class="episode-card-pro">
            <div class="episode-img-wrapper">
              <img src="${ep.thumb || ep.poster || ''}"
                   class="episode-img-pro"
                   alt="${ep.title || ('Episode ' + (ep.ep || ''))}"
                   loading="lazy" decoding="async">
              <div class="episode-img-overlay"></div>
              <span class="new-badge-pro">NEW</span>
            </div>
            <div class="episode-info">
              ${ep.series ? `<div class="series-title-pro">${ep.series}</div>` : ''}
              <div class="episode-title-pro">${ep.title || 'Episode ' + (ep.ep || '')}</div>
            </div>
            <a href="${buildEpisodeWatchUrl(ep)}"
               class="watch-btn-pro"
               target="_blank" rel="noopener">
              <span>▶ Watch Now</span>
            </a>
          </div>
        `).join('');

        newGrid.innerHTML = '';
        newGrid.appendChild(inner);
        moveFilterBarBelowNewEpisodes();
      })
      .catch(() => {
        newGrid.innerHTML = `<div style="color:var(--text-muted);font-size:.9em;padding:1em 1.2em;">Could not load new episodes.</div>`;
        moveFilterBarBelowNewEpisodes();
      });
  }

  // ══════════════════════════════════════════════
  // SERIES GRID
  // ══════════════════════════════════════════════
  const grid = document.getElementById('series-grid');
  if (grid) {
    const search   = document.getElementById('search');
    const pillDub  = document.getElementById('pill-dub');
    const pillSub  = document.getElementById('pill-sub');
    const subLangs = document.getElementById('sub-langs');

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
        // Remove skeleton
        document.getElementById('series-skeleton')?.remove();
        hydrateUI();
        render();
      })
      .catch(err => {
        document.getElementById('series-skeleton')?.remove();
        grid.innerHTML = `<div style="color:#e57373;padding:1.2em;grid-column:1/-1;">Error: ${err.message}</div>`;
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
      const t = e.target;
      if (t && t.matches('.pill') && t.dataset.lang) { setLang(t.dataset.lang); render(); }
    });
    search?.addEventListener('input', e => { state.q = e.target.value.trim().toLowerCase(); render(); });

    function render() {
      let list = SERIES;
      if (state.track === 'dubbed') {
        list = list.filter(s => s.track === 'dubbed');
      } else {
        list = list.filter(s => s.track === 'sub' && s.subLang === state.lang);
      }
      if (state.q) list = list.filter(s => (s.title || '').toLowerCase().includes(state.q));

      if (!list.length) {
        grid.innerHTML = `<div style="color:var(--text-muted);font-size:1em;padding:1.5em;grid-column:1/-1;text-align:center;">No series found.</div>`;
        return;
      }

      grid.innerHTML = list.map((s, i) => `
        <a class="card" href="series.html?series=${s.slug}" style="animation-delay:${i * 0.04}s;">
          <img src="${s.poster}" alt="${s.title}" loading="lazy" decoding="async">
          <div class="title">${s.title}</div>
        </a>
      `).join('');
    }
  }
});
