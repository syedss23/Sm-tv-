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
  const linksData = await linksRes.json();
  const series = seriesList.find(s => s.slug === slug);
  if (!series) return;

  // Series title
  document.getElementById('seriesTitle').innerText = series.title;

  // Series description & poster
  const detail = document.getElementById('series-detail');
  detail.innerHTML = `
    <img src="${series.poster}" alt="${series.title}" style="max-width:180px;float:left;margin-right:2em;border-radius:6px;margin-bottom:1em">
    <p>${series.desc[lang] || series.desc['en']}</p>
    <div style="clear:both"></div>
  `;

  // Detect seasons from linksData
  const seasonMap = (linksData[slug] && linksData[slug].seasons) ? linksData[slug].seasons : {};
  const allSeasons = Object.keys(seasonMap).sort((a,b)=>Number(a)-Number(b));
  if (!allSeasons.length) {
    document.getElementById('episodes-section').innerHTML = '<div style="padding:2em;color:#ff6565;text-align:center;">No seasons/episodes available.</div>';
    document.getElementById('seasonsBar').innerHTML = '';
    return;
  }

  // Render season buttons
  const seasonsBar = document.getElementById('seasonsBar');
  seasonsBar.innerHTML = '';
  allSeasons.forEach(seasonNum => {
    const btn = document.createElement('button');
    btn.innerText = `Season ${seasonNum}`;
    btn.className = 'season-btn';
    btn.onclick = () => {
      renderEpisodes(slug, seasonNum, seasonMap[seasonNum]);
      highlightSelected(seasonNum);
    };
    seasonsBar.appendChild(btn);
  });

  // Show the first available season by default
  renderEpisodes(slug, allSeasons[0], seasonMap[allSeasons[0]]);
  highlightSelected(allSeasons[0]);
}

function highlightSelected(selectedSeason) {
  const buttons = document.querySelectorAll('.season-btn');
  buttons.forEach(btn => {
    if (btn.innerText.endsWith(selectedSeason)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function renderEpisodes(slug, seasonNum, episodesArr) {
  const section = document.getElementById('episodes-section');
  if (!episodesArr || episodesArr.length === 0) {
    section.innerHTML = '<div style="padding:1.4em; color:#ff6565; text-align:center;">No episodes found for this season.</div>';
    return;
  }
  section.innerHTML = '';
  episodesArr.forEach(ep => {
    const epDiv = document.createElement('div');
    epDiv.className = "episode-thumb";
    epDiv.innerHTML = `
      <a href="episode.html?slug=${slug}&season=${seasonNum}&ep=${ep.ep}">
        <img src="${ep.thumb}" alt="Episode ${ep.ep}">
        <div class="ep-label">Ep ${ep.ep}</div>
        <div class="title">${ep.title}</div>
      </a>
    `;
    section.appendChild(epDiv);
  });
}
