const params = new URLSearchParams(window.location.search);
const epParam = params.get('ep'); // example: "salahuddin-ayyubi-s2e1"
const season = params.get('season');
const container = document.getElementById('episode-view') || document.body;

// AUTO-DETECT SERIES SLUG from epParam like "salahuddin-ayyubi-s2e1" or "alp-arslan-e1"
let slug = null, jsonFile, backUrl;
if (epParam) {
  // Match "series-sX" or "series" with optional "-e" or "-sXe" at the end
  let match = epParam.match(/^([a-z0-9-]+?)(?:-s(\d+))?e\d+$/i);
  if (match) {
    slug = match[1] + (match[2] ? ("-s" + match[2]) : "");
  }
}
if (!epParam || !slug) {
  container.innerHTML = `<div style="color:#fff;padding:30px;">Episode not found (cannot auto-detect series from ep param)</div>`;
  throw new Error("Missing or invalid ep param");
}

// Choose correct JSON filename (with or without -s{season})
if (season) {
  jsonFile = `episode-data/${slug}-s${season}.json`;
  backUrl = `series.html?series=${slug}&season=${season}`;
} else {
  jsonFile = `episode-data/${slug}.json`;
  backUrl = `series.html?series=${slug}`;
}

const HOW_TO_DOWNLOAD_URL = "https://t.me/howtodownloadd1/10";
const PREMIUM_CHANNEL_URL = "https://t.me/itzmezain1/2905";

Promise.all([
  fetch('series.json').then(r => r.ok ? r.json() : []),
  fetch(jsonFile).then(r => r.ok ? r.json() : [])
]).then(([seriesList, episodesArray]) => {
  const meta = Array.isArray(seriesList) ? seriesList.find(s => s.slug === slug) : null;

  // Match by ep number or slug
  let ep = episodesArray.find(e => e.slug === epParam);
  if (!ep && /^\d+$/.test(epParam)) {
    ep = episodesArray.find(e => String(e.ep) === epParam);
  }
  // Also allow for "e1", "e2" at the end (fallback)
  if (!ep && epParam && episodesArray[0]?.slug) {
    const simpleSlug = epParam.replace(/-s\d+e(\d+)$/, (m, n) => `e${n}`);
    ep = episodesArray.find(e => e.slug === simpleSlug);
  }
  if (!ep && /^\d+$/.test(epParam)) {
    ep = episodesArray.find(e => String(e.ep) === epParam);
  }

  if (!ep) {
    container.innerHTML = `<div style="color:#fff;padding:30px;">Episode not found (ep=${epParam}) in ${jsonFile}</div>`;
    return;
  }

  if (typeof showAdThen === "function") {
    showAdThen(renderEpisode);
  } else {
    renderEpisode();
  }

  function renderEpisode() {
    container.innerHTML = `
      <div class="pro-episode-view-polished">
        <div class="pro-episode-header-polished">
          <a class="pro-back-btn-polished" href="${backUrl}" title="Back">
            <svg width="23" height="23" viewBox="0 0 20 20" class="svg-arrow">
              <polyline points="12 4 6 10 12 16" fill="none" stroke="#23c6ed" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
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
}).catch(err => {
  container.innerHTML = `<div style="color:#fff;padding:30px;">Could not load episode info. Error: ${err.message}</div>`;
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
