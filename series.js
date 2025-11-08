(function() { 
  const qs = new URLSearchParams(location.search); 
  const slug = (qs.get('series') || '').trim(); 
  const lang = (qs.get('lang') || '').toLowerCase(); 
  let season = qs.get('season') || '1';

  // How-to videos (your exact embeds) 
  const HOWTO_PROCESS_1 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg466/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`; 
  const HOWTO_PROCESS_2 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg45g/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;

  // Inject small CSS to improve transitions & prevent anchor jumps
  (function injectStyles(){ 
    const css = `
      /* prevent browser auto anchor jumps */
      .pro-episodes-row-wrap-pro { overflow-anchor: none; transition: opacity .28s ease, filter .28s ease; will-change: opacity, filter; }
      .pro-episodes-row-wrap-pro.is-loading { opacity: .6; filter: blur(1px) saturate(.95); pointer-events: none; }
      .pro-episodes-row-pro { transition: transform .28s ease, opacity .28s ease; will-change: transform, opacity; }
      .pro-ep-loading { transition: opacity .28s ease, transform .28s ease; opacity: .9; transform: translateY(0); display:flex; align-items:center; justify-content:center; color:#9fd3ff; font-weight:800; }
      /* reveal animation */
      .reveal-anim { opacity:0; transform: translateY(10px); transition: opacity .32s ease, transform .32s ease; }
      .reveal-anim.in { opacity:1; transform: translateY(0); }
    `; 
    const s = document.createElement('style'); 
    s.textContent = css; 
    document.head.appendChild(s); 
  })();

  function jsonFor(season) { 
    if (lang === 'dub') { 
      return `episode-data/${slug}-s${season}.json`; 
    } else if (['en', 'hi', 'ur'].includes(lang)) { 
      return `episode-data/${slug}-s${season}-${lang}.json`; 
    } else { 
      return `episode-data/${slug}-s${season}.json`; 
    } 
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

  const uiStyles = `  
    .premium-channel-message { margin-top: 18px; padding: 16px; background: linear-gradient(135deg, #101a24 90%, #23c6ed30 100%); border: 2px solid #23c6ed; border-radius: 14px; color: #23c6ed; font-family: 'Montserrat', Arial, sans-serif; font-weight: 600; font-size: 1.09em; max-width: 540px; box-shadow: 0 2px 18px #1a232b18; letter-spacing: 0.03em; }   
    .premium-channel-message strong { color: #ffd700; font-weight:800; }   
    .premium-btn-row { display:flex; gap:12px; margin-top:11px; flex-wrap:wrap; align-items:center; }   
    .btn-primary{ display:inline-block; background:#ffd400; color:#13263a; font-weight:800; padding:10px 16px; border-radius:999px; box-shadow:0 4px 14px #ffd40055; text-align:center; }   
    .pro-ep-loading { width:150px; min-height:200px; border-radius:12px; background:linear-gradient(90deg,#0b1220,#111827); display:flex; align-items:center; justify-content:center; color:#9fbfd0; font-weight:700; }  
  `; 
  const styleTag = document.createElement('style'); 
  styleTag.textContent = uiStyles; 
  document.head.appendChild(styleTag);

  const detailsMount = document.getElementById('series-details'); 
  if (!detailsMount) { 
    console.warn('series-details mount not found'); 
    return; 
  }

  // initial load of series meta and render header
  fetch('series.json') 
    .then(r => r.json()) 
    .then(arr => { 
      const meta = Array.isArray(arr) ? arr.find(s => s.slug === slug) : null; 
      if (!meta) { 
        detailsMount.innerHTML = `<div style="color:#fff;padding:20px;">Series not found.</div>`; 
        return; 
      } 
      document.title = `${meta.title} – SmTv Urdu`;

      const premiumMsg = `
        <div class="premium-channel-message" role="region" aria-label="Premium">
          <strong>Go Ad-Free!</strong> Get direct access to all episodes by joining our <strong>Premium Channel</strong>.
          <div class="premium-btn-row">
            <a href="/premium" class="btn-primary" rel="noopener">Join Premium</a>
          </div>
        </div>
      `;

      detailsMount.innerHTML = `
        <section class="pro-series-header-pro" id="pro-series-header-pro">
          <a href="index.html" class="pro-series-back-btn-pro" title="Back" aria-label="Back to home">
            <svg width="24" height="24" viewBox="0 0 20 20" style="vertical-align: middle;">
              <polyline points="12 4 6 10 12 16" fill="none" stroke="#23c6ed" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></polyline>
            </svg>
          </a>
          <img class="pro-series-poster-pro" src="${meta.poster}" alt="${meta.title}">
          <div class="pro-series-meta-pro">
            <h2 class="pro-series-title-pro">${meta.title}</h2>
            <div class="pro-series-desc-pro">${(meta.desc && (meta.desc.en || meta.desc)) || ""}</div>
            ${premiumMsg}
          </div>
        </section>
        <nav class="pro-seasons-tabs-pro" id="pro-seasons-tabs" aria-label="Seasons"></nav>
        <section class="pro-episodes-row-wrap-pro" id="pro-episodes-row-wrap" aria-live="polite"></section>
      `;

      // build seasons list
      let seasons = []; 
      if (typeof meta.seasons === 'number') { 
        for (let i = 1; i <= meta.seasons; i++) seasons.push(String(i)); 
      } else if (Array.isArray(meta.seasons)) { 
        seasons = meta.seasons.map(s => String(s)); 
      } else { 
        seasons = ['1']; 
      } 

      // render tabs (use button elements to avoid anchor/focus jumps)
      const tabs = document.getElementById('pro-seasons-tabs'); 
      tabs.innerHTML = ''; 
      seasons.forEach(s => { 
        const btn = document.createElement('button'); 
        btn.type = 'button'; 
        btn.className = 'pro-season-tab-pro' + (s === season ? ' active' : ''); 
        btn.dataset.season = s; 
        btn.textContent = 'Season ' + s; 
        btn.setAttribute('aria-pressed', s === season ? 'true' : 'false'); 
        btn.addEventListener('click', seasonTabClick); 
        tabs.appendChild(btn); 
      }); 

      // initial render
      renderSeason(season, null, { initial:true }); 
    }) 
    .catch(() => { 
      detailsMount.innerHTML = `<div style="color:#fff;padding:30px;">Could not load series info. Try again later.</div>`; 
    });

  // Season click handler: save scrollY, set visual active, then render with smooth transition
  function seasonTabClick(e) { 
    const btn = e.currentTarget; 
    if (!btn || !btn.dataset) return; 
    try { e.preventDefault && e.preventDefault(); } catch(e){} 
    // blur to avoid focus scrolling
    try { btn.blur(); } catch(e){} 
    // save scroll position 
    const savedY = window.scrollY || window.pageYOffset || 0;

    // mark visual active
    const tabs = document.getElementById('pro-seasons-tabs'); 
    tabs.querySelectorAll('.pro-season-tab-pro').forEach(b => { 
      b.classList.remove('active'); 
      b.setAttribute('aria-pressed', 'false'); 
    }); 
    btn.classList.add('active'); 
    btn.setAttribute('aria-pressed', 'true');

    const newSeason = btn.dataset.season; 
    season = newSeason; 

    // call render with savedY to restore scroll after load
    renderSeason(newSeason, savedY, { smooth:true }); 
  }

  // renderSeason: shows placeholders + fades, fetches episodes and replaces with content
  function renderSeason(seasonToLoad, savedScrollY = null, opts = {}) { 
    const wrap = document.getElementById('pro-episodes-row-wrap'); 
    if (!wrap) return;

    // If we already have content and user wants smooth transition, do a small fade out
    const doSmooth = !!opts.smooth; 
    if (doSmooth) { 
      wrap.classList.add('is-loading'); 
    }

    // Lock current height to prevent layout jumps that cause scrolling
    const prevMin = wrap.style.minHeight || '';
    const prevHeight = wrap.clientHeight || 0;
    if (prevHeight > 0) wrap.style.minHeight = prevHeight + 'px';

    // Temporarily disable smooth scroll behavior so browser doesn't animate scrollTo
    const htmlEl = document.documentElement;
    const prevScrollBehavior = htmlEl.style.scrollBehavior || '';
    htmlEl.style.scrollBehavior = 'auto';

    // Insert immediate placeholders so user sees instant feedback
    wrap.innerHTML = `<div class="pro-episodes-row-pro" role="region" aria-busy="true" aria-label="Loading episodes">
      ${Array.from({length:6}).map(()=>`<div class="pro-ep-loading">Loading</div>`).join('')}
    </div>`;

    // allow the placeholder to paint before fetching to reduce perceived jank
    requestAnimationFrame(() => requestAnimationFrame(() => { 
      const url = bust(jsonFor(seasonToLoad)); 
      fetchWithRetry(url, 1, 9000) 
        .then(episodes => { 
          if (!Array.isArray(episodes) || episodes.length === 0) { 
            wrap.innerHTML = `<div style="color:#fff;padding:28px 16px;">No episodes for this season.</div>`; 
            if (doSmooth) restoreScroll(savedScrollY); 
            wrap.classList.remove('is-loading'); 
            wrap.style.minHeight = prevMin;
            htmlEl.style.scrollBehavior = prevScrollBehavior;
            return; 
          } 

          // Build episodes scroller HTML
          const scrollerHtml = `<div class="pro-episodes-row-pro" role="list">` + episodes.map(ep => { 
            const episodeUrl = ep.shortlink 
              ? ep.shortlink 
              : `episode.html?series=${encodeURIComponent(slug)}&season=${encodeURIComponent(seasonToLoad)}&ep=${encodeURIComponent(ep.ep)}&lang=${encodeURIComponent(lang)}`; 
            const extra = ep.shortlink ? 'target="_blank" rel="noopener"' : ''; 
            const thumb = (ep.thumb && ep.thumb.trim()) ? ep.thumb : 'default-thumb.jpg'; 
            return ` 
              <a class="pro-episode-card-pro reveal-anim" href="${episodeUrl}" ${extra} aria-label="Episode ${ep.ep}" role="listitem"> 
                <div class="pro-ep-thumb-wrap-pro" aria-hidden="true"> 
                  <img src="${thumb}" class="pro-ep-thumb-pro" alt="Ep ${ep.ep} thumbnail" loading="lazy"> 
                  <span class="pro-ep-num-pro">Ep ${ep.ep}</span> 
                </div> 
                <div class="pro-ep-title-pro">${ep.title || ('Episode ' + ep.ep)}</div> 
              </a> 
            `; 
          }).join('') + `</div>`; 

          // Tutorial blocks (kept below)
          const tutorialHtml = ` 
            <section class="pro-highlight-section" aria-hidden="false"> 
              <div class="pro-highlight-title">How to Watch Episodes</div> 
            </section> 
            <section class="pro-video-card" aria-label="How to Watch video"> 
              <div class="pro-video-frame-wrap">${HOWTO_PROCESS_1}</div> 
            </section> 
            <section class="pro-highlight-section" aria-hidden="false"> 
              <div class="pro-highlight-title">How to Watch (Old Process)</div> 
            </section> 
            <section class="pro-video-card" aria-label="How to Watch old process video"> 
              <div class="pro-video-frame-wrap">${HOWTO_PROCESS_2}</div> 
            </section> 
          `; 

          // Replace content in one go
          wrap.innerHTML = scrollerHtml + tutorialHtml;

          // small deferred activation: reveal items with stagger
          const scroller = wrap.querySelector('.pro-episodes-row-pro'); 
          if (scroller) { 
            const items = Array.from(scroller.querySelectorAll('.reveal-anim')); 
            items.forEach((c, i) => { 
              // start hidden (CSS already sets this), then add 'in' to trigger transition
              setTimeout(() => { 
                c.classList.add('in'); 
              }, 60 + i * 28); 
            }); 
          } 

          // remove loading state
          wrap.classList.remove('is-loading'); 

          // ensure nothing retains focus (prevents some mobile jumps)
          try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch(e){} 

          // restore scroll (deferred so layout is stable)
          restoreScroll(savedScrollY);

          // restore prior minHeight after a short delay so layout has settled
          setTimeout(()=> { wrap.style.minHeight = prevMin; htmlEl.style.scrollBehavior = prevScrollBehavior; }, 360);
        }) 
        .catch(err => { 
          wrap.innerHTML = `<div style="color:#fff;padding:28px 16px;">Could not load episodes. Please try again.</div>`; 
          wrap.classList.remove('is-loading'); 
          toast('Episode file missing or network error'); 
          restoreScroll(savedScrollY); 
          wrap.style.minHeight = prevMin;
          htmlEl.style.scrollBehavior = prevScrollBehavior;
          console.warn('renderSeason error', err); 
        }); 
    })); 
  }

  // fetch with one retry (retries times)
  function fetchWithRetry(url, retries = 1, timeout = 8000) { 
    return new Promise((resolve, reject) => { 
      let attempts = 0; 
      function doFetch() { 
        attempts++; 
        const controller = new AbortController(); 
        const timer = setTimeout(() => controller.abort(), timeout); 
        fetch(url, { signal: controller.signal, cache: 'no-cache' }) 
          .then(res => { clearTimeout(timer); if (!res.ok) throw new Error('bad response ' + res.status); return res.json(); }) 
          .then(json => resolve(json)) 
          .catch(err => { 
            clearTimeout(timer); 
            if (attempts <= retries) { setTimeout(doFetch, 350); } else { reject(err); } 
          }); 
      } 
      doFetch(); 
    }); 
  }

  // Restore scroll position if provided. If null -> do nothing.
  function restoreScroll(savedY) { 
    if (savedY == null) return; 
    // Wait a couple frames for layout to finish before restoring
    requestAnimationFrame(() => { 
      requestAnimationFrame(() => { 
        try { 
          // Use 'auto' which is supported
          window.scrollTo({ top: savedY, left: 0, behavior: 'auto' }); 
        } catch (err) { 
          window.scrollTo(0, savedY); 
        } 
      }); 
    }); 
  }

})();
