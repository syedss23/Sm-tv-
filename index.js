document.addEventListener('DOMContentLoaded', () => {
  // Sidebar
  const sbar = document.getElementById('sidebar');
  document.getElementById('sidebarToggle')?.addEventListener('click', () => sbar.classList.toggle('open'));
  document.getElementById('sidebarClose')?.addEventListener('click', () => sbar.classList.remove('open'));

  // New Episodes Grid (Top of Homepage)
  const newGrid = document.getElementById('new-episodes-grid');
  if (newGrid) {
    fetch('series.json')
      .then(r => r.json())
      .then(seriesArr => {
        // Collect all season data file paths
        const episodeJsonFiles = [];
        seriesArr.forEach(series => {
          if (Array.isArray(series.seasons)) {
            series.seasons.forEach(season => {
              if (season.json) episodeJsonFiles.push({series, season, path: season.json});
            });
          } else if (series.json) {
            episodeJsonFiles.push({series, season: null, path: series.json});
          }
        });
        // Fetch all episode json files
        return Promise.all(
          episodeJsonFiles.map(obj =>
            fetch(obj.path)
              .then(res => res.ok ? res.json() : [])
              .then(data =>
                (Array.isArray(data) ? data.map(ep => ({
                  ...ep,
                  _series: obj.series,
                  _season: obj.season,
                  _src: obj.path
                })) : [])
              )
              .catch(() => [])
            )
        );
      })
      .then(arrays => {
        // Flatten episode arrays, filter for valid timestamps
        const allEpisodes = arrays.flat().filter(ep => ep.timestamp);
        // Sort by most recent timestamp
        allEpisodes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        // Take top 5
        const latestEps = allEpisodes.slice(0, 5);

        if (!latestEps.length) {
          newGrid.innerHTML =
            `<div style="color:#fff;font-size:1em;padding:1.2em;text-align:center;">
              No new episodes found.
            </div>`;
          return;
        }

        newGrid.innerHTML = latestEps.map(ep => {
          const seriesTitle = ep._series?.title || '';
          // Prefer thumb > poster for episode preview:
          const image = ep.thumb || ep.poster || ep._series?.poster || '';
          // Build episode watch link
          let epSlug;
          if (ep._series && ep._series.slug) {
            if (ep._season && ep._season.season) {
              epSlug = `episode.html?series=${ep._series.slug}&season=${ep._season.season}&ep=${ep.ep}`;
            } else {
              epSlug = `episode.html?series=${ep._series.slug}&ep=${ep.ep}`;
            }
          } else {
            epSlug = '#';
          }

          return `
            <div class="episode-card-pro">
              <img src="${image}" class="episode-img-pro" alt="${seriesTitle} Ep ${ep.ep}" loading="lazy" decoding="async">
              <div class="series-title-pro">${seriesTitle}</div>
              <div class="episode-title-pro">
                ${(ep.title || 'Episode ' + ep.ep)}
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

  // ---------------- Home: Series list with Dubbed/Subtitles toggle (no counts) ----------------
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
      toggleSubLangs(); // only show languages when Subtitles is active
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
