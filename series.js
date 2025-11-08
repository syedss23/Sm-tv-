// series.js — ready to replace (fixed + horizontal episode cards + diagnostics)
(function () {
  'use strict';

  const qs = new URLSearchParams(location.search);
  const slug = (qs.get('series') || '').trim();
  const lang = (qs.get('lang') || '').toLowerCase();
  const seasonQuery = qs.get('season') || '1';

  // HOW-TO embeds (keep as strings)
  const HOWTO_PROCESS_1 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg466/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;
  const HOWTO_PROCESS_2 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg45g/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;

  function jsonFor(season) {
    // try language-specific first, then generic
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
    } catch (e) { console.warn('toast error', e); }
  }

  // inject small styles that ensure horizontal layout + premium look
  const injectedStyles = `
    .premium-channel-message{ margin-top:12px; padding:14px; background:linear-gradient(135deg,#0b1520 80%, #143f52 100%); border-radius:12px; border:1px solid rgba(35,198,237,0.12); color:#23c6ed; font-weight:700; }
    .premium-btn-row{ margin-top:10px; }
    .btn-primary{ background:#ffd400; color:#112; padding:8px 14px; border-radius:999px; text-decoration:none; font-weight:800; display:inline-block; }
    .pro-series-header-pro{ display:flex; flex-direction:column; align-items:center; text-align:center; gap:12px; padding:18px; border-radius:12px; background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.06)); box-shadow: 0 8px 22px rgba(0,0,0,0.45); position:relative; }
    .pro-series-back-btn-pro{ position:absolute; left:14px; top:14px; width:48px; height:48px; display:inline-flex; align-items:center; justify-content:center; border-radius:12px; background: rgba(0,150,200,0.08); border:2px solid rgba(0,160,210,0.14); text-decoration:none; }
    .pro-series-poster-pro{ width:180px; height:100px; border-radius:10px; object-fit:cover; box-shadow:0 8px 18px rgba(0,0,0,0.45); }
    .pro-series-title-pro{ color:#00d0f0; font-size:20px; margin:8px 0; font-weight:800; }
    .pro-series-desc-pro{ color:#cfd8df; line-height:1.45; max-width:820px; }

    /* HORIZONTAL episodes row */
    .pro-episodes-row-pro{ display:flex; gap:12px; overflow-x:auto; padding:12px 6px; -webkit-overflow-scrolling:touch; scroll-snap-type:x mandatory; }
    .pro-episode-card-pro{ scroll-snap-align:center; flex:0 0 320px; display:flex; gap:12px; align-items:center; padding:12px; border-radius:12px; text-decoration:none; color:#fff; box-shadow:0 8px 20px rgba(0,0,0,0.45); background:linear-gradient(180deg, rgba(255,255,255,0.01), rgba(0,0,0,0.06)); min-height:96px; }
    .pro-ep-thumb-wrap-pro{ flex:0 0 160px; width:160px; height:90px; position:relative; border-radius:8px; overflow:hidden; background:#111; }
    .pro-ep-thumb-pro{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; }
    .pro-ep-num-pro{ position:absolute; right:8px; top:8px; background:linear-gradient(90deg,#ffcf33,#ff7a5f); color:#111; font-weight:800; padding:6px 10px; border-radius:999px; }
    .pro-ep-title-pro{ flex:1; font-size:16px; font-weight:800; line-height:1.15; color:#fff; }
    @media(min-width:700px){ .pro-episode-card-pro{ flex:0 0 380px; } .pro-ep-thumb-wrap-pro{ width:200px;height:110px; } .pro-series-poster-pro{ width:220px;height:120px;} }
  `;
  try {
    const sty = document.createElement('style');
    sty.textContent = injectedStyles;
    document.head.appendChild(sty);
  } catch (e) { /* ignore */ }

  function escapeHtml(s) {
    if (!s && s !== 0) return '';
    return String(s).replace(/[&<>"'`=\/]/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;' }[c];
    });
  }

  // Try candidate paths in order and return parsed JSON or diagnostics
  async function fetchEpisodesWithCandidates(season) {
    const baseCandidates = [
      `episode-data/${slug}-s${season}.json`,
      `episode-data/${slug}-s${season}-${lang}.json`,
      `episode-data/${slug}-s${season}-en.json`,
      `episode-data/${slug}-s${season}-hi.json`,
      `episode-data/${slug}-s${season}-ur.json`,
      `episode-data/${slug}-s${season}-.json`,
      `episode-data/${slug}-s${season}-${lang}-.json`
    ].filter(Boolean);

    const tried = [];

    for (const cand of baseCandidates) {
      try {
        const url = bust(cand.startsWith('/') ? cand : '/' + cand.replace(/^\/+/, ''));
        const resp = await fetch(url, { cache: 'no-cache' });
        const record = { path: cand, ok: resp.ok, status: resp.status, err: null };
        tried.push(record);

        const text = await resp.text();
        // attempt to parse
        try {
          const j = JSON.parse(text);
          return { episodes: j, tried };
        } catch (parseErr) {
          record.err = 'json-parse:SyntaxError: ' + (parseErr.message || parseErr);
          // continue to next candidate
          continue;
        }
      } catch (fetchErr) {
        tried.push({ path: cand, ok: false, status: null, err: String(fetchErr) });
        continue;
      }
    }

    // nothing succeeded
    throw { tried };
  }

  // main
  (async function init() {
    try {
      // wait for load so footer and other scripts don't race
      if (document.readyState !== 'complete') {
        await new Promise(r => window.addEventListener('load', r, { once: true }));
      }
      // small delay
      await new Promise(r => setTimeout(r, 20));

      const detailsEl = document.getElementById('series-details');
      if (!detailsEl) {
        console.warn('series.js: #series-details not found');
        return;
      }

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

      document.title = `${meta.title} – SmTv Urdu`;

      const premiumMsg = `
        <div class="premium-channel-message">
          <strong>Go Ad-Free!</strong> Get direct access to all episodes by joining our <strong>Premium Channel</strong>.
          <div class="premium-btn-row"><a href="/premium.html" class="btn-primary" rel="noopener">Join Premium</a></div>
        </div>
      `;

      // render header
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

        <nav class="pro-seasons-tabs-pro" id="pro-seasons-tabs"></nav>
        <section class="pro-episodes-row-wrap-pro" id="pro-episodes-row-wrap"></section>
      `;

      // build seasons list
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
          const { episodes, tried } = await (async () => {
            try {
              const result = await fetchEpisodesWithCandidates(season);
              return { episodes: result.episodes, tried: result.tried || [] };
            } catch (err) {
              // If fetchEpisodesWithCandidates throws object with tried -> surface it
              if (err && err.tried) throw err;
              throw err;
            }
          })();

          if (!Array.isArray(episodes) || episodes.length === 0) {
            wrap.innerHTML = `<div style="color:#fff;padding:28px 0 0 0;">No episodes for this season.</div>`;
            return;
          }

          // render horizontal cards
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

          const tutorial = `
            <section style="margin-top:18px;">
              <div style="color:#fff;font-weight:800;margin:8px 0;">How to Watch Episodes</div>
              <div class="pro-video-frame-wrap">${HOWTO_PROCESS_1}</div>
              <div style="color:#fff;font-weight:800;margin:18px 0 8px 0;">How to Watch (Old Process)</div>
              <div class="pro-video-frame-wrap">${HOWTO_PROCESS_2}</div>
            </section>
          `;

          wrap.innerHTML = `<div class="pro-episodes-row-pro">${cardsHtml}</div>` + tutorial;

          // ensure first card visible
          try {
            const first = wrap.querySelector('.pro-episode-card-pro');
            if (first) first.scrollIntoView({ behavior: 'auto', inline: 'start', block: 'nearest' });
          } catch (e) {}

        } catch (diag) {
          // If diag contains 'tried' array, show helpful diagnostic block (useful for mobile debugging)
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

  // helper that tries candidate paths and returns { episodes, tried } or throws { tried }
  async function fetchEpisodesWithCandidates(season) {
    const candidates = [
      `episode-data/${slug}-s${season}.json`,
      `episode-data/${slug}-s${season}-${lang}.json`,
      `episode-data/${slug}-s${season}-en.json`,
      `episode-data/${slug}-s${season}-hi.json`,
      `episode-data/${slug}-s${season}-ur.json`,
      `episode-data/${slug}-s${season}-.json`,
      `episode-data/${slug}-s${season}-${lang}-.json`
    ].filter(Boolean);

    const tried = [];

    for (const cand of candidates) {
      try {
        const url = bust(cand.startsWith('/') ? cand : '/' + cand.replace(/^\/+/, ''));
        const resp = await fetch(url, { cache: 'no-cache' });
        const rec = { path: cand, ok: resp.ok, status: resp.status, err: null };
        tried.push(rec);

        const text = await resp.text();
        try {
          const parsed = JSON.parse(text);
          return { episodes: parsed, tried };
        } catch (parseErr) {
          rec.err = 'json-parse:SyntaxError: ' + (parseErr.message || parseErr);
          continue;
        }
      } catch (fetchErr) {
        tried.push({ path: cand, ok: false, status: null, err: String(fetchErr) });
        continue;
      }
    }

    throw { tried };
  }

})();
