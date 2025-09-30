document.addEventListener('DOMContentLoaded', () => {
  // Sidebar controls
  const sbar = document.getElementById('sidebar');
  document.getElementById('sidebarToggle')?.addEventListener('click', () => sbar.classList.toggle('open'));
  document.getElementById('sidebarClose')?.addEventListener('click', () => sbar.classList.remove('open'));

  // ---------- New Episodes Grid: Horizontal style ----------
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

        newGrid.innerHTML = `
          <div class="pro-episodes-row-pro" style="display:flex;gap:15px;overflow-x:auto;padding-bottom:8px;">
            ${
              latestEps.map(ep => {
                const img = ep.thumb || ep.poster || '';
                const epNum = ep.ep || '';
                const epTitle = ep.title || `Episode ${epNum}`;
                return `
                  <a class="pro-episode-card-pro" style="background:#192837;border-radius:9px;min-width:150px;max-width:185px;box-shadow:0 2px 14px #0005;overflow:hidden;display:flex;flex-direction:column;text-decoration:none;margin-bottom:2px;" href="${ep.shortlink || ep.download || '#'}" target="_blank" rel="noopener">
                    <div class="pro-ep-thumb-wrap-pro" style="position:relative;">
                      <img src="${img}" alt="${epTitle}" style="width:100%;height:95px;object-fit:cover;">
                      <span class="pro-ep-num-pro" style="position:absolute;top:7px;left:7px;background:#198fff;color:#fff;font-weight:700;border-radius:6px;padding:3px 11px 2px 11px;font-size:.92em;">Ep ${epNum}</span>
                    </div>
                    <div class="pro-ep-title-pro" style="padding:7px 8px 12px 10px;font-family:'Montserrat',sans-serif;font-size:1em;font-weight:600;color:#fff;text-align:left;">
                      ${epTitle}
                      <span class="new-badge-pro" style="background:#ffd700;color:#162632;font-size:.82em;border-radius:5px;padding:2px 10px 2px 10px;margin-left:6px;font-weight:700;">NEW</span>
                    </div>
                  </a>
                `;
              }).join('')
            }
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
