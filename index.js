document.addEventListener('DOMContentLoaded', () => {
  // Sidebar logic
  const sbar = document.getElementById('sidebar');
  if (document.getElementById('sidebarToggle')) {
    document.getElementById('sidebarToggle').onclick = () => sbar.classList.toggle('open');
  }
  if (document.getElementById('sidebarClose')) {
    document.getElementById('sidebarClose').onclick = () => sbar.classList.remove('open');
  }

  // Helper to get current filename
  function getPageFilename() {
    return location.pathname.split('/').pop();
  }

  // ---- SERIES LIST PAGE ----
  if (document.getElementById('spa-series-list')) {
    let seriesList = [];
    fetch('series.json').then(r => r.json()).then(data => {
      seriesList = data;
      renderSeriesList('');
    });

    if (document.getElementById('seriesSearch')) {
      document.getElementById('seriesSearch').addEventListener('input', e => {
        renderSeriesList(e.target.value.trim());
      });
    }

    function renderSeriesList(search) {
      let gridContainer = document.getElementById('spa-series-list');
      gridContainer.innerHTML = `<div class="poster-grid"></div>`;
      let grid = gridContainer.querySelector('.poster-grid');
      let filtered = seriesList;
      if (search) {
        filtered = seriesList.filter(s =>
          (s.title || '').toLowerCase().includes(search.toLowerCase())
        );
      }
      if (!filtered.length) {
        grid.innerHTML = `<div style="color:#fff;font-size:1.1em;padding:1.5em;">No series found.</div>`;
        return;
      }
      filtered.forEach(series => {
        let a = document.createElement('a');
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

  // ---- SEASON PAGE (Like salahuddin-ayyubi-season-2.html) ----
  if (document.getElementById('season-2-episodes')) {
    fetch('episode-data/salahuddin-ayyubi-season-2.json')
      .then(resp => resp.json())
      .then(episodes => renderEpisodes(episodes));

    function renderEpisodes(episodes) {
      let epContainer = document.getElementById('season-2-episodes');
      if (!episodes || !episodes.length) {
        epContainer.innerHTML = `<div style="color:#fff;padding:1.5em;">Episodes will appear here as soon as they release!</div>`;
        return;
      }
      let listHTML = '<div class="pro-episodes-row-pro">';
      episodes.forEach(ep => {
        listHTML += `
          <a class="pro-episode-card-pro" href="episode.html?ep=${ep.slug}">
            <div class="pro-ep-thumb-wrap-pro">
              <img src="${ep.thumb}" alt="${ep.title}" class="pro-ep-thumb-pro">
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
