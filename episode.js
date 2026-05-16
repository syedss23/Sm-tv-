// episode.js — Fully redesigned, bug-proof, professional

const params  = new URLSearchParams(window.location.search);
const slug    = params.get('series');
const season  = params.get('season');
const epNum   = params.get('ep');
const source  = params.get('source');
const container = document.getElementById('episode-view') || document.body;

if (!slug || !epNum) {
  container.innerHTML = `<div style="color:#fff;padding:40px;text-align:center;font-family:'Nunito',sans-serif;">
    <div style="font-size:2.5em;margin-bottom:12px;">⚠️</div>
    <div style="font-size:1.1em;color:rgba(200,210,255,0.7);">Episode not found. Missing series or ep in URL.</div>
  </div>`;
  throw new Error("Missing required param");
}

let jsonFile, backUrl;
if (season) {
  const isBarbarossaS1Source2 = slug === 'barbarossa' && season === '1' && source === '2';
  jsonFile = isBarbarossaS1Source2
    ? `episode-data/${slug}-s${season}-source2.json`
    : `episode-data/${slug}-s${season}.json`;
  backUrl = `series.html?series=${slug}&season=${season}`;
} else {
  jsonFile = `episode-data/${slug}.json`;
  backUrl  = `series.html?series=${slug}`;
}

const HOW_TO_DOWNLOAD_URL = "https://t.me/howtodownloadd1/10";
const PREMIUM_CHANNEL_URL = "https://t.me/itzmezain1/2905";

let featureConfig = null;

async function loadFeatureConfig() {
  try {
    const res = await fetch('/config.json', { cache: 'no-cache' });
    if (res.ok) {
      const cfg = await res.json();
      featureConfig = cfg.redirectionFeatures;
    } else {
      featureConfig = { shortlink: false, sponsorPopup: true };
    }
  } catch {
    featureConfig = { shortlink: false, sponsorPopup: true };
  }
}

/* ─── Banner HTML based on config ─── */
function getBannerHTML() {
  if (!featureConfig) return '';

  // SHORTLINK mode → Premium banner
  if (featureConfig.shortlink && !featureConfig.sponsorPopup) {
    return `
      <div class="ep-banner ep-banner--premium">
        <div class="banner-icon">🌟</div>
        <div class="banner-title">Want Ad-Free Direct Access?</div>
        <p class="banner-body">
          For <b>direct episodes</b> with <b>ad-free downloads</b>, join our <b>Premium Channel!</b><br>
          Get instant access to all episodes without any ads or shortlinks.
        </p>
        <p class="banner-body" style="margin-bottom:14px;">
          <b>Note:</b> Some episodes' <b>Download Server 2</b> links have expired.<br>
          Please use <b>Download Server 1</b> for reliable downloads.
        </p>
        <a href="${PREMIUM_CHANNEL_URL}" target="_blank" rel="noopener" class="banner-btn banner-btn--green">
          🚀 Join Premium Now
        </a>
      </div>
    `;
  }

  // SPONSOR POPUP mode → Sponsor banner
  if (!featureConfig.shortlink && featureConfig.sponsorPopup) {
    return `
      <div class="ep-banner ep-banner--sponsor">
        <div class="sponsor-top">
          <img src="sponsor.png" alt="Sponsor Logo" class="sponsor-logo" />
          <div class="sponsor-name-block">
            <div class="sponsor-label">Episode Sponsored By</div>
            <div class="sponsor-name">FX Reall Accadmy</div>
          </div>
        </div>
        <p class="banner-body">
          Rozana <b>Forex &amp; Gold (XAUUSD)</b> trading signals ke saath clear
          <b>Entry · SL · TP</b>, risk-managed setups &amp; live updates paayein.<br><br>
          Chahe beginner ho ya pro — smart signals follow karke
          <b>aasani se earning start kar sakte ho</b> 🚀
        </p>
        <a href="https://t.me/+OKnw3z4Uq28wYzRk" target="_blank" rel="noopener"
           class="banner-btn banner-btn--gold" style="margin-top:14px;">
          🚀 Start Earning Now
        </a>
        <div class="disclaimer">
          ⚠️ Forex &amp; Gold trading high-risk hoti hai. Profit guaranteed nahi hota.
          Hamesha apni research aur sahi risk management ke saath trade karein.
        </div>
      </div>
    `;
  }

  return '';
}

/* ─── Render player embed safely ─── */
function renderEmbed(embedHTML, label) {
  if (!embedHTML || !embedHTML.trim()) return '';

  // Patch any iframe inside the embed string
  const patched = embedHTML.replace(/<iframe/gi, `<iframe loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen`);

  return `
    <div class="ep-player-block">
      <div class="ep-player-label">
        <span class="dot"></span>
        ${label}
      </div>
      <div class="ep-embed-wrap">
        ${patched}
      </div>
    </div>
  `;
}

