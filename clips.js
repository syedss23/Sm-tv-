// clips.js — updated: preload next/prev two clips + spinner progress indicator
(function(){
  'use strict';

  const FEED_PATH = './clips.json'; // adjust if needed
  const root = document.getElementById('clips-root');
  const loadingEl = document.getElementById('clips-loading');

  function toast(msg){
    try{
      const t = document.createElement('div');
      t.textContent = msg;
      t.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);background:#122231;color:#9fe6ff;padding:10px 14px;border-radius:9px;border:1px solid #2d4b6a;font-weight:700;z-index:99999';
      document.body.appendChild(t);
      setTimeout(()=>t.remove(),2600);
    }catch(e){console.warn(e)}
  }

  function escapeHtml(s){
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"'`=\/]/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'}[c];
    });
  }

  // Add autoplay param to embed URL
  function withAutoplay(url){
    if (!url) return url;
    let u = String(url);
    if (!/autoplay=/.test(u)) u += (u.includes('?') ? '&' : '?') + 'autoplay=1';
    return u;
  }

  // Build an iframe element from embed URL. Used for visible iframe + preloads.
  function buildIframe(url, opts = {}) {
    const iframe = document.createElement('iframe');
    iframe.className = 'reel-iframe';
    iframe.src = url;
    iframe.setAttribute('frameborder','0');
    iframe.setAttribute('allowfullscreen','');
    iframe.setAttribute('loading','lazy');
    iframe.setAttribute('allow','autoplay; fullscreen; encrypted-media; picture-in-picture');
    if (opts.hidden) {
      // keep in DOM (so browser loads) but hidden from layout
      iframe.style.display = 'none';
      iframe.setAttribute('aria-hidden','true');
    } else {
      iframe.style.display = '';
      iframe.removeAttribute('aria-hidden');
    }
    return iframe;
  }

  function createClipCard(item, index, playHandler){
    const card = document.createElement('article');
    card.className = 'clip-card';

    const playerWrap = document.createElement('div');
    playerWrap.className = 'clip-player-wrap';

    const placeholder = document.createElement('div');
    placeholder.className = 'clip-placeholder';
    if (item.thumb) placeholder.style.backgroundImage = `url("${item.thumb}")`;
    placeholder.setAttribute('aria-hidden','true');

    const playBtn = document.createElement('button');
    playBtn.className = 'clip-play-btn';
    playBtn.type = 'button';
    playBtn.innerText = '▶ Play';
    playBtn.addEventListener('click', () => playHandler(index));

    placeholder.appendChild(playBtn);
    playerWrap.appendChild(placeholder);

    const meta = document.createElement('div');
    meta.className = 'clip-meta';
    meta.innerHTML = `<div class="clip-title">${escapeHtml(item.title||'')}</div>
                      <div class="clip-desc">${escapeHtml(item.desc||'')}</div>`;

    const actions = document.createElement('div');
    actions.className = 'clip-actions';

    const shareBtn = document.createElement('button');
    shareBtn.className = 'btn';
    shareBtn.type = 'button';
    shareBtn.textContent = 'Share';
    shareBtn.addEventListener('click', async () => {
      const url = item.open || item.embed || location.href;
      if (navigator.share) {
        try { await navigator.share({ title: item.title, text: item.desc, url }); return; } catch(e){}
      }
      try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch(e){ toast('Copy failed'); }
    });
    actions.appendChild(shareBtn);

    if (item.embed && typeof item.embed === 'string') {
      const openUrl = item.open || (item.embed.includes('/embed/') ? item.embed.replace('/embed/','/') : null);
      if (openUrl) {
        const a = document.createElement('a');
        a.className = 'btn';
        a.href = openUrl;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = 'Open on Rumble';
        actions.appendChild(a);
      }
    }

    meta.appendChild(actions);
    card.appendChild(playerWrap);
    card.appendChild(meta);
    return card;
  }

  // opens full-screen pager overlay; returns controller object
  function openPager(clips, startIndex){
    const overlay = document.createElement('div');
    overlay.className = 'reel-overlay';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-label','Clips viewer');
    overlay.tabIndex = -1;

    const topGesture = document.createElement('div');
    topGesture.className = 'reel-top-gesture';
    overlay.appendChild(topGesture);

    const counter = document.createElement('div');
    counter.className = 'reel-counter';
    overlay.appendChild(counter);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'reel-close';
    closeBtn.type = 'button';
    closeBtn.innerText = 'Close';
    overlay.appendChild(closeBtn);

    const track = document.createElement('div');
    track.className = 'reel-track';
    overlay.appendChild(track);

    const hint = document.createElement('div');
    hint.className = 'reel-swipe-hint';
    hint.innerText = 'Swipe up/down to navigate • Esc to close';
    overlay.appendChild(hint);

    let idx = startIndex;
    const cache = {}; // { index: { iframe, url, loaded:Boolean, spinnerEl } }

    function setCounter(){
      counter.innerText = `${idx+1} / ${clips.length}`;
    }

    function createSlideElement(i){
      const slide = document.createElement('div');
      slide.className = 'reel-slide';
      slide.style.transform = `translateY(${(i - idx) * 100}%)`;
      slide.style.opacity = (i === idx) ? '1' : '0';
      slide.dataset.index = String(i);
      // spinner container (progress indicator)
      const spinner = document.createElement('div');
      spinner.className = 'reel-spinner';
      spinner.innerHTML = `<div class="reel-spinner-dot"></div>`;
      slide.appendChild(spinner);
      return slide;
    }

    function attachLoadHandler(entry, slide){
      // slide contains spinner element as last child
      const spinner = slide.querySelector('.reel-spinner');
      entry.spinnerEl = spinner;
      if (!entry.iframe) return;
      // show spinner until iframe reports load
      spinner.style.display = '';
      // ensure load handler attaches only once
      function onLoadOnce(){
        try { spinner.style.display = 'none'; } catch(e){}
        entry.loaded = true;
        entry.iframe.removeEventListener('load', onLoadOnce);
      }
      entry.iframe.addEventListener('load', onLoadOnce);
      // If iframe already loaded (cached), hide spinner immediately
      // Some browsers may already have fired load before listener attached; check readyState via contentWindow (not always accessible). Best-effort:
      // keep spinner visible until load event for cross-origin; otherwise it will hide when load fires.
    }

    async function showIndex(i, options = { requestFs: false }){
      if (i < 0) i = 0;
      if (i >= clips.length) i = clips.length - 1;
      const prevIdx = idx;
      idx = i;
      setCounter();

      // clear track and render three slides: prev, current, next
      track.innerHTML = '';

      const indexes = [idx-2, idx-1, idx, idx+1, idx+2].filter(j => j >= 0 && j < clips.length);
      for (const j of indexes) {
        const slide = createSlideElement(j);
        const cached = cache[j];
        // If cached iframe exists, use it
        if (cached && cached.iframe) {
          // append iframe (it may be hidden in cache)
          slide.appendChild(cached.iframe);
          // ensure visual hiding for non-current
          if (j !== idx) cached.iframe.style.display = 'none';
          else cached.iframe.style.display = '';
          attachLoadHandler(cached, slide);
        } else {
          // Build iframe: for current we use autoplay=1, for others autoplay=0
          const url = clips[j].embed || '';
          const autoplayUrl = (j === idx) ? withAutoplay(url) : (withAutoplay(url).replace(/autoplay=1/, 'autoplay=0'));
          const iframe = buildIframe(autoplayUrl, { hidden: (j !== idx) });
          slide.appendChild(iframe);
          cache[j] = { iframe, url: clips[j].embed, loaded: false, spinnerEl: null };
          attachLoadHandler(cache[j], slide);
        }
        track.appendChild(slide);
      }

      // animate slides into position
      Array.from(track.children).forEach(el => {
        const j = Number(el.dataset.index);
        el.style.transition = 'transform .36s cubic-bezier(.2,.9,.2,1), opacity .24s ease';
        el.style.transform = `translateY(${(j - idx) * 100}%)`;
        el.style.opacity = (j === idx) ? '1' : '0';
      });

      // ensure active iframe has autoplay=1 (replace src if needed)
      const currentEntry = cache[idx];
      if (currentEntry && currentEntry.iframe) {
        try {
          if (!/autoplay=1/.test(currentEntry.iframe.src)) {
            currentEntry.iframe.src = withAutoplay(currentEntry.url || currentEntry.iframe.src);
          }
          currentEntry.iframe.style.display = '';
        } catch(e){}
      }

      // pause non-visible iframes: ensure autoplay=0 for them to avoid multiple plays
      Object.keys(cache).forEach(k => {
        const key = Number(k);
        const entry = cache[key];
        if (!entry || !entry.iframe) return;
        if (key === idx) return;
        try {
          // change src to autoplay=0 variant to avoid simultaneous playback
          const noAuto = (entry.url && String(entry.url).replace(/([?&])autoplay=1/, '$1autoplay=0')) || entry.iframe.src;
          entry.iframe.style.display = 'none';
          entry.iframe.src = noAuto;
        } catch(e){}
      });

      // Preload next two & prev two (create hidden iframes if not cached)
      [idx+1, idx+2, idx-1, idx-2].forEach(k => {
        if (k >=0 && k < clips.length && !cache[k]) {
          try {
            const url = clips[k].embed || '';
            // preloaded iframes use autoplay=0
            const iframe = buildIframe(withAutoplay(url).replace(/autoplay=1/, 'autoplay=0'), { hidden: true });
            cache[k] = { iframe, url: clips[k].embed, loaded:false, spinnerEl:null };
            // append to track but hidden so browser initiates network
            // keep it attached but hidden to avoid layout reflow
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
          } catch(e){}
        }
      });

      // optional: remove far-away cache entries to free memory (keep -3..+3)
      Object.keys(cache).forEach(k => {
        const key = Number(k);
        if (Math.abs(key - idx) > 4) {
          try { cache[key].iframe && cache[key].iframe.remove(); } catch(e){}
          delete cache[key];
        }
      });

      // Request fullscreen on current slide if requested (user gesture context)
      try {
        if (options.requestFs && document.fullscreenEnabled) {
          const slideEl = track.querySelector('.reel-slide[data-index="'+idx+'"]');
          if (slideEl && slideEl.requestFullscreen) {
            slideEl.requestFullscreen().catch(()=>{});
          }
        }
      } catch(e){}
    }

    function next(){ if (idx < clips.length - 1) showIndex(idx+1, { requestFs: false }); else hintFlash('End of clips'); }
    function prev(){ if (idx > 0) showIndex(idx-1, { requestFs: false }); else hintFlash('Start of clips'); }
    function hintFlash(text){
      hint.innerText = text;
      setTimeout(()=> hint.innerText = 'Swipe up/down to navigate • Esc to close', 900);
    }

    // swipe detection (vertical)
    let startY = null, startTime = 0;
    overlay.addEventListener('touchstart', (ev) => {
      const t = ev.touches && ev.touches[0];
      if (!t) return;
      startY = t.clientY;
      startTime = Date.now();
    }, { passive: true });

    overlay.addEventListener('touchend', (ev) => {
      if (startY == null) return;
      const t = (ev.changedTouches && ev.changedTouches[0]) || null;
      if (!t) { startY = null; return; }
      const dy = startY - t.clientY; // positive => swipe up
      const dt = Date.now() - startTime;
      startY = null;
      if (Math.abs(dy) < 40 || dt > 800) return;
      if (dy > 0) next(); else prev();
    }, { passive: true });

    // Mouse wheel debounce for desktop
    let wheelDebounce = 0;
    overlay.addEventListener('wheel', (ev) => {
      const now = Date.now();
      if (now < wheelDebounce) return;
      wheelDebounce = now + 250;
      if (ev.deltaY > 0) next(); else prev();
    }, { passive:true });

    // keyboard
    overlay.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowUp') { ev.preventDefault(); prev(); }
      else if (ev.key === 'ArrowDown') { ev.preventDefault(); next(); }
      else if (ev.key === 'Escape') { close(); }
    });

    function close(){
      try {
        if (document.fullscreenElement) document.exitFullscreen && document.exitFullscreen().catch(()=>{});
      } catch(e){}
      overlay.remove();
      // cleanup cached iframes
      try {
        Object.values(cache).forEach(ent => {
          try { if (ent && ent.iframe) ent.iframe.remove(); } catch(_) {}
        });
      } catch(e){}
      try { root && root.focus && root.focus(); } catch(e){}
    }

    closeBtn.addEventListener('click', close);

    document.body.appendChild(overlay);
    try { overlay.focus(); } catch(e){}

    // show starting index, request fullscreen because user tapped Play (gesture)
    showIndex(startIndex, { requestFs: true });

    return { close, showIndex };
  }

  async function loadClips(){
    try{
      const r = await fetch(FEED_PATH, { cache: 'no-cache' });
      if (!r.ok) throw new Error('HTTP '+r.status);
      const json = await r.json();
      if (!Array.isArray(json)) throw new Error('Invalid feed format (expected array)');

      const normalized = json.map((c, idx) => {
        const ts = c.added ? Date.parse(c.added) : null;
        return Object.assign({ __idx: idx, __ts: Number.isFinite(ts) ? ts : null }, c);
      });
      const anyTs = normalized.some(x => x.__ts !== null);
      const sorted = anyTs ? normalized.sort((a,b) => (b.__ts || 0) - (a.__ts || 0) || (b.__idx - a.__idx)) : normalized.slice().reverse();

      if (loadingEl) loadingEl.remove();

      if (sorted.length === 0) {
        root.innerHTML = '<div class="loading">No clips yet.</div>';
        return;
      }

      const clipsArr = sorted.map(x => ({ id: x.id, title: x.title, desc: x.desc, thumb: x.thumb, embed: x.embed, added: x.added }));

      clipsArr.forEach((item, i) => {
        const card = createClipCard(item, i, (idxToPlay) => {
          openPager(clipsArr, idxToPlay);
        });
        root.appendChild(card);
      });

      // Optionally auto-open on mobile: currently commented to avoid surprising users
      // if (window.innerWidth <= 640) openPager(clipsArr, 0);

    }catch(err){
      console.error('clips load error', err);
      if (loadingEl) loadingEl.textContent = 'Could not load clips.';
      else root.innerHTML = '<div class="error">Could not load clips. Try again later.</div>';
    }
  }

  loadClips();

})();
