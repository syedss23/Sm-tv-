document.addEventListener('DOMContentLoaded', () => {
  // Sidebar controls
  const sbar = document.getElementById('sidebar');
  document.getElementById('sidebarToggle')?.addEventListener('click', () => sbar.classList.toggle('open'));
  document.getElementById('sidebarClose')?.addEventListener('click', () => sbar.classList.remove('open'));

  // ---------- New Episodes Grid: Uses episode-data/index.json ONLY ----------
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

        newGrid.innerHTML = latestEps.map(ep => {
          // Try to extract a nice series title from filename if not specified
          let baseTitle = ep.series;
          if (!baseTitle && ep._src) {
            const clean = ep._src.split('/').pop().replace('.json','').replace(/[-_]/g, ' ');
            baseTitle = clean.charAt(0).toUpperCase() + clean.slice(1);
          }
          const img = ep.thumb || ep.poster || '';
          const epNum = ep.ep || '';
          const epTitle = ep.title || `Episode ${epNum}`;
          let epSlug = "#";
          if (ep._src) {
            const fileParam = encodeURIComponent(ep._src.replace('.json',''));
            epSlug = `episode.html?file=${fileParam}&ep=${epNum}`;
          }
          return `
            <div class="episode-card-pro">
              <img src="${img}" class="episode-img-pro" alt="${baseTitle} Ep ${epNum}" loading="lazy" decoding="async">
              <div class="series-title-pro">${baseTitle}</div>
              <div class="episode-title-pro">
                ${epTitle}
                <span class="new-badge-pro">NEW</span>
              </div>
              <a href="${epSlug}" class="watch-btn-pro">Watch Now</a>
            </div>
          `;
        }).join('');
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
