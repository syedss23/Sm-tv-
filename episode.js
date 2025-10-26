// episode.js — Advanced VK iframe player (uses embed2 directly)

const params = new URLSearchParams(window.location.search);
const slug = params.get("series");
const season = params.get("season");
const epNum = params.get("ep");
const container = document.getElementById("episode-view") || document.body;

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
  fetch("series.json").then((r) => (r.ok ? r.json() : [])),
  fetch(jsonFile).then((r) => (r.ok ? r.json() : [])),
])
  .then(([seriesList, episodesArray]) => {
    const meta = Array.isArray(seriesList)
      ? seriesList.find((s) => s.slug === slug)
      : null;
    const ep = Array.isArray(episodesArray)
      ? episodesArray.find((e) => String(e.ep) === String(epNum))
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

          <!-- Player 1 -->
          <div class="pro-episode-embed-polished">
            ${ep.embed ? ep.embed : '<div style="padding:50px 0;color:#ccc;text-align:center;">No streaming available</div>'}
          </div>

          <!-- ADVANCED VK PLAYER (embed2 iframe with controls wrapper) -->
          <div class="pro-episode-embed-polished" style="margin-top:20px;">
            ${
              ep.embed2
                ? `
                <div id="advanced-vk-player" style="position:relative;width:100%;background:#000;border-radius:12px;overflow:hidden;box-shadow:0 0 20px rgba(0,0,0,0.5);">
                  <div class="player-header" style="position:absolute;top:0;left:0;width:100%;padding:8px 14px;background:rgba(0,0,0,0.55);color:#fff;font-size:0.95em;z-index:5;display:flex;justify-content:space-between;align-items:center;">
                    <span>🎬 VK Player</span>
                    <button id="fullscreen-btn" style="background:none;border:none;color:#fff;font-size:1.2em;cursor:pointer;">⛶</button>
                  </div>
                  <div style="position:relative;width:100%;height:0;padding-bottom:56.25%;">
                    ${ep.embed2.replace(
                      "<iframe",
                      "<iframe style='position:absolute;top:0;left:0;width:100%;height:100%;border:0;'"
                    )}
                  </div>
                </div>`
                : `<div style="padding:50px 0;color:#ccc;text-align:center;">Second video not available</div>`
            }
          </div>

          <!-- Download Buttons -->
          <div style="margin:22px 0 10px 0;">
            <button id="watch3Btn" class="pro-download-btn-polished" style="display:block;width:100%;max-width:500px;margin:0 auto 12px auto;background:#e53935;color:#fff;">▶️ Watch (Server 3)</button>
          </div>

          <div style="margin:10px 0 8px 0;">
            <a class="pro-download-btn-polished" href="${ep.download || "#"}"
                download
                style="display:block;width:100%;max-width:500px;margin:0 auto 12px auto;background:#198fff;"
                ${ep.download ? "" : "tabindex='-1' aria-disabled='true' style='pointer-events:none;opacity:0.7;background:#555;'"}>📥 Telegram Download (Server 1)</a>
          </div>

          <div style="margin:8px 0;">
            <button class="pro-download-btn-polished" id="download2Btn" style="display:block;width:100%;max-width:500px;margin:0 auto;background:#30c96b;">📥 Download (Server 2)</button>
          </div>

          <a class="pro-tutorial-btn" href="${HOW_TO_DOWNLOAD_URL}" target="_blank" style="display:block;background:#234a63;color:#fff;padding:12px 28px;margin:8px 0 0 0;border-radius:8px;text-align:center;font-weight:600;text-decoration:none;font-size:1.03em;">📘 How to Download (Tutorial)</a>

          <a class="pro-premium-btn" href="${PREMIUM_CHANNEL_URL}" target="_blank" style="display:block;background:#099c7d;color:#fff;padding:13px 28px;margin:12px 0 0 0;border-radius:8px;text-align:center;font-weight:600;font-size:1.11em;text-decoration:none;letter-spacing:0.01em;">🌟 Join Premium Channel</a>
        </div>
      `;

      // Fullscreen button logic
      const fullscreenBtn = document.getElementById("fullscreen-btn");
      const vkContainer = document.getElementById("advanced-vk-player");
      if (fullscreenBtn && vkContainer) {
        fullscreenBtn.addEventListener("click", () => {
          if (!document.fullscreenElement) {
            vkContainer.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
        });
      }
    }
  })
  .catch((err) => {
    container.innerHTML = `<div style="color:#fff;padding:30px;">Could not load episode info. Error: ${err.message}</div>`;
  });
