// --- episode.js ---
const params = new URLSearchParams(window.location.search);
const slug = params.get('series');
const season = params.get('season');
const epNum = params.get('ep');

Promise.all([
  fetch('series.json').then(r => r.json()),
  fetch('links.json').then(r => r.json())
]).then(([seriesList, data]) => {
  const meta = seriesList.find(s => s.slug === slug);
  const sData = data[slug];
  const episodes = sData && sData.seasons && sData.seasons[String(season)] ? sData.seasons[String(season)] : [];
  const ep = episodes.find(e => String(e.ep) === String(epNum));
  let container = document.getElementById('episode-view');
  if (!ep) {
    container.innerHTML = `<div style="color:#fff;padding:30px;">Episode not found.</div>`;
    return;
  }

  // Show Monetag ad before streaming
  showAdThen(() => {
    container.innerHTML = `
      <div class="pro-episode-view">
        <div class="pro-episode-header-pro">
          <a class="pro-episode-back-pro" href="series.html?series=${slug}" title="Back">
            <span class="pro-back-arrow">&#8592;</span> Episodes
          </a>
          <h2 class="pro-episode-title-pro">
            ${meta ? meta.title : ''} 
            <span class="pro-ep-title-part">${ep.title ? ep.title : `Episode ${ep.ep}`}</span>
          </h2>
        </div>
        <div class="pro-episode-embed">${ep.embed || '<div style="padding:50px 0;color:#ccc;text-align:center;">No streaming available</div>'}</div>
        <a class="pro-download-btn" href="${ep.download || '#'}" download>⬇️ Download Episode</a>
      </div>
    `;
  });

  function showAdThen(done) {
    // Show blocking overlay for ad
    let overlay = document.createElement('div');
    overlay.id = 'adBlockOverlay';
    overlay.style = 'position:fixed;z-index:99999;top:0;left:0;width:100vw;height:100vh;background:#111c;padding:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.2em;';
    overlay.innerHTML = '<div><b>Loading&nbsp;Ad...</b></div>';
    document.body.appendChild(overlay);

    if (typeof show_9623557 === "function") {
      show_9623557({
        type: 'inApp',
        inAppSettings: {
          frequency: 2,
          capping: 0.1,
          interval: 30,
          timeout: 5,
          everyPage: false
        }
      });
    }
    // Remove overlay after ad time (tune delay to Monetag)
    setTimeout(() => {
      document.body.removeChild(overlay);
      done();
    }, 6500);
  }
});
