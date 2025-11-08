// series.js — improved: no-jump season switching + smoother transitions
(function() {
  const qs = new URLSearchParams(location.search);
  const slug = (qs.get('series') || '').trim();
  const lang = (qs.get('lang') || '').toLowerCase();
  let season = qs.get('season') || '1';

  const HOWTO_PROCESS_1 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg466/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;
  const HOWTO_PROCESS_2 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg45g/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;

  // Inject small helper CSS used for transitions
  (function injectStyles(){
    const css = `
      .pro-episodes-row-wrap-pro { overflow-anchor: none; transition: opacity .28s ease, filter .28s ease; will-change: opacity, filter; }
      .pro-episodes-row-wrap-pro.is-loading { opacity:.58; filter: blur(1px) saturate(.94); pointer-events:none; }
      .pro-episodes-row-pro { transition: opacity .28s ease, transform .28s ease; will-change: opacity, transform; }
      .pro-ep-loading { display:flex; align-items:center; justify-content:center; color:#9fd3ff; font-weight:800; border-radius:12px; min-width:120px; min-height:120px; background:linear-gradient(90deg,#0b1220,#111827); }
      /* reveal animation for episode cards */
      .reveal-anim { opacity:0; transform:translateY(10px); transition:opacity .32s ease, transform .32s ease; }
      .reveal-anim.in { opacity:1; transform:translateY(0); }
    `;
    const s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  })();

  function jsonFor(s) {
    if (lang === 'dub') return `episode-data/${slug}-s${s}.json`;
    if (['en','hi','ur'].includes(lang)) return `episode-data/${slug}-s${s}-${lang}.json`;
    return `episode-data/${slug}-s${s}.json`;
  }
  function bust(url) {
    const v = (qs.get('v') || '1');
    return url + (url.includes('?') ? '&' : '?') + 'v=' + v;
  }
  function toast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);background:#122231;color:#9fe6ff;padding:10px 14px;border-radius:9px;border:1px solid #2d4b6a;font-weight:700;z-index:9999;font-family:Montserrat,sans-serif;';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  // Robust fetch with one retry + timeout
  function fetchWithRetry(url, retries = 1, timeout = 9000) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      function attempt() {
        attempts++;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        fetch(url, { signal: controller.signal, cache: 'no-cache' })
          .then(r => { clearTimeout(timer); if (!r.ok) throw new Error('bad response ' + r.status); return r.json(); })
          .then(json => resolve(json))
          .catch(err => {
            clearTimeout(timer);
            if (attempts <= retries) setTimeout(attempt, 300);
            else reject(err);
          });
      }
      attempt();
    });
  }

  function safeBlur() {
    try { const a = document.activeElement; if (a && a.blur) a.blur(); } catch(e){}
  }

  function restoreScroll(savedY) {
    if (savedY == null) return;
    // two frames to let layout settle
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try { window.scrollTo({ top: savedY, left: 0, behavior: 'auto' }); }
        catch(e) { window.scrollTo(0, savedY); }
      });
    });
  }

  const mount = document.getElementById('series-details');
  if (!mount) return;

  // load series metadata and render header + tabs
  fetch('series.json').then(r => r.json()).then(list => {
    const meta = Array.isArray(list) ? list.find(x => x.slug === slug) : null;
    if (!meta) {
      mount.innerHTML = `<div style="color:#fff;padding:20px;">Series not found.</div>`;
      return;
    }
    document.title = `${meta.title} – SmTv Urdu`;

    const premiumMsg = `
      <div class="premium-channel-message" role="region" aria-label="Premium">
        <strong>Go Ad-Free!</strong> Get direct access to all episodes by joining our <strong>Premium Channel</strong>.
        <div class="premium-btn-row" style="margin-top:10px;"><a href="/premium" class="btn-primary" rel="noopener">Join Premium</a></div>
      </div>`;

    mount.innerHTML = `
      <section class="pro-series-header-pro" id="pro-series-header-pro">
        <a href="index.html" class="pro-series-back-btn-pro" title="Back" aria-label="Back to home">
          <svg width="20" height="20" viewBox="0 0 20 20"><polyline points="12 4 6 10 12 16" fill="none" stroke="#23c6ed" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>
        </a>
        <img class="pro-series-poster-pro" src="${meta.poster || 'default-poster.jpg'}" alt="${meta.title}">
        <div class="pro-series-meta-pro">
          <h2 class="pro-series-title-pro">${meta.title}</h2>
          <div class="pro-series-desc-pro">${(meta.desc && (meta.desc.en || meta.desc)) || ''}</div>
          ${premiumMsg}
        </div>
      </section>
      <nav class="pro-seasons-tabs-pro" id="pro-seasons-tabs" aria-label="Seasons"></nav>
      <section class="pro-episodes-row-wrap-pro" id="pro-episodes-row-wrap" aria-live="polite"></section>
    `;

    // build seasons
    let seasons = [];
    if (typeof meta.seasons === 'number') for (let i=1;i<=meta.seasons;i++) seasons.push(String(i));
    else if (Array.isArray(meta.seasons)) seasons = meta.seasons.map(s=>String(s));
    else seasons = ['1'];

    const tabs = document.getElementById('pro-seasons-tabs');
    tabs.innerHTML = '';
    seasons.forEach(s => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pro-season-tab-pro' + (s === season ? ' active' : '');
      btn.dataset.season = s;
      btn.setAttribute('aria-pressed', s === season ? 'true' : 'false');
      btn.textContent = 'Season ' + s;
      btn.addEventListener('click', onSeasonClick);
      tabs.appendChild(btn);
    });

    // initial render (no forced scrolling)
    renderSeason(season, null, { initial:true });
  }).catch(err => {
    console.warn(err);
    mount.innerHTML = `<div style="color:#fff;padding:30px;">Could not load series info. Try again later.</div>`;
  });

  // handle tab click — save scroll, switch active UI then load
  function onSeasonClick(e) {
    const btn = e.currentTarget;
    if (!btn || !btn.dataset) return;
    try { e.preventDefault && e.preventDefault(); } catch(e){}
    safeBlur();

    const savedY = window.scrollY || window.pageYOffset || 0;

    const tabs = document.getElementById('pro-seasons-tabs');
    tabs.querySelectorAll('.pro-season-tab-pro').forEach(x => { x.classList.remove('active'); x.setAttribute('aria-pressed','false'); });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed','true');

    const newSeason = btn.dataset.season;
    season = newSeason;

    renderSeason(newSeason, savedY, { smooth:true });
  }

  // main renderer: placeholders -> fetch -> replace with animation + restore scroll
  function renderSeason(seasonToLoad, savedScrollY = null, opts = {}) {
    const wrap = document.getElementById('pro-episodes-row-wrap');
    if (!wrap) return;
    const doSmooth = !!opts.smooth;

    // capture current height of wrap to lock layout and avoid reflow jumps
    const currentHeight = wrap.clientHeight || 0;
    if (currentHeight > 0) {
      wrap.style.minHeight = currentHeight + 'px';
    }

    // temporarily disable CSS smooth scrolling in case site uses it
    const html = document.documentElement;
    const prevScrollBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';

    if (doSmooth) wrap.classList.add('is-loading');

    // immediate placeholders for instant feedback
    wrap.innerHTML = `<div class="pro-episodes-row-pro" role="region" aria-busy="true" aria-label="Loading episodes">` +
      Array.from({length:6}).map(()=>`<div class="pro-ep-loading">Loading</div>`).join('') +
      `</div>`;

    // allow paint then fetch
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const url = bust(jsonFor(seasonToLoad));
        fetchWithRetry(url, 1, 9000)
          .then(episodes => {
            if (!Array.isArray(episodes) || episodes.length === 0) {
              wrap.innerHTML = `<div style="color:#fff;padding:28px 16px;">No episodes for this season.</div>`;
              wrap.classList.remove('is-loading');
              wrap.style.minHeight = '';
              restoreScroll(savedScrollY);
              html.style.scrollBehavior = prevScrollBehavior || '';
              return;
            }

            // build scroller html
            const scrollerHtml = `<div class="pro-episodes-row-pro" role="list">` + episodes.map(ep => {
              const thumb = (ep.thumb && ep.thumb.trim()) ? ep.thumb : 'default-thumb.jpg';
              const title = ep.title ? ep.title : ('Episode ' + ep.ep);
              const episodeUrl = ep.shortlink ? ep.shortlink : `episode.html?series=${encodeURIComponent(slug)}&season=${encodeURIComponent(seasonToLoad)}&ep=${encodeURIComponent(ep.ep)}${lang ? '&lang=' + encodeURIComponent(lang) : ''}`;
              const extra = ep.shortlink ? 'target="_blank" rel="noopener"' : '';
              return `
                <a class="pro-episode-card-pro reveal-anim" href="${episodeUrl}" ${extra} role="listitem" aria-label="${title}">
                  <div class="pro-ep-thumb-wrap-pro" aria-hidden="true">
                    <img src="${thumb}" class="pro-ep-thumb-pro" alt="${title}" loading="lazy">
                    <span class="pro-ep-num-pro">Ep ${ep.ep}</span>
                  </div>
                  <div class="pro-ep-title-pro">${title}</div>
                </a>
              `;
            }).join('') + `</div>`;

            const tutorialHtml = `
              <section class="pro-highlight-section" aria-hidden="false" style="margin-top:28px;">
                <div class="pro-highlight-title">How to Watch Episodes</div>
              </section>
              <section class="pro-video-card" aria-label="How to Watch video">
                <div class="pro-video-frame-wrap">${HOWTO_PROCESS_1}</div>
              </section>

              <section class="pro-highlight-section" aria-hidden="false" style="margin-top:18px;">
                <div class="pro-highlight-title">How to Watch (Old Process)</div>
              </section>
              <section class="pro-video-card" aria-label="How to Watch old process video">
                <div class="pro-video-frame-wrap">${HOWTO_PROCESS_2}</div>
              </section>
            `;

            // replace content atomically
            wrap.innerHTML = scrollerHtml + tutorialHtml;

            // staggered reveal for better perceived performance
            try {
              const scroller = wrap.querySelector('.pro-episodes-row-pro');
              if (scroller) {
                const items = Array.from(scroller.querySelectorAll('.reveal-anim'));
                items.forEach((item, i) => {
                  // ensure starting state
                  item.classList.remove('in');
                  // staggered add
                  setTimeout(()=> item.classList.add('in'), 80 + i * 28);
                });
              }
            } catch(e){ /* ignore reveal errors */ }

            // clear loading state & minHeight
            wrap.classList.remove('is-loading');
            // allow a short delay so browser finishes flow before removing minHeight
            setTimeout(()=> { wrap.style.minHeight = ''; }, 360);

            // avoid focus-driven scrolling
            safeBlur();

            // restore scroll position (user expected behavior)
            restoreScroll(savedScrollY);

            // restore previous scroll-behavior
            html.style.scrollBehavior = prevScrollBehavior || '';
          })
          .catch(err => {
            console.warn('episodes fetch error', err);
            wrap.innerHTML = `<div style="color:#fff;padding:28px 16px;">Could not load episodes. Please try again.</div>`;
            wrap.classList.remove('is-loading');
            wrap.style.minHeight = '';
            toast('Episode file missing or network error');
            restoreScroll(savedScrollY);
            html.style.scrollBehavior = prevScrollBehavior || '';
          });
      });
    });
  }

})();
