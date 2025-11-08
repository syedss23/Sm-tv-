// series.js — updated: scroll-to-top on open, smooth scroll on season change, debounced loads
(function () {
  'use strict';

  const qs = new URLSearchParams(location.search);
  const slug = (qs.get('series') || '').trim();
  const lang = (qs.get('lang') || '').toLowerCase();
  const initialSeason = qs.get('season') || '1';

  // your how-to embeds (keep exact)
  const HOWTO_PROCESS_1 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg466/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;
  const HOWTO_PROCESS_2 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg45g/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;

  function jsonFor(season) {
    if (!slug) return null;
    if (lang === 'dub') return `episode-data/${slug}-s${season}.json`;
    if (lang && ['en', 'hi', 'ur'].includes(lang)) return `episode-data/${slug}-s${season}-${lang}.json`;
    return `episode-data/${slug}-s${season}.json`;
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
    } catch (e) { /* silent */ }
  }

  // small helper to safely scroll to top of series-details / main-content
  function scrollToTopOfSeries(behavior = 'auto') {
    try {
      // prefer scrolling the page to the top of main-content area
      const main = document.getElementById('main-content') || document.documentElement;
      const rect = main.getBoundingClientRect();
      const absoluteTop = window.pageYOffset + rect.top;
      window.scrollTo({ top: Math.max(0, absoluteTop - 6), behavior });
    } catch (e) {
      try { window.scrollTo({ top: 0, behavior }); } catch (err) {}
    }
  }

  // helper to scroll episodes area into view (minimizes jump)
  function scrollToEpisodes(behavior = 'smooth') {
    try {
      const wrap = document.getElementById('pro-episodes-row-wrap') || document.getElementById('series-details');
      if (!wrap) return scrollToTopOfSeries(behavior);
      // compute Y coordinate a little above the episodes area so header remains visible
      const rect = wrap.getBoundingClientRect();
      const top = window.pageYOffset + rect.top - 12;
      window.scrollTo({ top: Math.max(0, top), behavior });
    } catch (e) {
      scrollToTopOfSeries(behavior);
    }
  }

  // debounce guard for season loads
  let seasonLoadToken = 0;

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

      // small minor fix: remove accidental top whitespace (if any inline <hr> or similar)
      // (this is defensive; actual layout should not require it)
      document.body.style.marginTop = document.body.style.marginTop || '';

      // load series metadata
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

      // Render header + basic layout synchronously
      detailsEl.innerHTML = `
        <section class="pro-series-header-pro" id="pro-series-header">
          <a href="/index.html" class="pro-series-back-btn-pro" title="Back" aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><polyline points="12 4 6 10 12 16" fill="none" stroke="#23c6ed" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>
          </a>
          <img class="pro-series-poster-pro" src="${escapeHtml(meta.poster || '')}" alt="${escapeHtml(meta.title || '')}">
          <div class="pro-series-meta-pro">
            <h2 class="pro-series-title-pro">${escapeHtml(meta.title || '')}</h2>
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

        <section class="pro-episodes-row-wrap-pro" id="pro-episodes-row-wrap" style="margin-top:14px;"></section>
      `;

      // after header rendered, ensure user sees top of page (removes annoying mid-page open)
      // use setTimeout 0 to allow layout paint then scroll
      setTimeout(() => scrollToTopOfSeries('auto'), 0);

      // build seasons
      let seasons = [];
      if (typeof meta.seasons === 'number') {
        for (let i = 1; i <= meta.seasons; i++) seasons.push(String(i));
      } else if (Array.isArray(meta.seasons)) {
        seasons = meta.seasons.map(s => String(s));
      } else seasons = ['1'];

      const tabsEl = document.getElementById('pro-seasons-tabs');
      tabsEl.innerHTML = seasons.map(s => `<button data-season="${s}" class="pro-season-tab-pro${s === initialSeason ? ' active' : ''}">Season ${s}</button>`).join('');
      tabsEl.querySelectorAll('.pro-season-tab-pro').forEach(btn => {
        btn.addEventListener('click', () => {
          // quick UI active toggle
          tabsEl.querySelectorAll('.pro-season-tab-pro').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          // load with debounce token to avoid multiple parallel loads
          loadSeasonDebounced(btn.dataset.season);
        });
      });

      // initial load (use initialSeason)
      loadSeasonDebounced(initialSeason, true);

      // Debounced loader — ensures only the most recent request runs
      function loadSeasonDebounced(season, immediate = false) {
        const token = ++seasonLoadToken;
        // if immediate, load straight away; otherwise small debounce to avoid flicker on rapid clicks
        const delay = immediate ? 0 : 140;
        setTimeout(() => {
          if (token !== seasonLoadToken) return; // stale
          loadSeason(season).catch(err => {
            console.error('loadSeason error', err);
          });
        }, delay);
      }

      // Core: load episodes for a season, render, and scroll nicely
      async function loadSeason(season) {
        const wrap = document.getElementById('pro-episodes-row-wrap');
        if (!wrap) return;
        // show a compact loader (keeps header visible)
        wrap.innerHTML = `<div style="color:#ddd;padding:12px 8px 24px 8px;">Loading episodes...</div>`;

        // small timeout to allow the "loading" paint before heavy fetch
        await new Promise(r => setTimeout(r, 40));

        // build candidate paths and try one by one (robust)
        const candidates = [
          `episode-data/${slug}-s${season}.json`,
          `episode-data/${slug}-s${season}-${lang}.json`,
          `episode-data/${slug}-s${season}-en.json`,
          `episode-data/${slug}-s${season}-hi.json`,
          `episode-data/${slug}-s${season}-ur.json`
        ].filter(Boolean);

        let episodes = null;
        let lastErr = null;
        for (const cand of candidates) {
          try {
            const url = cand.startsWith('/') ? cand : '/' + cand.replace(/^\/+/, '');
            const resp = await fetch(bust(url), { cache: 'no-cache' });
            if (!resp.ok) {
              lastErr = new Error('HTTP ' + resp.status + ' for ' + url);
              continue;
            }
            const txt = await resp.text();
            // try parse
            try {
              const parsed = JSON.parse(txt);
              if (Array.isArray(parsed) && parsed.length) {
                episodes = parsed;
                break;
              } else {
                // if parsed but empty array, treat as empty episodes
                episodes = Array.isArray(parsed) ? parsed : null;
                // keep trying others if present
              }
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
              <div style="font-size:13px;color:#cfe6ff">Try another season or contact support.</div>
            </div>
          `;
          if (lastErr) toast('Episodes JSON missing or invalid for this season');
          return;
        }

        // Build compact cards html
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

        // tutorial blocks (keeps consistent UI)
        const tutorialBlock = `
          <div style="height:8px"></div>
          <div class="pro-tutorial-title">How to Watch Episodes</div>
          <div class="pro-video-frame-wrap">${HOWTO_PROCESS_1}</div>

          <div style="height:12px"></div>

          <div class="pro-tutorial-title">How to Watch (Old Process)</div>
          <div class="pro-video-frame-wrap">${HOWTO_PROCESS_2}</div>
        `;

        wrap.innerHTML = `<div class="pro-episodes-row-pro">${cardsHtml}</div>` + tutorialBlock;

        // ensure the first card is visible and then smoothly scroll viewport to episodes top
        try {
          const scroller = wrap.querySelector('.pro-episodes-row-pro');
          if (scroller) {
            // make sure the scroller is scrolled to start
            scroller.scrollLeft = 0;
          }
        } catch (e) {}

        // small timeout to allow layout and images to settle, then scroll viewport to episodes
        setTimeout(() => scrollToEpisodes('smooth'), 80);
      }

      // small HTML esc helper
      function escapeHtml(s) {
        if (!s && s !== 0) return '';
        return String(s).replace(/[&<>"'`=\/]/g, function (c) {
          return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;' }[c];
        });
      }

    } catch (err) {
      console.error('series.js fatal', err);
      const el = document.getElementById('series-details');
      if (el) el.innerHTML = `<div style="color:#fff;padding:30px;">Could not load series info. Try again later.</div>`;
    }
  })();

})();
