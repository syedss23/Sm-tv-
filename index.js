let allSeries = [];
let episodesCache = {};

document.addEventListener('DOMContentLoaded', ()=>{
  fetch('series.json').then(r=>r.json()).then(series=>{
    allSeries = series;
    renderSeriesList();
    window.addEventListener('popstate', handlePopstate);
    // Sidebar
    document.getElementById('sidebarToggle').onclick = ()=>document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarClose').onclick = ()=>document.getElementById('sidebar').classList.remove('open');
    document.getElementById('navHome').onclick = (e)=>{ e.preventDefault(); goHome(); };
    // Search
    document.getElementById('seriesSearch').addEventListener('input', e=>{
      renderSeriesList(e.target.value.trim());
    });
  });
});

function renderSeriesList(search = "") {
  showOnly('spa-series-list');
  document.getElementById('mainTitle').textContent = "Turkish Series";
  let list = document.getElementById('spa-series-list');
  list.innerHTML = `<div class="poster-grid"></div>`;
  let grid = list.querySelector('.poster-grid');
  let filtered = allSeries;
  if (search) filtered = allSeries.filter(s=>s.title.toLowerCase().includes(search.toLowerCase()));
  filtered.forEach(series=>{
    let div = document.createElement('div');
    div.className = 'poster-item';
    div.innerHTML = `
      <img src="${series.poster}" alt="${series.title}">
      <div class="title">${series.title}</div>
    `;
    div.onclick = ()=>{
      history.pushState({page: 'series', slug: series.slug}, '', '#series-' + series.slug);
      renderSeriesDetails(series.slug);
    };
    grid.appendChild(div);
  });
}

function renderSeriesDetails(slug) {
  showOnly('spa-series-details');
  let s = allSeries.find(ss=>ss.slug===slug);
  if (!s) return renderSeriesList();
  document.getElementById('mainTitle').textContent = s.title;
  let details = document.getElementById('spa-series-details');
  details.innerHTML = `<button id="backToList">&larr; Back</button>
    <div style="display:flex;gap:24px;align-items:start;flex-wrap:wrap;">
      <img src="${s.poster}" alt="${s.title}" style="width:144px;border-radius:8px">
      <div>
        <h2 style="margin-top:0">${s.title}</h2>
        <div>${s.description||''}</div>
        <h3 style="margin:1em 0 0.5em">Episodes</h3>
        <div id="epis-grid" class="poster-grid"></div>
      </div>
    </div>`;
  document.getElementById('backToList').onclick = ()=>{ goHome(); };
  loadEpisodesForSeries(slug);
}
function loadEpisodesForSeries(slug) {
  let grid = document.getElementById('epis-grid');
  grid.innerHTML = "Loading...";
  (episodesCache[slug]
    ? Promise.resolve(episodesCache[slug])
    : fetch(`episodes-${slug}.json`).then(r=>r.json()).then(eps=>{episodesCache[slug]=eps; return eps;}))
    .then(episodes=>{
      grid.innerHTML = '';
      episodes.forEach(ep=>{
        let div = document.createElement('div');
        div.className = 'poster-item';
        div.innerHTML = `<div class="title">Ep ${ep.id}: ${ep.title}</div>`;
        div.onclick = ()=>{
          history.pushState({page:'episode', slug, epi: ep.id}, '', `#series-${slug}-ep${ep.id}`);
          renderEpisodeDetails(slug, ep.id);
        };
        grid.appendChild(div);
      });
    })
    .catch(()=>{grid.innerHTML="No episodes."});
}
function renderEpisodeDetails(slug, eid) {
  showOnly('spa-episode-details');
  let details = document.getElementById('spa-episode-details');
  let s = allSeries.find(s=>s.slug===slug);
  details.innerHTML = `<button id="backToSeries">&larr; Back</button><h2>Episode ${eid}</h2><div id="video"></div>`;
  document.getElementById('backToSeries').onclick = ()=>{ history.pushState({page:'series',slug}, '', '#series-'+slug); renderSeriesDetails(slug); };
  let load = episodesCache[slug]
    ? Promise.resolve(episodesCache[slug])
    : fetch(`episodes-${slug}.json`).then(r=>r.json()).then(eps=>(episodesCache[slug]=eps,eps));
  load.then(eps=>{
    let ep = (eps||[]).find(e=>e.id==eid);
    if (ep && ep.link) details.querySelector('#video').innerHTML = `<video src="${ep.link}" controls style="width:100%;max-width:600px"></video>`;
    else details.querySelector('#video').innerHTML = "Not found.";
  });
}
function handlePopstate(e) {
  const state = e.state||{};
  if (!state.page || state.page==='list') renderSeriesList();
  else if (state.page==='series') renderSeriesDetails(state.slug);
  else if (state.page==='episode') renderEpisodeDetails(state.slug, state.epi);
}

function showOnly(id) {
  ['spa-series-list','spa-series-details','spa-episode-details'].forEach(hid=>
    document.getElementById(hid).classList.toggle('hide',hid!==id)
  );
}
function goHome() {
  history.pushState({page:'list'}, '', '#');
  renderSeriesList();
}
