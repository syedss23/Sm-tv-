// series.js — Replace-ready. Prevents auto-scroll-to-middle and smooths season switching.
(function () {
  'use strict';

  const qs = new URLSearchParams(location.search);
  const slug = (qs.get('series') || '').trim();
  const lang = (qs.get('lang') || '').toLowerCase();
  const initialSeason = qs.get('season') || '1';

  const HOWTO_PROCESS_1 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg466/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;
  const HOWTO_PROCESS_2 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg45g/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;

  // Prevent browser from auto-restoring scroll position on navigation
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}

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
    } catch (e) {}
  }

  function escapeHtml(s) {
    if (!s && s !== 0) return '';
    return String(s).replace(/[&<>"'`=\/]/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;' }[c];
    });
  }

  // Ensure there's no URL hash (prevents anchor jump)
  try {
    if (location.hash) {
      history.replaceState(history.state, document.title, location.pathname + location.search);
    }
  } catch (e) {}

  // Force document focus and remove any focused control (prevents focus-based scroll)
  function clearFocus() {
    try {
      if (document.activeElement && document.activeElement !== document.body) {
        try { document.activeElement.blur(); } catch (e) {}
      }
      try { document.body.focus && document.body.focus(); } catch (e) {}
    } catch (e) {}
  }

  // Force immediate top-of-page position relative to the main content
  function forceTop(behavior = 'auto') {
    try {
      const main = document.getElementById('main-content') || document.documentElement;
      const r = main.getBoundingClientRect();
      const y = Math.max(0, window.pageYOffset + r.top - 0);
      window.scrollTo({ top: y, behavior });
      // also set documentElement scrolls as fallback
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch (e) {
      try { window.scrollTo({ top: 0, behavior }); } catch (err) {}
    }
  }

  // Scroll the episodes container into view, but not so aggressively that it lands mid-card
  function scrollToEpisodesTop(behavior = 'smooth') {
    try {
      const wrap = document.getElementById('pro-episodes-row-wrap') || document.getElementById('series-details');
      if (!wrap) { forceTop(behavior); return; }
      const rect = wrap.getBoundingClientRect();
      const target = Math.max(0, window.pageYOffset + rect.top - 6);
      window.scrollTo({ top: target, behavior });
    } catch (e) { forceTop(behavior); }
  }

  // debounce helper for season loads
  let loadToken = 0;

  (async function init() {
    // wait for full load to avoid late browser scroll restoration
    if (document.readyState !== 'complete') {
      await new Promise(r => window.addEventListener('load', r, { once: true }));
    }

    // Clear any focus and ensure top before we render
    clearFocus();
    forceTop('auto');

    const detailsEl = document.getElementById('series-details');
    if (!detailsEl) {
      console.warn('series.js: #series-details not found');
      return;
    }

    // load series list
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

    // render header + placeholders synchronously (keeps top of page stable)
    detailsEl.innerHTML = `
      <section class="pro-series-header-pro" id="pro-series-header">
        <a href="/index.html" class="pro-series-back-btn-pro" title="Back" aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><polyline points="12 4 6 10 12 16" fill="none" stroke="#23c6ed" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>
        </a>
        <img class="pro-series-poster-pro" src="${escapeHtml(meta.poster||'')}" alt="${escapeHtml(meta.title||'')}">
        <div class="pro-series-meta-pro">
          <h2 class="pro-series-title-pro">${escapeHtml(meta.title||'')}</h2>
          <div class="pro-series-desc-pro">${escapeHtml((meta.desc && meta.desc.en) ? meta.desc.en : (meta.desc || ''))}</div>
          <div class="premium-channel-message">
            <strong>Go Ad-Free — Join Premium</strong>
            <div style="margin-top:8px;">Get direct access to all episodes and remove ads by joining our <strong>Premium Channel</strong>.</div>
            <a class="join-btn" href="/premium.html" style="display:inline-block;margin-top:12px;">Join Premium</a>
            <div style="margin-top:10px;font-size:0.95em;color:#bfe9f7;">Members get early uploads, higher quality and download links.</div>
          </div>
        </div>
      </section>

      <nav class="pro-seasons-tabs-pro" id="pro-seasons-tabs" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:12px;"></nav>

      <section id="pro-episodes-row-wrap" class="pro-episodes-row-wrap-pro" style="margin-top:14px;">
        <div style="color:#ddd;padding:12px 8px;">Loading episodes...</div>
      </section>
    `;

    // Immediately ensure we are at top and nothing is focused
    clearFocus();
    forceTop('auto');

    // compute seasons array
    let seasons = [];
    if (typeof meta.seasons === 'number') {
      for (let i = 1; i <= meta.seasons; i++) seasons.push(String(i));
    } else if (Array.isArray(meta.seasons)) {
      seasons = meta.seasons.map(s => String(s));
    } else seasons = ['1'];

    const tabsEl = document.getElementById('pro-seasons-tabs');
    tabsEl.innerHTML = seasons.map(s => `<button data-season="${s}" class="pro-season-tab-pro${s === initialSeason ? ' active' : ''}" type="button">Season ${s}</button>`).join('');

    // attach handlers (buttons blur after click to avoid focus-based scrolling)
    tabsEl.querySelectorAll('.pro-season-tab-pro').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        // remove active from others and add to this
        tabsEl.querySelectorAll('.pro-season-tab-pro').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // blur immediately so focus doesn't jump
        try { btn.blur(); } catch (e) {}
        // debounced load
        const token = ++loadToken;
        setTimeout(() => { if (token === loadToken) loadSeason(btn.dataset.season); }, 120);
      });
    });

    // initial load
    loadSeason(initialSeason);

    // loadSeason: fetch episodes, render cards + tutorial, ensure scroller resets and page stays at top
    async function loadSeason(season) {
      const wrap = document.getElementById('pro-episodes-row-wrap');
      if (!wrap) return;

      // show minimal loader (keeps header visible so page doesn't jump)
      wrap.innerHTML = `<div style="color:#ddd;padding:12px 8px;">Loading episodes...</div>`;
      clearFocus();
      forceTop('auto');

      // short delay so the "loading" paint happens (prevents huge layout changes)
      await new Promise(r => setTimeout(r, 40));

      // candidate files to try (robust)
      const candidates = [
        `episode-data/${slug}-s${season}.json`,
        `episode-data/${slug}-s${season}-${lang}.json`,
        `episode-data/${slug}-s${season}-en.json`,
        `episode-data/${slug}-s${season}-hi.json`,
        `episode-data/${slug}-s${season}-ur.json`
      ];

      let episodes = null;
      let lastErr = null;
      for (const cand of candidates) {
        try {
          const path = cand.startsWith('/') ? cand : '/' + cand.replace(/^\/+/, '');
          const resp = await fetch(bust(path), { cache: 'no-cache' });
          if (!resp.ok) { lastErr = new Error('HTTP ' + resp.status); continue; }
          const txt = await resp.text();
          try {
            const parsed = JSON.parse(txt);
            if (Array.isArray(parsed)) { episodes = parsed; break; }
          } catch (pe) {
            lastErr = pe;
            continue;
          }
        } catch (fe) {
          lastErr = fe;
          continue;
        }
      }

      if (!episodes || episodes.length === 0) {
        wrap.innerHTML = `
          <div style="background:#0e1720;color:#ffd;padding:14px;border-radius:12px;">
            <div style="font-weight:800;color:#ffd700;margin-bottom:8px;">Episodes not found for this season</div>
            <div style="font-size:13px;color:#cfe6ff">Tried multiple JSON paths — check your episode-data files.</div>
          </div>
        `;
        if (lastErr) toast('Episodes JSON missing or invalid for this season');
        return;
      }

      // Build cards HTML (compact square cards)
      const cardsHtml = episodes.map(ep => {
        const epNum = escapeHtml(String(ep.ep || ''));
        const epTitle = escapeHtml(ep.title || ('Episode ' + epNum));
        const thumb = escapeHtml(ep.thumb || 'default-thumb.jpg');
        const episodeUrl = ep.shortlink ? ep.shortlink : `episode.html?series=${encodeURIComponent(slug)}&season=${encodeURIComponent(season)}&ep=${encodeURIComponent(ep.ep)}${lang?('&lang='+encodeURIComponent(lang)) : ''}`;
        const extra = ep.shortlink ? 'target="_blank" rel="noopener"' : '';
        return `
          <a class="pro-episode-card-pro" href="${episodeUrl}" ${extra} aria-label="${epTitle}">
            <div class="pro-ep-thumb-wrap-pro">
              <img class="pro-ep-thumb-pro" src="${thumb}" alt="${epTitle}" loading="lazy">
              <span class="pro-ep-num-pro">Ep ${epNum}</span>
            </div>
            <div class="pro-ep-title-pro">${epTitle}</div>
          </a>
        `;
      }).join('');

      const tutorialBlock = `
        <div style="height:8px"></div>
        <div class="pro-tutorial-title">How to Watch Episodes</div>
        <div class="pro-video-frame-wrap">${HOWTO_PROCESS_1}</div>
        <div style="height:12px"></div>
        <div class="pro-tutorial-title">How to Watch (Old Process)</div>
        <div class="pro-video-frame-wrap">${HOWTO_PROCESS_2}</div>
      `;

      wrap.innerHTML = `<div class="pro-episodes-row-pro">${cardsHtml}</div>` + tutorialBlock;

      // Reset horizontal scroller to start (prevents a scroller saved position showing middle cards)
      try {
        const scroller = wrap.querySelector('.pro-episodes-row-pro');
        if (scroller) scroller.scrollLeft = 0;
      } catch (e) {}

      // clear focus then force top-of-series again and finally scroll episodes top smoothly after images settle
      clearFocus();
      forceTop('auto');
      // after a short delay (let images paint), scroll the viewport to episodes block (smooth)
      setTimeout(() => {
        scrollToEpisodesTop('smooth');
      }, 120);

      // ensure cards are not focusable automatically (prevent browser focusing them on load)
      try {
        wrap.querySelectorAll('.pro-episode-card-pro').forEach(a => {
          try { a.setAttribute('tabindex', '-1'); } catch(e){}
        });
      } catch (e) {}
    } // end loadSeason

  })(); // end init

})();
