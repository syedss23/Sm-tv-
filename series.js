// series.js — updated: refined premium banner + compact square episode cards + larger titles
(function () {
  'use strict';

  const qs = new URLSearchParams(location.search);
  const slug = (qs.get('series') || '').trim();
  const lang = (qs.get('lang') || '').toLowerCase();
  const seasonQuery = qs.get('season') || '1';

  const HOWTO_PROCESS_1 = `<iframe class="rumble" width="100%" height="360" src="https://rumble.com/embed/v6yg466/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;
  const HOWTO_PROCESS_2 = `<iframe class="rumble" width="100%" height="360" src="https://rumble.com/embed/v6yg45g/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;

  function bust(url) {
    const v = (qs.get('v') || '1');
    return (url || '') + (url.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(v);
  }

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"'`=\/]/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;' })[c];
    });
  }

  function toast(msg) {
    try {
      const t = document.createElement('div');
      t.textContent = msg;
      t.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);background:#122231;color:#9fe6ff;padding:10px 14px;border-radius:9px;border:1px solid #2d4b6a;font-weight:700;z-index:99999;font-family:Montserrat,sans-serif;';
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 2800);
    } catch (e) { console.warn('toast', e); }
  }

  // Strong injected styles: make cards compact + improve premium banner + increase title size
  const injectedStyles = `
  /* ===== series.js injected overrides ===== */
  .pro-episodes-row-wrap-pro { margin: 12px 0 !important; padding: 0 !important; box-sizing: border-box !important; }

  .pro-episodes-row-pro {
    display:flex;
    gap:12px;
    overflow-x:auto;
    -webkit-overflow-scrolling:touch;
    padding:12px 14px;
    scroll-snap-type:x proximity;
    align-items:flex-start;
    box-sizing: border-box;
  }

  /* compact square card (smaller, no empty vertical space) */
  .pro-episode-card-pro{
    scroll-snap-align:center;
    flex:0 0 160px;         /* compact width */
    max-width:160px;
    display:flex;
    flex-direction:column;
    gap:8px;
    align-items:center;
    padding:10px;
    border-radius:14px;
    text-decoration:none;
    color:#fff;
    box-shadow: 0 8px 22px rgba(0,0,0,0.5);
    background: linear-gradient(180deg, rgba(255,255,255,0.01), rgba(0,0,0,0.04));
    min-height: auto;
    transition: transform .12s ease, box-shadow .12s ease;
  }
  .pro-episode-card-pro:hover{ transform: translateY(-6px); box-shadow: 0 14px 36px rgba(0,0,0,0.55); }

  /* thumbnail area: taller (to give poster feel) but keeps card compact */
  .pro-ep-thumb-wrap-pro{
    width:100%;
    height:140px;            /* slightly taller poster */
    border-radius:10px;
    overflow:hidden;
    position:relative;
    background:#0c0f12;
    display:block;
    box-shadow: inset 0 -8px 18px rgba(0,0,0,0.35);
  }
  .pro-ep-thumb-pro{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; }

  /* Episode number badge */
  .pro-ep-num-pro{
    position:absolute;
    right:8px;
    top:8px;
    background:linear-gradient(90deg,#ffcf33,#ff7a5f);
    color:#111;
    font-weight:800;
    padding:6px 10px;
    border-radius:999px;
    font-size:12px;
    box-shadow: 0 6px 18px rgba(255,120,60,0.12);
  }

  /* title area: bigger, centered, no extra padding */
  .pro-ep-title-pro{
    width:100%;
    text-align:center;
    font-size:17px;
    font-weight:900;
    color:#fff;
    padding:10px 6px 6px 6px;
    border-radius:8px;
    background: transparent;
    box-shadow: none;
    line-height:1.05;
  }

  /* ensure titles don't create excess height */
  .pro-ep-title-pro small { display:block; font-weight:600; font-size:13px; color:#cfe6ff; }

  /* smaller card on very small screens */
  @media (max-width:420px){
    .pro-episode-card-pro { flex:0 0 140px; max-width:140px; padding:8px; }
    .pro-ep-thumb-wrap-pro { height:120px; }
    .pro-ep-title-pro { font-size:15px; }
  }

  /* premium banner (compact, styled like your screenshot) */
  .premium-channel-message {
    margin-top:12px;
    padding:18px;
    border-radius:18px;
    background: linear-gradient(180deg, rgba(6,30,39,0.9), rgba(8,38,47,0.85));
    border: 1px solid rgba(34,193,195,0.12);
    box-shadow: 0 10px 30px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.02);
    color:#bfeff6;
    max-width:780px;
    text-align:center;
  }
  .premium-channel-message h3 { margin:0 0 8px 0; color:#00d6ef; font-size:20px; font-weight:900; }
  .premium-channel-message p { margin:0 0 14px 0; color:#cfefff; font-size:15px; line-height:1.2; opacity:0.95; }
  .premium-cta {
    display:inline-block;
    background: linear-gradient(90deg,#ffd400,#ff8a4a);
    color:#111;
    font-weight:900;
    padding:12px 26px;
    border-radius:999px;
    box-shadow: 0 10px 28px rgba(255,160,40,0.18), 0 3px 10px rgba(0,0,0,0.5);
    text-decoration:none;
    font-size:16px;
  }

  /* highlight small note below premium (optional) */
  .premium-note { margin-top:8px; font-size:13px; color:#9fe6ff; opacity:0.88; }

  /* tutorial highlighted title consistent */
  .pro-tutorial-title {
    margin-top:18px;
    font-weight:900;
    font-size:20px;
    color:#fff;
    background: linear-gradient(90deg, rgba(34,193,195,0.04), rgba(253,187,45,0.02));
    border-left:6px solid #ffd400;
    padding:10px 14px;
    border-radius:10px;
    box-shadow: 0 8px 18px rgba(0,0,0,0.35);
    max-width:1100px;
  }

  /* small safety: ensure no huge bottom gap */
  .pro-episodes-row-pro::after { content:''; width:6px; display:block; }
  `;

  try {
    const styleEl = document.createElement('style');
    styleEl.textContent = injectedStyles;
    document.head.appendChild(styleEl);
  } catch (e) { console.warn('inject style failed', e); }

  // Attempt multiple candidate paths to find the episodes JSON
  async function fetchEpisodesWithCandidates(season) {
    const candidates = [
      `episode-data/${slug}-s${season}.json`,
      `episode-data/${slug}-s${season}-${lang}.json`,
      `episode-data/${slug}-s${season}-en.json`,
      `episode-data/${slug}-s${season}-hi.json`,
      `episode-data/${slug}-s${season}-ur.json`,
      `episode-data/${slug}-s${season}-sub.json`
    ].filter(Boolean);

    const tried = [];
    for (const cand of candidates) {
      try {
        // ensure leading slash for fetch consistency
        const path = cand.startsWith('/') ? cand : '/' + cand.replace(/^\/+/, '');
        const url = bust(path);
        const resp = await fetch(url, { cache: 'no-cache' });
        const rec = { path: cand, ok: resp.ok, status: resp.status };
        // try parse
        const text = await resp.text();
        try {
          const parsed = JSON.parse(text);
          return { episodes: parsed, tried: [...tried, rec] };
        } catch (parseErr) {
          rec.err = 'json-parse:' + (parseErr && parseErr.message ? parseErr.message : String(parseErr));
          tried.push(rec);
          continue;
        }
      } catch (fetchErr) {
        tried.push({ path: cand, ok: false, err: String(fetchErr) });
        continue;
      }
    }

    throw { tried };
  }

  (async function init() {
    try {
      if (document.readyState !== 'complete') {
        await new Promise(r => window.addEventListener('load', r, { once: true }));
      }

      const detailsEl = document.getElementById('series-details');
      if (!detailsEl) {
        console.warn('series.js: #series-details not found');
        return;
      }

      // load series.json
      let seriesList;
      try {
        const r = await fetch('/series.json', { cache: 'no-cache' });
        if (!r.ok) throw new Error('series.json HTTP ' + r.status);
        const j = await r.json();
        seriesList = Array.isArray(j) ? j : (j && Array.isArray(j.series) ? j.series : null);
      } catch (e) {
        detailsEl.innerHTML = `<div style="color:#fff;padding:20px;">Could not load series list. Try again later.</div>`;
        console.error('Failed loading series.json', e);
        return;
      }

      if (!slug) {
        detailsEl.innerHTML = `<div style="color:#fff;padding:20px;">Open a series from Home or the Series tab.</div>`;
        return;
      }

      const meta = Array.isArray(seriesList) ? seriesList.find(s => s.slug === slug) : null;
      if (!meta) {
        detailsEl.innerHTML = `<div style="color:#fff;padding:20px;">Series not found.</div>`;
        return;
      }

      document.title = `${meta.title} – SmTv Urdu`;

      // premiumMessage HTML (improved visual)
      const premiumMsg = `
        <div class="premium-channel-message" role="region" aria-label="Premium channel">
          <h3>Go Ad-Free — Join Premium</h3>
          <p>Get direct access to all episodes and remove ads by joining our <strong>Premium Channel</strong>.</p>
          <a href="/premium.html" class="premium-cta" rel="noopener">Join Premium</a>
          <div class="premium-note">Members get early uploads, higher quality and downloads.</div>
        </div>
      `;

      detailsEl.innerHTML = `
        <section class="pro-series-header-pro" aria-hidden="false">
          <a href="/index.html" class="pro-series-back-btn-pro" title="Back" aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><polyline points="12 4 6 10 12 16" fill="none" stroke="#23c6ed" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>
          </a>
          <img class="pro-series-poster-pro" src="${escapeHtml(meta.poster || '')}" alt="${escapeHtml(meta.title || '')}" />
          <div class="pro-series-meta-pro">
            <h2 class="pro-series-title-pro">${escapeHtml(meta.title || '')}</h2>
            <div class="pro-series-desc-pro">${escapeHtml((meta.desc && meta.desc.en) ? meta.desc.en : (meta.desc || ''))}</div>
            ${premiumMsg}
          </div>
        </section>

        <nav class="pro-seasons-tabs-pro" id="pro-seasons-tabs" aria-label="Seasons"></nav>
        <section class="pro-episodes-row-wrap-pro" id="pro-episodes-row-wrap" aria-live="polite"></section>
      `;

      // build seasons
      let seasons = [];
      if (typeof meta.seasons === 'number') {
        for (let i = 1; i <= meta.seasons; i++) seasons.push(String(i));
      } else if (Array.isArray(meta.seasons)) {
        seasons = meta.seasons.map(s => String(s));
      } else seasons = ['1'];

      const tabsEl = document.getElementById('pro-seasons-tabs');
      tabsEl.innerHTML = seasons.map(s => `<button data-season="${s}" class="pro-season-tab-pro${s === seasonQuery ? ' active' : ''}">Season ${s}</button>`).join('');
      tabsEl.querySelectorAll('.pro-season-tab-pro').forEach(btn => {
        btn.addEventListener('click', () => {
          tabsEl.querySelectorAll('.pro-season-tab-pro').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          loadSeason(btn.dataset.season);
        });
      });

      // initial load
      await loadSeason(seasonQuery);

      async function loadSeason(season) {
        const wrap = document.getElementById('pro-episodes-row-wrap');
        if (!wrap) return;
        wrap.innerHTML = `<div style="color:#ddd;padding:12px 0;">Loading episodes...</div>`;

        try {
          const { episodes, tried } = await (async () => {
            try {
              const res = await fetchEpisodesWithCandidates(season);
              return { episodes: res.episodes, tried: res.tried || [] };
            } catch (err) {
              throw err;
            }
          })();

          if (!Array.isArray(episodes) || episodes.length === 0) {
            wrap.innerHTML = `<div style="color:#fff;padding:28px 0 0 0;">No episodes for this season.</div>`;
            return;
          }

          // build compact cards
          const cardsHtml = episodes.map(ep => {
            const epNum = escapeHtml(String(ep.ep || ''));
            const epTitle = escapeHtml(ep.title || ('Episode ' + epNum));
            const thumb = escapeHtml(ep.thumb || 'default-thumb.jpg');
            const episodeUrl = ep.shortlink ? ep.shortlink : `episode.html?series=${encodeURIComponent(slug)}&season=${encodeURIComponent(season)}&ep=${encodeURIComponent(ep.ep)}${lang?('&lang='+encodeURIComponent(lang)) : ''}`;
            const extra = ep.shortlink ? 'target="_blank" rel="noopener"' : '';
            return `
              <a class="pro-episode-card-pro" href="${episodeUrl}" ${extra} aria-label="${epTitle}">
                <div class="pro-ep-thumb-wrap-pro">
                  <img class="pro-ep-thumb-pro" src="${thumb}" alt="${epTitle}">
                  <span class="pro-ep-num-pro">Ep ${epNum}</span>
                </div>
                <div class="pro-ep-title-pro">${epTitle}</div>
              </a>
            `;
          }).join('');

          const tutorialBlock = `
            <div class="pro-tutorial-title">How to Watch Episodes</div>
            <div class="pro-video-frame-wrap" style="margin-top:12px;">${HOWTO_PROCESS_1}</div>

            <div style="height:14px"></div>

            <div class="pro-tutorial-title" style="border-left-color:#23c6ed;">How to Watch (Old Process)</div>
            <div class="pro-video-frame-wrap" style="margin-top:12px;">${HOWTO_PROCESS_2}</div>
          `;

          wrap.innerHTML = `<div class="pro-episodes-row-pro">${cardsHtml}</div>` + tutorialBlock;

          // set a focused scroll so first card is visible
          try {
            const first = wrap.querySelector('.pro-episode-card-pro');
            if (first) first.scrollIntoView({ behavior: 'auto', inline: 'start', block: 'nearest' });
          } catch (e) { /* ignore */ }

        } catch (diag) {
          if (diag && diag.tried) {
            wrap.innerHTML = `
              <div style="background:#0e1720;color:#ffd;padding:14px;border-radius:12px;">
                <div style="font-weight:800;color:#ffd700;margin-bottom:8px;">Episodes not found for this season</div>
                <div style="font-size:13px;color:#cfe6ff">Tried paths (server responded but JSON invalid / missing):</div>
                <pre style="white-space:pre-wrap;color:#cfe6ff;font-size:12px;margin-top:8px;">${escapeHtml(JSON.stringify(diag.tried, null, 2))}</pre>
              </div>
            `;
            toast('Episodes JSON missing or invalid for this season');
          } else {
            wrap.innerHTML = `<div style="color:#fff;padding:28px 0 0 0;">No episodes for this season.</div>`;
            toast('Episodes load error');
          }
          console.error('Episode load error / diagnostics', diag);
        }
      }

    } catch (err) {
      console.error('series.js fatal', err);
      const el = document.getElementById('series-details');
      if (el) el.innerHTML = `<div style="color:#fff;padding:30px;">Could not load series info. Try again later.</div>`;
    }
  })();

})();
