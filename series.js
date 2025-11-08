// series.js (debug-friendly details renderer) — replace your current series.js with this file
(function(){
  'use strict';
  const qs = new URLSearchParams(location.search);
  const slug = (qs.get('series')||'').trim();
  const lang = (qs.get('lang')||'').toLowerCase();
  const seasonQuery = qs.get('season') || '1';
  const JSON_PATHS = ['/series.json','/data/series.json','series.json'];

  function escapeHtml(s){ if(s===null||s===undefined) return ''; return String(s).replace(/[&<>"'`=\/]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'}[c])); }

  function showPanel(title, html){
    let existing = document.getElementById('smtv-debug-panel');
    if(existing) existing.remove();
    const panel = document.createElement('div');
    panel.id = 'smtv-debug-panel';
    panel.style.cssText = 'position:fixed;left:10px;right:10px;top:72px;z-index:999999;padding:14px;border-radius:10px;background:#0f1720;color:#e6f7ff;font-family:Arial,Helvetica,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.7);';
    panel.innerHTML = `<div style="font-weight:800;color:#ffd400;margin-bottom:8px;">${escapeHtml(title)}</div><div style="font-size:13px;color:#d2eaf6;line-height:1.35">${html}</div>`;
    document.body.appendChild(panel);
  }

  // If no slug present — do nothing (list page handles itself)
  if(!slug) return;

  // inject minimal styles used by details UI
  (function(){ const css = `
    .pro-series-header-pro{display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;padding:18px;border-radius:14px;background:linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.06));box-shadow:0 8px 22px rgba(0,0,0,0.45);position:relative;margin-bottom:12px;}
    .pro-series-back-btn-pro{position:absolute;left:14px;top:14px;width:48px;height:48px;display:inline-flex;align-items:center;justify-content:center;border-radius:12px;background:rgba(0,150,200,0.12);border:2px solid rgba(0,160,210,0.18);box-shadow:0 6px 18px rgba(0,140,200,0.08);text-decoration:none;}
    .pro-series-poster-pro{width:150px;height:90px;border-radius:10px;object-fit:cover;display:block;box-shadow:0 8px 18px rgba(0,0,0,0.45);}
    .pro-series-title-pro{font-size:22px;margin:8px 0;color:#00d0f0;font-weight:800;}
    .pro-episodes-row-pro{display:flex;flex-direction:column;gap:12px;margin-top:12px;}
    .pro-episode-card-pro{display:flex;gap:12px;align-items:center;padding:10px;background:linear-gradient(180deg,rgba(255,255,255,0.01),rgba(0,0,0,0.06));border-radius:12px;color:#fff;text-decoration:none;}
    .pro-ep-thumb-wrap-pro{flex:0 0 140px;width:140px;height:80px;position:relative;border-radius:8px;overflow:hidden;background:#111;}
    .pro-ep-thumb-pro{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
  `; try{ const t=document.createElement('style'); t.textContent = css; document.head.appendChild(t);}catch(e){} })();

  async function fetchJson(paths){
    let lastErr = null;
    for(const p of paths){
      try{
        const res = await fetch(p, {cache:'no-cache'});
        if(!res.ok){ lastErr = new Error('HTTP ' + res.status + ' for ' + p); continue; }
        const j = await res.json();
        return {path:p, data:j};
      }catch(err){ lastErr = err; }
    }
    throw lastErr || new Error('All fetch attempts failed: ' + JSON.stringify(paths));
  }

  (async function(){
    if(document.readyState !== 'complete') await new Promise(r=>window.addEventListener('load', r, {once:true}));
    await new Promise(r=>setTimeout(r, 40));
    // ensure container exists
    let detailsEl = document.getElementById('series-details');
    if(!detailsEl){
      detailsEl = document.createElement('div');
      detailsEl.id = 'series-details';
      document.querySelector('.container')?.appendChild(detailsEl);
    }

    // hide list area if present
    try { const listArea = document.getElementById('series-list-area'); if(listArea) listArea.style.display='none'; } catch(e){}

    // load series.json
    let seriesRaw;
    try{
      const res = await fetchJson(JSON_PATHS);
      seriesRaw = Array.isArray(res.data) ? res.data : (res.data && Array.isArray(res.data.series) ? res.data.series : null);
      if(!Array.isArray(seriesRaw)){
        showPanel('series.json loaded but unexpected structure','Tried: ' + escapeHtml(res.path) + '<br><pre style="white-space:pre-wrap;color:#ffd">' + escapeHtml(JSON.stringify(res.data).slice(0,1000)) + '</pre>');
        return;
      }
    }catch(err){
      showPanel('Could not load series.json', 'Tried: ' + escapeHtml(JSON_PATHS.join(', ')) + '<br><br>Error: ' + escapeHtml(String(err)));
      return;
    }

    const meta = seriesRaw.find(s => s.slug === slug);
    if(!meta){
      showPanel('Series meta not found','slug used: <b>' + escapeHtml(slug) + '</b><br>Available slugs:<br><pre style="white-space:pre-wrap;color:#ffd">' + escapeHtml(seriesRaw.map(x=>x.slug).join(', ')) + '</pre>');
      return;
    }

    // render header and tabs area
    document.title = meta.title ? meta.title + ' – SmTv Urdu' : 'Series – SmTv Urdu';
    detailsEl.innerHTML = `
      <section class="pro-series-header-pro">
        <a href="series.html" class="pro-series-back-btn-pro" title="Back" aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polyline points="12 4 6 10 12 16" fill="none" stroke="#00d0f0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>
        </a>
        <img class="pro-series-poster-pro" src="${escapeHtml(meta.poster||'')}" alt="${escapeHtml(meta.title||'')}">
        <div class="pro-series-meta-pro">
          <h2 class="pro-series-title-pro">${escapeHtml(meta.title||'')}</h2>
          <div class="pro-series-desc-pro" style="color:#cfd8df">${escapeHtml((meta.desc&&meta.desc.en)?meta.desc.en:(meta.desc||''))}</div>
        </div>
      </section>
      <nav id="pro-seasons-tabs"></nav>
      <section id="pro-episodes-row-wrap"></section>
    `;

    // compute seasons
    let seasons = [];
    if(typeof meta.seasons === 'number'){ for(let i=1;i<=meta.seasons;i++) seasons.push(String(i)); }
    else if(Array.isArray(meta.seasons)) seasons = meta.seasons.map(String); else seasons = ['1'];

    const tabsEl = document.getElementById('pro-seasons-tabs');
    tabsEl.innerHTML = seasons.map(s=>`<button data-season="${s}" class="pro-season-tab-pro${s===seasonQuery ? ' active':''}">Season ${s}</button>`).join('');
    tabsEl.querySelectorAll('.pro-season-tab-pro').forEach(btn=>btn.addEventListener('click', ()=>{ tabsEl.querySelectorAll('.pro-season-tab-pro').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderSeason(btn.dataset.season); }));

    // initial render
    renderSeason(seasonQuery);

    async function renderSeason(season){
      const wrap = document.getElementById('pro-episodes-row-wrap');
      wrap.innerHTML = `<div style="color:#ddd;padding:12px 0">Loading episodes for season ${escapeHtml(season)}...</div>`;

      const cand = [
        `episode-data/${slug}-s${season}.json`,
        `episode-data/${slug}-s${season}-${lang}.json`,
        `episode-data/${slug}-s${season}-en.json`,
        `episode-data/${slug}-s${season}-hi.json`,
        `episode-data/${slug}-s${season}-ur.json`
      ];

      const tried = [];
      let episodes = null;
      for(const p of cand){
        try{
          const r = await fetch(p, {cache:'no-cache'});
          tried.push({path:p, ok:r.ok, status:r.status});
          if(!r.ok) continue;
          try {
            const j = await r.json();
            if(Array.isArray(j)) { episodes = j; break; }
            if(j && Array.isArray(j.episodes)) { episodes = j.episodes; break; }
          }catch(e){ tried[tried.length-1].err = 'json-parse:'+String(e); continue; }
        }catch(e){ tried.push({path:p, ok:false, err:String(e)}); continue; }
      }

      if(!episodes || !Array.isArray(episodes) || episodes.length===0){
        showPanel('Episodes not found for this season', 'Tried paths:<br><pre style="white-space:pre-wrap;color:#ffd">' + escapeHtml(JSON.stringify(tried, null, 2)) + '</pre><br>If missing, upload: <b>episode-data/' + escapeHtml(slug) + '-s' + escapeHtml(season) + '.json</b>');
        wrap.innerHTML = `<div style="color:#fff;padding:28px 0 0 0;">No episodes for this season.</div>`;
        return;
      }

      // render episodes
      wrap.innerHTML = `<div class="pro-episodes-row-pro">` + episodes.map(ep=>{
        const epUrl = ep.shortlink ? ep.shortlink : `episode.html?series=${encodeURIComponent(slug)}&season=${encodeURIComponent(season)}&ep=${encodeURIComponent(ep.ep)}${lang? '&lang=' + encodeURIComponent(lang):''}`;
        const thumb = ep.thumb || 'default-thumb.jpg';
        return `<a class="pro-episode-card-pro" href="${epUrl}" ${ep.shortlink ? 'target="_blank" rel="noopener"':''}><div class="pro-ep-thumb-wrap-pro"><img class="pro-ep-thumb-pro" src="${escapeHtml(thumb)}" alt="Ep ${escapeHtml(String(ep.ep))}"></div><div class="pro-ep-title-pro">${escapeHtml(ep.title || ('Episode ' + ep.ep))}</div></a>`;
      }).join('') + `</div>`;
    }
  })();

})();
