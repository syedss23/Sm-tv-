/* ============================================================
   SmTv Urdu — index.js  (vanilla JS, no frameworks)
   ALL FIXES:
   - Schedule: robust JSON parsing, works with time:false
   - Hero: fully visible thumb, no crop, shortlink redirect
   - Series/Search/Rec: small portrait 2/3 cards
   - Filter pills: blue primary, gold secondary
   - Shortlink: properly intercepts h-watch-btn
   ============================================================ */
'use strict';

/* ── Shared promises ── */
const seriesReady = fetch('series.json')
  .then(r => r.ok ? r.json() : []).catch(() => []);

const episodesReady = fetch('episode-data/index.json')
  .then(r => r.ok ? r.json() : [])
  .then(files => Promise.all(
    files.map(path =>
      fetch(path)
        .then(r => r.ok ? r.json() : [])
        .then(data => (Array.isArray(data) ? data : []).map(ep => ({ ...ep, _src: path })))
        .catch(() => [])
    )
  ))
  .then(arrs => arrs.flat())
  .catch(() => []);

const configReady = fetch('/config.json', { cache: 'no-cache' })
  .then(r => r.ok ? r.json() : null).catch(() => null);

/* ============================================================
   UTILITIES
   ============================================================ */

/** Detect lang code from episode-data filename */
function detectLang(src = '') {
  const LANGS = ['en', 'ur', 'hi', 'ar', 'sp'];
  const file  = src.split('/').pop().replace(/\.json$/i, '');
  const parts = file.split('-');
  // Drop the last part if it's the season token (s1, s2 …)
  const withoutSeason = parts.filter(p => !/^s\d+$/i.test(p));
  for (const p of withoutSeason) {
    if (LANGS.includes(p.toLowerCase())) return p.toLowerCase();
  }
  return null; // dubbed
}

/** Build episode watch URL from episode object */
function buildEpisodeUrl(ep) {
  try {
    const raw = (ep._src || '').replace(/^\/+/, '');
    // Strip lang tokens before season to get clean slug
    // e.g.  episode-data/kurulus-orhan-en-s1.json  -> slug=kurulus-orhan, season=1, lang=en
    const m = raw.match(/^episode-data\/(.+?)-s(\d+)(?:\.json)?$/i);
    if (!m) return ep.shortlink || ep.download || '#';

    const slug   = m[1];
    const season = m[2];
    const lang   = detectLang(raw);

    const p = new URLSearchParams();
    p.set('series', slug);
    p.set('season', season);
    if (ep.ep != null) p.set('ep', ep.ep);
    if (lang) p.set('lang', lang);

    return `episode.html?${p.toString()}`;
  } catch {
    return ep.shortlink || ep.download || '#';
  }
}

/** Reveal cards with IntersectionObserver */
function observeReveal(selector) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll(selector).forEach(el => io.observe(el));
}

/* ============================================================
   SIDEBAR
   ============================================================ */
function initSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const backdrop = document.getElementById('sb-backdrop');
  const openBtn  = document.getElementById('hdr-hamburger');
  const closeBtn = document.getElementById('sb-close');

  const open  = () => { sidebar.classList.add('open');  backdrop.classList.add('open');  document.body.style.overflow = 'hidden'; };
  const close = () => { sidebar.classList.remove('open'); backdrop.classList.remove('open'); document.body.style.overflow = ''; };

  openBtn?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);
}

/* ============================================================
   SPONSOR BANNER
   ============================================================ */
async function initSponsorBanner() {
  const config = await configReady;
  if (!config?.redirectionFeatures) return;
  const rf = config.redirectionFeatures;
  if (rf.shortlink === true && rf.sponsorPopup === false) {
    const banner = document.getElementById('sponsor-banner');
    if (!banner) return;
    banner.innerHTML = `
      <span class="spn-icon">📢</span>
      <div class="spn-info">
        <span class="spn-label">Ad Space Available</span>
        <span class="spn-name">Reach Thousands Daily</span>
      </div>
      <a href="https://t.me/Itz_me_zain1" target="_blank" rel="noopener" class="spn-btn"
         onclick="gtag('event','ad_inquiry_click',{location:'homepage_banner'});">Contact 💬</a>`;
  }
}

/* ============================================================
   HERO — cinema banner, swipe only, 5 s auto-rotate
   ============================================================ */
