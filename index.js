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
          if (epis) renderFullPageEpisode(state.slug, state.season, epis, seriesList.find(s=>s.slug===state.slug));
        }
      }
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
  const seasonNums = Object.keys(sData.seasons).map(Number).sort((a, b) => a - b);
  let defaultSeason = String(seasonNums[0]);
  let details = document.getElementById('spa-series-details');
  details.innerHTML = `
    <div class="series-details-layout">
      <button class="series-back-btn" id="backToList" title="Go Back">&larr; Back</button>
      <img class="series-big-poster" src="${meta.poster}" alt="${meta.title}">
      <div class="series-meta">
        <h2>${meta.title}</h2>
        <div class="series-desc">${desc}</div>
        <div id="seasons-bar"></div>
        <div id="season-episodes" class="poster-grid"></div>
      </div>
    </div>
    <div id="spa-full-episode-view" class="hide"></div>
  `;
  document.getElementById('backToList').onclick = () => { goHome(); };
  renderSeasonBar(slug, seasonNums, defaultSeason);
  renderSeasonEpisodes(slug, defaultSeason);
}

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

function renderSeasonEpisodes(slug, seasonNumber) {
  const sData = seriesEpisodesData[slug];
  const episodes = sData.seasons[seasonNumber] || [];
  let episGrid = document.getElementById('season-episodes');
  episGrid.innerHTML = '';
  if (!episodes.length) {
    episGrid.innerHTML = "<div style='color:#fff;'>No episodes.</div>";
    return;
  }
  episodes.forEach(ep => {
    let div = document.createElement('div');
    div.className = 'episode-item';
    div.innerHTML = `
      <img class="episode-thumb" src="${ep.thumb || 'default-thumb.jpg'}" alt="Ep ${ep.ep}">
      <div class="episode-title">${ep.title ? ep.title : `Episode ${ep.ep}`}</div>
    `;
    div.onclick = () => {
      history.pushState({page: 'episode', slug, season: seasonNumber, epi: ep.ep}, '', `#series-${slug}-s${seasonNumber}-ep${ep.ep}`);
      renderFullPageEpisode(slug, seasonNumber, ep, seriesList.find(s=>s.slug===slug));
    };
    episGrid.appendChild(div);
  });
}

function renderFullPageEpisode(slug, season, ep, meta) {
  let existing = document.getElementById('spa-full-episode-view');
  if (!existing) {
    existing = document.createElement('div');
    existing.id = "spa-full-episode-view";
    document.body.appendChild(existing);
  }
  showOnly(null); // Hide all
  existing.classList.remove('hide');
  existing.innerHTML = `
    <div class="ep-full-header">
      <button class="ep-full-back-btn" id="episodePageBack" title="Back">&larr;</button>
      <h2>${meta ? meta.title : ''} – <span style="font-weight:600;">${ep.title ? ep.title : `Episode ${ep.ep}`}</span></h2>
      <span style="width:36px;"></span>
    </div>
    <div class="ep-full-embed-block">
      <div class="ep-full-embed">${ep.embed || '<div style="padding:50px 0;color:#ccc;">No streaming available</div>'}</div>
      <a class="ep-full-download-btn" href="${ep.download || '#'}" download>⬇️ Download</a>
    </div>
  `;
  document.getElementById('episodePageBack').onclick = () => {
    existing.classList.add('hide');
    renderSeriesDetails(slug);
    renderSeasonBar(slug, Object.keys(seriesEpisodesData[slug].seasons).map(Number).sort((a,b)=>a-b), season);
    renderSeasonEpisodes(slug, season);
    history.pushState({page:'series', slug}, '', `#series-${slug}`);
  };
}

function showOnly(id) {
  ['spa-series-list','spa-series-details'].forEach(hid =>
    document.getElementById(hid) && document.getElementById(hid).classList.toggle('hide', hid !== id)
  );
  let epView = document.getElementById('spa-full-episode-view');
  if (epView) epView.classList.add('hide');
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
    const sData = seriesEpisodesData[state.slug];
    if (sData) {
      const epis = (sData.seasons[state.season] || []).find(e => String(e.ep) === String(state.epi));
      if (epis) renderFullPageEpisode(state.slug, state.season, epis, seriesList.find(s=>s.slug===state.slug));
    }
  }
}
