(function() {
  const qs = new URLSearchParams(location.search);
  const slug = (qs.get('series') || '').trim();
  const lang = (qs.get('lang') || '').toLowerCase();
  let season = qs.get('season') || '1';

  // How-to videos (your exact embeds)
  const HOWTO_PROCESS_1 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg466/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;
  const HOWTO_PROCESS_2 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg45g/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;

  function jsonFor(season) {
    if (lang === 'dub') {
      return `episode-data/${slug}-s${season}.json`;
    } else if (['en', 'hi', 'ur'].includes(lang)) {
      return `episode-data/${slug}-s${season}-${lang}.json`;
    } else {
      return `episode-data/${slug}-s${season}.json`;
    }
  }

  function bust(url) {
    const v = (qs.get('v') || '1');
    return url + (url.includes('?') ? '&' : '?') + 'v=' + v;
  }

  function toast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);background:#122231;color:#9fe6ff;padding:10px 14px;border-radius:9px;border:1px solid #2d4b6a;font-weight:700;z-index:9999;font-family:Montserrat,sans-serif;';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  const premiumStyles = `
    .premium-channel-message {
      margin-top: 18px;
      padding: 16px;
      background: linear-gradient(135deg, #101a24 90%, #23c6ed30 100%);
      border: 2px solid #23c6ed;
      border-radius: 14px;
      color: #23c6ed;
      font-family: 'Montserrat', Arial, sans-serif;
      font-weight: 600;
      font-size: 1.09em;
      max-width: 540px;
      box-shadow: 0 2px 18px #1a232b18;
      letter-spacing: 0.03em;
    }
    .premium-channel-message strong { color: #ffd700; font-weight:800; }
    .premium-btn-row { display:flex; gap:12px; margin-top:11px; flex-wrap:wrap; align-items:center; }
    .btn-primary{ display:inline-block; background:#ffd400; color:#13263a; font-weight:800; padding:10px 16px; border-radius:999px; box-shadow:0 4px 14px #ffd40055; text-align:center; }
    .btn-primary:active{ transform:translateY(1px); }
    /* loading skeleton for episodes scroller */
    .pro-ep-loading { width:150px; min-height:200px; border-radius:12px; background:linear-gradient(90deg,#111827,#141a26); display:flex; align-items:center; justify-content:center; color:#9fbfd0; font-weight:700; }
  `;
  const styleTag = document.createElement('style');
  styleTag.textContent = premiumStyles;
  document.head.appendChild(styleTag);

  // ensure we have a mount
  const detailsMount = document.getElementById('series-details');
  if (!detailsMount) {
    console.warn('series-details mount not found');
    return;
  }

  // Load series metadata, render header and tabs
  fetch('series.json')
    .then(r => r.json())
    .then(arr => {
      const meta = Array.isArray(arr) ? arr.find(s => s.slug === slug) : null;
      if (!meta) {
        detailsMount.innerHTML = `<div style="color:#fff;padding:20px;">Series not found.</div>`;
        return;
      }
      document.title = `${meta.title} – SmTv Urdu`;

      const premiumMsg = `
        <div class="premium-channel-message" role="region" aria-label="Premium">
          <strong>Go Ad-Free!</strong> Get direct access to all episodes by joining our <strong>Premium Channel</strong>.
          <div class="premium-btn-row">
            <a href="/premium" class="btn-primary" rel="noopener">Join Premium</a>
          </div>
        </div>
      `;

      detailsMount.innerHTML = `
        <section class="pro-series-header-pro" id="pro-series-header-pro">
          <a href="index.html" class="pro-series-back-btn-pro" title="Back" aria-label="Back to home">
            <svg width="24" height="24" viewBox="0 0 20 20" style="vertical-align: middle;">
              <polyline points="12 4 6 10 12 16" fill="none" stroke="#23c6ed" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></polyline>
            </svg>
          </a>
          <img class="pro-series-poster-pro" src="${meta.poster}" alt="${meta.title}">
          <div class="pro-series-meta-pro">
            <h2 class="pro-series-title-pro">${meta.title}</h2>
            <div class="pro-series-desc-pro">${(meta.desc && (meta.desc.en || meta.desc)) || ""}</div>
            ${premiumMsg}
          </div>
        </section>
        <nav class="pro-seasons-tabs-pro" id="pro-seasons-tabs" aria-label="Seasons"></nav>
        <section class="pro-episodes-row-wrap-pro" id="pro-episodes-row-wrap" aria-live="polite"></section>
      `;

      // Create seasons array
      let seasons = [];
      if (typeof meta.seasons === 'number') {
        for (let i = 1; i <= meta.seasons; i++) seasons.push(String(i));
      } else if (Array.isArray(meta.seasons)) {
        seasons = meta.seasons.map(s => String(s));
      } else {
        seasons = ['1'];
      }

      // Render season tabs
      const tabs = document.getElementById('pro-seasons-tabs');
      tabs.innerHTML = ''; // clear
      seasons.forEach(s => {
        const btn = document.createElement('button');
        btn.type = 'button'; // critical: prevent default focus/submit behaviour
        btn.className = 'pro-season-tab-pro' + (s === season ? ' active' : '');
        btn.dataset.season = s;
        btn.textContent = 'Season ' + s;
        btn.setAttribute('aria-pressed', s === season ? 'true' : 'false');
        btn.addEventListener('click', seasonTabClick);
        tabs.appendChild(btn);
      });

      // Render initial season
      renderSeason(season);
    })
    .catch(() => {
      detailsMount.innerHTML = `<div style="color:#fff;padding:30px;">Could not load series info. Try again later.</div>`;
    });

  // Click handler for season buttons
  function seasonTabClick(e) {
    const btn = e.currentTarget;
    if (!btn || !btn.dataset) return;
    // Prevent any default behaviour and avoid focus-driven scrolling:
    try { e.preventDefault && e.preventDefault(); } catch (er){}
    // Save the current scroll position so we can restore after update:
    const savedScrollY = window.scrollY || window.pageYOffset || 0;

    // immediately blur to avoid focus jump
    try { btn.blur(); } catch (er) {}

    // set active class visually
    const tabs = document.getElementById('pro-seasons-tabs');
    tabs.querySelectorAll('.pro-season-tab-pro').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');

    const newSeason = btn.dataset.season;
    season = newSeason;

    // render but keep scroll stable
    renderSeason(newSeason, savedScrollY);
  }

  // Render season (with optional saved scroll position)
  function renderSeason(seasonToLoad, savedScrollY = null) {
    const wrap = document.getElementById('pro-episodes-row-wrap');
    if (!wrap) return;

    // show compact loading placeholders in the scroller so user sees immediate feedback
    wrap.innerHTML = `
      <div class="pro-episodes-row-pro" role="region" aria-busy="true" aria-label="Loading episodes">
        ${Array.from({length:5}).map(()=>`<div class="pro-ep-loading">Loading</div>`).join('')}
      </div>
    `;

    // small delay to allow loading placeholders to paint before heavy fetch
    setTimeout(() => {
      const url = bust(jsonFor(seasonToLoad));
      // try fetch with a single retry for transient network issues
      fetchWithRetry(url, 1, 9000)
        .then(episodes => {
          // if episodes isn't an array or empty -> show friendly message
          if (!Array.isArray(episodes) || episodes.length === 0) {
            wrap.innerHTML = `<div style="color:#fff;padding:28px 16px;">No episodes for this season.</div>`;
            // restore scroll if provided
            restoreScroll(savedScrollY);
            return;
          }

          // Build scroller HTML
          const html = `<div class="pro-episodes-row-pro">` + episodes.map(ep => {
            const episodeUrl = ep.shortlink
              ? ep.shortlink
              : `episode.html?series=${encodeURIComponent(slug)}&season=${encodeURIComponent(seasonToLoad)}&ep=${encodeURIComponent(ep.ep)}&lang=${encodeURIComponent(lang)}`;
            const extra = ep.shortlink ? 'target="_blank" rel="noopener"' : '';
            // ensure thumbnails lazy load and fill the small square (no gaps)
            const thumb = (ep.thumb && ep.thumb.trim()) ? ep.thumb : 'default-thumb.jpg';
            return `
              <a class="pro-episode-card-pro" href="${episodeUrl}" ${extra} aria-label="Episode ${ep.ep}">
                <div class="pro-ep-thumb-wrap-pro" aria-hidden="true">
                  <img src="${thumb}" class="pro-ep-thumb-pro" alt="Ep ${ep.ep} thumbnail" loading="lazy">
                  <span class="pro-ep-num-pro">Ep ${ep.ep}</span>
                </div>
                <div class="pro-ep-title-pro">${ep.title || ('Episode ' + ep.ep)}</div>
              </a>
            `;
          }).join('') + `</div>`;

          // Tutorial sections below scroller
          const tutorialTitle1 = `
            <section class="pro-highlight-section" aria-hidden="false">
              <div class="pro-highlight-title">How to Watch Episodes</div>
            </section>
          `;
          const tutorialVideo1 = `
            <section class="pro-video-card" aria-label="How to Watch video">
              <div class="pro-video-frame-wrap">
                ${HOWTO_PROCESS_1}
              </div>
            </section>
          `;
          const tutorialTitle2 = `
            <section class="pro-highlight-section" aria-hidden="false">
              <div class="pro-highlight-title">How to Watch (Old Process)</div>
            </section>
          `;
          const tutorialVideo2 = `
            <section class="pro-video-card" aria-label="How to Watch old process video">
              <div class="pro-video-frame-wrap">
                ${HOWTO_PROCESS_2}
              </div>
            </section>
          `;

          // Replace innerHTML in one go
          wrap.innerHTML = html + tutorialTitle1 + tutorialVideo1 + tutorialTitle2 + tutorialVideo2;

          // Small accessibility: remove focus from any element that may cause scroll
          try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch(e){}

          // restore any saved scroll position (defer to next frames so layout is settled)
          restoreScroll(savedScrollY);
        })
        .catch(e => {
          wrap.innerHTML = `<div style="color:#fff;padding:28px 16px;">Could not load episodes. Please try again.</div>`;
          toast('Episode file missing or network error');
          restoreScroll(savedScrollY);
          console.warn('renderSeason error', e);
        });
    }, 60); // tiny delay
  }

  // fetch with one retry (retriesCount times)
  function fetchWithRetry(url, retries = 1, timeout = 8000) {
    return new Promise((resolve, reject) => {
      let attempts = 0;

      function doFetch() {
        attempts++;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        fetch(url, { signal: controller.signal, cache: 'no-cache' })
          .then(res => {
            clearTimeout(timer);
            if (!res.ok) throw new Error('bad response ' + res.status);
            return res.json();
          })
          .then(json => resolve(json))
          .catch(err => {
            clearTimeout(timer);
            if (attempts <= retries) {
              // small backoff then retry
              setTimeout(doFetch, 350);
            } else {
              reject(err);
            }
          });
      }

      doFetch();
    });
  }

  // restore scroll position (if provided). If null -> do nothing.
  function restoreScroll(savedY) {
    if (savedY == null) return;
    // wait for layout/paint then restore to avoid janky jumps
    requestAnimationFrame(() => {
      // double frame for robust layout done
      requestAnimationFrame(() => {
        try {
          window.scrollTo({ top: savedY, left: 0, behavior: 'instant' });
        } catch (e) {
          window.scrollTo(0, savedY);
        }
      });
    });
  }

})();
