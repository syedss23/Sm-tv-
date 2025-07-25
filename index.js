let allSeries = [];
let allLinks = [];

document.addEventListener('DOMContentLoaded', () => {
  Promise.all([
    fetch('series.json').then(r => r.json()),
    fetch('links.json').then(r => r.json())
  ]).then(([series, links]) => {
    allSeries = series;
    allLinks = links;
    renderSeriesList();
    window.addEventListener('popstate', handlePopstate);
    // Sidebar and nav
    document.getElementById('sidebarToggle').onclick = () => document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarClose').onclick = () => document.getElementById('sidebar').classList.remove('open');
    document.getElementById('navHome').onclick = (e) => { e.preventDefault(); goHome(); };
    // Search
    document.getElementById('seriesSearch').addEventListener('input', e => {
      renderSeriesList(e.target.value.trim());
    });
    // Language select (expand logic as needed)
    document.getElementById('langSelect').onchange = function(){};
  });
});

function renderSeriesList(search = "") {
  showOnly('spa-series-list');
  document.getElementById('mainTitle').textContent = "Turkish Series";
  let list = document.getElementById('spa-series-list');
  list.innerHTML = `<div class="poster-grid"></div>`;
  let grid = list.querySelector('.poster-grid');
  let filtered = allSeries;
  if (search) filtered = allSeries.filter(s => s.title.toLowerCase().includes(search.toLowerCase()));
  if (filtered.length === 0) {
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
      history.pushState({page: 'series', slug: series.slug}, '', '#series-' + series.slug);
      renderSeriesDetails(series.slug);
    };
    grid.appendChild(div);
  });
}

function renderSeriesDetails(slug) {
  showOnly('spa-series-details');
  const s = allSeries.find(ss => ss.slug === slug);
  if (!s) return renderSeriesList();
  document.getElementById('mainTitle').textContent = s.title;
  let details = document.getElementById('spa-series-details');
  details.innerHTML = `
    <button id="backToList">&larr; Back</button>
    <div style="display:flex;gap:24px;align-items:start;flex-wrap:wrap;">
      <img src="${s.poster}" alt="${s.title}" style="width:160px; border-radius:8px;">
      <div>
        <h2 style="margin-top:0">${s.title}</h2>
        <div>${s.description||''}</div>
        <div id="seasons-bar" style="margin:1em 0 0.5em"></div>
        <div id="season-episodes" class="poster-grid"></div>
      </div>
    </div>
    <div id="spa-episode-view" class="hide"></div>
  `;
  document.getElementById('backToList').onclick = () => { goHome(); };
  // get this series' links/seasons
  const seriesLinks = allLinks.find(l => l.slug === slug);
  const seasonNumber = (seriesLinks?.seasons?.[0]?.season) || 1;
  if (seriesLinks)
    loadSeasonsAndEpisodesFromLinks(seriesLinks, slug, seasonNumber);
}

function loadSeasonsAndEpisodesFromLinks(seriesLinks, slug, seasonNum = 1) {
  // Render season buttons
  let bar = document.getElementById('seasons-bar');
  bar.innerHTML = seriesLinks.seasons.map(s =>
    `<button data-season="${s.season}" class="season-btn${s.season==seasonNum?' active':''}">Season ${s.season}</button>`
  ).join("");
  bar.querySelectorAll(".season-btn").forEach(btn => {
    btn.onclick = () => loadSeasonsAndEpisodesFromLinks(seriesLinks, slug, Number(btn.dataset.season));
  });
  // Render episodes for season
  let episGrid = document.getElementById('season-episodes');
  episodViewHide();
  let find = seriesLinks.seasons.find(s => s.season == seasonNum);
  if (!find || !find.episodes.length) {
    episGrid.innerHTML = "<div style='color:#fff;'>No episodes.</div>";
    return;
  }
  episGrid.innerHTML = '';
  find.episodes.forEach(ep => {
    let div = document.createElement('div');
    div.className = 'poster-item';
    div.innerHTML = `
      <img src="${ep.thumbnail||'default-thumb.jpg'}" alt="Ep ${ep.id}">
      <div class="title">${ep.title}</div>
    `;
    div.onclick = () => {
      history.pushState({page:'episode', slug, season:seasonNum, epi: ep.id}, '', `#series-${slug}-s${seasonNum}-ep${ep.id}`);
      renderEpisodeView(slug, seasonNum, ep);
    };
    episGrid.appendChild(div);
  });
}

function renderEpisodeView(slug, season, ep) {
  episodViewShow();
  let box = document.getElementById('spa-episode-view');
  box.innerHTML = `
    <button id="closeEpisodeView">&larr; Back to Season</button>
    <h2>${ep.title}</h2>
    <div class="ep-embed">${ep.embed || ''}</div>
    <div style="margin:1em 0;">
      <a class="download-btn" href="${ep.download}" download>Download Episode</a>
    </div>
  `;
  document.getElementById('closeEpisodeView').onclick = () => {
    history.pushState({page:'series', slug}, '', `#series-${slug}`);
    renderSeriesDetails(slug);
    const seriesLinks = allLinks.find(l => l.slug === slug);
    loadSeasonsAndEpisodesFromLinks(seriesLinks, slug, season);
  };
}

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

function handlePopstate(e) {
  const state = e.state || {};
  if (!state.page || state.page === 'list') renderSeriesList();
  else if (state.page === 'series') renderSeriesDetails(state.slug);
  else if (state.page === 'episode') {
    const seriesLinks = allLinks.find(l => l.slug === state.slug);
    const season = seriesLinks?.seasons.find(s => s.season == state.season);
    const ep = season?.episodes.find(e => e.id == state.epi || String(e.id) === String(state.epi));
    if (ep) renderEpisodeView(state.slug, state.season, ep);
  }
}

function showOnly(id) {
  ['spa-series-list','spa-series-details','spa-episode-details'].forEach(hid =>
    document.getElementById(hid) && document.getElementById(hid).classList.toggle('hide', hid !== id)
  );
  // The episode-view is inside spa-series-details and is toggled by show/hide
}
function goHome() {
  history.pushState({page:'list'}, '', '#');
  renderSeriesList();
}
