// clips.js — updated: poster cover + play overlay + tap-to-load immediate embed + lazy on scroll
(async function(){
  const FEED_PATH = '/clips.json'; // adjust if stored elsewhere
  const feedEl = document.getElementById('clips-feed');
  if (!feedEl) return;

  async function fetchClips() {
    try {
      const res = await fetch(FEED_PATH, { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const arr = await res.json();
      if (!Array.isArray(arr)) return [];
      const withAdded = arr.filter(c => c.added).slice();
      if (withAdded.length) {
        return arr.slice().sort((a,b) => {
          const da = a.added ? Date.parse(a.added) : 0;
          const db = b.added ? Date.parse(b.added) : 0;
          return db - da;
        });
      }
      return arr.slice().reverse();
    } catch (err) {
      console.error('clips fetch error', err);
      return [];
    }
  }

  function createEl(tag, props = {}, children = []) {
    const el = document.createElement(tag);
    for (const k in props) {
      if (k === 'className') el.className = props[k];
      else if (k === 'html') el.innerHTML = props[k];
      else el.setAttribute(k, props[k]);
    }
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (!c) return;
      if (typeof c === 'string') el.appendChild(document.createTextNode(c));
      else el.appendChild(c);
    });
    return el;
  }

  function buildClipNode(clip, idx) {
    const article = createEl('article', { className: 'clip-card', 'data-clip-id': clip.id || ('clip' + idx) });

    const meta = createEl('div', { className: 'clip-meta' }, [
      createEl('div', { className: 'clip-title' }, clip.title || 'Clip'),
      createEl('div', { className: 'clip-sub' }, clip.added ? (new Date(clip.added)).toLocaleString() : '')
    ]);

    const wrap = createEl('div', { className: 'clip-iframe-wrap' });
    wrap.style.position = 'relative';

    // thumbnail (if provided) - acts as poster/cover
    if (clip.thumb) {
      const img = createEl('img', { className: 'clip-thumb', src: clip.thumb, alt: clip.title || 'Clip thumbnail', loading: 'lazy' });
      wrap.appendChild(img);
    } else {
      // subtle gradient background if no thumb
      wrap.style.background = 'linear-gradient(180deg,#071022,#0b0f18)';
    }

    // holder for iframe (we fill src on demand)
    const holder = createEl('div', { className: 'clip-iframe-holder', 'data-embed': clip.embed || '' });
    holder.style.width = '100%';
    holder.style.height = '100%';
    holder.dataset.loaded = 'false';
    wrap.appendChild(holder);

    // small bottom-left rounded Play button (like reels)
    const playBtn = createEl('button', { className: 'clip-play-btn', type: 'button', title: 'Play' }, [
      createEl('i', { className: 'fa-solid fa-play' }), ' Play'
    ]);
    playBtn.style.border = 'none';
    playBtn.style.cursor = 'pointer';
    wrap.appendChild(playBtn);

    // center semi-transparent play for visual cue
    const center = createEl('div', { className: 'center-play', role: 'button', title: 'Play' }, '▶');
    wrap.appendChild(center);

    // description
    const desc = clip.desc ? createEl('div', { className: 'clip-desc' }, clip.desc) : null;

    article.appendChild(meta);
    article.appendChild(wrap);
    if (desc) article.appendChild(desc);

    // click handlers: immediate load on click of card, play btn, or center
    function loadNow() {
      if (holder.dataset.loaded === 'true') return;
      const embed = holder.dataset.embed && holder.dataset.embed.trim();
      if (!embed) {
        // fallback: open on Rumble in new tab
        if (clip.rumble_url) window.open(clip.rumble_url, '_blank');
        return;
      }
      // create iframe and insert
      const ifr = document.createElement('iframe');
      ifr.setAttribute('frameborder','0');
      ifr.setAttribute('allowfullscreen','');
      ifr.width = '100%'; ifr.height = '100%';
      // If embed already contains full iframe url, use it; else assume it's embed src
      const src = embed.indexOf('iframe') !== -1 ? embed : embed;
      ifr.src = src;
      // clear existing holder children (poster) so iframe sits on top
      holder.innerHTML = '';
      holder.appendChild(ifr);
      holder.dataset.loaded = 'true';
      // hide center play and poster smoothly
      const thumb = wrap.querySelector('.clip-thumb');
      if (thumb) thumb.style.display = 'none';
      center.style.display = 'none';
      // keep playBtn visible to allow user to click for something (but optional)
    }

    // attach click
    playBtn.addEventListener('click', (e) => { e.stopPropagation(); loadNow(); });
    center.addEventListener('click', (e) => { e.stopPropagation(); loadNow(); });
    article.addEventListener('click', (e) => {
      // if clicking controls inside the embed, ignore
      if (e.target.closest('.clip-play-btn') || e.target.closest('.clip-iframe-holder')) return;
      loadNow();
    });

    return article;
  }

  // lazy-load when mostly visible
  function setupObserver(rootEl) {
    const options = { root: rootEl, rootMargin: '0px', threshold: 0.6 };
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const el = entry.target;
        const holder = el.querySelector('.clip-iframe-holder');
        if (!holder) return;
        if (entry.isIntersecting && holder.dataset.loaded === 'false') {
          // load lazily after a tiny delay so quick scrolls don't eagerly load many
          setTimeout(() => {
            if (holder.dataset.loaded === 'false') {
              const embed = holder.dataset.embed;
              if (embed) {
                // create iframe but keep poster hidden only after load
                const ifr = document.createElement('iframe');
                ifr.setAttribute('frameborder','0');
                ifr.setAttribute('allowfullscreen','');
                ifr.width = '100%'; ifr.height = '100%';
                ifr.src = embed;
                holder.appendChild(ifr);
                holder.dataset.loaded = 'true';
                // hide central play after small fade
                const center = el.querySelector('.center-play');
                if (center) center.style.display = 'none';
                const thumb = el.querySelector('.clip-thumb');
                if (thumb) thumb.style.display = 'none';
              }
            }
          }, 300);
        }
      });
    }, options);

    rootEl.querySelectorAll('.clip-card').forEach(card => io.observe(card));
    return io;
  }

  // arrow / page keyboard nav (smooth center)
  function setupKeyboardNav(rootEl) {
    window.addEventListener('keydown', (ev) => {
      const keys = ['ArrowDown','ArrowUp','PageDown','PageUp'];
      if (!keys.includes(ev.key)) return;
      const cards = Array.from(rootEl.querySelectorAll('.clip-card'));
      if (!cards.length) return;
      const centerY = rootEl.scrollTop + (rootEl.clientHeight / 2);
      let current = cards.findIndex(c => {
        const top = c.offsetTop;
        const bottom = top + c.offsetHeight;
        return centerY >= top && centerY <= bottom;
      });
      if (current === -1) current = Math.max(0, cards.findIndex(c => c.offsetTop >= rootEl.scrollTop));
      if (ev.key === 'ArrowDown' || ev.key === 'PageDown') current = Math.min(cards.length - 1, current + 1);
      if (ev.key === 'ArrowUp' || ev.key === 'PageUp') current = Math.max(0, current - 1);
      const target = cards[current];
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      ev.preventDefault();
    }, { passive: false });
  }

  // render feed
  feedEl.innerHTML = '<div class="clips-loading">Loading clips…</div>';
  const clips = await fetchClips();
  feedEl.innerHTML = '';
  if (!clips || clips.length === 0) {
    feedEl.innerHTML = '<div class="clips-loading">No clips yet.</div>';
    return;
  }

  clips.forEach((c,i) => feedEl.appendChild(buildClipNode(c, i)));
  // start at top
  feedEl.scrollTop = 0;

  // set up observer & keyboard nav
  setupObserver(feedEl);
  setupKeyboardNav(feedEl);

  // convenience refresh
  window.smtvClipsRefresh = async function() {
    const latest = await fetchClips();
    feedEl.innerHTML = '';
    latest.forEach((c,i) => feedEl.appendChild(buildClipNode(c,i)));
    setupObserver(feedEl);
  };
})();
