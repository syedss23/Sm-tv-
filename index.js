let seriesList = [];
let seriesEpisodesData = {};
let currentLang = 'en'; // adjusts for desc

document.addEventListener('DOMContentLoaded', () => {
  Promise.all([
    fetch('series.json').then(r => r.json()),
    fetch('links.json').then(r => r.json()) // if your "episodes-by-series" is in links.json, else update this line to match your filename!
  ]).then(([listArr, episodesObj]) => {
    seriesList = listArr;
    seriesEpisodesData = episodesObj;
    renderSeriesList();
    window.addEventListener('popstate', handlePopstate);

    document.getElementById('sidebarToggle').onclick = () =>
      document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarClose').onclick = () =>
      document.getElementById('sidebar').classList.remove('open');
    document.getElementById('navHome').onclick = (e) => { e.preventDefault(); goHome(); };

    // Search
    document.getElementById('seriesSearch').addEventListener('input', e => {
      renderSeriesList(e.target.value.trim());
    });

    // Language picker
    document.getElementById('langSelect').onchange = function () {
      currentLang = this.value;
      const state = history.state || {};
      if (!state.page || state.page === 'list') renderSeriesList(document.getElementById('seriesSearch').value.trim());
      else if (state.page === 'series') renderSeriesDetails(state.slug);
      else if (state.page === 'episode') {
        const sData = seriesEpisodesData[state.slug];
        if (sData) {
          const epis = (sData.seasons[state.season] || []).find(e => String(e.ep) === String(state.epi));
          if (epis) renderEpisodeView(state.slug, state.season, epis);
        }
      }
    };
  });
});

// SHOW ALL SERIES (grid view)
function renderSeriesList(search = "") {
  showOnly('spa-series-list');
  document.getElementById('mainTitle').textContent = "Turkish Series";
  let list = document.getElementById('spa-series-list');
  list.innerHTML = `<div class="poster-grid"></div>`;
  let grid = list.querySelector('.poster-grid');
  let filtered = seriesList;
  if (search) filtered = seriesList.filter(s => s.title.toLowerCase().includes(search.toLowerCase()));
  if (!filtered.length) {
    grid.innerHTML = `<div style="color:#fff;font-size:1.1em;padding:1.5em;">No series found.</div>`;
    return;
  }
  filtered.forEach(series => {
    let div = document.createElement('div');
    div.className = 'poster-item';
    div.innerHTML = `
      <img src="${series.poster}" alt="${series.title}">
      <div class="title">${series.title}</div>
    `;
    div.onclick = () => {
      history.pushState({ page: 'series', slug: series.slug }, '', '#series-' + series.slug);
      renderSeriesDetails(series.slug);
    };
    grid.appendChild(div);
  });
}

// SERIES DETAILS: poster, desc, season bar, grid of episode thumbs
function renderSeriesDetails(slug) {
  showOnly('spa-series-details');
  const meta = seriesList.find(s => s.slug === slug);
  const sData = seriesEpisodesData[slug];
  if (!meta || !sData) return renderSeriesList();
  document.getElementById('mainTitle').textContent = meta.title;
  let desc = (meta.desc && (meta.desc[currentLang] || meta.desc['en'])) || '';

  const seasonNums = Object.keys(sData.seasons).map(Number).sort((a, b) => a - b);
  let defaultSeason = String(seasonNums[0]);

  let details = document.getElementById('spa-series-details');
  details.innerHTML = `
    <button id="backToList">&larr; Back</button>
    <div style="display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap;">
      <img src="${meta.poster}" alt="${meta.title}" style="width:160px;border-radius:8px;">
      <div>
        <h2 style="margin-top:0">${meta.title}</h2>
        <div style="margin-bottom:1.15em;max-width:400px;">${desc}</div>
        <div id="seasons-bar" style="margin:1em 0 0.5em 0;"></div>
        <div id="season-episodes" class="poster-grid"></div>
      </div>
    </div>
    <div id="spa-episode-view" class="hide"></div>
  `;
  document.getElementById('backToList').onclick = () => { goHome(); };

  // Render season bar and (by default) the first season
  renderSeasonBar(slug, seasonNums, defaultSeason);
  renderSeasonEpisodes(slug, defaultSeason);
}

