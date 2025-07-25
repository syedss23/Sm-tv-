let seriesList = [];
let seriesEpisodesData = {};
let currentLang = 'en';

document.addEventListener('DOMContentLoaded', () => {
  Promise.all([
    fetch('series.json').then(r => r.json()),
    fetch('links.json').then(r => r.json())
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
    document.getElementById('seriesSearch').addEventListener('input', e => {
      renderSeriesList(e.target.value.trim());
    });
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

// SERIES GRID (Home)
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

// SERIES DETAILS: Pro layout, compact big poster, description, season bar, episode grid
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
    <button id="backToList" class="close-btn" style="position:static;float:right;margin-bottom:23px;">&larr; Back</button>
    <div class="series-details-card">
      <img class="series-big-poster" src="${meta.poster}" alt="${meta.title}">
      <div style="flex:1;min-width:130px">
        <h2 style="margin-top:0;font-size:1.2em;">${meta.title}</h2>
        <div style="margin-bottom:1em;line-height:1.5;color:#efefef;">${desc}</div>
        <div id="seasons-bar"></div>
        <div id="season-episodes" class="poster-grid"></div>
      </div>
    </div>
    <div id="spa-episode-view" class="hide"></div>
  `;
  document.getElementById('backToList').onclick = () => { goHome(); };

  renderSeasonBar(slug, seasonNums, defaultSeason);
  renderSeasonEpisodes(slug, defaultSeason);
}

// SEASONS BAR
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

// Tighter episode grid for season
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
    div.className = 'episode-item';
    div.innerHTML = `
      <img class="episode-thumb" src="${ep.thumb || 'default-thumb.jpg'}" alt="Ep ${ep.ep}">
      <div class="episode-title">${ep.title ? ep.title : `Episode ${ep.ep}`}</div>
    `;
    div.onclick = () => {
      history.pushState({page: 'episode', slug, season: seasonNumber, epi: ep.ep}, '', `#series-${slug}-s${seasonNumber}-ep${ep.ep}`);
      renderEpisodeView(slug, seasonNumber, ep);
    };
    episGrid.appendChild(div);
  });
}

// Centered streaming popup
function renderEpisodeView(slug, season, ep) {
  const overlay = document.getElementById('spa-episode-view');
  overlay.classList.remove('hide');
  overlay.innerHTML = `
    <button class="close-btn" id="closeEpisodeView" title="Close">&times;</button>
    <div class="stream-content">
      <div class="ep-title">${ep.title ? ep.title : `Episode ${ep.ep}`}</div>
      <div class="ep-embed">${ep.embed || '<div style="padding:60px 0;color:#ccc;">No streaming available</div>'}</div>
      <a class="download-btn" href="${ep.download||'#'}" download>⬇️ Download</a>
    </div>
  `;
  document.getElementById('closeEpisodeView').onclick = () => {
    overlay.classList.add('hide');
    history.pushState({page:'series', slug}, '', `#series-${slug}`);
    renderSeriesDetails(slug);
    renderSeasonBar(slug, Object.keys(seriesEpisodesData[slug].seasons).map(Number).sort((a,b)=>a-b), season);
    renderSeasonEpisodes(slug, season);
  };
}

function episodViewShow(){ /* handled by overlay above */ }
function episodViewHide(){
  const el = document.getElementById('spa-episode-view');
  if (el) el.classList.add('hide');
}

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
