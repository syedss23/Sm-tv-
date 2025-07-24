let lang = localStorage.getItem('lang') || 'en';

document.addEventListener('DOMContentLoaded', () => {
  const langSelect = document.getElementById('langSelect');
  if (langSelect) {
    langSelect.value = lang;
    langSelect.addEventListener('change', e => {
      lang = e.target.value;
      localStorage.setItem('lang', lang);
      loadSeries();
    });
  }

  loadAd();
  loadSeries();

  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
  // Sidebar close button support
  const sidebarClose = document.getElementById('sidebarClose');
  if (sidebarClose && sidebar) {
    sidebarClose.addEventListener('click', () => {
      sidebar.classList.remove('open');
    });
  }
});

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

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

async function loadSeries() {
  const slug = getQueryParam('slug');
  if (!slug) return;

  // Load data
  const [seriesRes, linksRes] = await Promise.all([
    fetch('series.json'),
    fetch('links.json')
  ]);
  const seriesList = await seriesRes.json();
  const series = seriesList.find(s => s.slug === slug);
  if (!series) return;

  document.getElementById('seriesTitle').innerText = series.title;

  const detail = document.getElementById('series-detail');
  detail.innerHTML = `
    <img src="${series.poster}" alt="${series.title}" style="max-width:180px;float:left;margin-right:2em;border-radius:6px;margin-bottom:1em">
    <p>${series.desc[lang] || series.desc['en']}</p>
    <div style="clear:both"></div>
  `;

  // Only show seasons as found in links.json
  const linksData = await linksRes.json();
  const availableSeasons = Object.keys((linksData[slug] || {}).seasons || {});
  const selector = document.getElementById('season-selector');
  selector.innerHTML = '';
  availableSeasons.forEach(seasonNum => {
    const btn = document.createElement('button');
    btn.innerText = 'Season ' + seasonNum;
    btn.className = 'season-btn';
    btn.addEventListener('click', () => {
      renderEpisodes(slug, seasonNum, linksRes);
      highlightSelected(Number(seasonNum));
    });
    selector.appendChild(btn);
  });
  // Load the first available season by default
  if (availableSeasons.length) {
    renderEpisodes(slug, availableSeasons[0], linksRes);
    highlightSelected(Number(availableSeasons[0]));
  }
}

function highlightSelected(selected) {
  const buttons = document.querySelectorAll('.season-btn');
  buttons.forEach((btn, idx) => {
    btn.style.background = (btn.innerText.endsWith(selected)) ? "#e50914" : "#222";
    btn.style.color = (btn.innerText.endsWith(selected)) ? "#fff" : "#bbb";
  });
}

async function renderEpisodes(slug, season, linksRes) {
  const linksData = await linksRes.json();
  const episodes = ((linksData[slug] || {}).seasons || {})[season] || [];
  const section = document.getElementById('episodes-section');
  section.innerHTML = '';
  episodes.forEach(ep => {
    const epDiv = document.createElement('div');
    epDiv.className = "episode-thumb";
    epDiv.innerHTML = `
      <a href="episode.html?slug=${slug}&season=${season}&ep=${ep.ep}">
        <img src="${ep.thumb}" alt="Episode ${ep.ep}">
        <div class="title">${ep.title}</div>
      </a>
    `;
    section.appendChild(epDiv);
  });
}
