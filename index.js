let lang = localStorage.getItem('lang') || 'en';

document.addEventListener('DOMContentLoaded', () => {
  const langSelect = document.getElementById('langSelect');
  if (langSelect) {
    langSelect.value = lang;
    langSelect.addEventListener('change', e => {
      lang = e.target.value;
      localStorage.setItem('lang', lang);
      renderGrid();
    });
  }

  renderGrid();
  loadAd();

  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
});

async function renderGrid() {
  const response = await fetch('series.json');
  const seriesList = await response.json();
  const grid = document.getElementById('series-grid');
  grid.innerHTML = '';
  seriesList.forEach(series => {
    const item = document.createElement('div');
    item.className = 'poster-item';
    item.innerHTML = `
      <a href="series.html?slug=${series.slug}">
        <img src="${series.poster}" alt="${series.title}">
        <div class="title">${series.title}</div>
      </a>
    `;
    grid.appendChild(item);
  });
}

async function loadAd() {
  const adSpace = document.getElementById('adSpace');
  try {
    const resp = await fetch('data.json');
    const data = await resp.json();
    adSpace.innerHTML = data.adCode || 'Ad Area';
  } catch {
    adSpace.innerText = "Ad Area";
  }
}