/* ─── Main entry ─── */
(async function () {
  await loadFeatureConfig();

  // Show skeleton while loading
  container.innerHTML = `
    <div class="ep-page" style="animation:none;">
      <div class="ep-skeleton" style="height:56px;margin-bottom:14px;border-radius:999px;max-width:200px;"></div>
      <div class="ep-skeleton" style="height:32px;margin-bottom:10px;"></div>
      <div class="ep-skeleton" style="height:180px;margin-bottom:14px;"></div>
      <div class="ep-skeleton" style="height:220px;margin-bottom:14px;"></div>
      <div class="ep-skeleton" style="height:52px;margin-bottom:10px;border-radius:12px;"></div>
      <div class="ep-skeleton" style="height:52px;border-radius:12px;"></div>
    </div>
  `;

  try {
    const [seriesList, episodesArray] = await Promise.all([
      fetch('series.json').then(r => r.ok ? r.json() : []),
      fetch(jsonFile).then(r => r.ok ? r.json() : [])
    ]);

    const meta = Array.isArray(seriesList) ? seriesList.find(s => s.slug === slug) : null;
    const ep   = Array.isArray(episodesArray)
      ? episodesArray.find(e => String(e.ep) === String(epNum))
      : null;

    if (!ep) {
      container.innerHTML = `
        <div class="ep-page">
          <a class="ep-back-btn" href="${backUrl}">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <polyline points="12 4 6 10 12 16" stroke="#00d4ff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Back
          </a>
          <div style="text-align:center;padding:60px 0;color:rgba(200,210,255,0.6);">
            <div style="font-size:2.5em;margin-bottom:12px;">🔍</div>
            <div>Episode ${epNum} not found in ${jsonFile}</div>
          </div>
        </div>`;
      return;
    }

    renderEpisode(ep, meta);

  } catch (err) {
    container.innerHTML = `
      <div class="ep-page">
        <div style="text-align:center;padding:60px 20px;color:rgba(200,210,255,0.6);font-family:'Nunito',sans-serif;">
          <div style="font-size:2.5em;margin-bottom:12px;">⚠️</div>
          <div>Could not load episode data.<br><span style="font-size:0.85em;opacity:0.6;">${err.message}</span></div>
        </div>
      </div>`;
  }

  function renderEpisode(ep, meta) {
    const seriesTitle   = meta ? meta.title : slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const episodeTitle  = ep.title || `Episode ${ep.ep}`;
    const server3Embed  = ep.embed3 || null;
    const server3URL    = ep.watch3 || null;
    const hasServer3    = !!(server3Embed || server3URL);

    const bannerHTML   = getBannerHTML();
    const player1HTML  = renderEmbed(ep.embed,  'Server 1 · Player');
    const player2HTML  = renderEmbed(ep.embed2, 'Server 2 · Player');

    // Build action buttons
    const watch3BtnAttrs   = hasServer3 ? '' : 'class="ep-action-btn ep-action-btn--watch3 ep-action-btn--disabled full-width" disabled aria-disabled="true"';
    const dl1BtnAttrs      = ep.download ? '' : 'ep-action-btn--disabled" aria-disabled="true"';
    const dl2BtnAttrs      = ep.download2 ? '' : ' ep-action-btn--disabled" aria-disabled="true"';

    container.innerHTML = `
      <div class="ep-page">

        <!-- Header -->
        <div class="ep-header">
          <a class="ep-back-btn" href="${backUrl}" title="Go back">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <polyline points="12 4 6 10 12 16" stroke="#00d4ff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Back
          </a>
          <div class="ep-titles">
            <div class="ep-series-name">${seriesTitle}</div>
            <div class="ep-episode-label">
              <span style="opacity:0.7;">▶</span>
              ${episodeTitle}
            </div>
          </div>
        </div>

        <!-- Sponsor / Premium Banner -->
        ${bannerHTML}

        <!-- Video Players -->
        <div class="ep-player-section">
          ${player1HTML}
          ${player2HTML}
        </div>

        <!-- Action Buttons -->
        <div class="ep-actions">

          <!-- Watch Server 3 — full width -->
          <button id="watch3Btn"
            class="ep-action-btn ep-action-btn--watch3 full-width${hasServer3 ? '' : ' ep-action-btn--disabled'}"
            ${hasServer3 ? '' : 'disabled aria-disabled="true"'}>
            <span class="btn-icon">▶️</span>
            Watch (Server 3)
          </button>

          <!-- Telegram Download -->
          <a id="dl1Btn"
            href="${ep.download || '#'}"
            class="ep-action-btn ep-action-btn--dl1${ep.download ? '' : ' ep-action-btn--disabled'}"
            ${ep.download ? 'target="_blank" rel="noopener"' : 'aria-disabled="true"'}>
            <span class="btn-icon">📥</span>
            Telegram Download<br><small style="font-weight:600;opacity:0.8;">(Server 1)</small>
          </a>

          <!-- Download Server 2 -->
          <button id="dl2Btn"
            class="ep-action-btn ep-action-btn--dl2${ep.download2 ? '' : ' ep-action-btn--disabled'}"
            ${ep.download2 ? '' : 'disabled aria-disabled="true"'}>
            <span class="btn-icon">📥</span>
            Download<br><small style="font-weight:600;opacity:0.8;">(Server 2)</small>
          </button>

          <!-- Tutorial — full width -->
          <a href="${HOW_TO_DOWNLOAD_URL}" target="_blank" rel="noopener"
             class="ep-action-btn ep-action-btn--tutorial full-width">
            <span class="btn-icon">📘</span>
            How to Download (Tutorial)
          </a>

          <!-- Premium — full width -->
          <a href="${PREMIUM_CHANNEL_URL}" target="_blank" rel="noopener"
             class="ep-action-btn ep-action-btn--premium full-width">
            <span class="btn-icon">🌟</span>
            Join Premium Channel
          </a>

        </div>
      </div>

      <!-- Watch 3 Modal -->
      <div id="watch3Modal" role="dialog" aria-modal="true" aria-label="Watch Server 3">
        <div id="watch3Box">
          <button id="watch3Close" aria-label="Close">✕</button>
          <div id="watch3Content">Loading…</div>
        </div>
      </div>
    `;

    /* ── Post-render: lazy-load iframes ── */
    container.querySelectorAll('.ep-embed-wrap').forEach(wrap => {
      // Patch all iframes in wrap
      wrap.querySelectorAll('iframe').forEach(f => {
        if (!f.hasAttribute('loading'))           f.setAttribute('loading', 'lazy');
        if (!f.hasAttribute('width'))             f.setAttribute('width', '100%');
        if (!f.hasAttribute('height'))            f.setAttribute('height', '100%');
        if (!f.hasAttribute('frameborder'))       f.setAttribute('frameborder', '0');
        if (!f.hasAttribute('allowfullscreen'))   f.setAttribute('allowfullscreen', '');
        if (!f.hasAttribute('referrerpolicy'))    f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        if (!f.hasAttribute('allow'))             f.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share');
        f.style.width = '100%';
        f.style.height = '100%';
        f.style.display = 'block';
        f.style.border = 'none';
      });

      // Lazy-load placeholder elements
      wrap.querySelectorAll('[data-embed-src]').forEach(placeholder => {
        const io = new IntersectionObserver(entries => {
          entries.forEach(e => {
            if (e.isIntersecting) {
              const iframe = document.createElement('iframe');
              iframe.src = e.target.getAttribute('data-embed-src');
              iframe.loading = 'lazy';
              iframe.width = '100%';
              iframe.height = '100%';
              iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
              iframe.setAttribute('frameborder', '0');
              iframe.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share');
              iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
              iframe.setAttribute('allowfullscreen', '');
              e.target.replaceWith(iframe);
              io.disconnect();
            }
          });
        }, { rootMargin: '300px' });
        io.observe(placeholder);
      });
    });

    /* ── Download 2 Button ── */
    const dl2Btn = document.getElementById('dl2Btn');
    if (dl2Btn && ep.download2) {
      dl2Btn.addEventListener('click', () => { window.location.href = ep.download2; });
    }

    /* ── Watch Server 3 ── */
    const watch3Btn   = document.getElementById('watch3Btn');
    const watch3Modal = document.getElementById('watch3Modal');
    const watch3Box   = document.getElementById('watch3Box');
    const watch3Cont  = document.getElementById('watch3Content');
    const watch3Close = document.getElementById('watch3Close');

    function openWatch3Modal() {
      if (server3URL) {
        window.open(server3URL, '_blank', 'noopener');
        return;
      }
      if (server3Embed) {
        watch3Cont.innerHTML = server3Embed;
        const iframe = watch3Cont.querySelector('iframe');
        if (iframe) {
          iframe.setAttribute('width', '100%');
          iframe.setAttribute('height', '100%');
          iframe.setAttribute('frameborder', '0');
          iframe.setAttribute('loading', 'lazy');
          iframe.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share');
          iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
          iframe.setAttribute('allowfullscreen', '');
          iframe.style.cssText = 'width:100%;height:100%;display:block;border:none;';
        }
        watch3Modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
      }
    }

    function closeWatch3Modal() {
      watch3Modal.style.display = 'none';
      document.body.style.overflow = '';
      watch3Cont.innerHTML = '';
    }

    if (watch3Btn && hasServer3) {
      watch3Btn.addEventListener('click', openWatch3Modal);
    }
    if (watch3Close)  watch3Close.addEventListener('click', closeWatch3Modal);
    if (watch3Modal)  watch3Modal.addEventListener('click', e => { if (e.target === watch3Modal) closeWatch3Modal(); });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && watch3Modal && watch3Modal.style.display === 'flex') {
        e.preventDefault();
        closeWatch3Modal();
      }
    });

    /* ── Analytics ── */
    if (typeof gtag !== 'undefined') {
      gtag('event', 'episode_view', {
        episode: `${slug || ''}_s${season || ''}e${epNum || ''}`,
        config_mode: featureConfig
          ? (featureConfig.shortlink ? 'shortlink' : 'sponsor_popup')
          : 'unknown'
      });
    }
  }

})();
