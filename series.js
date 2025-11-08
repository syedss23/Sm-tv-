// series.js — improved robust loader for series page
(function () {
  'use strict';

  // --- Config / URL helpers -------------------------------------------------
  const qs = new URLSearchParams(location.search);
  const slug = (qs.get('series') || '').trim();
  const lang = (qs.get('lang') || '').toLowerCase();
  const seasonQuery = qs.get('season') || '1';
  const JSON_PATHS = ['/series.json', '/data/series.json', 'series.json'];

  // How-to video embeds (kept from original)
  const HOWTO_PROCESS_1 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg466/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;
  const HOWTO_PROCESS_2 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg45g/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;

  function jsonFor(season) {
    // builds the episode JSON filename depending on lang & slug
    if (!slug) return null;
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
    return url + (url.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(v);
  }

  function toast(msg) {
    try {
      const t = document.createElement('div');
      t.textContent = msg;
      t.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);background:#122231;color:#9fe6ff;padding:10px 14px;border-radius:9px;border:1px solid #2d4b6a;font-weight:700;z-index:99999;font-family:Montserrat,sans-serif;';
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 2600);
    } catch (e) { console.warn('toast error', e); }
  }

  // --- small premium styles injection (kept) -------------------------------
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
    .premium-channel-message strong {
      color: #ffd700;
      font-weight: 800;
      letter-spacing: 0.01em;
    }
    .premium-btn-row {
      display: flex;
      gap: 12px;
      margin-top: 11px;
      flex-wrap: wrap;
      align-items: center;
    }
    .btn-primary{
      display:inline-block;
      background:#ffd400;
      color:#13263a;
      font-weight:800;
      padding:10px 16px;
      border-radius:999px;
      box-shadow:0 4px 14px #ffd40055;
      text-align:center;
    }
    .btn-primary:active{ transform:translateY(1px); }
    .pro-season-tab-pro { margin-right:8px; background:rgba(255,255,255,0.03); border:none; color:#ddd; padding:8px 12px; border-radius:10px; cursor:pointer; }
    .pro-season-tab-pro.active { background: linear-gradient(90deg,#ffcf33,#ff7a5f); color:#111; font-weight:700; transform:translateY(-2px); }
    .pro-episodes-row-pro { display:flex; flex-wrap:wrap; gap:12px; margin-top:12px; }
    .pro-episode-card-pro { display:block; width:calc(50% - 6px); text-decoration:none; color:#fff; border-radius:10px; overflow:hidden; background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.08)); box-shadow: 0 8px 20px rgba(0,0,0,0.45); }
    @media(min-width:700px){ .pro-episode-card-pro { width:calc(33.333% - 8px); } }
    .pro-ep-thumb-wrap-pro { position:relative; width:100%; padding-bottom:56%; background:#111; }
    .pro-ep-thumb-pro { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; }
    .pro-ep-num-pro { position:absolute; left:8px; top:8px; background:rgba(0,0,0,0.5); padding:6px 8px; border-radius:8px; font-weight:700; color:#fff; font-size:13px; }
    .pro-ep-title-pro { padding:10px; font-size:14px; font-weight:700; color:#fff; }
    .pro-video-frame-wrap { margin-top:18px; border-radius:10px; overflow:hidden; }
  `;
  try {
    const styleTag = document.createElement('style');
    styleTag.textContent = premiumStyles;
    document.head.appendChild(styleTag);
  } catch (e) {
    console.warn('Failed to inject premium styles', e);
  }

  // --- utility: fetch JSON from multiple candidate paths -------------------
  async function fetchJsonWithFallback(paths) {
    let lastError = null;
    for (const p of paths) {
      try {
        const res = await fetch(p, { cache: 'no-cache' });
        if (!res.ok) {
          lastError = new Error('HTTP ' + res.status + ' for ' + p);
          continue;
        }
        const j = await res.json();
        return j;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('All fetch attempts failed for ' + JSON.stringify(paths));
  }

  // --- main render logic ---------------------------------------------------
  async function init() {
    try {
      // wait for full load so other page scripts (and footer include) finish
      if (document.readyState !== 'complete') {
        await new Promise(r => window.addEventListener('load', r, { once: true }));
      }
      // tiny delay to avoid race with other dynamic injectors
      await new Promise(r => setTimeout(r, 40));

      // ensure series-details container exists
      const detailsEl = document.getElementById('series-details');
      if (!detailsEl) {
        console.warn('series.js: #series-details not found');
        return;
      }

      // load series.json (from multiple paths)
      let seriesData = null;
      try {
        const raw = await fetchJsonWithFallback(JSON_PATHS);
        seriesData = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.series) ? raw.series : null);
      } catch (e) {
        console.error('series.js: failed to load series.json', e);
        detailsEl.innerHTML = `<div style="color:#fff;padding:20px;">Could not load series list. Try again later.</div>`;
        return;
      }

      // find meta for slug
      const meta = Array.isArray(seriesData) && slug ? seriesData.find(s => s.slug === slug) : null;
      if (!meta) {
        detailsEl.innerHTML = `<div style="color:#fff;padding:20px;">Series not found.</div>`;
        return;
      }

      // update title
      document.title = `${meta.title} – SmTv Urdu`;

      // build premium message (kept)
      const premiumMsg = `
        <div class="premium-channel-message">
          <strong>Go Ad-Free!</strong> Get direct access to all episodes by joining our <strong>Premium Channel</strong>.
          <div class="premium-btn-row">
            <a href="/premium.html" class="btn-primary" rel="noopener">Join Premium</a>
          </div>
        </div>
      `;

      // render main details markup
      detailsEl.innerHTML = `
        <section class="pro-series-header-pro" style="display:flex;gap:12px;align-items:flex-start;">
          <a href="/index.html" class="pro-series-back-btn-pro" title="Back" style="text-decoration:none;display:inline-flex;align-items:center;">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="vertical-align:middle"><polyline points="12 4 6 10 12 16" fill="none" stroke="#23c6ed" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>
          </a>
          <img class="pro-series-poster-pro" src="${meta.poster || ''}" alt="${escapeHtml(meta.title || '')}" style="width:120px;border-radius:10px;object-fit:cover;">
          <div class="pro-series-meta-pro" style="flex:1;">
            <h2 class="pro-series-title-pro" style="margin:0 0 8px 0;">${escapeHtml(meta.title || '')}</h2>
            <div class="pro-series-desc-pro muted">${escapeHtml((meta.desc && meta.desc.en) ? meta.desc.en : (meta.desc || ''))}</div>
            ${premiumMsg}
          </div>
        </section>
        <nav class="pro-seasons-tabs-pro" id="pro-seasons-tabs" style="margin-top:14px;"></nav>
        <section class="pro-episodes-row-wrap-pro" id="pro-episodes-row-wrap" style="margin-top:12px;"></section>
      `;

      // determine seasons array
      let seasons = [];
      if (typeof meta.seasons === 'number') {
        for (let i = 1; i <= meta.seasons; i++) seasons.push(String(i));
      } else if (Array.isArray(meta.seasons)) {
        seasons = meta.seasons.map(s => String(s));
      } else {
        seasons = ['1'];
      }

      const tabsEl = document.getElementById('pro-seasons-tabs');
      tabsEl.innerHTML = seasons.map(s =>
        `<button data-season="${s}" class="pro-season-tab-pro${s === seasonQuery ? ' active' : ''}">Season ${s}</button>`
      ).join('');

      // attach tab listeners
      tabsEl.querySelectorAll('.pro-season-tab-pro').forEach(btn => {
        btn.addEventListener('click', () => {
          tabsEl.querySelectorAll('.pro-season-tab-pro').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderSeason(btn.dataset.season);
        });
      });

      // initial render for season
      renderSeason(seasonQuery);

      // --- renderSeason function -------------------------------------------
      async function renderSeason(season) {
        const wrap = document.getElementById('pro-episodes-row-wrap');
        if (!wrap) return;
        wrap.innerHTML = `<div style="color:#ddd;padding:12px 0;">Loading episodes...</div>`;

        const episodeJson = jsonFor(season);
        if (!episodeJson) {
          wrap.innerHTML = `<div style="color:#fff;padding:28px 0 0 0;">No episodes for this season.</div>`;
          return;
        }

        const url = bust(episodeJson);

        try {
          const resp = await fetch(url, { cache: 'no-cache' });
          if (!resp.ok) throw new Error('HTTP ' + resp.status + ' ' + url);
          const episodes = await resp.json();

          if (!Array.isArray(episodes) || episodes.length === 0) {
            wrap.innerHTML = `<div style="color:#fff;padding:28px 0 0 0;">No episodes for this season.</div>`;
            return;
          }

          // build episodes grid
          const html = `<div class="pro-episodes-row-pro">` + episodes.map(ep => {
            const episodeUrl = ep.shortlink
              ? ep.shortlink
              : `episode.html?series=${encodeURIComponent(slug)}&season=${encodeURIComponent(season)}&ep=${encodeURIComponent(ep.ep)}&lang=${encodeURIComponent(lang)}`;
            const extra = ep.shortlink ? 'target="_blank" rel="noopener"' : '';
            const thumb = ep.thumb || 'default-thumb.jpg';
            const epTitle = escapeHtml(ep.title || ('Episode ' + ep.ep));
            return `
              <a class="pro-episode-card-pro" href="${episodeUrl}" ${extra}>
                <div class="pro-ep-thumb-wrap-pro">
                  <img src="${thumb}" class="pro-ep-thumb-pro" alt="Ep ${ep.ep}">
                  <span class="pro-ep-num-pro">Ep ${escapeHtml(String(ep.ep))}</span>
                </div>
                <div class="pro-ep-title-pro">${epTitle}</div>
              </a>
            `;
          }).join('') + `</div>`;

          // add tutorial sections after episodes
          const tutorialTitle1 = `
            <section class="pro-highlight-section">
              <div class="pro-highlight-title" style="color:#fff;font-weight:700;margin-top:18px;">How to Watch Episodes</div>
            </section>
          `;
          const tutorialVideo1 = `
            <section class="pro-video-card">
              <div class="pro-video-frame-wrap">
                ${HOWTO_PROCESS_1}
              </div>
            </section>
          `;
          const tutorialTitle2 = `
            <section class="pro-highlight-section">
              <div class="pro-highlight-title" style="color:#fff;font-weight:700;margin-top:18px;">How to Watch (Old Process)</div>
            </section>
          `;
          const tutorialVideo2 = `
            <section class="pro-video-card">
              <div class="pro-video-frame-wrap">
                ${HOWTO_PROCESS_2}
              </div>
            </section>
          `;

          wrap.innerHTML = html + tutorialTitle1 + tutorialVideo1 + tutorialTitle2 + tutorialVideo2;
        } catch (err) {
          console.error('Failed to load episode JSON:', err);
          wrap.innerHTML = `<div style="color:#fff;padding:28px 0 0 0;">No episodes for this season.</div>`;
          toast('Missing file: ' + (err.message || String(err)));
        }
      }

    } catch (errMain) {
      console.error('series.js main error:', errMain);
      const detailsEl = document.getElementById('series-details');
      if (detailsEl) detailsEl.innerHTML = `<div style="color:#fff;padding:30px;">Could not load series info. Try again later.</div>`;
    }
  } // end init

  // small helper: escape HTML for safety
  function escapeHtml(s) {
    if (!s && s !== 0) return '';
    return String(s).replace(/[&<>"'`=\/]/g, function (c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
      }[c];
    });
  }

  // run
  init();

})();
