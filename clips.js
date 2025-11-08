// clips.js — reel-style viewer with autoplay & fullscreen overlay + swipe up/down navigation
(function(){
  'use strict';

  const FEED_PATH = './clips.json'; // keep same folder
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

  // build iframe element from an embed URL
  function buildIframeFromUrl(url){
    try {
      // add autoplay param if not present
      let src = String(url);
      if (!/autoplay=/.test(src)) {
        src += (src.includes('?') ? '&' : '?') + 'autoplay=1';
      }
      const iframe = document.createElement('iframe');
      iframe.className = 'reel-iframe';
      iframe.setAttribute('src', src);
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('loading', 'lazy');
      // allow autoplay features
      iframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
      return iframe;
    } catch (e) {
      return null;
    }
  }

  // create the standard card shown in list (Play opens full-screen overlay)
  function createClipCard(item, index, onPlay){
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
    playBtn.innerHTML = '▶ Play';
    playBtn.addEventListener('click', () => onPlay(index));

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

  // overlay reel player
  function createOverlay(clips, startIndex){
    // overlay elements
    const overlay = document.createElement('div');
    overlay.className = 'reel-overlay';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-label','Clips viewer');
    overlay.tabIndex = -1;

    const counter = document.createElement('div');
    counter.className = 'reel-counter';
    overlay.appendChild(counter);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'reel-close';
    closeBtn.type = 'button';
    closeBtn.innerText = 'Close';
    closeBtn.addEventListener('click', closeOverlay);
    overlay.appendChild(closeBtn);

    const playerContainer = document.createElement('div');
    playerContainer.className = 'reel-player';
    overlay.appendChild(playerContainer);

    const hint = document.createElement('div');
    hint.className = 'reel-swipe-hint';
    hint.innerText = 'Swipe up/down to navigate';
    overlay.appendChild(hint);

    let idx = startIndex;
    let currentIframe = null;

    function showIndex(i){
      if (i < 0) i = 0;
      if (i >= clips.length) i = clips.length - 1;
      idx = i;
      counter.innerText = `${idx+1} / ${clips.length}`;
      // remove existing iframe
      playerContainer.innerHTML = '';
      currentIframe = null;
      // build iframe and append
      const url = clips[idx].embed || '';
      const iframe = buildIframeFromUrl(url);
      if (!iframe) {
        playerContainer.innerHTML = `<div style="color:#fff;padding:20px;">Cannot load clip</div>`;
        return;
      }
      playerContainer.appendChild(iframe);
      currentIframe = iframe;
      // try request fullscreen for immersive feel (best effort)
      try {
        // allow user gesture triggered: requestFullscreen on playerContainer element
        if (playerContainer.requestFullscreen) {
          playerContainer.requestFullscreen().catch(()=>{ /* ignore */ });
        } else if (playerContainer.webkitRequestFullscreen) {
          playerContainer.webkitRequestFullscreen();
        }
      } catch(e){}
    }

    // navigation helpers
    function next(){
      if (idx < clips.length - 1) { showIndex(idx+1); }
      else { /* bounce / end */ hintFlash('End of clips'); }
    }
    function prev(){
      if (idx > 0) { showIndex(idx-1); }
      else { hintFlash('Start of clips'); }
    }

    // small hint flash
    function hintFlash(text){
      hint.innerText = text;
      setTimeout(()=> { hint.innerText = 'Swipe up/down to navigate'; }, 900);
    }

    // touch swipe handling
    let startY = null;
    let startTime = 0;
    overlay.addEventListener('touchstart', function(e){
      const t = e.touches && e.touches[0];
      if (!t) return;
      startY = t.clientY;
      startTime = Date.now();
    }, {passive:true});
    overlay.addEventListener('touchend', function(e){
      if (startY == null) return;
      const t = (e.changedTouches && e.changedTouches[0]) || null;
      if (!t) { startY = null; return; }
      const dy = startY - t.clientY; // positive => swipe up
      const dt = Date.now() - startTime;
      startY = null;
      // threshold
      if (Math.abs(dy) < 40 || dt > 800) return;
      if (dy > 0) next(); else prev();
    }, {passive:true});

    // mouse wheel (desktop) to navigate
    let wheelDebounce = 0;
    overlay.addEventListener('wheel', function(e){
      const now = Date.now();
      if (now < wheelDebounce) return;
      wheelDebounce = now + 250;
      if (e.deltaY > 0) next(); else prev();
    });

    // keyboard navigation: ArrowUp/ArrowDown/Escape
    overlay.addEventListener('keydown', function(e){
      if (e.key === 'ArrowUp') { e.preventDefault(); prev(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); next(); }
      else if (e.key === 'Escape') { closeOverlay(); }
    });

    // close overlay
    function closeOverlay(){
      try {
        // exit fullscreen if active
        if (document.fullscreenElement) {
          document.exitFullscreen && document.exitFullscreen().catch(()=>{});
        }
      } catch(e){}
      overlay.remove();
      // restore focus to root
      try { root && root.focus && root.focus(); } catch(e){}
    }

    // attach to DOM
    document.body.appendChild(overlay);
    // set initial focus for keyboard events
    try { overlay.focus(); } catch(e){}

    showIndex(idx);

    return { overlay, showIndex, closeOverlay };
  }

  // load feed and render cards
  async function loadClips(){
    try {
      const res = await fetch(FEED_PATH, { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP '+res.status);
      const json = await res.json();
      if (!Array.isArray(json)) throw new Error('Invalid JSON — expected array');

      // Normalize and sort newest-first by added ISO date (fallback to file order: last item = newest)
      const normalized = json.map((c, idx) => {
        const ts = c.added ? Date.parse(c.added) : null;
        return Object.assign({ __idx: idx, __ts: Number.isFinite(ts) ? ts : null }, c);
      });

      const anyTs = normalized.some(x => x.__ts !== null);
      const sorted = anyTs
        ? normalized.sort((a,b) => (b.__ts || 0) - (a.__ts || 0) || (b.__idx - a.__idx))
        : normalized.slice().reverse();

      if (loadingEl) loadingEl.remove();

      if (sorted.length === 0) {
        root.innerHTML = '<div class="loading">No clips yet.</div>';
        return;
      }

      // convert to array and attach play handler that opens overlay
      const clipsArray = sorted.map(x => x);

      // render cards (newest first)
      clipsArray.forEach((item, idx) => {
        const card = createClipCard(item, idx, (indexToPlay) => {
          // open overlay starting at this index
          const overlay = createOverlay(clipsArray, indexToPlay);
          // overlay returns object but we don't need to store globally
        });
        root.appendChild(card);
      });

    } catch (err) {
      console.error('clips load error', err);
      if (loadingEl) loadingEl.textContent = 'Could not load clips.';
      else root.innerHTML = '<div class="error">Could not load clips. Try again later.</div>';
    }
  }

  loadClips();

})();
