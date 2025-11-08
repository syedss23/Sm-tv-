// series.js — fixed details renderer (keeps old behavior but corrected)
(function() {
  'use strict';

  const qs = new URLSearchParams(location.search);
  const slug = (qs.get('series') || '').trim();
  const lang = (qs.get('lang') || '').toLowerCase();
  const season = qs.get('season') || '1';
  const SERIES_JSON_PATHS = ['/series.json', '/data/series.json', 'series.json'];

  // How-to videos (kept as strings)
  const HOWTO_PROCESS_1 = '<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg466/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>';
  const HOWTO_PROCESS_2 = '<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg45g/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>';

  // Helper: build candidate episode JSON filename
  function jsonFor(season) {
    const normalizedLang = (lang === 'dubbed') ? 'dub' : lang; // accept both
    if (normalizedLang === 'dub' || normalizedLang === 'dubbed') {
      return `episode-data/${slug}-s${season}.json`;
    } else if (['en', 'hi', 'ur'].includes(normalizedLang)) {
      return `episode-data/${slug}-s${season}-${normalizedLang}.json`;
    } else {
      return `episode-data/${slug}-s${season}.json`;
    }
  }

  // bust cache helper
  function bust(url) {
    const v = (qs.get('v') || Date.now());
    return url + (url.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(v);
  }

  // toast helper
  function toast(msg) {
    try {
      const t = document.createElement('div');
      t.textContent = msg;
      t.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);background:#122231;color:#9fe6ff;padding:10px 14px;border-radius:9px;border:1px solid #2d4b6a;font-weight:700;z-index:9999;font-family:Montserrat,sans-serif;';
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 2600);
    } catch (e) { console.warn(e); }
  }

  // small CSS injection for episode card styles (keeps look consistent)
  const injectedCss = `
    .pro-series-header-pro{display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;padding:18px;border-radius:14px;background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.06));box-shadow:0 8px 22px rgba(0,0,0,0.45);position:relative;margin-bottom:12px;}
    .pro-series-back-btn-pro{position:absolute;left:14px;top:14px;width:48px;height:48px;display:inline-flex;align-items:center;justify-content:center;border-radius:12px;background:rgba(0,150,200,0.12);border:2px solid rgba(0,160,210,0.18);box-shadow:0 6px 18px rgba(0,140,200,0.08);text-decoration:none;color:inherit;}
    .pro-series-poster-pro{width:150px;height:90px;border-radius:10px;object-fit:cover;display:block;box-shadow:0 8px 18px rgba(0,0,0,0.45);}
    .pro-series-title-pro{font-size:22px;margin:8px 0;color:#00d0f0;font-weight:800;}
    .pro-series-desc-pro{color:#cfd8df;line-height:1.45;}
    .pro-seasons-tabs-pro{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:10px;}
    .pro-season-tab-pro{background:rgba(255,255,255,0.03);border:none;color:#ddd;padding:8px 12px;border-radius:10px;cursor:pointer;}
    .pro-season-tab-pro.active{background:linear-gradient(90deg,#ffcf33,#ff7a5f);color:#111;font-weight:700;transform:translateY(-2px);}
    .pro-episodes-row-pro{display:flex;flex-direction:column;gap:12px;margin-top:12px;}
    .pro-episode-card-pro{display:flex;gap:12px;align-items:center;padding:10px;background:linear-gradient(180deg,rgba(255,255,255,0.01),rgba(0,0,0,0.06));border-radius:12px;text-decoration:none;color:#fff;box-shadow:0 8px 20px rgba(0,0,0,0.45);transition:transform .12s ease,box-shadow .12s ease;}
    .pro-episode-card-pro:hover{transform:translateY(-4px);box-shadow:0 12px 28px rgba(0,0,0,0.6);}
    .pro-ep-thumb-wrap-pro{flex:0 0 140px;width:140px;height:80px;position:relative;border-radius:8px;overflow:hidden;background:#111;}
    .pro-ep-thumb-pro{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}
    .pro-ep-title-pro{flex:1;font-size:15px;font-weight:700;color:#fff;}
    .pro-video-frame-wrap{margin-top:18px;border-radius:10px;overflow:hidden;}
    @media(min-width:700px){ .pro-series-poster-pro{width:180px;height:110px;} .pro-ep-thumb-wrap-pro{flex:0 0 180px;width:180px;height:100px;} }
  `;
  try {
    const st = document.createElement('style');
    st.textContent = injectedCss;
    document.head.appendChild(st);
  } catch (e) {}

  // try multiple series.json locations
  async function fetchSeriesJson() {
    let lastErr = null;
    for (const p of SERIES_JSON_PATHS) {
      try {
        const r = await fetch(p, { cache: 'no-cache' });
        if (!r.ok) { lastErr = new Error('HTTP ' + r.status + ' ' + p); continue; }
        const j = await r.json();
        return Array.isArray(j) ? j : (j && Array.isArray(j.series) ? j.series : null);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('series.json not found');
  }

  // main logic: load meta & render
  (async function init() {
    if (!slug) return; // nothing to do on list page
    // wait for full load to avoid race with footer include
    if (document.readyState !== 'complete') {
      await new Promise(r => window.addEventListener('load', r, { once: true }));
    }

    const detailsEl = document.getElementById('series-details');
    if (!detailsEl) return;

    detailsEl.innerHTML = `<div style="color:#ddd;padding:18px">Loading series details...</div>`;

    let seriesArr;
    try {
      seriesArr = await fetchSeriesJson();
      if (!Array.isArray(seriesArr)) throw new Error('series.json has unexpected structure');
    } catch (err) {
      console.error(err);
      detailsEl.innerHTML = `<div style="color:#fff;padding:18px;">Could not load series info. Try again later.</div>`;
      return;
    }

    const meta = seriesArr.find(s => s.slug === slug);
    if (!meta) {
      detailsEl.innerHTML = `<div style="color:#fff;padding:20px;">Series not found.</div>`;
      return;
    }

    document.title = `${meta.title || 'Series'} – SmTv Urdu`;

    // render header + tabs + container for episodes
    detailsEl.innerHTML = `
      <section class="pro-series-header-pro">
        <a href="index.html" class="pro-series-back-btn-pro" title="Back" aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="vertical-align: middle;"><polyline points="12 4 6 10 12 16" fill="none" stroke="#23c6ed" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>
        </a>
        <img class="pro-series-poster-pro" src="${meta.poster || ''}" alt="${(meta.title||'').replace(/"/g,'') }">
        <div class="pro-series-meta-pro">
          <h2 class="pro-series-title-pro">${meta.title || ''}</h2>
          <div class="pro-series-desc-pro">${(meta.desc && meta.desc.en) ? meta.desc.en : ''}</div>
        </div>
      </section>

      <nav class="pro-seasons-tabs-pro" id="pro-seasons-tabs"></nav>
      <section class="pro-episodes-row-wrap-pro" id="pro-episodes-row-wrap"></section>
    `;

    // compute seasons array
    let seasons = [];
    if (typeof meta.seasons === 'number') {
      for (let i = 1; i <= meta.seasons; i++) seasons.push(String(i));
    } else if (Array.isArray(meta.seasons)) {
      seasons = meta.seasons.map(s => String(s));
    } else {
      seasons = ['1'];
    }

    // render season tabs
    const tabs = document.getElementById('pro-seasons-tabs');
    tabs.innerHTML = seasons.map(s => `<button data-season="${s}" class="pro-season-tab-pro${s === season ? ' active' : ''}">Season ${s}</button>`).join('');
    tabs.querySelectorAll('.pro-season-tab-pro').forEach(btn => {
      btn.addEventListener('click', () => {
        tabs.querySelectorAll('.pro-season-tab-pro').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderSeason(btn.dataset.season);
      });
    });

    // initial render for selected season
    await renderSeason(season);

    // renderSeason function
    async function renderSeason(seasonIndex) {
      const wrap = document.getElementById('pro-episodes-row-wrap');
      if (!wrap) return;
      wrap.innerHTML = `<div style="color:#ddd;padding:12px 0">Loading episodes...</div>`;

      // candidate filenames (prefer explicit language json if requested)
      const candidates = [
        `episode-data/${slug}-s${seasonIndex}.json`,
        `episode-data/${slug}-s${seasonIndex}-${lang}.json`,
        `episode-data/${slug}-s${seasonIndex}-en.json`,
        `episode-data/${slug}-s${seasonIndex}-hi.json`,
        `episode-data/${slug}-s${seasonIndex}-ur.json`
      ];

      let episodes = null;
      const tried = [];
      for (const p of candidates) {
        try {
          const r = await fetch(bust(p), { cache: 'no-cache' });
          tried.push({ path: p, status: r.status, ok: r.ok });
          if (!r.ok) continue;
          const j = await r.json();
          if (Array.isArray(j)) {
            episodes = j;
            break;
          }
          if (j && Array.isArray(j.episodes)) {
            episodes = j.episodes;
            break;
          }
        } catch (e) {
          tried.push({ path: p, err: String(e) });
          continue;
        }
      }

      if (!Array.isArray(episodes) || episodes.length === 0) {
        // helpful debug info printed to console (keeps UI clean) and friendly message
        console.warn('Episode JSON not found, tried:', tried);
        wrap.innerHTML = `<div style="color:#fff;padding:28px 0 0 0;">No episodes for this season.</div>`;
        toast('Episode file missing for this series (check episode-data).');
        return;
      }

      // build horizontal episode cards
      const html = `<div class="pro-episodes-row-pro">` + episodes.map(ep => {
        const episodeUrl = ep.shortlink ? ep.shortlink : `episode.html?series=${encodeURIComponent(slug)}&season=${encodeURIComponent(seasonIndex)}&ep=${encodeURIComponent(ep.ep)}${lang ? '&lang=' + encodeURIComponent(lang) : ''}`;
        const extra = ep.shortlink ? 'target="_blank" rel="noopener"' : '';
        const thumb = ep.thumb || 'default-thumb.jpg';
        const title = ep.title || ('Episode ' + ep.ep);
        return `
          <a class="pro-episode-card-pro" href="${episodeUrl}" ${extra}>
            <div class="pro-ep-thumb-wrap-pro">
              <img src="${thumb}" class="pro-ep-thumb-pro" alt="Ep ${ep.ep}">
            </div>
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <div style="font-weight:800;color:#ffd700;background:linear-gradient(90deg,#ffcf33,#ff7a5f);padding:6px 10px;border-radius:999px;font-size:13px;">Ep ${ep.ep}</div>
              </div>
              <div class="pro-ep-title-pro">${title}</div>
            </div>
          </a>
        `;
      }).join('') + `</div>`;

      // append how-to videos after episodes
      const howtoHtml = `
        <div style="margin-top:18px;color:#fff;font-weight:700">How to Watch Episodes</div>
        <div class="pro-video-frame-wrap" style="margin-top:8px">${HOWTO_PROCESS_1}</div>
        <div style="margin-top:18px;color:#fff;font-weight:700">How to Watch (Old Process)</div>
        <div class="pro-video-frame-wrap" style="margin-top:8px">${HOWTO_PROCESS_2}</div>
      `;

      wrap.innerHTML = html + howtoHtml;
    }

  })();

})();
