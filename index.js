document.addEventListener('DOMContentLoaded', () => {
  // Sidebar
  const sbar = document.getElementById('sidebar');
  document.getElementById('sidebarToggle')?.addEventListener('click', () => sbar.classList.toggle('open'));
  document.getElementById('sidebarClose')?.addEventListener('click', () => sbar.classList.remove('open'));

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
      // set active language pill (labels stay static; no counts)
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

  // ---------------- Legacy SPA list (older markup support) ----------------
  if (document.getElementById('spa-series-list')) {
    let seriesList = [];
    fetch('series.json')
      .then(r => {
        if (!r.ok) throw new Error('Series JSON not found. Check /series.json');
        return r.json();
      })
      .then(data => {
        seriesList = Array.isArray(data) ? data : [];
        renderSeriesList('');
      })
      .catch(err => {
        const gridContainer = document.getElementById('spa-series-list');
        gridContainer.innerHTML = `<div style="color:#f44;padding:1.2em;">Error: ${err.message}</div>`;
      });

    document.getElementById('seriesSearch')?.addEventListener('input', e => {
      renderSeriesList(e.target.value.trim());
    });

    function renderSeriesList(search) {
      const gridContainer = document.getElementById('spa-series-list');
      gridContainer.innerHTML = `<div class="poster-grid"></div>`;
      const grid = gridContainer.querySelector('.poster-grid');
      let filtered = seriesList;
      if (search) filtered = seriesList.filter(s => (s.title || '').toLowerCase().includes(search.toLowerCase()));
      if (!filtered.length) { grid.innerHTML = `<div style="color:#fff;font-size:1.1em;padding:1.5em;">No series found.</div>`; return; }
      filtered.forEach(series => {
        const a = document.createElement('a');
        a.href = `series.html?series=${series.slug}`;
        a.className = 'poster-item';
        a.innerHTML = `
          <img src="${series.poster}" alt="${series.title}">
          <div class="title">${series.title}</div>
        `;
        grid.appendChild(a);
      });
    }
  }

  // ---------------- Season page: Salahuddin Ayyubi S2 ----------------
  if (document.getElementById('season-2-episodes')) {
    fetch('episode-data/salauddin-ayyubi-s2.json')
      .then(resp => {
        if (!resp.ok) throw new Error('Season JSON not found. Check episode-data/salauddin-ayyubi-s2.json');
        return resp.json();
      })
      .then(episodes => renderEpisodes(episodes))
      .catch(err => {
        document.getElementById('season-2-episodes').innerHTML =
          `<div style="color:#f44;padding:1.2em;">Error: ${err.message}</div>`;
      });

    function renderEpisodes(episodes) {
      const epContainer = document.getElementById('season-2-episodes');
      if (!episodes || !episodes.length) {
        epContainer.innerHTML =
          `<div style="color:#fff;padding:1.5em;">Episodes will appear here as soon as they release!</div>`;
        return;
      }
      let listHTML = '<div class="pro-episodes-row-pro">';
      episodes.forEach(ep => {
        listHTML += `
          <a class="pro-episode-card-pro" href="episode.html?ep=${ep.slug}">
            <div class="pro-ep-thumb-wrap-pro">
              <img src="${ep.thumb}" alt="${ep.title}" class="pro-ep-thumb-pro" loading="lazy" decoding="async">
              <span class="pro-ep-num-pro">EP ${ep.ep}</span>
            </div>
            <div class="pro-ep-title-pro">${ep.title ? ep.title : 'Episode ' + ep.ep}</div>
          </a>
        `;
      });
      listHTML += '</div>';
      epContainer.innerHTML = listHTML;
    }
  }
});
