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
      if (!state.page || state.page === 'list')
        renderSeriesList(document.getElementById('seriesSearch').value.trim());
      else if (state.page === 'series')
        renderSeriesDetails(state.slug);
      else if (state.page === 'episode')
        playProEpisode(state.slug, String(state.season), state.epi, seriesList.find(s=>s.slug===state.slug));
    };
  });
});

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

function renderSeriesDetails(slug) {
  showOnly('spa-series-details');
  const meta = seriesList.find(s => s.slug === slug);
  const sData = seriesEpisodesData[slug];
  if (!meta || !sData) return renderSeriesList();
  document.getElementById('mainTitle').textContent = meta.title;
  let desc = (meta.desc && (meta.desc[currentLang] || meta.desc['en'])) || '';
  const seasonNums = Object.keys(sData.seasons).sort((a, b) => Number(a) - Number(b));
  let defaultSeason = seasonNums[0];
  let details = document.getElementById('spa-series-details');
  details.innerHTML = `
    <div class="classic-details-card">
      <button class="series-back-btn" id="backToList" title="Go Back">&larr; Back</button>
      <img class="series-big-poster" src="${meta.poster}" alt="${meta.title}">
      <div class="series-desc">
        <h2>${meta.title}</h2>
        <p>${desc}</p>
      </div>
    </div>
    <div class="classic-seasons-bar" id="classic-seasons-bar"></div>
    <div class="classic-episodes-list" id="classic-episodes-list"></div>
  `;
  document.getElementById('backToList').onclick = () => { goHome(); };
  renderClassicSeasonBar(slug, seasonNums, defaultSeason);
  renderClassicEpisodesList(slug, defaultSeason);
}

function renderClassicSeasonBar(slug, seasonNums, activeSeason) {
  let bar = document.getElementById('classic-seasons-bar');
  bar.innerHTML =
    seasonNums.map(season => `
      <button data-season="${season}" class="season-btn${season == activeSeason ? ' active' : ''}">Season ${season}</button>
    `).join('');
  bar.querySelectorAll('.season-btn').forEach(btn => {
    btn.onclick = () => {
      bar.querySelectorAll('.season-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderClassicEpisodesList(slug, btn.dataset.season);
    };
  });
}

function renderClassicEpisodesList(slug, seasonNumber) {
  const sData = seriesEpisodesData[slug];
  const seasonKey = String(seasonNumber);
  const episodes = sData && sData.seasons && sData.seasons[seasonKey] ? sData.seasons[seasonKey] : [];
  let out = '';
  if (!episodes.length) {
    out = `<div style='color:#fff;padding:18px;'>No episodes for this season.</div>`;
  } else {
    out = episodes
      .map(ep => `
        <div class="classic-ep-row" onclick="window._spaPlayEpisode && window._spaPlayEpisode('${slug}','${seasonKey}','${ep.ep}')">
          <img src="${ep.thumb || 'default-thumb.jpg'}" class="classic-ep-thumb" alt="Ep ${ep.ep}" />
          <span class="classic-ep-title">${ep.title ? ep.title : `Episode ${ep.ep}`}</span>
        </div>
      `).join('');
  }
  document.getElementById('classic-episodes-list').innerHTML = out;
  window._spaPlayEpisode = (slug, seasonKey, epNum) =>
    playProEpisode(slug, seasonKey, epNum, seriesList.find(s=>s.slug===slug));
}

// Professional streaming-style episode view
function playProEpisode(slug, season, epi, meta) {
  const seasonKey = String(season);
  const sData = seriesEpisodesData[slug];
  const episodes = sData && sData.seasons ? sData.seasons[seasonKey] || [] : [];
  const ep = episodes.find(e => String(e.ep) === String(epi));
  let container = document.getElementById('spa-series-details');
  if (!ep) {
    container.innerHTML = `<div style="color:#fff; padding:40px;">Episode not found.</div>`;
    return;
  }
  container.innerHTML = `
    <div class="pro-episode-view">
      <div class="pro-episode-header">
        <button class="pro-episode-back" onclick="renderSeriesDetails('${slug}')">&larr; Back to episodes</button>
        <h2 class="pro-episode-title">${meta ? meta.title : ''} – <span>${ep.title ? ep.title : `Episode ${ep.ep}`}</span></h2>
      </div>
      <div class="pro-episode-embed">${ep.embed || '<div style="padding:50px 0;color:#ccc;text-align:center;">No streaming available</div>'}</div>
      <a class="pro-download-btn" href="${ep.download || '#'}" download>⬇️ Download Episode</a>
    </div>
  `;
  history.pushState({page: 'episode', slug, season: seasonKey, epi: ep.ep}, '', `#series-${slug}-s${seasonKey}-ep${ep.ep}`);
}

function showOnly(id) {
  ['spa-series-list', 'spa-series-details'].forEach(hid =>
    document.getElementById(hid) && document.getElementById(hid).classList.toggle('hide', hid !== id)
  );
}

function goHome() {
  history.pushState({page:'list'}, '', '#');
  renderSeriesList(document.getElementById('seriesSearch').value.trim());
}

function handlePopstate(e) {
  const state = e.state || {};
  if (!state.page || state.page === 'list') {
    renderSeriesList(document.getElementById('seriesSearch').value.trim());
  } else if (state.page === 'series') {
    renderSeriesDetails(state.slug);
  } else if (state.page === 'episode') {
    playProEpisode(
      state.slug,
      String(state.season),
      state.epi,
      seriesList.find(s=>s.slug===state.slug)
    );
  }
}