// Season bar (tabs for 1/2/3...)
function renderSeasonBar(slug, seasonNums, activeSeason) {
  let bar = document.getElementById('seasons-bar');
  bar.innerHTML = seasonNums.map(season =>
    `<button data-season="${season}" class="season-btn${season==activeSeason?' active':''}">Season ${season}</button>`
  ).join("");
  bar.querySelectorAll(".season-btn").forEach(btn => {
    btn.onclick = () => {
      bar.querySelectorAll('.season-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderSeasonEpisodes(slug, btn.dataset.season);
    };
  });
}

// Render all episodes for a single season, as grid/thumbs
function renderSeasonEpisodes(slug, seasonNumber) {
  const sData = seriesEpisodesData[slug];
  const episodes = sData.seasons[seasonNumber] || [];
  episodViewHide();
  let episGrid = document.getElementById('season-episodes');
  if (!episodes.length) {
    episGrid.innerHTML = "<div style='color:#fff;'>No episodes.</div>";
    return;
  }
  episGrid.innerHTML = '';
  episodes.forEach(ep => {
    let div = document.createElement('div');
    div.className = 'poster-item';
    div.innerHTML = `
      <img src="${ep.thumb || 'default-thumb.jpg'}" alt="Ep ${ep.ep}">
      <div class="title">Ep ${ep.ep}: ${ep.title}</div>
    `;
    div.onclick = () => {
      history.pushState({page: 'episode', slug, season: seasonNumber, epi: ep.ep}, '', `#series-${slug}-s${seasonNumber}-ep${ep.ep}`);
      renderEpisodeView(slug, seasonNumber, ep);
    };
    episGrid.appendChild(div);
  });
}

// Main episode popup (embed + download button)
function renderEpisodeView(slug, season, ep) {
  episodViewShow();
  let box = document.getElementById('spa-episode-view');
  box.innerHTML = `
    <button id="closeEpisodeView">&larr; Back to Season</button>
    <h2>${ep.title ? ep.title : `Episode ${ep.ep}`}</h2>
    <div class="ep-embed">${ep.embed || ''}</div>
    <div style="margin:1em 0;">
      <a class="download-btn" href="${ep.download||'#'}" download>Download Episode</a>
    </div>
  `;
  document.getElementById('closeEpisodeView').onclick = () => {
    history.pushState({page:'series', slug}, '', `#series-${slug}`);
    renderSeriesDetails(slug);
    renderSeasonBar(slug, Object.keys(seriesEpisodesData[slug].seasons).map(Number).sort((a,b)=>a-b), season);
    renderSeasonEpisodes(slug, season);
  };
}

// Hide/show helpers
function episodViewShow(){
  document.getElementById('spa-episode-view').classList.remove('hide');
  document.getElementById('season-episodes').classList.add('hide');
  document.getElementById('seasons-bar').classList.add('hide');
}
function episodViewHide(){
  document.getElementById('spa-episode-view').classList.add('hide');
  document.getElementById('season-episodes').classList.remove('hide');
  document.getElementById('seasons-bar').classList.remove('hide');
}

// SPA/Telegram/WB back/forward support
function handlePopstate(e) {
  const state = e.state || {};
  if (!state.page || state.page === 'list') {
    renderSeriesList(document.getElementById('seriesSearch').value.trim());
  } else if (state.page === 'series') {
    renderSeriesDetails(state.slug);
  } else if (state.page === 'episode') {
    const sData = seriesEpisodesData[state.slug];
    if (sData) {
      const epis = (sData.seasons[state.season] || []).find(e => String(e.ep) === String(state.epi));
      if (epis) renderEpisodeView(state.slug, state.season, epis);
    }
  }
}

function showOnly(id) {
  ['spa-series-list','spa-series-details','spa-episode-details'].forEach(hid =>
    document.getElementById(hid) && document.getElementById(hid).classList.toggle('hide', hid !== id)
  );
}

function goHome() {
  history.pushState({page:'list'}, '', '#');
  renderSeriesList(document.getElementById('seriesSearch').value.trim());
}
