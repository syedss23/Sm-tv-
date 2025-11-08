// series.js — improved: compact square episode cards, thumbnail-first layout, robust episode loading
(function () {
  'use strict';

  const qs = new URLSearchParams(location.search);
  const slug = (qs.get('series') || '').trim();
  const lang = (qs.get('lang') || '').toLowerCase();
  const seasonQuery = qs.get('season') || '1';

  // Tutorial embeds (you already use these)
  const HOWTO_PROCESS_1 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg466/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;
  const HOWTO_PROCESS_2 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg45g/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;

  function bust(url) {
    const v = (qs.get('v') || '1');
    return url + (url.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(v);
  }

  function escapeHtml(s) {
    if (s === undefined || s === null) return '';
    return String(s).replace(/[&<>"'`=\/]/g, function (c) {
      return {
        '&': '&amp;', '<': '&lt;', '>': '&gt;',
        '"': '&quot;', "'": '&#39;', '/': '&#x2F;',
        '`': '&#x60;', '=': '&#x3D;'
      }[c];
    });
  }

  function toast(msg, duration = 2600) {
    try {
      const t = document.createElement('div');
      t.textContent = msg;
      t.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);background:#122231;color:#9fe6ff;padding:10px 14px;border-radius:9px;border:1px solid #2d4b6a;font-weight:700;z-index:99999;font-family:Montserrat,sans-serif;';
      document.body.appendChild(t);
      setTimeout(() => t.remove(), duration);
    } catch (e) { /* ignore */ }
  }

  // Inject (or overwrite) small set of styles controlling the carousel + thumbnails
  (function injectStyles() {
    const css = `
      /* compact square-style episode cards + consistent tutorial title */
      .pro-episodes-row-pro{ display:flex; gap:12px; overflow-x:auto; padding:12px 14px; -webkit-overflow-scrolling:touch; scroll-snap-type:x proximity; align-items:flex-start; }
      .pro-episode-card-pro{ scroll-snap-align:center; flex:0 0 150px; display:flex; flex-direction:column; gap:10px; align-items:center; padding:10px; border-radius:12px; text-decoration:none; color:#fff; box-shadow:0 10px 30px rgba(0,0,0,0.45); background:linear-gradient(180deg, rgba(255,255,255,0.01), rgba(0,0,0,0.06)); min-height:200px; transition:transform .14s ease,box-shadow .14s ease; }
      @media(max-width:420px){ .pro-episode-card-pro{ flex:0 0 140px; min-height:190px; padding:8px; } }
      .pro-ep-thumb-wrap-pro{ width:120px; height:120px; border-radius:10px; overflow:hidden; position:relative; background:#0b0d10; display:block; }
      @media(min-width:900px){ .pro-episode-card-pro{ flex:0 0 200px; min-height:220px; } .pro-ep-thumb-wrap-pro{ width:160px;height:160px; } }
      .pro-ep-thumb-pro{ width:100%; height:100%; object-fit:cover; display:block; }
      .pro-ep-num-pro{ position:absolute; right:8px; top:8px; background:linear-gradient(90deg,#ffcf33,#ff7a5f); color:#111; font-weight:800; padding:6px 10px; border-radius:999px; font-size:12px; box-shadow:0 6px 18px rgba(255,120,60,0.12); }
      .pro-ep-title-pro{ width:100%; text-align:center; font-size:15px; font-weight:800; color:#fff; padding:8px 6px; border-radius:8px; background: linear-gradient(180deg, rgba(255,255,255,0.01), rgba(0,0,0,0.03)); box-shadow: inset 0 -6px 12px rgba(0,0,0,0.08); }
      .pro-tutorial-title{ margin-top:18px; font-weight:900; font-size:20px; color:#fff; background: linear-gradient(90deg, rgba(34,193,195,0.04), rgba(253,187,45,0.02)); border-left:6px solid #ffd400; padding:10px 14px; border-radius:10px; box-shadow:0 8px 18px rgba(0,0,0,0.35); }
      .premium-channel-message{ margin-top:14px; padding:18px; border-radius:14px; background: linear-gradient(180deg,#042430 0%, #08323e 100%); border:1px solid rgba(0,160,200,0.12); color:#c6f5ff; box-shadow:0 12px 34px rgba(0,0,0,0.45); text-align:center; }
      .premium-channel-message .join-btn{ display:inline-block; margin-top:12px; background:linear-gradient(90deg,#ffd400,#ff8a55); color:#13263a; font-weight:800; padding:12px 22px; border-radius:999px; box-shadow:0 14px 36px rgba(255,136,65,0.18); text-decoration:none; }
      /* Avoid big empty space under episodes scroller */
      .pro-episodes-row-wrap-pro{ padding-bottom:6px; margin-bottom:4px; }
      @media (max-width:600px){ body{ padding-bottom: calc(120px + env(safe-area-inset-bottom)); } }
    `;
    try {
      const s = document.createElement('style');
      s.textContent = css;
      document.head.appendChild(s);
    } catch (e) { console.warn('injectStyles failed', e); }
  })();

  // candidate paths to try for episodes JSON — ordered
  function episodeCandidates(season) {
    const base = `episode-data/${slug}-s${season}`;
    const candidates = [
      `${base}.json`,
      `${base}-${lang}.json`,
      `${base}-en.json`,
      `${base}-hi.json`,
      `${base}-ur.json`,
      `${base}-sub.json`,
      `${base}-en-sub.json`,
      // some sites have weird suffixes
      `${base}-.json`,
      `${base}-sub-s1.json`,
      `${base}-en-sub-s1.json`
    ];
    return candidates;
  }

  // Try loading episodes from several candidate files; return parsed JSON or throw diagnostics
  async function fetchEpisodes(season) {
    const tried = [];
    for (const cand of episodeCandidates(season)) {
      try {
        const path = cand.startsWith('/') ? cand : '/' + cand.replace(/^\/+/, '');
        const url = bust(path);
        const resp = await fetch(url, { cache: 'no-cache' });
        const rec = { path: cand, ok: resp.ok, status: resp.status };
        // read text and try parse
        const txt = await resp.text();
        try {
          const parsed = JSON.parse(txt);
          return { episodes: parsed, tried: tried.concat([rec]) };
        } catch (pe) {
          rec.error = 'json-parse:' + (pe && pe.message ? pe.message : String(pe));
          tried.push(rec);
          continue;
        }
      } catch (fe) {
        tried.push({ path: cand, ok: false, error: String(fe) });
        continue;
      }
    }
    throw { tried };
  }

  // main init
  (async function init() {
    try {
      // wait for load (ensures head injected CSS applied)
      if (document.readyState !== 'complete') {
        await new Promise(r => window.addEventListener('load', r, { once: true }));
      }
      const detailsEl = document.getElementById('series-details');
      if (!detailsEl) {
        console.warn('series.js: #series-details not found');
        return;
      }

      // load series metadata
      let seriesList;
      try {
        const res = await fetch('/series.json', { cache: 'no-cache' });
        if (!res.ok) throw new Error('series.json HTTP ' + res.status);
        const j = await res.json();
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

      // premium message (nicer)
      const premiumMsg = `
        <div class="premium-channel-message" role="note" aria-label="Premium Channel promo">
          <div style="font-weight:900;font-size:1.05em;color:#aef7ff;margin-bottom:6px;">Go Ad-Free — Join Premium</div>
          <div style="color:#cfe6ef;opacity:0.95;">Get direct access to all episodes and remove ads by joining our <strong>Premium Channel</strong>.</div>
          <a href="/premium.html" class="join-btn" rel="noopener">Join Premium</a>
          <div style="color:#9fd6e0;margin-top:8px;font-size:0.95em;">Members get early uploads, higher quality and download links.</div>
        </div>
      `;

      // render header + tabs + episodes placeholder
      detailsEl.innerHTML = `
        <section class="pro-series-header-pro" aria-labelledby="series-title">
          <a href="/index.html" class="pro-series-back-btn-pro" title="Back" aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><polyline points="12 4 6 10 12 16" fill="none" stroke="#23c6ed" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>
          </a>
          <img class="pro-series-poster-pro" src="${escapeHtml(meta.poster || '')}" alt="${escapeHtml(meta.title || '')}">
          <div class="pro-series-meta-pro" style="text-align:center;max-width:880px;">
            <h2 id="series-title" class="pro-series-title-pro" style="color:#00d0f0;margin:8px 0;font-weight:800;">${escapeHtml(meta.title || '')}</h2>
            <div class="pro-series-desc-pro" style="color:#cfd8df;line-height:1.45;">${escapeHtml((meta.desc && meta.desc.en) ? meta.desc.en : (meta.desc || ''))}</div>
            ${premiumMsg}
          </div>
        </section>

        <nav class="pro-seasons-tabs-pro" id="pro-seasons-tabs" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:12px;"></nav>

        <section class="pro-episodes-row-wrap-pro" id="pro-episodes-row-wrap" style="margin-top:14px;"></section>
      `;

      // build seasons array
      let seasons = [];
      if (typeof meta.seasons === 'number') {
        for (let i = 1; i <= meta.seasons; i++) seasons.push(String(i));
      } else if (Array.isArray(meta.seasons)) seasons = meta.seasons.map(s => String(s));
      else seasons = ['1'];

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
          const res = await fetchEpisodes(season);
          const episodes = res.episodes;

          if (!Array.isArray(episodes) || episodes.length === 0) {
            wrap.innerHTML = `<div style="color:#fff;padding:28px 0 0 0;">No episodes for this season.</div>`;
            return;
          }

          // build compact cards HTML
          const cardsHtml = episodes.map(ep => {
            const epNum = escapeHtml(String(ep.ep || ''));
            const epTitle = escapeHtml(ep.title || ('Episode ' + epNum));
            const thumb = escapeHtml(ep.thumb || 'default-thumb.jpg');
            const episodeUrl = ep.shortlink ? ep.shortlink : `episode.html?series=${encodeURIComponent(slug)}&season=${encodeURIComponent(season)}&ep=${encodeURIComponent(ep.ep)}${lang?('&lang='+encodeURIComponent(lang)) : ''}`;
            const extra = ep.shortlink ? 'target="_blank" rel="noopener"' : '';
            return `
              <a class="pro-episode-card-pro" href="${episodeUrl}" ${extra} aria-label="${epTitle}">
                <div class="pro-ep-thumb-wrap-pro" role="img" aria-hidden="false">
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
            <div style="height:14px"></div>
            <div class="pro-tutorial-title">How to Watch (Old Process)</div>
            <div class="pro-video-frame-wrap">${HOWTO_PROCESS_2}</div>
          `;

          wrap.innerHTML = `<div class="pro-episodes-row-pro">${cardsHtml}</div>` + tutorialBlock;

          // optional: focus first card into view nicely
          try {
            const first = wrap.querySelector('.pro-episode-card-pro');
            if (first) first.scrollIntoView({ behavior: 'auto', inline: 'start', block: 'nearest' });
          } catch (e) {}

        } catch (diag) {
          // diagnostics output (helpful while debugging missing json files)
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
