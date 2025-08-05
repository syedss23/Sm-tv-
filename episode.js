// --- episode.js ---
// This script works if your JSON has an "ep" key for each episode object, and your URLs look like:
// episode.html?series=salahuddin-ayyubi-s2&ep=1

const params = new URLSearchParams(window.location.search);
const epNum = params.get('ep');        // episode number as string/number
let slug = params.get('series');       // series identifier, eg. 'salahuddin-ayyubi-s2'

const container = document.getElementById('episode-view') || document.body;

// Ensure both series and ep are provided
if (!slug || !epNum) {
  container.innerHTML = `<div style="color:#fff;padding:30px;">Episode not found (URL missing series or ep parameters)</div>`;
  throw new Error("Missing series or ep in URL");
}

// File path: /episode-data/{series}.json
function getEpisodeFile(slug) {
  return `episode-data/${slug}.json`;
}

const HOW_TO_DOWNLOAD_URL = "https://t.me/howtodownloadd1/10";
const PREMIUM_CHANNEL_URL = "https://t.me/itzmezain1/2905";

// Fetch series metadata and episode data
Promise.all([
  fetch('series.json').then(r => r.ok ? r.json() : []),
  fetch(getEpisodeFile(slug)).then(r => r.ok ? r.json() : [])
]).then(([seriesList, episodesArray]) => {
  const meta = Array.isArray(seriesList) ? seriesList.find(s => s.slug === slug) : null;
  // Find episode by number only, not slug
  const ep = Array.isArray(episodesArray)
    ? episodesArray.find(e => String(e.ep) === String(epNum))
    : null;

  if (!ep) {
    container.innerHTML = `<div style="color:#fff;padding:30px;">Episode not found.</div>`;
    return;
  }

  // Optional ad before rendering
  if (typeof showAdThen === "function") {
    showAdThen(renderEpisode);
  } else {
    renderEpisode();
  }

  function renderEpisode() {
    container.innerHTML = `
      <div class="pro-episode-view-polished">
        <div class="pro-episode-header-polished">
          <a class="pro-back-btn-polished" href="${slug}.html" title="Back">
            <svg width="23" height="23" viewBox="0 0 20 20" class="svg-arrow"><polyline points="12 4 6 10 12 16" fill="none" stroke="#23c6ed" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Back
          </a>
          <div class="pro-header-title-wrap">
            <span class="pro-series-bigname">${meta ? meta.title : slug.replace(/-/g, " ").toUpperCase()}</span>
            <span class="pro-ep-strong-title">${ep.title || `Episode ${ep.ep}`}</span>
          </div>
        </div>
        <div class="fullscreen-alert-msg" style="background:#162632;padding:16px 16px 14px 16px;border-radius:10px;color:#23c6ed;font-size:1.05em;margin:16px 0 24px 0;">
          <b>🔔 Note:</b><br>
          Telegram Mini App mein <b>full screen</b> me Episodes dekhna support nahi karta. Agar aapko <b>full screen</b> aur behtar quality mein episode dekhna hai toh <b>hamari website par jaakar dekhein.</b><br>
          Sabhi episodes full screen ke sath wahan available hain.<br>
          <a href="https://sm-tv.vercel.app" target="_blank" style="color:#f7e038;text-decoration:underline;word-break:break-all;">https://sm-tv.vercel.app</a> 👇
        </div>
        <div class="pro-episode-embed-polished">
          ${ep.embed ? ep.embed : '<div style="padding:50px 0;color:#ccc;text-align:center;">No streaming available</div>'}
        </div>
        <div class="pro-download-btns-flex" style="margin:24px 0 8px 0;display:flex;gap:16px;flex-wrap:wrap;">
          <a class="pro-download-btn-polished"
             href="${ep.download || '#'}"
             download
             style="flex:1 1 180px;background:#198fff;"
             ${ep.download ? "" : "tabindex='-1' aria-disabled='true' style='pointer-events:none;opacity:0.7;background:#555;'"}>
            🖇️ Download (Server 1)
          </a>
          <a class="pro-download-btn-polished"
             href="${ep.download2 || '#'}"
             download
             style="flex:1 1 180px;background:#30c96b;"
             ${ep.download2 ? "" : "tabindex='-1' aria-disabled='true' style='pointer-events:none;opacity:0.7;background:#555;'"}>
            🖇️ Download (Server 2)
          </a>
        </div>
        <a class="pro-tutorial-btn"
           href="${HOW_TO_DOWNLOAD_URL}"
           target="_blank"
           rel="noopener"
           style="display:block;background:#234a63;color:#fff;padding:12px 28px;margin:8px 0 0 0;border-radius:8px;text-align:center;font-weight:600;text-decoration:none;font-size:1.03em;">
          📕 How to Download (Tutorial)
        </a>
        <a class="pro-premium-btn"
           href="${PREMIUM_CHANNEL_URL}"
           target="_blank"
           rel="noopener"
           style="display:block;background:#099c7d;color:#fff;padding:13px 28px;margin:12px 0 0 0;border-radius:8px;text-align:center;font-weight:600;font-size:1.11em;text-decoration:none;letter-spacing:0.01em;">
          🌟 Join Premium Channel
        </a>
      </div>
    `;
  }
}).catch(() => {
  container.innerHTML = `<div style="color:#fff;padding:30px;">Could not load episode info. Try again later.</div>`;
});

// --- Monetag ad overlay loader for optional pre-roll ad ---
function showAdThen(done) {
  let overlay = document.createElement('div');
  overlay.id = 'adBlockOverlay';
  overlay.style = 'position:fixed;z-index:99999;top:0;left:0;width:100vw;height:100vh;background:#111c;padding:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.2em;';
  overlay.innerHTML = '<div><b>Loading Ad...</b></div>';
  document.body.appendChild(overlay);

  if (typeof show_9623557 === "function") {
    show_9623557({
      type: 'inApp',
      inAppSettings: {
        frequency: 1,
        capping: 1,
        interval: 9999,
        timeout: 5,
        everyPage: false
      }
    });
  }
  setTimeout(() => {
    document.body.removeChild(overlay);
    done();
  }, 6500);
}
