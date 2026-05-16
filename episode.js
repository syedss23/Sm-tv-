// episode.js — SM-TV (Complete Clean Rewrite)

const params    = new URLSearchParams(window.location.search);
const slug      = params.get('series');
const season    = params.get('season');
const epNum     = params.get('ep');
const source    = params.get('source');
const container = document.getElementById('episode-view') || document.body;

if (!slug || !epNum) {
  container.innerHTML = `<div style="color:#fff;padding:40px;text-align:center;">⚠️ Episode not found.</div>`;
  throw new Error('Missing required param');
}

let jsonFile, backUrl;
if (season) {
  const isBarbarossaS1S2 = slug === 'barbarossa' && season === '1' && source === '2';
  jsonFile = isBarbarossaS1S2
    ? `episode-data/${slug}-s${season}-source2.json`
    : `episode-data/${slug}-s${season}.json`;
  backUrl = `series.html?series=${slug}&season=${season}`;
} else {
  jsonFile = `episode-data/${slug}.json`;
  backUrl  = `series.html?series=${slug}`;
}

const HOW_TO_DOWNLOAD_URL = 'https://t.me/howtodownloadd1/10';
const PREMIUM_CHANNEL_URL = 'https://t.me/itzmezain1/2905';

let featureConfig = null;

async function loadConfig() {
  try {
    const r = await fetch('/config.json', { cache: 'no-cache' });
    featureConfig = r.ok
      ? (await r.json()).redirectionFeatures
      : { shortlink: false, sponsorPopup: true };
  } catch {
    featureConfig = { shortlink: false, sponsorPopup: true };
  }
}

function getBannerHTML() {
  if (!featureConfig) return '';

  // Premium / shortlink mode
  if (featureConfig.shortlink && !featureConfig.sponsorPopup) {
    return `
      <div class="smtv-banner smtv-banner-premium">
        <div class="smtv-banner-icon">🌟</div>
        <div class="smtv-banner-title">Want Ad-Free Direct Access?</div>
        <div class="smtv-banner-body">
          For <b>direct episodes</b> with <b>ad-free downloads</b>, join our <b>Premium Channel!</b><br>
          Get instant access to all episodes without any ads or shortlinks.<br><br>
          <b>Note:</b> Some episodes' <b>Download Server 2</b> links have expired.
          Please use <b>Download Server 1</b> for reliable downloads.
        </div>
        <a href="${PREMIUM_CHANNEL_URL}" target="_blank" rel="noopener" class="smtv-banner-btn smtv-btn-green">
          🚀 Join Premium Now
        </a>
      </div>`;
  }

  // Sponsor popup mode
  if (!featureConfig.shortlink && featureConfig.sponsorPopup) {
    return `
      <div class="smtv-banner smtv-banner-sponsor">
        <div class="smtv-sponsor-top">
          <img src="sponsor.png" alt="Sponsor Logo" class="smtv-sponsor-img" />
          <div class="smtv-sponsor-info">
            <div class="smtv-sponsor-label">Episode Sponsored By</div>
            <div class="smtv-sponsor-name">FX Reall Accadmy</div>
          </div>
        </div>
        <div class="smtv-banner-body">
          Rozana <b>Forex &amp; Gold (XAUUSD)</b> trading signals ke saath clear
          <b>Entry · SL · TP</b>, risk-managed setups &amp; live updates paayein.<br><br>
          Chahe beginner ho ya pro — smart signals follow karke
          <b>aasani se earning start kar sakte ho</b> 🚀
        </div>
        <a href="https://t.me/+OKnw3z4Uq28wYzRk" target="_blank" rel="noopener"
           class="smtv-banner-btn smtv-btn-gold">
          🚀 Start Earning Now
        </a>
        <div class="smtv-disclaimer">
          ⚠️ Forex &amp; Gold trading high-risk hoti hai. Profit guaranteed nahi hota.
          Hamesha apni research aur sahi risk management ke saath trade karein.
        </div>
      </div>`;
  }

  return '';
}

