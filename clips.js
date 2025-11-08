// clips.js — handles clips.json where embed is a URL (not an iframe string)
(function(){
  'use strict';

  const FEED_PATH = './clips.json';
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

  // build iframe from URL (URL should be an embed URL like: https://rumble.com/embed/....)
  function buildIframeFromUrl(url){
    try {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('src', url);
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('loading', 'lazy');
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.setAttribute('allow', 'autoplay; fullscreen');
      return iframe;
    } catch (e) {
      return null;
    }
  }

  // create card element; iframe is injected only after Play click
  function createClipCard(item){
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

    playBtn.addEventListener('click', function(){
      // if iframe present, do nothing
      if (playerWrap.querySelector('iframe')) return;
      const url = item.embed || '';
      if (!url) { toast('Embed missing'); return; }
      const iframe = buildIframeFromUrl(url);
      if (!iframe) { toast('Invalid embed URL'); return; }
      // replace content
      playerWrap.innerHTML = '';
      playerWrap.appendChild(iframe);
      // try to focus the iframe (no scroll because we do not call scrollIntoView)
      try { iframe.setAttribute('tabindex','-1'); } catch(e){}
    });

    // append play button into placeholder bottom-left
    placeholder.appendChild(playBtn);
    playerWrap.appendChild(placeholder);

    const meta = document.createElement('div');
    meta.className = 'clip-meta';
    const titleHtml = `<div class="clip-title">${escapeHtml(item.title || '')}</div>`;
    const descHtml = `<div class="clip-desc">${escapeHtml(item.desc || '')}</div>`;
    meta.innerHTML = titleHtml + descHtml;

    const actions = document.createElement('div');
    actions.className = 'clip-actions';

    // Share
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

    // Open on Rumble (if we can derive a page URL)
    if (item.embed && typeof item.embed === 'string') {
      // Prefer an explicit "open" field; otherwise attempt to convert embed URL to public url
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

      // Append cards (newest first)
      sorted.forEach(item => {
        const card = createClipCard(item);
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