async function initHero() {
  const heroEl   = document.getElementById('hero');
  const slidesEl = document.getElementById('hero-slides');
  const dotsEl   = document.getElementById('hero-dots');
  if (!heroEl || !slidesEl || !dotsEl) return;

  const episodes = await episodesReady;
  const timed    = episodes.filter(ep => ep.timestamp);
  timed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const latest = timed.slice(0, 5);

  if (!latest.length) {
    heroEl.style.display = 'none';
    dotsEl.style.display = 'none';
    return;
  }

  slidesEl.innerHTML = latest.map((ep, i) => {
    const bg    = ep.poster || ep.thumb || '';
    const thumb = ep.thumb  || ep.poster || '';
    const url   = buildEpisodeUrl(ep);
    return `
      <div class="hero-slide${i === 0 ? ' active' : ''}" data-index="${i}">
        <div class="hero-bg" style="background-image:url('${bg}')"></div>
        <div class="hero-vignette"></div>
        <div class="hero-new-badge">NEW EPISODE</div>
        ${thumb ? `<img class="hero-thumb" src="${thumb}" alt="${ep.title||''}" loading="${i===0?'eager':'lazy'}">` : ''}
        <div class="hero-content">
          ${ep.series ? `<div class="hero-series-name">${ep.series}</div>` : ''}
          <div class="hero-ep-title">${ep.title || 'Episode ' + (ep.ep||'')}</div>
          <a href="${url}" class="hero-watch-btn h-watch-btn" data-src="${ep._src||''}" data-ep="${ep.ep||''}">▶ Watch Now</a>
        </div>
      </div>`;
  }).join('');

  dotsEl.innerHTML = latest.map((_, i) =>
    `<button class="hero-dot${i===0?' active':''}" data-i="${i}" aria-label="Slide ${i+1}"></button>`
  ).join('');

  const slides = slidesEl.querySelectorAll('.hero-slide');
  const dots   = dotsEl.querySelectorAll('.hero-dot');
  let cur = 0, autoT = null;

  const goTo = idx => {
    slides[cur].classList.remove('active');
    dots[cur].classList.remove('active');
    cur = (idx + slides.length) % slides.length;
    slides[cur].classList.add('active');
    dots[cur].classList.add('active');
  };

  const startAuto = () => { clearInterval(autoT); autoT = setInterval(() => goTo(cur + 1), 5000); };
  const stopAuto  = () => clearInterval(autoT);

  dots.forEach(d => d.addEventListener('click', () => { goTo(+d.dataset.i); startAuto(); }));

  let tx = 0;
  heroEl.addEventListener('touchstart', e => { tx = e.touches[0].clientX; stopAuto(); }, { passive: true });
  heroEl.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 40) goTo(dx < 0 ? cur + 1 : cur - 1);
    startAuto();
  }, { passive: true });

  startAuto();

  // Shortlink interception for hero watch buttons
  const config = await configReady;
  const rf = config?.redirectionFeatures;

  slidesEl.addEventListener('click', async e => {
    const btn = e.target.closest('.h-watch-btn');
    if (!btn) return;
    if (!rf?.shortlink || rf?.sponsorPopup) return; // let normal navigation work
    e.preventDefault();
    await handleShortlink(btn.getAttribute('href'));
  });
}

/* ============================================================
   SHORTLINK HANDLER (shared logic)
   ============================================================ */
async function handleShortlink(href) {
  try {
    const params = new URLSearchParams((href || '').split('?')[1] || '');
    const series = params.get('series');
    const season = params.get('season');
    const lang   = params.get('lang');
    const epNum  = params.get('ep');
    let jsonFile = `episode-data/${series}-s${season}`;
    if (lang) jsonFile += `-${lang}`;
    jsonFile += '.json';

    const res = await fetch(jsonFile);
    if (!res.ok) { location.href = href; return; }
    const eps   = await res.json();
    const found = (Array.isArray(eps) ? eps : []).find(ep => String(ep.ep) === String(epNum));
    if (found?.shortlink) {
      if (typeof gtag !== 'undefined') gtag('event', 'shortlink_redirect', { url: found.shortlink });
      location.href = found.shortlink;
    } else {
      location.href = href;
    }
  } catch { location.href = href; }
}

/* ============================================================
   SCHEDULE — vertical stacked cards
   ============================================================ */
