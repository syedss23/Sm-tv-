// series.js — ready-to-replace: compact square cards, robust JSON lookup, highlighted tutorial titles
(function () {
  'use strict';

  const qs = new URLSearchParams(location.search);
  const slug = (qs.get('series') || '').trim();
  const lang = (qs.get('lang') || '').toLowerCase();
  const seasonQuery = qs.get('season') || '1';

  const HOWTO_PROCESS_1 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg466/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;
  const HOWTO_PROCESS_2 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg45g/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;

  function escapeHtml(s) {
    if (s === undefined || s === null) return '';
    return String(s).replace(/[&<>"'`=\/]/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;' }[c];
    });
  }

  function bust(url) {
    const v = (qs.get('v') || '1');
    const sep = url.includes('?') ? '&' : '?';
    return url + sep + 'v=' + encodeURIComponent(v);
  }

  function toast(msg) {
    try {
      const t = document.createElement('div');
      t.textContent = msg;
      t.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);background:#122231;color:#9fe6ff;padding:10px 14px;border-radius:9px;border:1px solid #2d4b6a;font-weight:700;z-index:99999;font-family:Montserrat,sans-serif;';
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 2600);
    } catch (e) { console.warn(e); }
  }

  // inject small helper styles if the page hasn't (keeps premium message consistent)
  (function injectHelperStyles() {
    const css = `
      .pro-tutorial-title { margin-top:18px; font-weight:900; font-size:20px; color:#fff; border-left:8px solid #ffd400; padding:10px 14px; border-radius:10px; background:linear-gradient(90deg, rgba(34,193,195,0.04), rgba(253,187,45,0.02)); box-shadow:0 8px 18px rgba(0,0,0,0.35); }
    `;
    try {
      const s = document.createElement('style');
      s.textContent = css;
      document.head.appendChild(s);
    } catch (e) {}
  })();

  // Attempt multiple possible episode JSON filenames — returns { episodes, tried }
  async function fetchEpisodesWithCandidates(season) {
    if (!slug) throw new Error('Missing series slug');

    const candidates = [
      `episode-data/${slug}-s${season}.json`,
      `episode-data/${slug}-s${season}-${lang}.json`,
      `episode-data/${slug}-s${season}-en.json`,
      `episode-data/${slug}-s${season}-hi.json`,
      `episode-data/${slug}-s${season}-ur.json`,
      `episode-data/${slug}-s${season}-sub.json`,
      `episode-data/${slug}-s${season}-en-sub.json`
    ].filter(Boolean);

    const tried = [];

    for (const cand of candidates) {
      try {
        // normalize to absolute-ish path (avoid double slashes)
        const path = cand.startsWith('/') ? cand : '/' + cand.replace(/^\/+/, '');
        const url = bust(path);
        const resp = await fetch(url, { cache: 'no-cache' });
        const rec = { path: cand, ok: resp.ok, status: resp.status, err: null };

        // read as text first (some endpoints return HTML with 200)
        const text = await resp.text();
        try {
          const parsed = JSON.parse(text);
          return { episodes: parsed, tried: [...tried, rec] };
        } catch (pe) {
          rec.err = 'json-parse:' + (pe && pe.message ? pe.message : String(pe));
          tried.push(rec);
          continue;
        }
      } catch (fe) {
        tried.push({ path: cand, ok: false, status: null, err: String(fe) });
        continue;
      }
    }

    throw { tried };
  }

  (async function init() {
    try {
      // ensure DOM loaded
      if (document.readyState !== 'complete') {
        await new Promise(r => window.addEventListener('load', r, { once: true }));
      }

      const detailsEl = document.getElementById('series-details');
      if (!detailsEl) return console.warn('#series-details not found');

      // load series.json (list)
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

      // prettier premium message (matches the HTML CSS in series.html)
      const premiumMsg = `
        <div class="premium-channel-message" role="region" aria-label="Premium channel promo">
          <div style="font-weight:800;font-size:1.05rem;color:#c6f5ff;">Go Ad-Free! Get direct access to all episodes by joining our <strong style="color:#ffd700">Premium Channel</strong>.</div>
          <div style="margin-top:10px;">
            <a href="/premium.html" class="join-btn" rel="noopener">Join Premium</a>
          </div>
        </div>
      `;

      // basic header + seasons placeholder + episodes wrapper
      detailsEl.innerHTML = `
        <section class="pro-series-header-pro" aria-labelledby="series-title">
          <a href="/index.html" class="pro-series-back-btn-pro" title="Back" aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><polyline points="12 4 6 10 12 16" fill="none" stroke="#23c6ed" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>
          </a>
          <img class="pro-series-poster-pro" src="${escapeHtml(meta.poster || '')}" alt="${escapeHtml(meta.title || '')}">
          <div class="pro-series-meta-pro">
            <h2 id="series-title" class="pro-series-title-pro">${escapeHtml(meta.title || '')}</h2>
            <div class="pro-series-desc-pro">${escapeHtml((meta.desc && meta.desc.en) ? meta.desc.en : (meta.desc || ''))}</div>
            ${premiumMsg}
          </div>
        </section>

        <nav class="pro-seasons-tabs-pro" id="pro-seasons-tabs" aria-label="Seasons"></nav>

        <section class="pro-episodes-row-wrap-pro" id="pro-episodes-row-wrap" aria-live="polite"></section>
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
        wrap.innerHTML = `<div style="color:#ddd;padding:12px 0;">Loading episodes…</div>`;

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

          // Build cards html: compact square-style
          const cardsHtml = episodes.map(ep => {
            const epNum = escapeHtml(String(ep.ep || ''));
            const epTitle = escapeHtml(ep.title || ('Episode ' + epNum));
            const thumb = escapeHtml(ep.thumb || 'default-thumb.jpg');
            const episodeUrl = ep.shortlink ? ep.shortlink : `episode.html?series=${encodeURIComponent(slug)}&season=${encodeURIComponent(season)}&ep=${encodeURIComponent(ep.ep)}${lang ? ('&lang=' + encodeURIComponent(lang)) : ''}`;
            const extra = ep.shortlink ? 'target="_blank" rel="noopener"' : '';
            return `
              <a class="pro-episode-card-pro" href="${episodeUrl}" ${extra} aria-label="${epTitle}">
                <div class="pro-ep-thumb-wrap-pro" aria-hidden="true">
                  <img class="pro-ep-thumb-pro" src="${thumb}" alt="${epTitle}">
                  <span class="pro-ep-num-pro">Ep ${epNum}</span>
                </div>
                <div class="pro-ep-title-pro">${epTitle}</div>
              </a>
            `;
          }).join('');

          // tutorial block: both headings highlighted the same way
          const tutorialBlock = `
            <div class="pro-tutorial-title" role="heading" aria-level="2">How to Watch Episodes</div>
            <div class="pro-video-frame-wrap">${HOWTO_PROCESS_1}</div>

            <div style="height:14px"></div>

            <div class="pro-tutorial-title" role="heading" aria-level="2" style="border-left-color:#ffd400;">How to Watch (Old Process)</div>
            <div class="pro-video-frame-wrap">${HOWTO_PROCESS_2}</div>
          `;

          wrap.innerHTML = `<div class="pro-episodes-row-pro">${cardsHtml}</div>` + tutorialBlock;

          // visible focus: scroll first card into view start
          try {
            const first = wrap.querySelector('.pro-episode-card-pro');
            if (first) first.scrollIntoView({ behavior: 'auto', inline: 'start', block: 'nearest' });
          } catch (e) {}

        } catch (diag) {
          console.error('Episode load diagnostics', diag);
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
        }
      }

    } catch (err) {
      console.error('series.js fatal', err);
      const el = document.getElementById('series-details');
      if (el) el.innerHTML = `<div style="color:#fff;padding:30px;">Could not load series info. Try again later.</div>`;
    }
  })();

})();
