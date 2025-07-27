const params = new URLSearchParams(window.location.search);
const slug = params.get('series');

Promise.all([
  fetch('series.json').then(r=>r.json()),
  fetch('links.json').then(r=>r.json())
]).then(([seriesList, episodesData]) => {
  const meta = seriesList.find(s=>s.slug===slug);
  const sData = episodesData[slug];
  if (!meta || !sData) {
    document.getElementById('series-details').innerHTML = `<div style="color:#fff;">Series not found.</div>`;
    return;
  }
  let html = `
    <div class="pro-details-header">
      <a href="index.html" class="series-back-btn" title="Go Back">&larr; Back</a>
      <img class="series-detail-poster" src="${meta.poster}" alt="${meta.title}">
      <div class="series-detail-meta">
        <h2>${meta.title}</h2>
        <div class="series-desc">${meta.desc && meta.desc.en ? meta.desc.en : ''}</div>
      </div>
    </div>
    <div class="pro-seasons-tabs" id="pro-seasons-tabs"></div>
    <div class="pro-episodes-row-wrap" id="pro-episodes-row-wrap"></div>
  `;
  document.getElementById('series-details').innerHTML = html;

  const seasonNums = Object.keys(sData.seasons).sort((a,b)=>Number(a)-Number(b));
  document.getElementById('pro-seasons-tabs').innerHTML =
    seasonNums.map(season =>
      `<button data-season="${season}" class="pro-season-tab${season==seasonNums[0]?' active':''}">Season ${season}</button>`
    ).join('');
  document.querySelectorAll('.pro-season-tab').forEach(btn => {
    btn.onclick = function() {
      document.querySelectorAll('.pro-season-tab').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      renderProEpisodesRow(btn.dataset.season);
    };
  });
  renderProEpisodesRow(seasonNums[0]);
  function renderProEpisodesRow(seasonNumber) {
    const seasonKey = String(seasonNumber);
    const episodes = sData.seasons && sData.seasons[seasonKey] ? sData.seasons[seasonKey] : [];
    let row = '';
    if (!episodes.length) {
      row = `<div style='color:#fff;padding:22px 0 0 0;'>No episodes for this season.</div>`;
    } else {
      row = `<div class="pro-episodes-row">` +
        episodes.map(ep => `
          <a class="pro-episode-card" href="episode.html?series=${slug}&season=${seasonKey}&ep=${ep.ep}">
            <div class="pro-ep-thumb-wrap">
              <img src="${ep.thumb || 'default-thumb.jpg'}" class="pro-ep-thumb" alt="Ep ${ep.ep}">
              <span class="pro-ep-num">Ep ${ep.ep}</span>
            </div>
            <div class="pro-ep-title">${ep.title ? ep.title : `Episode ${ep.ep}`}</div>
          </a>
        `).join('') + '</div>';
    }
    document.getElementById('pro-episodes-row-wrap').innerHTML = row;
  }
});
