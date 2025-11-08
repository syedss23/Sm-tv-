// series.js — details-only renderer for series.html?series=slug
(function () {
  'use strict';

  const qs = new URLSearchParams(location.search);
  const slug = (qs.get('series') || '').trim();
  const lang = (qs.get('lang') || '').toLowerCase();
  const seasonQuery = qs.get('season') || '1';
  const JSON_PATHS = ['/series.json', '/data/series.json', 'series.json'];

  // tutorial embeds (unchanged)
  const HOWTO_PROCESS_1 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg466/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;
  const HOWTO_PROCESS_2 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg45g/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;

  function jsonFor(season) {
    if (!slug) return null;
    if (lang === 'dub') {
      return `episode-data/${slug}-s${season}.json`;
    } else if (['en', 'hi', 'ur'].includes(lang)) {
      return `episode-data/${slug}-s${season}-${lang}.json`;
    } else {
      // fallback to base file
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
    } catch (e) { /* noop */ }
  }

  // If no slug → don't render details; this file is only for details view.
  if (!slug) {
    // Do not alter the list/filter DOM — let series.html handle the grid view.
    // But we still export a small helper (no-op) so nothing breaks if called.
    return;
  }

  // inject styles for details view (header + horizontal card styles)
  (function injectStyles(){
    const css = `
      .pro-series-header-pro{display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;padding:18px;border-radius:14px;background:linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.06));box-shadow:0 8px 22px rgba(0,0,0,0.45);position:relative;margin-bottom:12px;}
      .pro-series-back-btn-pro{position:absolute;left:14px;top:14px;width:48px;height:48px;display:inline-flex;align-items:center;justify-content:center;border-radius:12px;background:rgba(0,150,200,0.12);border:2px solid rgba(0,160,210,0.18);box-shadow:0 6px 18px rgba(0,140,200,0.08);text-decoration:none;}
      .pro-series-poster-pro{width:150px;height:90px;border-radius:10px;object-fit:cover;display:block;box-shadow:0 8px 18px rgba(0,0,0,0.45);}
      .pro-series-meta-pro{width:100%;max-width:720px;}
      .pro-series-title-pro{font-size:22px;margin:8px 0;color:#00d0f0;font-weight:800;}
      .pro-series-desc-pro{color:#cfd8df;line-height:1.45;}
      .pro-season-tab-pro{margin-right:8px;background:rgba(255,255,255,0.03);border:none;color:#ddd;padding:8px 12px;border-radius:10px;cursor:pointer;}
      .pro-season-tab-pro.active{background:linear-gradient(90deg,#ffcf33,#ff7a5f);color:#111;font-weight:700;transform:translateY(-2px);}
      .pro-episodes-row-pro{display:flex;flex-direction:column;gap:12px;margin-top:12px;}
      .pro-episode-card-pro{display:flex;gap:12px;align-items:center;padding:10px;background:linear-gradient(180deg,rgba(255,255,255,0.01),rgba(0,0,0,0.06));border-radius:12px;text-decoration:none;color:#fff;box-shadow:0 8px 20px rgba(0,0,0,0.45);transition:transform .12s ease,box-shadow .12s ease;}
      .pro-episode-card-pro:hover{transform:translateY(-4px);box-shadow:0 12px 28px rgba(0,0,0,0.6);}
      .pro-ep-thumb-wrap-pro{flex:0 0 140px;width:140px;height:80px;position:relative;border-radius:8px;overflow:hidden;background:#111;}
      .pro-ep-thumb-pro{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}
      .pro-ep-num-pro{position:absolute;left:8px;top:8px;background:rgba(0,0,0,0.45);padding:6px 8px;border-radius:8px;font-weight:700;color:#fff;font-size:13px;}
      .pro-ep-title-pro{flex:1;font-size:15px;font-weight:700;color:#fff;}
      .pro-video-frame-wrap{margin-top:18px;border-radius:10px;overflow:hidden;}
      @media(min-width:700px){ .pro-series-poster-pro{width:180px;height:110px;} .pro-ep-thumb-wrap-pro{flex:0 0 180px;width:180px;height:100px;} }
    `;
    try{
      const t = document.createElement('style');
      t.textContent = css;
      document.head.appendChild(t);
    }catch(e){}
  })();

  // robust JSON fetcher (tries multiple paths)
  async function fetchJsonWithFallback(paths){
    let lastErr = null;
    for(const p of paths){
      try{
        const r = await fetch(p, { cache: 'no-cache' });
        if(!r.ok){ lastErr = new Error('HTTP ' + r.status + ' for ' + p); continue; }
        const j = await r.json();
        return j;
      }catch(err){ lastErr = err; }
    }
    throw lastErr || new Error('All fetch attempts failed');
  }

  // main details renderer
  (async function renderDetails(){
    // wait page load near-safely so footer include or other scripts don't race
    if (document.readyState !== 'complete') {
      await new Promise(r => window.addEventListener('load', r, { once: true }));
    }
    await new Promise(r => setTimeout(r, 40));

    const detailsEl = document.getElementById('series-details');
    if (!detailsEl) {
      console.warn('series.js: #series-details not found');
      return;
    }

    // hide list/filter area if present (series.html provides them)
    try {
      const listArea = document.getElementById('series-list-area');
      const filterBar = document.querySelector('.filter-bar');
      const subLangBar = document.getElementById('subLangBar');
      if (listArea) listArea.style.display = 'none';
      if (filterBar) filterBar.style.display = 'none';
      if (subLangBar) subLangBar.style.display = 'none';
      detailsEl.style.display = '';
    } catch (e){ /* ignore */ }

    // load series.json to get the meta
    let seriesData = null;
    try {
      const raw = await fetchJsonWithFallback(JSON_PATHS);
      seriesData = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.series) ? raw.series : null);
    } catch (e) {
      detailsEl.innerHTML = `<div style="color:#fff;padding:20px;">Could not load series info. Try again later.</div>`;
      console.error('series.js: failed to load series.json', e);
      return;
    }

    const meta = Array.isArray(seriesData) ? seriesData.find(s => s.slug === slug) : null;
    if (!meta) {
      detailsEl.innerHTML = `<div style="color:#fff;padding:20px;">Series not found.</div>`;
      return;
    }

    // update doc title and meta description
    try{
      document.title = `${meta.title} – SmTv Urdu`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if(metaDesc) metaDesc.setAttribute('content', `${meta.title} - Watch all episodes of ${meta.title} in Urdu on SmTv Urdu.`);
    }catch(e){}

    // premium promo
    const premiumMsg = `
      <div class="premium-channel-message">
        <strong>Go Ad-Free!</strong> Get direct access to all episodes by joining our <strong>Premium Channel</strong>.
        <div class="premium-btn-row">
          <a href="/premium.html" class="btn-primary" rel="noopener">Join Premium</a>
        </div>
      </div>
    `;

    // render header (centered) + tabs container + episodes wrapper
    detailsEl.innerHTML = `
      <section class="pro-series-header-pro">
        <a href="series.html" class="pro-series-back-btn-pro" title="Back" aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polyline points="12 4 6 10 12 16" fill="none" stroke="#00d0f0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>
        </a>

        <img class="pro-series-poster-pro" src="${meta.poster || ''}" alt="${escapeHtml(meta.title || '')}">
        <div class="pro-series-meta-pro">
          <h2 class="pro-series-title-pro">${escapeHtml(meta.title || '')}</h2>
          <div class="pro-series-desc-pro">${escapeHtml((meta.desc && meta.desc.en) ? meta.desc.en : (meta.desc || ''))}</div>
          ${premiumMsg}
        </div>
      </section>

      <nav class="pro-seasons-tabs-pro" id="pro-seasons-tabs"></nav>
      <section class="pro-episodes-row-wrap-pro" id="pro-episodes-row-wrap"></section>
    `;

    // compute seasons
    let seasons = [];
    if (typeof meta.seasons === 'number') {
      for (let i=1;i<=meta.seasons;i++) seasons.push(String(i));
    } else if (Array.isArray(meta.seasons)) {
      seasons = meta.seasons.map(String);
    } else {
      seasons = ['1'];
    }

    const tabsEl = document.getElementById('pro-seasons-tabs');
    if (!tabsEl) return;
    tabsEl.innerHTML = seasons.map(s => `<button data-season="${s}" class="pro-season-tab-pro${s===seasonQuery? ' active':''}">Season ${s}</button>`).join('');

    // attach click handlers to tabs
    tabsEl.querySelectorAll('.pro-season-tab-pro').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        tabsEl.querySelectorAll('.pro-season-tab-pro').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        renderSeason(btn.dataset.season);
      });
    });

    // render the initial season
    renderSeason(seasonQuery);

    // renderSeason function: fetch episodes JSON and render horizontal cards + tutorial videos
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
        const r = await fetch(url, { cache: 'no-cache' });
        if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
        const episodes = await r.json();

        if (!Array.isArray(episodes) || episodes.length === 0) {
          wrap.innerHTML = `<div style="color:#fff;padding:28px 0 0 0;">No episodes for this season.</div>`;
          return;
        }

        const epHtml = `<div class="pro-episodes-row-pro">` + episodes.map(ep=>{
          const episodeUrl = ep.shortlink ? ep.shortlink : `episode.html?series=${encodeURIComponent(slug)}&season=${encodeURIComponent(season)}&ep=${encodeURIComponent(ep.ep)}${lang ? '&lang=' + encodeURIComponent(lang) : ''}`;
          const extra = ep.shortlink ? 'target="_blank" rel="noopener"' : '';
          const thumb = ep.thumb || 'default-thumb.jpg';
          const epTitle = escapeHtml(ep.title || ('Episode ' + ep.ep));
          return `
            <a class="pro-episode-card-pro" href="${episodeUrl}" ${extra}>
              <div class="pro-ep-thumb-wrap-pro">
                <img src="${thumb}" class="pro-ep-thumb-pro" alt="${escapeHtml('Ep ' + ep.ep)}">
                <span class="pro-ep-num-pro">Ep ${escapeHtml(String(ep.ep))}</span>
              </div>
              <div class="pro-ep-title-pro">${epTitle}</div>
            </a>
          `;
        }).join('') + `</div>`;

        const tutorialSections = `
          <section class="pro-highlight-section">
            <div class="pro-highlight-title" style="color:#fff;font-weight:700;margin-top:18px;">How to Watch Episodes</div>
          </section>
          <section class="pro-video-card"><div class="pro-video-frame-wrap">${HOWTO_PROCESS_1}</div></section>
          <section class="pro-highlight-section">
            <div class="pro-highlight-title" style="color:#fff;font-weight:700;margin-top:18px;">How to Watch (Old Process)</div>
          </section>
          <section class="pro-video-card"><div class="pro-video-frame-wrap">${HOWTO_PROCESS_2}</div></section>
        `;

        wrap.innerHTML = epHtml + tutorialSections;
      } catch (err) {
        console.error('Failed to load episodes JSON', err);
        wrap.innerHTML = `<div style="color:#fff;padding:28px 0 0 0;">No episodes for this season.</div>`;
        toast('Missing file: ' + (err && err.message ? err.message : String(err)));
      }
    }

  })(); // end renderDetails

  // escape HTML utility
  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
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

})();
