document.addEventListener('DOMContentLoaded', () => {
  // Sidebar controls
  const sbar = document.getElementById('sidebar');
  document.getElementById('sidebarToggle')?.addEventListener('click', () => sbar.classList.toggle('open'));
  document.getElementById('sidebarClose')?.addEventListener('click', () => sbar.classList.remove('open'));

  // ===== SCHEDULE BAR (Above New Episodes) =====
  const scheduleBar = document.getElementById('schedule-bar');
  if (scheduleBar) {
    fetch('shedule.json')
      .then(r => r.json())
      .then(schedule => {
        if (!Array.isArray(schedule) || !schedule.length) {
          scheduleBar.innerHTML = `<div style="color:#ffd700;font-size:1em;padding:1em;text-align:center;">No schedule yet.</div>`;
          return;
        }
        scheduleBar.innerHTML = schedule.map(item => `
          <div class="schedule-entry" title="${item.title || ''}" style="display:flex;align-items:center;margin-right:10px;">
            <img src="${item.poster || ''}" alt="${item.title || ''}" loading="lazy" decoding="async"
                 style="width:27px;height:27px;object-fit:cover;border-radius:5px;margin-right:5px;">
            <span class="title" style="color:#23c6ed;font-weight:700;margin-right:4px;">${item.title || ''}</span>
            <span class="days" style="color: #ffe493; margin-left:4px; font-size: 0.92em;">${item.days || ''}</span>
            ${item.time ? `<span class="time" style="color: #ffd700; font-size:0.97em; margin-left:3px;">${item.time}</span>` : ''}
            ${item.type ? `<span class="type" style="color:#23c6ed; margin-left:6px; font-size:.91em;">${item.type}</span>` : ''}
          </div>
        `).join('');
      })
      .catch(() => {
        scheduleBar.innerHTML = `<div style="color:#ffd700;font-size:1em;padding:1em;text-align:center;">Could not load schedule.</div>`;
      });
  }

  // ===== New Episodes Horizontal Card Grid =====
  const newGrid = document.getElementById('new-episodes-grid');
  if (newGrid) {
    fetch('episode-data/index.json')
      .then(r => r.json())
      .then(files => Promise.all(
        files.map(path =>
          fetch(path)
            .then(res => res.ok ? res.json() : [])
            .then(data =>
              (Array.isArray(data) ? data.map(ep => ({
                ...ep,
                _src: path
              })) : [])
            )
            .catch(() => [])
        )
      ))
      .then(arrays => {
        const allEpisodes = arrays.flat().filter(ep => ep.timestamp);
        allEpisodes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const latestEps = allEpisodes.slice(0, 5);

        if (!latestEps.length) {
          newGrid.innerHTML =
            `<div style="color:#fff;font-size:1em;padding:1.2em;text-align:center;">
              No new episodes found.
            </div>`;
          return;
        }

        // Render in horizontal scroll row with classic card styling
        newGrid.innerHTML = `
          <div style="display: flex; gap: 14px; overflow-x: auto; padding: 0 2px 2px 2px;">
            ${latestEps.map(ep => `
              <div class="episode-card-pro"
                style="flex:0 0 166px; min-width:150px; max-width:172px; border-radius:13px; background: #182837; box-shadow: 0 4px 18px #0fd1cec7, 0 2px 10px #0003;">
                <img src="${ep.thumb || ep.poster || ''}" class="episode-img-pro" alt="${ep.title || ('Episode ' + (ep.ep || ''))}" 
                  loading="lazy" decoding="async"
                  style="display:block;border-radius:13px 13px 0 0;width:100%;height:110px;object-fit:cover;">
                <div class="episode-title-pro" style="margin:15px 0 4px 0;font-family:'Montserrat',sans-serif;font-size:1.07em;font-weight:700;color:#fff;text-align:center;">
                  ${ep.title || 'Episode ' + (ep.ep || '')}
                  <span class="new-badge-pro" style="margin-left:7px;background:#ffd700;color:#182734;font-size:.78em;border-radius:5px;padding:2.3px 9px 2.3px 9px;">NEW</span>
                </div>
                <a href="${ep.shortlink || ep.download || '#'}" class="watch-btn-pro"
                  target="_blank" rel="noopener"
                  style="margin-bottom:13px;width:86%;display:block;background:linear-gradient(90deg,#009aff 65%,#ffd700 100%);color:#fff;font-weight:700;text-decoration:none;text-align:center;border-radius:5px;padding:8px 0 8px 0;font-family:'Montserrat',sans-serif;font-size:1em;box-shadow:0 1px 10px #0087ff14;margin-left:auto;margin-right:auto;">
                  Watch Now
                </a>
              </div>
            `).join('')}
          </div>
        `;
      })
      .catch(() => {
        newGrid.innerHTML = `<div style="color:#fff;font-size:1em;padding:1.2em;text-align:center;">
          Could not load new episodes.
        </div>`;
      });
  }

  // ------------- Series homepage grid: NO CHANGES -------------
  const grid = document.getElementById('series-grid');
  if (grid) {
    const search   = document.getElementById('search');
    const pillDub  = document.getElementById('pill-dub');
    const pillSub  = document.getElementById('pill-sub');
    const subLangs = document.getElementById('sub-langs'); // hidden by default in HTML

    let SERIES = [];
    const qs = new URLSearchParams(location.search);
    let state = {
      track: qs.get('track') || localStorage.getItem('track')   || 'dubbed',
      lang:  qs.get('lang')  || localStorage.getItem('subLang') || 'en',
      q: ''
    };

    fetch('series.json')
      .then(r => {
        if (!r.ok) throw new Error('Series JSON not found. Check /series.json');
        return r.json();
      })
      .then(data => {
        SERIES = Array.isArray(data) ? data : [];
        hydrateUI();
        render();
      })
      .catch(err => {
        grid.innerHTML = `<div style="color:#f44;padding:1.2em;">Error: ${err.message}</div>`;
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

    // Events
    pillDub?.addEventListener('click', () => { setPrimary('dubbed'); toggleSubLangs(); render(); });
    pillSub?.addEventListener('click', () => { setPrimary('sub');    toggleSubLangs(); render(); });
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
      grid.innerHTML = list.length ? list.map(s => `
        <a class="card" href="series.html?series=${s.slug}">
          <img src="${s.poster}" alt="${s.title}" loading="lazy" decoding="async">
          <div class="title">${s.title}</div>
        </a>
      `).join('') : `<div style="color:#fff;font-size:1.1em;padding:1.5em;">No series found.</div>`;
    }
  }
});
