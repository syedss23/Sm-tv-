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
    <div class="pro-details-header">
      <button class="series-back-btn" id="backToList" title="Go Back">&larr; Back</button>
      <img class="series-detail-poster" src="${meta.poster}" alt="${meta.title}">
      <div class="series-detail-meta">
        <h2>${meta.title}</h2>
        <div class="series-desc">${desc}</div>
      </div>
    </div>
    <div class="pro-seasons-tabs" id="pro-seasons-tabs"></div>
    <div class="pro-episodes-row-wrap" id="pro-episodes-row-wrap"></div>
  `;
  document.getElementById('backToList').onclick = () => { goHome(); };
  renderProSeasonsTabs(slug, seasonNums, defaultSeason);
  renderProEpisodesRow(slug, defaultSeason);
}

function renderProSeasonsTabs(slug, seasonNums, activeSeason) {
  let bar = document.getElementById('pro-seasons-tabs');
  bar.innerHTML =
    seasonNums.map(season =>
      `<button data-season="${season}" class="pro-season-tab${season == activeSeason ? ' active' : ''}">Season ${season}</button>`
    ).join('');
  bar.querySelectorAll('.pro-season-tab').forEach(btn => {
    btn.onclick = () => {
      bar.querySelectorAll('.pro-season-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProEpisodesRow(slug, btn.dataset.season);
    };
  });
}

function renderProEpisodesRow(slug, seasonNumber) {
  const sData = seriesEpisodesData[slug];
  const seasonKey = String(seasonNumber);
  const episodes = sData && sData.seasons && sData.seasons[seasonKey] ? sData.seasons[seasonKey] : [];
  let row = '';
  if (!episodes.length) {
    row = `<div style='color:#fff;padding:22px 0 0 0;'>No episodes for this season.</div>`;
  } else {
    row = `<div class="pro-episodes-row">` +
      episodes.map(ep => `
        <div class="pro-episode-card" onclick="window._spaPlayEpisode && window._spaPlayEpisode('${slug}','${seasonKey}','${ep.ep}')">
          <div class="pro-ep-thumb-wrap">
            <img src="${ep.thumb || 'default-thumb.jpg'}" class="pro-ep-thumb" alt="Ep ${ep.ep}">
            <span class="pro-ep-num">Ep ${ep.ep}</span>
          </div>
          <div class="pro-ep-title">${ep.title ? ep.title : `Episode ${ep.ep}`}</div>
        </div>
      `).join('') + '</div>';
  }
  document.getElementById('pro-episodes-row-wrap').innerHTML = row;
  window._spaPlayEpisode = (slug, seasonKey, epNum) =>
    playProEpisode(slug, seasonKey, epNum, seriesList.find(s=>s.slug===slug));
}

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
