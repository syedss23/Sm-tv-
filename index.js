/* ============================================================
   SmTv Urdu — index.js  (vanilla JS, no frameworks)
   ============================================================ */

'use strict';

/* ── Shared data promises (loaded once) ── */
const seriesReady   = fetch('series.json').then(r => r.ok ? r.json() : []).catch(() => []);
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
  .then(arrays => arrays.flat())
  .catch(() => []);

/* ── Config promise ── */
const configReady = fetch('/config.json', { cache: 'no-cache' })
  .then(r => r.ok ? r.json() : null)
  .catch(() => null);

/* ============================================================
   UTILITY
   ============================================================ */

/** Detect lang from episode-data filename */
function detectLang(src = '') {
  const file  = src.split('/').pop().replace('.json', '');
  const parts = file.split('-');
  const LANGS = ['en', 'ur', 'hi', 'ar', 'sp'];
  // Remove season token (sN)
  const filtered = parts.filter(p => !/^s\d+$/i.test(p));
  for (const p of filtered) {
    if (LANGS.includes(p.toLowerCase())) return p.toLowerCase();
  }
  return null; // dubbed
}

/** Build episode watch URL */
function buildEpisodeUrl(ep) {
  try {
    const raw = (ep._src || '').replace(/^\/+/, '');
    // episode-data/slug[-lang]-sN.json  or  episode-data/slug[-lang-sub]-sN.json
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

/** Intersection observer factory for slide-in / fade-up */
function observeReveal(selector, className = 'visible') {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add(className); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll(selector).forEach(el => io.observe(el));
}

/* ============================================================
   SIDEBAR
   ============================================================ */
function initSidebar() {
  const sidebar   = document.getElementById('sidebar');
  const backdrop  = document.getElementById('sb-backdrop');
  const openBtn   = document.getElementById('hdr-hamburger');
  const closeBtn  = document.getElementById('sb-close');

  function open()  { sidebar.classList.add('open');  backdrop.classList.add('open');  document.body.style.overflow = 'hidden'; }
  function close() { sidebar.classList.remove('open'); backdrop.classList.remove('open'); document.body.style.overflow = ''; }

  openBtn?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);
}

/* ============================================================
   SPONSOR BANNER
   ============================================================ */
async function initSponsorBanner() {
  const config = await configReady;
  if (!config) return;
  const rf = config.redirectionFeatures;
  if (!rf) return;
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
         onclick="gtag('event','ad_inquiry_click',{location:'homepage_banner'});">
        Contact 💬
      </a>`;
  }
}

/* ============================================================
   HERO — CINEMA BANNER (touch swipe, no arrows, 5 s auto)
   ============================================================ */
async function initHero() {
  const episodes = await episodesReady;
  const heroWrap = document.getElementById('hero');
  const dotsWrap = document.getElementById('hero-dots');
  if (!heroWrap || !dotsWrap) return;

  const timed = episodes.filter(ep => ep.timestamp);
  timed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const latest = timed.slice(0, 5);

  if (!latest.length) { heroWrap.style.display = 'none'; dotsWrap.style.display = 'none'; return; }

  const slidesEl = document.getElementById('hero-slides');

  // Build slides
  slidesEl.innerHTML = latest.map((ep, i) => {
    const bg     = ep.poster || ep.thumb || '';
    const thumb  = ep.thumb  || ep.poster || '';
    const series = ep.series || '';
    const title  = ep.title  || `Episode ${ep.ep || ''}`;
    const url    = buildEpisodeUrl(ep);
    return `
      <div class="hero-slide${i === 0 ? ' active' : ''}" data-index="${i}">
        <div class="hero-bg" style="background-image:url('${bg}')"></div>
        <div class="hero-vignette"></div>
        <div class="hero-new-badge">NEW EPISODE</div>
        ${thumb ? `<img class="hero-thumb" src="${thumb}" alt="${title}" loading="${i === 0 ? 'eager' : 'lazy'}">` : ''}
        <div class="hero-content">
          ${series ? `<div class="hero-series-name">${series}</div>` : ''}
          <div class="hero-ep-title">${title}</div>
          <a href="${url}" class="hero-watch-btn h-watch-btn">▶ Watch Now</a>
        </div>
      </div>`;
  }).join('');

  // Build dots
  dotsWrap.innerHTML = latest.map((_, i) =>
    `<button class="hero-dot${i === 0 ? ' active' : ''}" data-i="${i}" aria-label="Slide ${i + 1}"></button>`
  ).join('');

  // State
  let current  = 0;
  let autoTimer = null;
  const slides = slidesEl.querySelectorAll('.hero-slide');
  const dots   = dotsWrap.querySelectorAll('.hero-dot');

  function goTo(idx) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  }

  function startAuto() {
    stopAuto();
    autoTimer = setInterval(() => goTo(current + 1), 5000);
  }
  function stopAuto() { clearInterval(autoTimer); }

  dots.forEach(d => d.addEventListener('click', () => { goTo(+d.dataset.i); startAuto(); }));

  // Touch swipe
  let touchStartX = 0;
  heroWrap.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; stopAuto(); }, { passive: true });
  heroWrap.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) goTo(dx < 0 ? current + 1 : current - 1);
    startAuto();
  }, { passive: true });

  startAuto();

  // Shortlink handler
  const config = await configReady;
  const rf = config?.redirectionFeatures;
  slidesEl.addEventListener('click', async e => {
    const btn = e.target.closest('.h-watch-btn');
    if (!btn) return;
    if (!rf?.shortlink || rf?.sponsorPopup) return;
    e.preventDefault();
    const href = btn.getAttribute('href');
    try {
      const params = new URLSearchParams(href.split('?')[1] || '');
      const series = params.get('series');
      const season = params.get('season');
      const lang   = params.get('lang');
      const epNum  = params.get('ep');
      let jsonFile = `episode-data/${series}-s${season}`;
      if (lang) jsonFile += `-${lang}`;
      jsonFile += '.json';
      const res = await fetch(jsonFile);
      if (!res.ok) { location.href = href; return; }
      const eps = await res.json();
      const found = eps.find(ep => String(ep.ep) === String(epNum));
      if (found?.shortlink) {
        if (typeof gtag !== 'undefined') gtag('event', 'shortlink_redirect', { url: found.shortlink });
        location.href = found.shortlink;
      } else {
        location.href = href;
      }
    } catch { location.href = href; }
  });
}

/* ============================================================
   SCHEDULE
   ============================================================ */
async function initSchedule() {
  const wrap = document.getElementById('schedule-wrap');
  if (!wrap) return;

  let schedule = [];
  try {
    const r = await fetch('shedule.json');
    schedule = r.ok ? await r.json() : [];
  } catch {}

  if (!Array.isArray(schedule) || !schedule.length) {
    wrap.innerHTML = `<p style="color:var(--muted);padding:12px 4px;font-size:.9rem;">No schedule available.</p>`;
    return;
  }

  wrap.innerHTML = schedule.map(item => `
    <div class="sched-card${item.live ? ' is-live' : ''}">
      ${item.poster ? `<img class="sched-thumb" src="${item.poster}" alt="${item.title || ''}" loading="lazy">` : ''}
      <div class="sched-info">
        <div class="sched-title">${item.title || ''}</div>
        <div class="sched-meta">
          ${item.day  ? `<span class="sched-day">${item.day}</span>` : ''}
          ${item.day && (item.time || item.type) ? '<span class="sched-dot">•</span>' : ''}
          ${item.time ? `<span class="sched-day" style="color:var(--cyan)">${item.time}</span>` : ''}
          ${item.type ? `<span class="sched-dot">•</span><span class="sched-type">${item.type}</span>` : ''}
          ${item.live ? `<span class="sched-live">● LIVE</span>` : ''}
        </div>
        ${item.countdown ? `<div class="sched-countdown" data-target="${item.countdown}"></div>` : ''}
      </div>
    </div>
  `).join('');

  // Countdown tickers
  wrap.querySelectorAll('.sched-countdown[data-target]').forEach(el => {
    const target = Date.parse(el.dataset.target);
    if (isNaN(target)) return;
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

  // Reveal animation
  setTimeout(() => observeReveal('.sched-card'), 100);
}

/* ============================================================
   RECOMMENDED
   ============================================================ */
async function initRecommended() {
  const scroll = document.getElementById('rec-scroll');
  if (!scroll) return;

  const series = await seriesReady;

  let slugs = [];
  try {
    const r = await fetch('recommended.json');
    slugs = r.ok ? await r.json() : [];
  } catch {}

  let picks = [];
  if (Array.isArray(slugs) && slugs.length) {
    slugs.slice(0, 5).forEach(slug => {
      const s = series.find(x => x.slug === slug);
      if (s) picks.push(s);
    });
  }
  if (!picks.length) picks = series.slice(0, 5);

  scroll.innerHTML = picks.map(s => `
    <a class="card" href="series.html?series=${s.slug}" style="flex:0 0 130px;width:130px;">
      <img src="${s.poster}" alt="${s.title}" loading="lazy">
      <div class="title">${s.title}</div>
    </a>
  `).join('');

  setTimeout(() => observeReveal('#rec-scroll .card'), 100);
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

  // Skeleton loaders
  grid.innerHTML = Array(8).fill('<div class="skeleton"></div>').join('');

  const SERIES = await seriesReady;

  // Parse URL params then localStorage
  const qs = new URLSearchParams(location.search);
  const state = {
    track: qs.get('track') || localStorage.getItem('track')   || 'dubbed',
    lang:  qs.get('lang')  || localStorage.getItem('subLang') || 'en',
    q: ''
  };

  function setPrimary(track) {
    state.track = track;
    localStorage.setItem('track', track);
    pillDub?.classList.toggle('active', track === 'dubbed');
    pillSub?.classList.toggle('active', track === 'sub');
    pillDub?.setAttribute('aria-pressed', String(track === 'dubbed'));
    pillSub?.setAttribute('aria-pressed', String(track === 'sub'));
    if (subLangs) subLangs.classList.toggle('visible', track === 'sub');
  }

  function setLang(lang) {
    state.lang = lang;
    localStorage.setItem('subLang', lang);
    subLangs?.querySelectorAll('.pill').forEach(b => {
      const active = b.dataset.lang === lang;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
  }

  function render() {
    let list = SERIES;
    if (state.track === 'dubbed') {
      list = list.filter(s => s.track === 'dubbed');
    } else {
      list = list.filter(s => s.track === 'sub' && s.subLang === state.lang);
    }
    if (state.q) {
      list = list.filter(s => (s.title || '').toLowerCase().includes(state.q));
    }

    if (!list.length) {
      grid.innerHTML = `<p style="color:var(--muted);padding:16px 4px;grid-column:1/-1;">No series found.</p>`;
      return;
    }

    grid.innerHTML = list.map((s, i) => `
      <a class="card" href="series.html?series=${s.slug}" style="transition-delay:${Math.min(i * 40, 400)}ms">
        <img src="${s.poster}" alt="${s.title}" loading="lazy" decoding="async">
        <div class="title">${s.title}</div>
      </a>
    `).join('');

    setTimeout(() => observeReveal('#series-grid .card'), 50);
  }

  // Hydrate UI
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
  const overlay   = document.getElementById('search-overlay');
  const openBtn   = document.getElementById('hdr-search');
  const cancelBtn = document.getElementById('srch-cancel');
  const input     = document.getElementById('srch-input');
  const clearBtn  = document.getElementById('srch-clear');
  const results   = document.getElementById('srch-results');
  const status    = document.getElementById('srch-status');
  if (!overlay || !input) return;

  const SERIES = await seriesReady;

  function openOverlay() {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => input.focus(), 350);
    renderResults('');
  }

  function closeOverlay() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    input.value = '';
    clearBtn.classList.remove('visible');
    results.innerHTML = '';
    status.textContent = '';
  }

  function renderResults(q) {
    const query = q.trim().toLowerCase();
    if (!query) {
      status.textContent = '';
      results.innerHTML = `
        <div class="srch-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <p>Type to search series</p>
        </div>`;
      return;
    }

    const list = SERIES.filter(s => (s.title || '').toLowerCase().includes(query));
    status.textContent = list.length
      ? `Found ${list.length} result${list.length !== 1 ? 's' : ''} for "${q.trim()}"`
      : '';

    if (!list.length) {
      results.innerHTML = `
        <div class="srch-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <p>No results for "<strong>${q.trim()}</strong>"</p>
        </div>`;
      return;
    }

    results.innerHTML = list.map((s, i) => `
      <a class="card visible" href="series.html?series=${s.slug}"
         style="animation:srchCardIn 0.35s ${Math.min(i * 40, 300)}ms both ease;">
        <img src="${s.poster}" alt="${s.title}" loading="lazy" decoding="async">
        <div class="title">${s.title}</div>
      </a>
    `).join('');
  }

  openBtn?.addEventListener('click', openOverlay);
  cancelBtn?.addEventListener('click', closeOverlay);

  clearBtn?.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.remove('visible');
    input.focus();
    renderResults('');
  });

  input?.addEventListener('input', e => {
    const q = e.target.value;
    clearBtn.classList.toggle('visible', q.length > 0);
    renderResults(q);
  });

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeOverlay();
  });

  // Inject search card animation keyframe once
  if (!document.getElementById('srch-anim-style')) {
    const st = document.createElement('style');
    st.id = 'srch-anim-style';
    st.textContent = `@keyframes srchCardIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }`;
    document.head.appendChild(st);
  }
}

/* ============================================================
   SHORTLINK HANDLER for .h-watch-btn outside hero
   ============================================================ */
async function initShortlinkHandler() {
  const config = await configReady;
  const rf = config?.redirectionFeatures;
  if (!rf?.shortlink || rf?.sponsorPopup) return;

  document.body.addEventListener('click', async e => {
    const btn = e.target.closest('.h-watch-btn');
    if (!btn) return;
    // Hero handles its own; skip if already inside #hero
    if (btn.closest('#hero')) return;

    e.preventDefault();
    const href = btn.getAttribute('href') || '';
    try {
      const params  = new URLSearchParams(href.split('?')[1] || '');
      const series  = params.get('series');
      const season  = params.get('season');
      const lang    = params.get('lang');
      const epNum   = params.get('ep');
      let jsonFile  = `episode-data/${series}-s${season}`;
      if (lang) jsonFile += `-${lang}`;
      jsonFile += '.json';
      const res = await fetch(jsonFile);
      if (!res.ok) { location.href = href; return; }
      const eps  = await res.json();
      const found = eps.find(ep => String(ep.ep) === String(epNum));
      if (found?.shortlink) {
        if (typeof gtag !== 'undefined') gtag('event', 'shortlink_redirect', { url: found.shortlink });
        location.href = found.shortlink;
      } else {
        location.href = href;
      }
    } catch { location.href = href; }
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