function patchIframes(html) {
  if (!html || !html.trim()) return null;
  return html.replace(/<iframe/gi,
    '<iframe loading="lazy" frameborder="0" allowfullscreen ' +
    'referrerpolicy="strict-origin-when-cross-origin" ' +
    'allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"');
}

// ── MAIN ──────────────────────────────────────────────
(async function () {
  await loadConfig();

  // Show skeleton
  container.innerHTML = `
    <div class="smtv-page">
      <div class="smtv-skel" style="height:42px;width:120px;border-radius:999px;margin-bottom:16px;"></div>
      <div class="smtv-skel" style="height:38px;border-radius:10px;margin-bottom:10px;"></div>
      <div class="smtv-skel" style="height:26px;width:180px;border-radius:999px;margin-bottom:18px;"></div>
      <div class="smtv-skel" style="height:210px;border-radius:16px;margin-bottom:14px;"></div>
      <div class="smtv-skel" style="height:210px;border-radius:16px;margin-bottom:18px;"></div>
      <div class="smtv-skel" style="height:54px;border-radius:14px;margin-bottom:10px;"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
        <div class="smtv-skel" style="height:68px;border-radius:14px;"></div>
        <div class="smtv-skel" style="height:68px;border-radius:14px;"></div>
      </div>
      <div class="smtv-skel" style="height:54px;border-radius:14px;margin-bottom:10px;"></div>
      <div class="smtv-skel" style="height:60px;border-radius:14px;"></div>
    </div>`;

  try {
    const [seriesList, episodes] = await Promise.all([
      fetch('series.json').then(r => r.ok ? r.json() : []),
      fetch(jsonFile).then(r => r.ok ? r.json() : [])
    ]);

    const meta = Array.isArray(seriesList) ? seriesList.find(s => s.slug === slug) : null;
    const ep   = Array.isArray(episodes)   ? episodes.find(e => String(e.ep) === String(epNum)) : null;

    if (!ep) {
      container.innerHTML = `
        <div class="smtv-page">
          <a class="smtv-back" href="${backUrl}">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <polyline points="12 4 6 10 12 16" stroke="#00d4ff" stroke-width="2.3"
                stroke-linecap="round" stroke-linejoin="round"/>
            </svg>Back
          </a>
          <div style="text-align:center;padding:60px 20px;color:rgba(200,210,255,0.6);">
            🔍 Episode ${epNum} not found in data.
          </div>
        </div>`;
      return;
    }

    const seriesTitle = meta
      ? meta.title
      : slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const epTitle   = ep.title || `Episode ${ep.ep}`;
    const hasS3     = !!(ep.embed3 || ep.watch3);
    const banner    = getBannerHTML();
    const embed1    = patchIframes(ep.embed);
    const embed2    = patchIframes(ep.embed2);

    container.innerHTML = `
      <div class="smtv-page">

        <!-- BACK BUTTON — own row -->
        <a class="smtv-back" href="${backUrl}">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <polyline points="12 4 6 10 12 16" stroke="#00d4ff" stroke-width="2.3"
              stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Back
        </a>

        <!-- TITLE — full width below back, never truncated -->
        <div class="smtv-titles">
          <h1 class="smtv-series-name">${seriesTitle}</h1>
          <div class="smtv-ep-badge">
            <span class="smtv-play-dot">▶</span>
            ${epTitle}
          </div>
        </div>

        <!-- BANNER -->
        ${banner}

        <!-- PLAYER 1 -->
        ${embed1 ? `
          <div class="smtv-player-label">
            <span class="smtv-live-dot"></span>Server 1 · Player
          </div>
          <div class="smtv-embed">${embed1}</div>
        ` : ''}

        <!-- PLAYER 2 -->
        ${embed2 ? `
          <div class="smtv-player-label">
            <span class="smtv-live-dot"></span>Server 2 · Player
          </div>
          <div class="smtv-embed">${embed2}</div>
        ` : ''}

        <!-- ACTION BUTTONS -->
        <div class="smtv-btns">

          <!-- Watch Server 3 — full width red -->
          <button id="watch3Btn"
            class="smtv-btn smtv-watch ${hasS3 ? '' : 'smtv-off'}"
            ${hasS3 ? '' : 'disabled aria-disabled="true"'}>
            <span class="smtv-ic">▶️</span>
            Watch (Server 3)
          </button>

          <!-- DL1 + DL2 side by side -->
          <div class="smtv-pair">
            <a href="${ep.download || '#'}"
               ${ep.download ? 'target="_blank" rel="noopener"' : 'aria-disabled="true"'}
               class="smtv-btn smtv-tg ${ep.download ? '' : 'smtv-off'}">
              <span class="smtv-ic">📥</span>
              <span>Telegram<br><small>Server 1</small></span>
            </a>
            <button id="dl2Btn"
              class="smtv-btn smtv-dl2 ${ep.download2 ? '' : 'smtv-off'}"
              ${ep.download2 ? '' : 'disabled aria-disabled="true"'}>
              <span class="smtv-ic">📥</span>
              <span>Download<br><small>Server 2</small></span>
            </button>
          </div>

          <!-- Tutorial -->
          <a href="${HOW_TO_DOWNLOAD_URL}" target="_blank" rel="noopener"
             class="smtv-btn smtv-how">
            <span class="smtv-ic">📘</span>
            How to Download (Tutorial)
          </a>

          <!-- Premium -->
          <a href="${PREMIUM_CHANNEL_URL}" target="_blank" rel="noopener"
             class="smtv-btn smtv-prem">
            <span class="smtv-ic smtv-star">🌟</span>
            Join Premium Channel
          </a>

        </div>
      </div>

      <!-- WATCH 3 MODAL -->
      <div id="w3Modal">
        <div id="w3Box">
          <button id="w3Close">✕ Close</button>
          <div id="w3Cont">Loading…</div>
        </div>
      </div>
    `;

    // Fix iframe sizing inside embeds
    container.querySelectorAll('.smtv-embed iframe').forEach(f => {
      Object.assign(f.style, {
        position: 'absolute', top: '0', left: '0',
        width: '100%', height: '100%',
        border: 'none', display: 'block'
      });
    });

    // DL2
    const dl2 = document.getElementById('dl2Btn');
    if (dl2 && ep.download2) {
      dl2.addEventListener('click', () => { window.location.href = ep.download2; });
    }

    // Watch 3 modal
    const w3Btn   = document.getElementById('watch3Btn');
    const w3Modal = document.getElementById('w3Modal');
    const w3Cont  = document.getElementById('w3Cont');
    const w3Close = document.getElementById('w3Close');

    function openW3() {
      if (ep.watch3) { window.open(ep.watch3, '_blank', 'noopener'); return; }
      if (ep.embed3) {
        w3Cont.innerHTML = ep.embed3;
        const f = w3Cont.querySelector('iframe');
        if (f) {
          Object.assign(f.style, { width:'100%', height:'100%', border:'none', display:'block' });
          f.setAttribute('allowfullscreen', '');
        }
        w3Modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
      }
    }
    function closeW3() {
      w3Modal.style.display = 'none';
      document.body.style.overflow = '';
      w3Cont.innerHTML = '';
    }

    if (w3Btn && hasS3) w3Btn.addEventListener('click', openW3);
    if (w3Close) w3Close.addEventListener('click', closeW3);
    if (w3Modal) w3Modal.addEventListener('click', e => { if (e.target === w3Modal) closeW3(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && w3Modal?.style.display === 'flex') closeW3();
    });

    if (typeof gtag !== 'undefined') {
      gtag('event', 'episode_view', {
        episode: `${slug}_s${season || '0'}e${epNum}`,
        config: featureConfig?.shortlink ? 'shortlink' : 'sponsor'
      });
    }

  } catch (err) {
    container.innerHTML = `<div style="color:#fff;padding:40px;text-align:center;">⚠️ ${err.message}</div>`;
  }
})();
