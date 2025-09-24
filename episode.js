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

function showRewardedAdThen(done) {
  if (typeof show_9623557 === "function") {
    show_9623557().then(done).catch(done);
  } else {
    done();
  }
}

// Helper to inject Adsterra/Monetag banners dynamically
function injectAdBanner(slotId, key, width, height) {
  const adDiv = document.getElementById(slotId);
  if (!adDiv) return;
  adDiv.innerHTML = "";
  const s1 = document.createElement("script");
  s1.type = "text/javascript";
  s1.innerHTML = `
    atOptions = {
      'key' : '${key}',
      'format' : 'iframe',
      'height' : ${height},
      'width' : ${width},
      'params' : {}
    };
  `;
  const s2 = document.createElement("script");
  s2.type = "text/javascript";
  s2.src = `//www.highperformanceformat.com/${key}/invoke.js`;
  adDiv.appendChild(s1);
  adDiv.appendChild(s2);
}

Promise.all([
  fetch("series.json").then(r => r.ok ? r.json() : []),
  fetch(jsonFile).then(r => r.ok ? r.json() : [])
]).then(([seriesList, episodesArray]) => {
  const meta = Array.isArray(seriesList)
    ? seriesList.find(s => s.slug === slug)
    : null;
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

        <div class="fullscreen-alert-msg" style="background:#162632;padding:16px 16px 14px 16px;border-radius:10px;color:#23c6ed;font-size:1.05em;margin:16px 0 24px 0;">
          <b>🔔 Note:</b><br>
          Telegram Mini App mein <b>full screen</b> me Episodes dekhna support nahi karta. Agar aapko <b>full screen</b> aur behtar quality mein episode dekhna hai toh <b>hamari website par jaakar dekhein.</b><br>
          Sabhi episodes full screen ke sath wahan available hain.<br>
          <a href="https://sm-tv.vercel.app" target="_blank" style="color:#f7e038;text-decoration:underline;word-break:break-all;">https://sm-tv.vercel.app</a> 👇
        </div>

        <!-- 300x250 AD BELOW NOTE -->
        <div id="ad-above-player"></div>

        <div class="pro-episode-embed-polished">
          ${ep.embed ? ep.embed : '<div style="padding:50px 0;color:#ccc;text-align:center;">No streaming available</div>'}
        </div>

        <!-- 300x250 AD BELOW PLAYER -->
        <div id="ad-below-player"></div>

        <div style="margin:24px 0 8px 0;">
          <a class="pro-download-btn-polished"
              href="${ep.download || "#"}"
              download
              style="display:block;width:100%;max-width:500px;margin:0 auto 12px auto;background:#198fff;"
              ${ep.download ? "" : "tabindex='-1' aria-disabled='true' style='pointer-events:none;opacity:0.7;background:#555;'"}>🖇️ Download (Server 1)</a>
        </div>

        <!-- 320x50 AD BETWEEN DOWNLOAD BUTTONS -->
        <div id="ad-between-downloads"></div>

        <div style="margin:8px 0;">
          <button class="pro-download-btn-polished"
                  id="download2Btn"
                  style="display:block;width:100%;max-width:500px;margin:0 auto;background:#30c96b;"
                  ${ep.download2 ? "" : "tabindex='-1' aria-disabled='true' style='pointer-events:none;opacity:0.7;background:#555;'"}>🖇️ Download (Server 2)</button>
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

    // Inject ads at all slots (dynamic script for banner rendering)
    injectAdBanner("ad-above-player", "030f560988476116223cff5a510791aa", 300, 250);
    injectAdBanner("ad-below-player", "030f560988476116223cff5a510791aa", 300, 250);
    injectAdBanner("ad-between-downloads", "c91a82435d260630918ecc80c95125ac", 320, 50);

    // Lazy load embed video code (unchanged)
    const embedWrap = container.querySelector('.pro-episode-embed-polished');
    if (embedWrap) {
      const placeholders = embedWrap.querySelectorAll('[data-embed-src]');
      if (placeholders.length) {
        const io = new IntersectionObserver(entries => {
          entries.forEach(e => {
            if (e.isIntersecting) {
              const src = e.target.getAttribute('data-embed-src');
              const i = document.createElement('iframe');
              i.src = src;
              i.loading = 'lazy';
              i.width = '100%';
              i.height = '100%';
              i.setAttribute('frameborder', '0');
              i.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share');
              i.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
              i.setAttribute('allowfullscreen', '');
              e.target.replaceWith(i);
              io.unobserve(e.target);
            }
          });
        }, { rootMargin: '400px' });
        placeholders.forEach(el => io.observe(el));
      }
      embedWrap.querySelectorAll('iframe').forEach((f, idx) => {
        const shouldLazy = idx > 0 || window.matchMedia('(max-width: 767px)').matches;
        if (shouldLazy && !f.hasAttribute('loading')) f.setAttribute('loading', 'lazy');
        if (!f.hasAttribute('referrerpolicy')) f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        if (!f.hasAttribute('allow')) f.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share');
        if (!f.hasAttribute('width')) f.setAttribute('width', '100%');
        if (!f.hasAttribute('height')) f.setAttribute('height', '100%');
        if (!f.hasAttribute('frameborder')) f.setAttribute('frameborder', '0');
        if (!f.hasAttribute('allowfullscreen')) f.setAttribute('allowfullscreen', '');
        if (!f.hasAttribute('decoding')) f.setAttribute('decoding', 'async');
      });
    }

    // Monetag rewarded ad for Download 2 (unchanged)
    const download2Btn = document.getElementById("download2Btn");
    if (download2Btn && ep.download2) {
      download2Btn.addEventListener("click", function (e) {
        e.preventDefault();
        if (typeof show_9623557 === "function") {
          show_9623557()
            .then(() => { window.location.href = ep.download2; })
            .catch(() => { alert("Ad could not be loaded. Please try again."); });
        } else {
          window.location.href = ep.download2;
        }
      });
    }
  }
}).catch((err) => {
  container.innerHTML = `<div style="color:#fff;padding:30px;">Could not load episode info. Error: ${err.message}</div>`;
});
