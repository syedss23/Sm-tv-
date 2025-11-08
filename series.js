// series.js — stronger style enforcement + compact square cards
(function () {
  'use strict';

  const qs = new URLSearchParams(location.search);
  const slug = (qs.get('series') || '').trim();
  const lang = (qs.get('lang') || '').toLowerCase();
  const seasonQuery = qs.get('season') || '1';

  const HOWTO_PROCESS_1 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg466/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;
  const HOWTO_PROCESS_2 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg45g/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;

  function bust(url) {
    const v = (qs.get('v') || Date.now());
    return url + (url.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(v);
  }

  function escapeHtml(s) {
    if (!s && s !== 0) return '';
    return String(s).replace(/[&<>"'`=\/]/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;' }[c];
    });
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

  // Inject a strong stylesheet at document end (very specific; uses #series-details scope)
  const STRONG_CSS = `
  /* Injected strong overrides for series page (won't affect other pages) */
  #series-details .pro-episodes-row-pro {
    display:flex !important;
    gap:12px !important;
    overflow-x:auto !important;
    padding:12px 10px !important;
    -webkit-overflow-scrolling:touch !important;
    scroll-snap-type:x proximity !important;
    align-items:flex-start !important;
    margin-bottom:10px !important;
    box-sizing:border-box !important;
  }
  #series-details .pro-episode-card-pro {
    scroll-snap-align:center !important;
    flex:0 0 150px !important; /* compact width */
    display:flex !important;
    flex-direction:column !important;
    gap:8px !important;
    align-items:center !important;
    padding:10px !important;
    border-radius:12px !important;
    text-decoration:none !important;
    color:#fff !important;
    box-shadow:0 8px 18px rgba(0,0,0,0.38) !important;
    background:linear-gradient(180deg, rgba(255,255,255,0.01), rgba(0,0,0,0.03)) !important;
    min-height:0 !important;
    transition:transform .12s ease !important;
    box-sizing:border-box !important;
  }
  @media(min-width:900px){
    #series-details .pro-episode-card-pro { flex:0 0 180px !important; }
  }
  #series-details .pro-ep-thumb-wrap-pro {
    width:100% !important;
    height:112px !important;
    border-radius:10px !important;
    overflow:hidden !important;
    position:relative !important;
    background:#0c0f12 !important;
    box-sizing:border-box !important;
  }
  #series-details .pro-ep-thumb-pro {
    position:absolute !important;
    inset:0 !important;
    width:100% !important;
    height:100% !important;
    object-fit:cover !important;
    display:block !important;
  }
  #series-details .pro-ep-num-pro {
    position:absolute !important;
    right:6px !important;
    top:6px !important;
    background:linear-gradient(90deg,#ffcf33,#ff7a5f) !important;
    color:#111 !important;
    font-weight:800 !important;
    padding:5px 8px !important;
    border-radius:999px !important;
    font-size:11px !important;
    box-shadow: 0 6px 14px rgba(255,120,60,0.12) !important;
  }
  #series-details .pro-ep-title-pro {
    width:100% !important;
    text-align:center !important;
    font-size:13px !important;
    font-weight:800 !important;
    color:#fff !important;
    padding:6px 6px !important;
    border-radius:6px !important;
    background:transparent !important;
    line-height:1.05 !important;
    height:40px !important;
    overflow:hidden !important;
    box-sizing:border-box !important;
  }
  #series-details .pro-tutorial-title {
    margin-top:18px !important;
    font-weight:900 !important;
    font-size:20px !important;
    color:#fff !important;
    background: linear-gradient(90deg, rgba(34,193,195,0.04), rgba(253,187,45,0.02)) !important;
    border-left:6px solid #ffd400 !important;
    padding:10px 14px !important;
    border-radius:10px !important;
    box-shadow: 0 8px 18px rgba(0,0,0,0.35) !important;
    max-width:1100px !important;
    box-sizing:border-box !important;
  }
  #series-details .pro-video-frame-wrap { margin-top:12px !important; border-radius:10px !important; overflow:hidden !important; }
  `;

  try {
    const s = document.createElement('style');
    s.id = 'smtv-series-strong-css';
    s.textContent = STRONG_CSS;
    document.head.appendChild(s);
  } catch (e) {
    console.warn('could not inject strong css', e);
  }

  // Candidate paths used originally — keep to preserve functionality diagnosing invalid JSON
  async function fetchEpisodesWithCandidates(season) {
    const base = `episode-data/${slug}-s${season}`;
    const candidates = [
      `${base}.json`,
      `${base}-${lang}.json`,
      `${base}-en.json`,
      `${base}-hi.json`,
      `${base}-ur.json`,
      `${base}-.json`,
      `${base}-sub.json`,
      `${base}-en-sub.json`,
      `${base}-en-sub-s1.json`,
      `${base}-sub-s1.json`
    ].filter(Boolean);

    const tried = [];
    for (const cand of candidates) {
      try {
        const path = cand.startsWith('/') ? cand : '/' + cand.replace(/^\/+/, '');
        const url = bust(path);
        const resp = await fetch(url, { cache: 'no-cache' });
        const rec = { path: cand, ok: resp.ok, status: resp.status, err: null };
        const text = await resp.text();
        try {
          const parsed = JSON.parse(text);
          return { episodes: parsed, tried: [...tried, rec] };
        } catch (parseErr) {
          rec.err = 'json-parse: ' + (parseErr.message || parseErr);
          tried.push(rec);
          continue;
        }
      } catch (fetchErr) {
        tried.push({ path: cand, ok: false, status: null, err: String(fetchErr) });
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
            <div style="height:14px"></div>
            <div class="pro-tutorial-title-old" style="font-weight:900;margin-top:18px;font-size:20px;color:#fff;">How to Watch (Old Process)</div>
            <div class="pro-video-frame-wrap">${HOWTO_PROCESS_2}</div>
          `;

          wrap.innerHTML = `<div class="pro-episodes-row-pro">${cardsHtml}</div>` + tutorialBlock;

          // Force inline tweaks (guarantees the visual size irrespective of other css)
          try {
            const row = wrap.querySelector('.pro-episodes-row-pro');
            const cards = Array.from(row.querySelectorAll('.pro-episode-card-pro'));
            cards.forEach((c, idx) => {
              // compact inline styles to override any remaining CSS
              c.style.flex = window.innerWidth >= 900 ? '0 0 180px' : '0 0 150px';
              c.style.minHeight = '0';
              c.style.padding = '10px';
              c.style.margin = '0';
              c.style.boxSizing = 'border-box';
              const thumb = c.querySelector('.pro-ep-thumb-wrap-pro');
              if (thumb) {
                thumb.style.height = (window.innerWidth >= 900 ? '130px' : '112px');
                thumb.style.width = '100%';
                thumb.style.borderRadius = '10px';
                thumb.style.overflow = 'hidden';
              }
              const img = c.querySelector('.pro-ep-thumb-pro');
              if (img) {
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.style.display = 'block';
              }
              const title = c.querySelector('.pro-ep-title-pro');
              if (title) {
                title.style.height = '40px';
                title.style.fontSize = '13px';
                title.style.padding = '6px';
                title.style.boxSizing = 'border-box';
              }
            });

            // make tutorial-old title match highlight style
            const oldTitle = wrap.querySelector('.pro-tutorial-title-old');
            if (oldTitle) {
              oldTitle.classList.add('pro-tutorial-title');
              oldTitle.style.marginTop = '18px';
            }

            // scroll first card into view
            const first = row.querySelector('.pro-episode-card-pro');
            if (first) first.scrollIntoView({ behavior: 'auto', inline: 'start', block: 'nearest' });
          } catch (e) {
            console.warn('post-render inline tweak failed', e);
          }

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
