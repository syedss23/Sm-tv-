const urlParams = new URLSearchParams(window.location.search);
const epNum = parseInt(urlParams.get('ep')) || 1;
const seasonFile = urlParams.get('season') || 'alp_arslan_s1.json';
let episodes = [];
let currentEp = epNum;

const playerContainer = document.getElementById('player-container');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const sourceSelect = document.getElementById('source-select');

fetch(`./json/${seasonFile}`)
  .then(res => res.json())
  .then(data => {
    episodes = data;
    loadEpisode(currentEp);
  });

function loadEpisode(ep) {
  const episode = episodes.find(e => e.ep === ep);
  if(!episode) return;
  
  const source = sourceSelect.value;
  playerContainer.innerHTML = episode[source] || 'Video not available';
}

prevBtn.addEventListener('click', () => {
  if(currentEp > 1) currentEp--;
  loadEpisode(currentEp);
});

nextBtn.addEventListener('click', () => {
  if(currentEp < episodes.length) currentEp++;
  loadEpisode(currentEp);
});

sourceSelect.addEventListener('change', () => loadEpisode(currentEp));
