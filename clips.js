// clips.js — lazy Rumble embeds, single-active, mobile-first
(function(){
  const CLIPS_JSON = '/clips.json'; // change if your path differs
  const clipsListEl = document.getElementById('clips-list');
  const loadingEl = document.getElementById('clips-loading');

  if (!clipsListEl) {
    console.warn('clips.js: mount not found');
    return;
  }

  // keep track of currently active iframe (only one at a time)
  let activeEmbed = null;
  let activeCard = null;

  // build a clip card DOM
  function renderClipCard(clip) {
    const card = document.createElement('article');
    card.className = 'clip-card';
    card.setAttribute('role','listitem');
    card.dataset.clipId = clip.id || '';

    // media area (thumb + embed slot)
    const media = document.createElement('div');
    media.className = 'clip-media';
    media.innerHTML = `
      <img class="clip-thumb" src="${escapeAttr(clip.thumb)}" alt="${escapeAttr(clip.title)}">
      <div class="clip-embed-slot" data-embed="${escapeAttr(clip.embed)}" aria-hidden="true"></div>
      <div class="clip-overlay">
        <button class="btn-play" type="button" aria-label="Play ${escapeAttr(clip.title)}">▶ Play</button>
      </div>
    `;

    // meta
    const meta = document.createElement('div');
    meta.className = 'clip-meta';
    meta.innerHTML = `
      <h3 class="clip-title">${escapeHtml(clip.title || '')}</h3>
      <p class="clip-desc">${escapeHtml(clip.desc || '')}</p>
      <div class="clip-controls">
        <button class="small-btn" type="button" data-action="share">Share</button>
        <button class="small-btn" type="button" data-action="open">Open on Rumble</button>
      </div>
    `;

    // wire play button
    const playBtn = media.querySelector('.btn-play');
    playBtn.addEventListener('click', () => {
      ensureEmbedForCard(card, /*userInitiated*/ true);
      // scroll the card a bit into view on tall pages (smooth but not jumpy)
      try { card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch(e){}
    });

    // controls: share / open
    meta.querySelectorAll('.small-btn').forEach(btn=>{
      btn.addEventListener('click', (ev)=>{
        const action = btn.dataset.action;
        if (action === 'share') {
          navigator.share ? navigator.share({ title: clip.title, url: clip.embed }).catch(()=>{}) : copyToClipboard(clip.embed);
          btn.textContent = 'Shared';
          setTimeout(()=> btn.textContent = 'Share', 1200);
        } else if (action === 'open') {
          window.open(clip.embed, '_blank', 'noopener');
        }
      });
    });

    card.appendChild(media);
    card.appendChild(meta);
    return card;
  }

  // safe html escaping for text nodes
  function escapeHtml(s) { if (!s) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(s){ return (s===undefined || s===null) ? '' : String(s).replace(/"/g,'&quot;'); }

  // copy fallback
  function copyToClipboard(text){
    try { navigator.clipboard.writeText(text); alert('Link copied'); } catch(e){ prompt('Copy link', text); }
  }

  // Create iframe element for a given embed URL
  function createIframe(embedUrl){
    const ifr = document.createElement('iframe');
    ifr.setAttribute('allowfullscreen','');
    ifr.setAttribute('frameborder','0');
    ifr.setAttribute('loading','lazy');
    ifr.style.width = '100%';
    ifr.style.height = '100%';
    // the embedUrl is usually the full embed src like https://rumble.com/embed/v6yg466/?pub=...
    ifr.src = embedUrl;
    return ifr;
  }

  // Ensure embed is present for a card. If another embed is active, unload it first.
  function ensureEmbedForCard(card, userInitiated=false){
    if (!card) return;
    const slot = card.querySelector('.clip-embed-slot');
    if (!slot) return;
    // if this card already has iframe — nothing to do
    if (slot.querySelector('iframe')) {
      // mark active
      setActiveCard(card);
      return;
    }
    const embedUrl = slot.dataset.embed;
    if (!embedUrl) return;

    // unload previous active embed to save memory
    if (activeEmbed && activeCard && activeCard !== card) {
      unloadActiveEmbed();
    }

    // insert iframe
    const ifr = createIframe(embedUrl);
    slot.appendChild(ifr);
    slot.setAttribute('aria-hidden', 'false');
    setActiveCard(card);
  }

  function unloadActiveEmbed(){
    if (!activeCard) return;
    const slot = activeCard.querySelector('.clip-embed-slot');
    if (!slot) return;
    slot.innerHTML = ''; // remove iframe
    slot.setAttribute('aria-hidden','true');
    activeCard.classList.remove('active-embed');
    activeEmbed = null;
    activeCard = null;
  }

  function setActiveCard(card){
    if (activeCard && activeCard !== card) {
      // remove previous highlight
      activeCard.classList.remove('active-embed');
      // remove previous iframe to keep single active
      const prevSlot = activeCard.querySelector('.clip-embed-slot');
      if (prevSlot) prevSlot.innerHTML = ''; 
    }
    activeCard = card;
    activeEmbed = card.querySelector('iframe') || null;
    if (card) card.classList.add('active-embed');
  }

  // IntersectionObserver lazy loader: load when >60% visible, unload when <20%
  const observerOptions = { root: null, rootMargin: '0px', threshold: [0.2,0.6] };
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const card = entry.target;
      if (entry.intersectionRatio >= 0.6) {
        // visible enough -> lazy load embed but only if user hasn't forced another
        ensureEmbedForCard(card, false);
      } else if (entry.intersectionRatio < 0.2) {
        // if this card is not active (or even if it is) unload to save resources
        // only unload if it isn't the currently focused/active card (user may have tapped play)
        if (activeCard && activeCard !== card) {
          // safe to unload any non-active card
          const slot = card.querySelector('.clip-embed-slot');
          if (slot) slot.innerHTML = '';
        } else if (!activeCard) {
          // no user active — unload non-visible
          const slot = card.querySelector('.clip-embed-slot');
          if (slot) slot.innerHTML = '';
        }
      }
    });
  }, observerOptions);

  // load clips.json and render
  fetch(CLIPS_JSON, { cache:'no-cache' })
    .then(res => {
      if (!res.ok) throw new Error('clips.json not found');
      return res.json();
    })
    .then(arr => {
      loadingEl && (loadingEl.style.display = 'none');
      if (!Array.isArray(arr) || arr.length === 0) {
        clipsListEl.innerHTML = '<div style="color:#fff;padding:12px">No clips found.</div>';
        return;
      }
      // render all
      arr.forEach((clip) => {
        try {
          const card = renderClipCard(clip);
          clipsListEl.appendChild(card);
          // observe media area
          io.observe(card);
        } catch (e) {
          console.warn('render error for clip', clip, e);
        }
      });

      // On pagehide/unload cleanup to remove iframes
      window.addEventListener('pagehide', () => { document.querySelectorAll('.clip-embed-slot').forEach(s => s.innerHTML = '') });

      // keyboard: Space toggles embed load on the currently centered card (best-effort)
      document.addEventListener('keydown', (ev) => {
        if (ev.code === 'Space') {
          ev.preventDefault();
          const cards = Array.from(document.querySelectorAll('.clip-card'));
          // choose the one closest to viewport center
          let best = null; let bestScore = Infinity;
          const mid = window.scrollY + (window.innerHeight/2);
          cards.forEach(c => {
            const r = c.getBoundingClientRect();
            const center = window.scrollY + r.top + r.height/2;
            const score = Math.abs(center - mid);
            if (score < bestScore) { bestScore = score; best = c; }
          });
          if (best) ensureEmbedForCard(best, true);
        }
      });
    })
    .catch(err => {
      console.error('Failed to load clips.json', err);
      loadingEl && (loadingEl.textContent = 'Could not load clips.');
    });

})();
