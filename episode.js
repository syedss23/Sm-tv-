let lang = localStorage.getItem('lang') || 'en';

document.addEventListener('DOMContentLoaded', () => {
  const langSelect = document.getElementById('langSelect');
  if (langSelect) {
    langSelect.value = lang;
    langSelect.addEventListener('change', e => {
      lang = e.target.value;
      localStorage.setItem('lang', lang);
      loadEpisode();
    });
  }

  loadAd();
  loadEpisode();

  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
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

async function loadEpisode() {
  const slug = getQueryParam('slug');
  const season = getQueryParam('season');
  const epNum = parseInt(getQueryParam('ep'));
  if (!slug || !season || !epNum) return;

  // Fetch data
  const [seriesRes, linksRes] = await Promise.all([
    fetch('series.json'),
    fetch('links.json')
  ]);
  const seriesList = await seriesRes.json();
  const linksData = await linksRes.json();

  const series = seriesList.find(s => s.slug === slug);
  const episodesArr = (((linksData[slug] || {}).seasons || {})[season]) || [];
  const episode = episodesArr.find(e => e.ep === epNum);
  if (!series || !episode) return;

  document.getElementById('episodeTitle').innerText =
    `${series.title} - ${episode.title}`;

  // Inject embed code if available
  const embedDiv = document.getElementById('videoContainer');
  if (episode.embed) {
    embedDiv.innerHTML = episode.embed;
  } else {
    embedDiv.innerHTML = "<div style='color:#e50914;text-align:center;padding:2em'>No streaming source available.</div>";
  }

  // Download button
  const dlBtn = document.getElementById('downloadBtn');
  dlBtn.onclick = () => {
    window.open(episode.download, '_blank');
  };
}