async function initSchedule() {
  const wrap = document.getElementById('schedule-wrap');
  if (!wrap) return;

  let schedule = [];
  try {
    const r = await fetch('shedule.json');
    if (r.ok) schedule = await r.json();
  } catch {}

  if (!Array.isArray(schedule) || !schedule.length) {
    wrap.innerHTML = `<p style="color:var(--muted);padding:12px 4px;font-size:.9rem;">No schedule available.</p>`;
    return;
  }

  wrap.innerHTML = schedule.map(item => {
    const live      = !!item.live;
    const hasDay    = item.day  && item.day  !== 'false';
    const hasTime   = item.time && item.time !== 'false';
    const hasType   = item.type && item.type !== 'false';
    const hasCount  = item.countdown && item.countdown !== 'false';

    return `
      <div class="sched-card${live ? ' is-live' : ''}">
        ${item.poster ? `<img class="sched-thumb" src="${item.poster}" alt="${item.title||''}" loading="lazy">` : ''}
        <div class="sched-info">
          <div class="sched-title">${item.title||''}</div>
          <div class="sched-meta">
            ${hasDay  ? `<span class="sched-day">${item.day}</span>` : ''}
            ${hasDay && (hasTime || hasType) ? '<span class="sched-dot">•</span>' : ''}
            ${hasTime ? `<span class="sched-day" style="color:var(--blue-lt)">${item.time}</span>` : ''}
            ${hasType ? `${hasTime?'<span class="sched-dot">•</span>':''}<span class="sched-type">${item.type}</span>` : ''}
            ${live ? `<span class="sched-live">● LIVE</span>` : ''}
          </div>
          ${hasCount ? `<div class="sched-countdown" data-target="${item.countdown}"></div>` : ''}
        </div>
      </div>`;
  }).join('');

  // Countdown tickers
  wrap.querySelectorAll('.sched-countdown[data-target]').forEach(el => {
    const target = Date.parse(el.dataset.target);
    if (isNaN(target)) { el.textContent = ''; return; }
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { el.textContent = '🔴 Now Playing'; clearInterval(id); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      el.textContent = `Starts in ${h}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
    };
    tick();
    const id = setInterval(tick, 1000);
  });

  setTimeout(() => observeReveal('.sched-card'), 80);
}

/* ============================================================
   RECOMMENDED — horizontal scroll, portrait cards
   ============================================================ */
async function initRecommended() {
  const scroll = document.getElementById('rec-scroll');
  if (!scroll) return;

  const series = await seriesReady;
  let slugs = [];
  try {
    const r = await fetch('recommended.json');
    if (r.ok) slugs = await r.json();
  } catch {}

  let picks = [];
  if (Array.isArray(slugs) && slugs.length) {
    slugs.slice(0, 5).forEach(slug => {
      const s = series.find(x => x.slug === slug);
      if (s) picks.push(s);
    });
  }
  if (!picks.length) picks = series.slice(0, 5);

  scroll.innerHTML = picks.map((s, i) => `
    <a class="card" href="series.html?series=${s.slug}"
       style="flex:0 0 110px;width:110px;min-width:110px;transition-delay:${i*60}ms">
      <img src="${s.poster}" alt="${s.title}" loading="lazy" decoding="async">
      <div class="title">${s.title}</div>
    </a>`).join('');

  setTimeout(() => observeReveal('#rec-scroll .card'), 80);
}

/* ============================================================
   FILTER BAR + SERIES GRID
   ============================================================ */
async function initSeriesGrid() {
  const grid     = document.getElementById('series-grid');
  const pillDub  = document.getElementById('pill-dub');
  const pillSub  = document.getElementById('pill-sub');
  const subLangs = document.getElementById('sub-langs');
  if (!grid) return;

  // Show skeletons
  grid.innerHTML = Array(10).fill('<div class="skeleton"></div>').join('');

  const SERIES = await seriesReady;

  const qs = new URLSearchParams(location.search);
  const state = {
    track: qs.get('track') || localStorage.getItem('track')   || 'dubbed',
    lang:  qs.get('lang')  || localStorage.getItem('subLang') || 'en',
    q: ''
  };

  function setPrimary(track) {
    state.track = track;
    localStorage.setItem('track', track);
    [pillDub, pillSub].forEach(p => { if (!p) return; p.classList.remove('active'); p.setAttribute('aria-pressed','false'); });
    const active = track === 'dubbed' ? pillDub : pillSub;
    active?.classList.add('active');
    active?.setAttribute('aria-pressed','true');
    subLangs?.classList.toggle('visible', track === 'sub');
  }

  function setLang(lang) {
    state.lang = lang;
    localStorage.setItem('subLang', lang);
    subLangs?.querySelectorAll('.pill').forEach(b => {
      const on = b.dataset.lang === lang;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }

  function render() {
    let list = SERIES;
    if (state.track === 'dubbed') {
      list = list.filter(s => s.track === 'dubbed');
    } else {
      list = list.filter(s => s.track === 'sub' && s.subLang === state.lang);
    }
    if (state.q) list = list.filter(s => (s.title||'').toLowerCase().includes(state.q));

    if (!list.length) {
      grid.innerHTML = `<p style="color:var(--muted);padding:16px 4px;grid-column:1/-1;">No series found.</p>`;
      return;
    }
    grid.innerHTML = list.map((s, i) => `
      <a class="card" href="series.html?series=${s.slug}" style="transition-delay:${Math.min(i*40,400)}ms">
        <img src="${s.poster}" alt="${s.title}" loading="lazy" decoding="async">
        <div class="title">${s.title}</div>
      </a>`).join('');

    setTimeout(() => observeReveal('#series-grid .card'), 50);
  }

  setPrimary(state.track);
  setLang(state.lang);
  render();

  pillDub?.addEventListener('click', () => { setPrimary('dubbed'); render(); });
  pillSub?.addEventListener('click', () => { setPrimary('sub');    render(); });
  subLangs?.addEventListener('click', e => {
    const t = e.target.closest('.pill');
    if (t?.dataset.lang) { setLang(t.dataset.lang); render(); }
  });
}

/* ============================================================
   SEARCH OVERLAY
   ============================================================ */
async function initSearch() {
  const overlay  = document.getElementById('search-overlay');
  const openBtn  = document.getElementById('hdr-search');
  const cancelBtn= document.getElementById('srch-cancel');
  const input    = document.getElementById('srch-input');
  const clearBtn = document.getElementById('srch-clear');
  const results  = document.getElementById('srch-results');
  const status   = document.getElementById('srch-status');
  if (!overlay || !input) return;

  const SERIES = await seriesReady;

  const openOverlay = () => {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => input.focus(), 350);
    renderResults('');
  };
  const closeOverlay = () => {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    input.value = '';
    clearBtn.classList.remove('visible');
    results.innerHTML = '';
    status.textContent = '';
  };

  function renderResults(q) {
    const query = q.trim().toLowerCase();
    if (!query) {
      status.textContent = '';
      results.innerHTML = `
        <div class="srch-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <p>Type to search series…</p>
        </div>`;
      return;
    }
    const list = SERIES.filter(s => (s.title||'').toLowerCase().includes(query));
    status.textContent = list.length
      ? `Found ${list.length} result${list.length!==1?'s':''} for "${q.trim()}"`
      : '';

    if (!list.length) {
      results.innerHTML = `
        <div class="srch-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <p>No results for "<strong>${q.trim()}</strong>"</p>
        </div>`;
      return;
    }

    // Small portrait cards, same as grid
    results.innerHTML = list.map((s, i) => `
      <a class="card visible" href="series.html?series=${s.slug}"
         style="animation:srchCardIn .3s ${Math.min(i*40,280)}ms both ease;opacity:1;translate:none">
        <img src="${s.poster}" alt="${s.title}" loading="lazy" decoding="async">
        <div class="title">${s.title}</div>
      </a>`).join('');
  }

  openBtn?.addEventListener('click', openOverlay);
  cancelBtn?.addEventListener('click', closeOverlay);
  clearBtn?.addEventListener('click', () => { input.value=''; clearBtn.classList.remove('visible'); input.focus(); renderResults(''); });
  input?.addEventListener('input', e => {
    clearBtn.classList.toggle('visible', e.target.value.length > 0);
    renderResults(e.target.value);
  });
  document.addEventListener('keydown', e => { if (e.key==='Escape' && overlay.classList.contains('open')) closeOverlay(); });
}

/* ============================================================
   GLOBAL SHORTLINK HANDLER for .h-watch-btn outside hero
   ============================================================ */
async function initShortlinkHandler() {
  const config = await configReady;
  const rf = config?.redirectionFeatures;
  if (!rf?.shortlink || rf?.sponsorPopup) return;

  document.body.addEventListener('click', async e => {
    const btn = e.target.closest('.h-watch-btn');
    if (!btn) return;
    if (btn.closest('#hero-slides')) return; // hero handles its own
    e.preventDefault();
    await handleShortlink(btn.getAttribute('href'));
  });
}

/* ============================================================
   BOOT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initSponsorBanner();
  initHero();
  initSchedule();
  initRecommended();
  initSeriesGrid();
  initSearch();
  initShortlinkHandler();
});
