// Note: You must move/adapt your series fetching, language, rendering,
// and episode fetching logic to this file, as all views load here!

let allSeries = [];
let seriesData = {}; // Cache series info

document.addEventListener('DOMContentLoaded', () => {
  fetch('series.json')
    .then(r => r.json())
    .then(data => {
      allSeries = data;
      seriesData = {};
      data.forEach(s => seriesData[s.slug] = s);
      renderSeriesList();
    });

  // Navigation
  document.getElementById('navHome').addEventListener('click', (e) => {
    e.preventDefault(); goHome();
  });
  window.onpopstate = handlePopstate;

  // Example: sidebar code remains same
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
  document.getElementById('sidebarClose')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
  });
});

function renderSeriesList() {
  document.getElementById('mainTitle').textContent = 'Turkish Series';
  hideAllViews();
  let div = document.getElementById('app-view-series-list');
  div.style.display = '';
  div.innerHTML = '';
  allSeries.forEach(series => {
    const el = document.createElement('div');
    el.className = 'poster-item';
    el.innerHTML = `
      <div class="series-card-link" style="cursor:pointer;" data-slug="${series.slug}">
        <img src="${series.poster}" alt="${series.title}">
        <div class="title">${series.title}</div>
      </div>
    `;
    el.querySelector('.series-card-link').onclick = (e) => {
      e.preventDefault();
      renderSeriesDetails(series.slug);
      history.pushState({page: 'series', slug: series.slug}, '', `#series/${series.slug}`);
    };
    div.appendChild(el);
  });
}

function renderSeriesDetails(slug) {
  let s = seriesData[slug];
  if (!s) return goHome();
  document.getElementById('mainTitle').textContent = s.title;
  hideAllViews();
  let div = document.getElementById('app-view-series-details');
  div.style.display = '';
  div.innerHTML = `
    <button id="backToList">&larr; Back</button>
    <h2>${s.title}</h2>
    <img src="${s.poster}" alt="${s.title}" style="max-width:200px;"><br>
    <div>${s.description || ''}</div>
    <h3>Episodes</h3>
    <div id="episodesList"></div>
  `;
  div.querySelector('#backToList').onclick = () => {
    goHome();
    history.pushState({page: 'home'}, '', '#');
  };
  // Example: Replace with real episode logic/fetch
  renderEpisodeList(s.slug, div.querySelector('#episodesList'));
}

function renderEpisodeList(slug, container) {
  // Replace with real episode JSON fetch! Example dummy code:
  fetch(`episodes-${slug}.json`).then(r=>r.json()).then(episodes => {
    container.innerHTML = '';
    episodes.forEach(ep => {
      let epEl = document.createElement('button');
      epEl.textContent = ep.title;
      epEl.onclick = () => {
        renderEpisodeDetails(slug, ep.id);
        history.pushState({page: 'episode', slug: slug, ep: ep.id}, '', `#series/${slug}/ep/${ep.id}`);
      };
      container.appendChild(epEl);
    });
  }).catch(()=>{ container.innerHTML = 'Episodes missing.' });
}

function renderEpisodeDetails(slug, epId) {
  // Replace with AJAX fetch from episode JSON file
  fetch(`episodes-${slug}.json`).then(r=>r.json()).then(episodes => {
    let ep = episodes.find(e => e.id == epId);
    if(!ep) return renderSeriesDetails(slug);
    document.getElementById('mainTitle').textContent = ep.title;
    hideAllViews();
    let div = document.getElementById('app-view-episode-details');
    div.style.display = '';
    div.innerHTML = `
      <button id="backToSeries">&larr; Back</button>
      <h2>${ep.title}</h2>
      <video src="${ep.link}" controls style="width:100%"></video>
    `;
    div.querySelector('#backToSeries').onclick = () => {
      renderSeriesDetails(slug); // go back to series info, NOT home yet
      history.pushState({page: 'series', slug: slug}, '', `#series/${slug}`);
    };
  });
}

function goHome() {
  history.pushState({page: 'home'}, '', '#');
  renderSeriesList();
}

function handlePopstate(event) {
  const st = event.state || {};
  if (!st.page || st.page === 'home') renderSeriesList();
  else if (st.page === 'series') renderSeriesDetails(st.slug);
  else if (st.page === 'episode') renderEpisodeDetails(st.slug, st.ep);
}

function hideAllViews() {
  document.getElementById('app-view-series-list').style.display = 'none';
  document.getElementById('app-view-series-details').style.display = 'none';
  document.getElementById('app-view-episode-details').style.display = 'none';
}
