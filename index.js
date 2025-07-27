document.addEventListener('DOMContentLoaded', () => {
  // Sidebar toggle logic (for mobile)
  const sbar = document.getElementById('sidebar');
  document.getElementById('sidebarToggle').onclick = () => sbar.classList.toggle('open');
  document.getElementById('sidebarClose').onclick = () => sbar.classList.remove('open');

  // Fetch and display series grid
  let seriesList = [];
  fetch('series.json').then(r => r.json()).then(data => {
    seriesList = data;
    renderSeriesList('');
  });

  // Search bar handler
  document.getElementById('seriesSearch').addEventListener('input', e => {
    renderSeriesList(e.target.value.trim());
  });

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
});
