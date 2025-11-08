// series.js — updated: better carousel sizing, consistent tutorial highlights, safer JSON detection
(function () {
  'use strict';

  const qs = new URLSearchParams(location.search);
  const slug = (qs.get('series') || '').trim();
  const lang = (qs.get('lang') || '').toLowerCase();
  const seasonQuery = qs.get('season') || '1';

  const HOWTO_PROCESS_1 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg466/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;
  const HOWTO_PROCESS_2 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg45g/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;

  function jsonForCandidate(season, candidatePattern) {
    return candidatePattern.replace(/\{slug\}/g, slug).replace(/\{s\}/g, season).replace(/\{lang\}/g, lang);
  }

  function bust(url) {
    const v = (qs.get('v') || '1');
    // If url already absolute (starts with /) keep, else prefix with /
    const path = url.startsWith('/') ? url : '/' + url.replace(/^\/+/, '');
    return path + (path.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(v);
  }

  function toast(msg) {
    try {
      const t = document.createElement('div');
      t.textContent = msg;
      t.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);background:#122231;color:#9fe6ff;padding:10px 14px;border-radius:9px;border:1px solid #2d4b6a;font-weight:700;z-index:99999;font-family:Montserrat,sans-serif;';
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 2600);
    } catch (e) { /* ignore */ }
  }

  // Injected styles tuned for compact horizontal cards and consistent tutorial title
  const injectedStyles = `
    .premium-channel-message{ margin-top:12px; padding:14px; background:linear-gradient(135deg,#071014 80%, #08323e 100%); border-radius:12px; border:1px solid rgba(35,198,237,0.12); color:#23c6ed; font-weight:700; }
    .premium-btn-row{ margin-top:10px; }
    .btn-primary{ background:#ffd400; color:#112; padding:8px 14px; border-radius:999px; text-decoration:none; font-weight:800; display:inline-block; }

    .pro-episodes-row-pro{
      display:flex;
      gap:14px;
      overflow-x:auto;
      padding:14px 8px;
      -webkit-overflow-scrolling:touch;
      scroll-snap-type:x proximity;
      align-items:flex-start;
    }

    .pro-episode-card-pro{
      scroll-snap-align:center;
      flex:0 0 200px;
      display:flex;
      flex-direction:column;
      gap:10px;
      align-items:center;
      padding:12px;
      border-radius:12px;
      text-decoration:none;
      color:#fff;
      box-shadow:0 10px 30px rgba(0,0,0,0.45);
      background:linear-gradient(180deg, rgba(255,255,255,0.01), rgba(0,0,0,0.06));
      min-height:180px;
      transition:transform .14s ease;
    }
    .pro-episode-card-pro:hover{ transform:translateY(-6px); }

    .pro-ep-thumb-wrap-pro{ width:100%; height:110px; border-radius:10px; overflow:hidden; position:relative; background:#0c0f12; display:block; }
    .pro-ep-thumb-pro{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; }

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

    .pro-ep-title-pro{
      width:100%;
      text-align:center;
      font-size:15px;
      font-weight:800;
      color:#fff;
      padding:10px 6px;
      border-radius:8px;
      background: linear-gradient(180deg, rgba(255,255,255,0.01), rgba(0,0,0,0.03));
      box-shadow: inset 0 -6px 12px rgba(0,0,0,0.18);
    }

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

    .pro-video-frame-wrap { margin-top:12px; border-radius:10px; overflow:hidden; }

    @media(min-width:900px){
      .pro-episode-card-pro{ flex:0 0 260px; min-height:200px; }
      .pro-ep-thumb-wrap-pro{ height:140px; }
      .pro-series-poster-pro{ width:260px; height:140px; }
    }
  `;
  try {
    const styleEl = document.createElement('style');
    styleEl.textContent = injectedStyles;
    document.head.appendChild(styleEl);
  } catch (e) { /* ignore */ }

  function escapeHtml(s) {
    if (!s && s !== 0) return '';
    return String(s).replace(/[&<>"'`=\/]/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;' }[c];
    });
  }

  // Try candidate paths. If content-type isn't JSON, treat as invalid (gives clearer diagnostics).
  async function fetchEpisodesWithCandidates(season) {
    // Build candidate list: prefer lang-specific when lang provided
    const base = 'episode-data/{slug}-s{ s }.json'.replace('{ s }','{s}'); // placeholder only
    const candidates = [];

    // If lang present and valid, try that first
    const langCandidates = [];
    if (lang && ['en','hi','ur','dub','sub'].includes(lang)) {
      langCandidates.push(`episode-data/{slug}-s{ s }-{lang}.json`);
      langCandidates.push(`episode-data/{slug}-s{ s }-{lang}-sub.json`);
    }
    // general candidates
    const fallback = [
      `episode-data/{slug}-s{ s }.json`,
      `episode-data/{slug}-s{ s }-.json`,
      `episode-data/{slug}-s{ s }-sub.json`,
      `episode-data/{slug}-s{ s }-en.json`,
      `episode-data/{slug}-s{ s }-hi.json`,
      `episode-data/{slug}-s{ s }-ur.json`
    ];

    candidates.push(...langCandidates, ...fallback);

    const tried = [];

    for (const pat of candidates) {
      try {
        const cand = jsonForCandidate(season, pat.replace(/\{ s \}/g,'{s}'));
        // normalize placeholders
        const candNorm = cand.replace(/\{s\}/g, season).replace(/\{slug\}/g, slug).replace(/\{lang\}/g, lang);
        const url = bust(candNorm);
        const resp = await fetch(url, { cache: 'no-cache' });
        const rec = { path: candNorm, ok: resp.ok, status: resp.status, err: null, contentType: resp.headers.get('content-type') || '' };

        // If not OK status, record and continue
        if (!resp.ok) {
          rec.err = `HTTP ${resp.status}`;
          tried.push(rec);
          continue;
        }

        const ct = (resp.headers.get('content-type') || '').toLowerCase();
        if (!ct.includes('application/json') && !ct.includes('json')) {
          // read text for diagnostics but don't attempt JSON.parse
          const text = await resp.text();
          rec.err = `invalid content-type: ${ct || 'unknown'}`;
          // Optionally capture snippet (first 120 chars) for easier debug
          rec.preview = (text || '').slice(0, 180);
          tried.push(rec);
          continue;
        }

        // Now parse json
        const j = await resp.json();
        return { episodes: j, tried: [...tried, rec] };
      } catch (err) {
        tried.push({ path: pat.replace(/\{s\}/g, season).replace(/\{slug\}/g, slug).replace(/\{lang\}/g, lang), ok: false, status: null, err: String(err) });
        continue;
      }
    }

    // nothing found
    throw { tried };
  }

  (async function init() {
    try {
      if (document.readyState !== 'complete') {
        await new Promise(r => window.addEventListener('load', r, { once: true }));
      }
      await new Promise(r => setTimeout(r, 20));

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

      const premiumMsg = `
        <div class="premium-channel-message">
          <strong>Go Ad-Free!</strong> Get direct access to all episodes by joining our <strong>Premium Channel</strong>.
          <div class="premium-btn-row"><a href="/premium.html" class="btn-primary" rel="noopener">Join Premium</a></div>
        </div>
      `;

      detailsEl.innerHTML = `
        <section class="pro-series-header-pro">
          <a href="/index.html" class="pro-series-back-btn-pro" title="Back" aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><polyline points="12 4 6 10 12 16" fill="none" stroke="#23c6ed" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>
          </a>
          <img class="pro-series-poster-pro" src="${escapeHtml(meta.poster || '')}" alt="${escapeHtml(meta.title || '')}">
          <div class="pro-series-meta-pro">
            <h2 class="pro-series-title-pro">${escapeHtml(meta.title || '')}</h2>
            <div class="pro-series-desc-pro">${escapeHtml((meta.desc && meta.desc.en) ? meta.desc.en : (meta.desc || ''))}</div>
            ${premiumMsg}
          </div>
        </section>

        <nav class="pro-seasons-tabs-pro" id="pro-seasons-tabs" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:12px;"></nav>

        <section class="pro-episodes-row-wrap-pro" id="pro-episodes-row-wrap" style="margin-top:14px;"></section>
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

          // build compact carousel cards
          const cardsHtml = episodes.map(ep => {
            const epNum = escapeHtml(String(ep.ep || ''));
            const epTitle = escapeHtml(ep.title || ('Episode ' + epNum));
            const thumb = escapeHtml(ep.thumb || 'default-thumb.jpg');
            const episodeUrl = ep.shortlink ? ep.shortlink : `episode.html?series=${encodeURIComponent(slug)}&season=${encodeURIComponent(season)}&ep=${encodeURIComponent(ep.ep)}${lang?('&lang='+encodeURIComponent(lang)) : ''}`;
            const extra = ep.shortlink ? 'target="_blank" rel="noopener"' : '';
            return `
              <a class="pro-episode-card-pro" href="${episodeUrl}" ${extra}>
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
            <div class="pro-video-frame-wrap">${HOWTO_PROCESS_1}</div>

            <div class="pro-tutorial-title">How to Watch (Old Process)</div>
            <div class="pro-video-frame-wrap">${HOWTO_PROCESS_2}</div>
          `;

          wrap.innerHTML = `<div class="pro-episodes-row-pro">${cardsHtml}</div>` + tutorialBlock;

          // ensure a nice initial scroll focus
          try {
            const first = wrap.querySelector('.pro-episode-card-pro');
            if (first) first.scrollIntoView({ behavior: 'auto', inline: 'start', block: 'nearest' });
          } catch (e) {}

        } catch (diag) {
          if (diag && diag.tried) {
            wrap.innerHTML = `
              <div style="background:#0e1720;color:#ffd;padding:14px;border-radius:12px;">
                <div style="font-weight:800;color:#ffd700;margin-bottom:8px;">Episodes not found for this season</div>
                <div style="font-size:13px;color:#cfe6ff">Tried paths (server responded but not JSON / missing):</div>
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
