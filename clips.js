// clips.js — lightweight clips/reels loader (drop-in)
(function(){
  'use strict';

  // Path to your clips feed (user said file path is correct)
  const FEED_PATH = './clips.json';

  const root = document.getElementById('clips-root');
  const loadingEl = document.getElementById('clips-loading');

  function el(html){ const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; }
  function toast(msg){
    try{
      const t = document.createElement('div');
      t.textContent = msg;
      t.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);background:#122231;color:#9fe6ff;padding:10px 14px;border-radius:9px;border:1px solid #2d4b6a;font-weight:700;z-index:99999';
      document.body.appendChild(t);
      setTimeout(()=>t.remove(),2600);
    }catch(e){console.warn(e)}
  }

  // Normalize clip: supports embed as iframe HTML OR embed as URL string
  function buildEmbedNode(embedValue){
    // if the clip embed contains "<iframe", insert as-is (sanity check)
    if (typeof embedValue === 'string' && embedValue.trim().startsWith('<iframe')){
      const wrapper = document.createElement('div');
      wrapper.innerHTML = embedValue.trim();
      const iframe = wrapper.querySelector('iframe');
      if (iframe) {
        iframe.setAttribute('loading','lazy');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.setAttribute('allowfullscreen','');
        return iframe;
      }
    }
    // else treat value as URL
    try {
      const url = embedValue && embedValue.trim();
      if (!url) return null;
      const ifr = document.createElement('iframe');
      ifr.className = 'rumble';
      ifr.setAttribute('loading','lazy');
      ifr.setAttribute('frameborder','0');
      ifr.setAttribute('allowfullscreen','');
      ifr.style.width = '100%';
      ifr.style.height = '100%';
      // if provided a full URL like "https://rumble.com/embed/..." use it as src
      ifr.src = url;
      return ifr;
    } catch(e){
      return null;
    }
  }

  // Build a single clip card element. We intentionally do NOT insert the iframe until user clicks Play.
  function renderClipCard(clip){
    const title = clip.title || 'Untitled';
    const desc = clip.desc || '';
    const thumb = clip.thumb || '';
    const embed = clip.embed || '';
    const openUrl = clip.open || ( (typeof embed === 'string' && embed.includes('rumble.com') && embed.indexOf('/embed/') > -1)
      ? embed.replace('/embed/','/') // attempt to convert embed url to watch url if possible
      : null
    );

    const card = document.createElement('article');
    card.className = 'clip-card';

    // player area placeholder
    const playerWrap = document.createElement('div');
    playerWrap.className = 'clip-player-wrap';

    const placeholder = document.createElement('div');
    placeholder.className = 'clip-placeholder';
    if (thumb) placeholder.style.backgroundImage = `url("${thumb}")`;
    placeholder.setAttribute('aria-hidden','true');

    // Play button
    const playBtn = document.createElement('button');
    playBtn.className = 'clip-play-btn';
    playBtn.type = 'button';
    playBtn.innerHTML = '▶ Play';

    // when clicked, create & insert the real iframe into playerWrap
    playBtn.addEventListener('click', function(){
      // guard: if iframe already exists, do nothing
      if (playerWrap.querySelector('iframe')) return;
      const embedNode = buildEmbedNode(embed);
      if (!embedNode) {
        toast('Embed not available');
        return;
      }
      // replace placeholder with iframe
      playerWrap.innerHTML = '';
      // make sure iframe fills area
      embedNode.style.width = '100%';
      embedNode.style.height = '100%';
      embedNode.setAttribute('allow','autoplay; fullscreen');
      playerWrap.appendChild(embedNode);
      // focus to keep keyboard users happy (but avoid auto-scroll)
      try { embedNode.setAttribute('tabindex','-1'); } catch(e){}
    });

    // append placeholder + play button to playerWrap
    placeholder.appendChild(playBtn);
    playerWrap.appendChild(placeholder);

    // meta area
    const meta = document.createElement('div');
    meta.className = 'clip-meta';
    meta.innerHTML = `<div class="clip-title">${escapeHtml(title)}</div>
                      <div class="clip-desc">${escapeHtml(desc)}</div>`;

    const actions = document.createElement('div');
    actions.className = 'clip-actions';

    // Share button (uses Web Share if available; falls back to copy link)
    const shareBtn = document.createElement('button');
    shareBtn.className = 'btn';
    shareBtn.type = 'button';
    shareBtn.innerHTML = 'Share';
    shareBtn.addEventListener('click', async function(){
      const url = openUrl || document.location.href;
      if (navigator.share) {
        try { await navigator.share({ title: title, text: desc, url: url }); return; } catch(e){ /* ignore */ }
      }
      try {
        await navigator.clipboard.writeText(url);
        toast('Link copied to clipboard');
      } catch(e) { toast('Could not copy link'); }
    });

    actions.appendChild(shareBtn);

    // Open on Rumble button (if we have an openUrl)
    if (openUrl) {
      const openBtn = document.createElement('a');
      openBtn.className = 'btn';
      openBtn.href = openUrl;
      openBtn.target = '_blank';
      openBtn.rel = 'noopener';
      openBtn.innerHTML = 'Open on Rumble';
      actions.appendChild(openBtn);
    }

    meta.appendChild(actions);

    // assemble card layout. On wide screens keep player left, meta right.
    // For simple fallback we append player then meta.
    card.appendChild(playerWrap);
    card.appendChild(meta);

    return card;
  }

  // helper to escape text for insertion to innerHTML when used
  function escapeHtml(s){
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"'`=\/]/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'}[c];
    });
  }

  // load feed and render
  async function loadFeed(){
    try {
      const res = await fetch(FEED_PATH, {cache:'no-cache'});
      if (!res.ok) throw new Error('HTTP '+res.status);
      const j = await res.json();
      if (!Array.isArray(j)) throw new Error('Invalid feed format (expected array)');

      // sort newest-first:
      const withDates = j.map((c, idx) => {
        let t = null;
        if (c.added) {
          const parsed = Date.parse(c.added);
          if (!Number.isNaN(parsed)) t = parsed;
        }
        // use explicit order index if no date (higher idx = later in file)
        return Object.assign({ __idx: idx, __ts: t }, c);
      });

      // If any have timestamps, sort by timestamp desc; otherwise preserve order but newest-first (reverse)
      const anyTs = withDates.some(x => x.__ts !== null);
      let sorted;
      if (anyTs) {
        sorted = withDates.sort((a,b) => {
          const ta = a.__ts || 0;
          const tb = b.__ts || 0;
          return tb - ta || b.__idx - a.__idx;
        });
      } else {
        sorted = withDates.slice().reverse(); // newest at top (file order newest at end)
      }

      // clear loading
      if (loadingEl) loadingEl.remove();

      // render cards
      if (sorted.length === 0) {
        root.innerHTML = '<div class="loading">No clips yet.</div>';
        return;
      }
      sorted.forEach(c => {
        const card = renderClipCard(c);
        root.appendChild(card);
      });
    } catch (err) {
      console.error('clips load error', err);
      if (loadingEl) loadingEl.textContent = 'Could not load clips.';
      else root.innerHTML = '<div class="error">Could not load clips. Try again later.</div>';
    }
  }

  // kick off
  loadFeed();

})();
