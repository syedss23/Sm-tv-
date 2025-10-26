// episode.js (original drop-in)

const params = new URLSearchParams(window.location.search);
const slug = params.get('series');
const season = params.get('season');
const epNum = params.get('ep');
const container = document.getElementById('episode-view') || document.body;

if (!slug || !epNum) {
  container.innerHTML = `<div style="color:#fff;padding:30px;">Episode not found (missing series or ep in URL)</div>`;
  throw new Error("Missing required param");
}

let jsonFile, backUrl;
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
  const ep = Array.isArray(episodesArray)
    ? episodesArray.find(e => String(e.ep) === String(epNum))
    : null;

  if (!ep) {
    container.innerHTML = `<div style="color:#fff;padding:30px;">Episode not found (ep=${epNum}) in ${jsonFile}</div>`;
    return;
  }

  renderEpisode();

  function renderEpisode() {
    container.innerHTML = `
      <div class="pro-episode-view-polished">
        <div class="pro-episode-header-polished">
          <a class="pro-back-btn-polished" href="${backUrl}" title="Back">
            <svg width="23" height="23" viewBox="0 0 20 20" class="svg-arrow">
              <polyline points="12 4 6 10 12 16" fill="none" stroke="#23c6ed" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"></polyline>
            </svg>
            Back
          </a>
          <div class="pro-header-title-wrap">
            <span class="pro-series-bigname">${meta ? meta.title : slug.replace(/-/g, " ").toUpperCase()}</span>
            <span class="pro-ep-strong-title">${ep.title || `Episode ${ep.ep}`}</span>
          </div>
        </div>

        <!-- Announcement -->
        <div class="fullscreen-alert-msg" style="
          background: linear-gradient(90deg, #223958 20%, #091728 90%);
          padding: 15px 14px 13px 14px;
          border-radius: 10px;
          border: 2px solid #23c6ed;
          color: #23c6ed;
          font-size: 1.07em;
          margin: 18px 0 20px 0;
          font-family: inherit;
          font-weight: 600;
          line-height: 1.5;">
          <span style="font-size:1.08em; color:#ffd700;">🔔 Note:</span><br>
          <span style="font-size:1em;">
            ⚠️ <span style="color:#ffd700;">Important Announcement</span><br>
            Filhal website par streaming ka thoda issue hai 😔.<br>
            Jab tak ye fix nahi hota, please <b>Download 1</b> ya <b>Download 2</b> se episodes dekho.<br>
            Agar koi aur problem ho to
            <a href="https://t.me/itz_me_zain1" target="_blank" style="color:#fa2538; font-weight:600; text-decoration:underline;">❤️ contact karo</a>.<br>
            Thanks for your support!
          </span>
        </div>

        <!-- Player 1 -->
        <div class="pro-episode-embed-polished">
          ${ep.embed ? ep.embed : '<div style="padding:50px 0;color:#ccc;text-align:center;">No streaming available</div>'}
        </div>

        <!-- Player 2 -->
        <div class="pro-episode-embed-polished" style="margin-top:20px;">
          ${ep.embed2 ? ep.embed2 : '<div style="padding:50px 0;color:#ccc;text-align:center;">Second video not available</div>'}
        </div>

        <!-- Watch Server 3 Button -->
        <div style="margin:22px 0 10px 0;">
          <button id="watch3Btn"
                  class="pro-download-btn-polished"
                  style="display:block;width:100%;max-width:500px;margin:0 auto 12px auto;background:#e53935;color:#fff;"
                  ${ep.watch3 ? "" : "tabindex='-1' aria-disabled='true' style='pointer-events:none;opacity:0.7;background:#6b2a2a;color:#ddd;'"}>▶️ Watch (Server 3)</button>
        </div>

        <!-- Download Buttons -->
        <div style="margin:10px 0 8px 0;">
          <a class="pro-download-btn-polished"
              href="${ep.download || "#"}"
              download
              style="display:block;width:100%;max-width:500px;margin:0 auto 12px auto;background:#198fff;"
              ${ep.download ? "" : "tabindex='-1' aria-disabled='true' style='pointer-events:none;opacity:0.7;background:#555;'"}>📥 Telegram Download (Server 1)</a>
        </div>

        <div style="margin:8px 0;">
          <button class="pro-download-btn-polished"
                  id="download2Btn"
                  style="display:block;width:100%;max-width:500px;margin:0 auto;background:#30c96b;"
                  ${ep.download2 ? "" : "tabindex='-1' aria-disabled='true' style='pointer-events:none;opacity:0.7;background:#555;'"}>📥 Download (Server 2)</button>
        </div>

        <a class="pro-tutorial-btn"
          href="${HOW_TO_DOWNLOAD_URL}"
          target="_blank"
          rel="noopener"
          style="display:block;background:#234a63;color:#fff;padding:12px 28px;margin:8px 0 0 0;border-radius:8px;text-align:center;font-weight:600;text-decoration:none;font-size:1.03em;">
          📘 How to Download (Tutorial)
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

    // Download 2 Button Action
    const download2Btn = document.getElementById("download2Btn");
    if (download2Btn && ep.download2) {
      download2Btn.addEventListener("click", function (e) {
        e.preventDefault();
        window.location.href = ep.download2;
      });
    }

    // Watch Server 3 button action
    const watch3Btn = document.getElementById("watch3Btn");
    if (watch3Btn && ep.watch3) {
      watch3Btn.addEventListener("click", function () {
        window.open(ep.watch3, "_blank");
      });
    }
  }
}).catch((err) => {
  container.innerHTML = `<div style="color:#fff;padding:30px;">Could not load episode info. Error: ${err.message}</div>`;
});
