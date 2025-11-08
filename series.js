// series.js — unified list + details renderer for series.html
(function(){
  'use strict';

  const qs = new URLSearchParams(location.search);
  const slug = (qs.get('series') || '').trim();
  const initialLang = (qs.get('lang') || '').toLowerCase();
  const seasonQuery = qs.get('season') || '1';
  const JSON_PATHS = ['/series.json','/data/series.json','series.json'];

  // escape helper
  function escapeHtml(s){ if(s===null||s===undefined) return ''; return String(s).replace(/[&<>"'`=\/]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'}[c])); }

  // fetch series.json with fallback paths
  async function fetchSeriesJson(){
    let lastErr = null;
    for(const p of JSON_PATHS){
      try {
        const r = await fetch(p, { cache: 'no-cache' });
        if(!r.ok) { lastErr = new Error('HTTP ' + r.status + ' ' + p); continue; }
        const j = await r.json();
        const arr = Array.isArray(j) ? j : (j && Array.isArray(j.series) ? j.series : null);
        if(Array.isArray(arr)) return arr;
        lastErr = new Error('unexpected structure for ' + p);
      } catch(e) { lastErr = e; }
    }
    throw lastErr || new Error('series.json not found');
  }

  // load episodes from candidate paths (returns episodes or tried list)
  async function loadEpisodesFor(slug, season, lang){
    const candidates = [
      `episode-data/${slug}-s${season}.json`,
      `episode-data/${slug}-s${season}-${lang}.json`,
      `episode-data/${slug}-s${season}-en.json`,
      `episode-data/${slug}-s${season}-hi.json`,
      `episode-data/${slug}-s${season}-ur.json`
    ];
    const tried = [];
    for(const p of candidates){
      try {
        const r = await fetch(p, { cache:'no-cache' });
        tried.push({ path:p, ok:r.ok, status:r.status });
        if(!r.ok) continue;
        const j = await r.json();
        if(Array.isArray(j)) return { episodes:j, tried };
        if(j && Array.isArray(j.episodes)) return { episodes:j.episodes, tried };
        tried[tried.length-1].err = 'not-array';
      } catch(e){ tried.push({ path:p, ok:false, err:String(e) }); continue; }
    }
    return { episodes:null, tried };
  }

  // small UI helper: toast
  function toast(msg){
    try{
      const t = document.createElement('div');
      t.textContent = msg;
      t.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);background:#122231;color:#9fe6ff;padding:10px 14px;border-radius:9px;border:1px solid #2d4b6a;font-weight:700;z-index:9999;font-family:Montserrat,sans-serif;';
      document.body.appendChild(t);
      setTimeout(()=>t.remove(),2600);
    }catch(e){}
  }

  // render the series list (grid)
  async function renderListFor(filter){
    try{
      const arr = await fetchSeriesJson();
      let filtered = [];
      if(filter.type === 'dubbed'){
        filtered = arr.filter(s => (s.track || '').toLowerCase() === 'dubbed');
      } else if(filter.type === 'sub'){
        if(filter.lang){
          filtered = arr.filter(s => (s.track || '').toLowerCase() === 'sub' && (s.subLang || '').toLowerCase() === filter.lang);
        } else {
          filtered = arr.filter(s => (s.track || '').toLowerCase() === 'sub');
        }
      }

      const grid = document.getElementById('series-list');
      const empty = document.getElementById('series-empty');
      if(!Array.isArray(filtered) || filtered.length===0){ grid.innerHTML=''; empty.style.display='block'; return; }
      empty.style.display='none';
      grid.innerHTML = filtered.map(s=>{
        // carry lang param for subtitle selections
        const linkLang = filter.type==='sub' && filter.lang ? '&lang=' + encodeURIComponent(filter.lang) : '';
        return `<a class="series-card" href="series.html?series=${encodeURIComponent(s.slug)}${linkLang}">
          <div class="series-thumb"><img class="thumb" src="${escapeHtml(s.poster||'assets/posters/default.jpg')}" alt="${escapeHtml(s.title||'')}"></div>
          <div class="series-title">${escapeHtml(s.title||'')}</div>
        </a>`;
      }).join('');
    } catch(e){
      console.error(e);
      const grid = document.getElementById('series-list');
      const empty = document.getElementById('series-empty');
      if(grid) grid.innerHTML = '';
      if(empty){ empty.style.display='block'; empty.textContent='Could not load series.'; }
    }
  }

  // render details page for a slug
  async function renderDetails(){
    const detailsEl = document.getElementById('series-details');
    if(!detailsEl) return;
    detailsEl.innerHTML = `<div style="color:#ddd;padding:18px">Loading series details...</div>`;
    try{
      const arr = await fetchSeriesJson();
      const meta = arr.find(s => s.slug === slug);
      if(!meta){
        detailsEl.innerHTML = `<div style="color:#fff;padding:18px">Series not found.</div>`;
        return;
      }
      document.title = `${meta.title || 'Series'} – SmTv Urdu`;

      // header
      detailsEl.innerHTML = `
        <section class="pro-series-header-pro">
          <a href="series.html" class="pro-series-back-btn-pro" title="Back" aria-label="Back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polyline points="12 4 6 10 12 16" fill="none" stroke="#00d0f0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>
          </a>
          <img class="pro-series-poster-pro" src="${escapeHtml(meta.poster||'')}" alt="${escapeHtml(meta.title||'')}">
          <div class="pro-series-meta-pro">
            <h2 class="pro-series-title-pro">${escapeHtml(meta.title||'')}</h2>
            <div class="pro-series-desc-pro">${escapeHtml((meta.desc && meta.desc.en) ? meta.desc.en : (meta.desc || ''))}</div>
          </div>
        </section>
        <nav id="pro-seasons-tabs"></nav>
        <section id="pro-episodes-row-wrap"></section>
      `;

      // seasons
      let seasons = [];
      if(typeof meta.seasons === 'number'){ for(let i=1;i<=meta.seasons;i++) seasons.push(String(i)); }
      else if(Array.isArray(meta.seasons)) seasons = meta.seasons.map(String);
      else seasons = ['1'];

      const tabsEl = document.getElementById('pro-seasons-tabs');
      tabsEl.innerHTML = seasons.map(s => `<button data-season="${s}" class="pro-season-tab-pro${s===seasonQuery ? ' active' : ''}">Season ${s}</button>`).join('');
      tabsEl.querySelectorAll('.pro-season-tab-pro').forEach(btn=>{
        btn.addEventListener('click', ()=>{ tabsEl.querySelectorAll('.pro-season-tab-pro').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderSeason(btn.dataset.season); });
      });

      await renderSeason(seasonQuery);

    } catch(e){
      detailsEl.innerHTML = `<div style="color:#fff;padding:18px">Failed to load series details.</div>`;
      console.error(e);
    }
  }

  // render a season's episodes
  async function renderSeason(season){
    const wrap = document.getElementById('pro-episodes-row-wrap');
    if(!wrap) return;
    wrap.innerHTML = `<div style="color:#ddd;padding:12px 0">Loading episodes for season ${escapeHtml(season)}...</div>`;

    // language preference: initialLang > saved > en
    let preferLang = 'en';
    try {
      const saved = localStorage.getItem('smtv_sub_lang');
      preferLang = initialLang || saved || 'en';
    } catch(e){}

    const { episodes, tried } = await loadEpisodesFor(slug, season, preferLang);
    if(!Array.isArray(episodes) || episodes.length===0){
      wrap.innerHTML = `<div style="color:#fff;padding:28px 0 0 0;">No episodes for this season.</div>`;
      console.warn('Episode load tried:', tried);
      return;
    }

    wrap.innerHTML = `<div class="pro-episodes-row-pro">` + episodes.map(ep=>{
      const epUrl = ep.shortlink ? ep.shortlink : `episode.html?series=${encodeURIComponent(slug)}&season=${encodeURIComponent(season)}&ep=${encodeURIComponent(ep.ep)}${initialLang ? '&lang=' + encodeURIComponent(initialLang) : ''}`;
      const thumb = ep.thumb || 'assets/posters/default.jpg';
      return `<a class="pro-episode-card-pro" href="${epUrl}" ${ep.shortlink ? 'target="_blank" rel="noopener"' : ''}>
        <div class="pro-ep-thumb-wrap-pro"><img class="pro-ep-thumb-pro" src="${escapeHtml(thumb)}" alt="Ep ${escapeHtml(String(ep.ep))}"></div>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <div style="font-weight:800;color:#ffd700;background:linear-gradient(90deg,#ffcf33,#ff7a5f);padding:6px 10px;border-radius:999px;font-size:13px;">Ep ${escapeHtml(String(ep.ep))}</div>
          </div>
          <div class="pro-ep-title-pro">${escapeHtml(ep.title || ('Episode ' + ep.ep))}</div>
        </div>
      </a>`;
    }).join('') + `</div>`;

    // add how-to videos
    const HOWTO1 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg466/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;
    const HOWTO2 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg45g/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;
    wrap.insertAdjacentHTML('beforeend', `<div style="margin-top:18px;color:#fff;font-weight:700">How to Watch Episodes</div><div class="pro-video-frame-wrap" style="margin-top:8px">${HOWTO1}</div><div style="margin-top:18px;color:#fff;font-weight:700">How to Watch (Old Process)</div><div class="pro-video-frame-wrap" style="margin-top:8px">${HOWTO2}</div>`);
  }

  // filters wiring on list page
  function wireFilters(){
    const dubbedBtn = document.getElementById('dubbedBtn');
    const subBtn = document.getElementById('subBtn');
    const subLangBar = document.getElementById('subLangBar');
    const subBtns = Array.from(subLangBar.querySelectorAll('.sub-btn'));

    let selectedSub = initialLang || localStorage.getItem('smtv_sub_lang') || 'en';
    subBtns.forEach(b => { b.classList.remove('active'); if(b.dataset.lang === selectedSub) b.classList.add('active'); });

    function setActive(type){
      if(type === 'dub'){
        dubbedBtn.classList.add('active'); dubbedBtn.setAttribute('aria-pressed','true');
        subBtn.classList.remove('active'); subBtn.setAttribute('aria-pressed','false');
        subLangBar.classList.remove('active'); subLangBar.setAttribute('aria-hidden','true');
      } else {
        subBtn.classList.add('active'); subBtn.setAttribute('aria-pressed','true');
        dubbedBtn.classList.remove('active'); dubbedBtn.setAttribute('aria-pressed','false');
        subLangBar.classList.add('active'); subLangBar.setAttribute('aria-hidden','false');
      }
    }

    dubbedBtn && dubbedBtn.addEventListener('click', async ()=>{
      setActive('dub');
      await renderListFor({ type:'dubbed' });
    });

    subBtn && subBtn.addEventListener('click', async ()=>{
      setActive('sub');
      if(!subBtns.find(b=>b.classList.contains('active'))){
        const btn = subBtns.find(b=>b.dataset.lang === selectedSub) || subBtns[0];
        btn.classList.add('active');
      }
      await renderListFor({ type:'sub', lang:selectedSub });
    });

    subBtns.forEach(b=>{
      b.addEventListener('click', async ()=>{
        subBtns.forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
        selectedSub = b.dataset.lang;
        try{ localStorage.setItem('smtv_sub_lang', selectedSub); }catch(e){}
        await renderListFor({ type:'sub', lang:selectedSub });
      });
    });
  }

  // initialisation: decide list or details
  (async function init(){
    if(document.readyState !== 'complete') await new Promise(r=>window.addEventListener('load', r, {once:true}));
    await new Promise(r=>setTimeout(r,40));

    if(!slug){
      // list view
      const listArea = document.getElementById('series-list-area');
      const details = document.getElementById('series-details');
      if(listArea) listArea.style.display = '';
      if(details) details.style.display = 'none';
      wireFilters();
      // initial selection: if user has a saved subtitle lang, prefer sub view; otherwise dubbed
      const pref = initialLang || localStorage.getItem('smtv_sub_lang') || null;
      if(pref){
        // set sub active
        const subBtn = document.getElementById('subBtn');
        if(subBtn) subBtn.classList.add('active');
        await renderListFor({ type:'sub', lang: pref });
      } else {
        await renderListFor({ type:'dubbed' });
      }
    } else {
      // details view for slug
      const listArea = document.getElementById('series-list-area');
      const details = document.getElementById('series-details');
      if(listArea) listArea.style.display = 'none';
      if(details) details.style.display = '';
      await renderDetails();
    }
  })();

})();
