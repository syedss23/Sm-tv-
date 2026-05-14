'use strict';

/* ── Shared data promises ── */
const seriesReady = fetch('series.json').then(r => r.ok ? r.json() : []).catch(() => []);

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

/* ── Config (used for sponsor banner only) ── */
const configReady = fetch('/config.json', { cache: 'no-cache' })
  .then(r => r.ok ? r.json() : null).catch(() => null);

/* ============================================================
   UTILITY — build episode.html URL from episode object
   Same regex as old code that was proven to work
   ============================================================ */
function buildEpisodeUrl(ep) {
  const fallback = ep.shortlink || ep.download || '#';
  try {
    const raw = (ep._src || '').replace(/^\/+/, '');
    // e.g. episode-data/kurulus-orhan-ur-s1.json
    const m = raw.match(/^episode-data\/(.+?)-s(\d+)(?:-([a-z]{2,3}|dub))?\.json$/i);
    if (!m) return fallback;
    const slug   = m[1];
    const season = m[2];
    const lang   = (m[3] || '').toLowerCase();
    const params = new URLSearchParams();
    params.set('series', slug);
    params.set('season', season);
    if (ep.ep != null) params.set('ep', ep.ep);
    if (lang && lang !== 'dub') params.set('lang', lang);
    else if (lang === 'dub') params.set('lang', 'dub');
    return `episode.html?${params.toString()}`;
  } catch (e) {
    return fallback;
  }
}

/* ============================================================
   UTILITY — build episode JSON filename from episode URL
   (Same logic as old working shortlink handler)
   ============================================================ */
function buildJsonPath(episodeUrl) {
  try {
    const params = new URLSearchParams(episodeUrl.split('?')[1] || '');
    const series = params.get('series');
    const season = params.get('season');
    const lang   = params.get('lang');
    if (!series || !season) return null;
    let path = `episode-data/${series}-s${season}`;
    if (lang && lang !== 'dub') path += `-${lang}`;
    path += '.json';
    return { path, ep: params.get('ep'), lang };
  } catch { return null; }
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
    const b = document.getElementById('sponsor-banner');
    if (!b) return;
    b.innerHTML = `
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
   HERO — full-width cinematic banner
   The image fills 100% width × 100% height via object-fit:cover
   Shortlink: DIRECTLY fetch episode JSON (same as old working code)
   ============================================================ */
async function initHero() {
  const heroEl   = document.getElementById('hero');
  const slidesEl = document.getElementById('hero-slides');
  const dotsEl   = document.getElementById('hero-dots');
  if (!heroEl || !slidesEl || !dotsEl) return;

  const episodes = await episodesReady;
  const timed = episodes.filter(ep => ep.timestamp);
  timed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const latest = timed.slice(0, 5);

  if (!latest.length) { heroEl.style.display = 'none'; dotsEl.style.display = 'none'; return; }

  // Build slides — store _src and ep directly on the anchor element
  slidesEl.innerHTML = latest.map((ep, i) => {
    const bg    = ep.poster || ep.thumb || '';
    const thumb = ep.thumb  || ep.poster || '';
    const url   = buildEpisodeUrl(ep);
    // Escape src for safe use in data attribute
    const src   = (ep._src || '').replace(/'/g, '');
    const epNum = String(ep.ep ?? '');
    return `<div class="hero-slide${i === 0 ? ' active' : ''}">
      <div class="hero-bg" style="background-image:url('${bg}')"></div>
      <div class="hero-vignette"></div>
      ${thumb ? `<img class="hero-cover" src="${thumb}" alt="" loading="${i === 0 ? 'eager' : 'lazy'}">` : ''}
      <div class="hero-new-badge">NEW EPISODE</div>
      <div class="hero-content">
        ${ep.series ? `<div class="hero-series-name">${ep.series}</div>` : ''}
        <div class="hero-ep-title">${ep.title || 'Episode ' + epNum}</div>
        <a class="hero-watch-btn" data-href="${url}" data-src="${src}" data-ep="${epNum}">▶ Watch Now</a>
      </div>
    </div>`;
  }).join('');

  dotsEl.innerHTML = latest.map((_, i) =>
    `<button class="hero-dot${i === 0 ? ' active' : ''}" data-i="${i}"></button>`
  ).join('');

  const slides = slidesEl.querySelectorAll('.hero-slide');
  const dots   = dotsEl.querySelectorAll('.hero-dot');
  let cur = 0, autoT = null;

  const goTo = idx => {
    slides[cur].classList.remove('active'); dots[cur].classList.remove('active');
    cur = (idx + slides.length) % slides.length;
    slides[cur].classList.add('active'); dots[cur].classList.add('active');
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

  /*
   * SHORTLINK HANDLER — mirrors the old working code exactly.
   * Steps:
   *   1. Get the episode JSON file path (data-src = e.g. episode-data/slug-ur-s1.json)
   *   2. Fetch it directly
   *   3. Find the episode by ep number
   *   4. If episode.shortlink exists → redirect there
   *   5. Otherwise → redirect to episode.html URL
   */
  slidesEl.addEventListener('click', async e => {
    const btn = e.target.closest('[data-href]');
    if (!btn) return;
    e.preventDefault();

    const episodeHref = btn.getAttribute('data-href') || '';
    const jsonSrc     = btn.getAttribute('data-src')  || '';  // e.g. episode-data/slug-ur-s1.json
    const epNum       = btn.getAttribute('data-ep')   || '';

    // Show loading state
    const origText = btn.textContent;
    btn.textContent = '⏳ Loading...';

    try {
      if (jsonSrc) {
        const res = await fetch(jsonSrc);
        if (res.ok) {
          const eps   = await res.json();
          const found = (Array.isArray(eps) ? eps : []).find(ep => String(ep.ep) === String(epNum));
          if (found && found.shortlink) {
            if (typeof gtag !== 'undefined') {
              gtag('event', 'shortlink_redirect_home', {
                episode: found.title || 'Episode ' + epNum,
                shortlink_url: found.shortlink
              });
            }
            window.location.href = found.shortlink;
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Shortlink fetch error:', err);
    }

    btn.textContent = origText;
    // No shortlink — go to episode page
    window.location.href = episodeHref;
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
    if (r.ok) schedule = await r.json();
  } catch {}

  if (!Array.isArray(schedule) || !schedule.length) {
    wrap.innerHTML = `<p style="color:var(--muted);padding:12px 4px;font-size:.9rem;text-align:center;">No schedule available.</p>`;
    return;
  }

  wrap.innerHTML = schedule.map((item, i) => {
    const live      = !!item.live;
    const hasDay    = item.day  && item.day  !== false && item.day  !== 'false';
    const hasTime   = item.time && item.time !== false && item.time !== 'false';
    const hasType   = item.type && item.type !== false && item.type !== 'false';
    const hasCount  = item.countdown && item.countdown !== false && item.countdown !== 'false';
    return `
      <div class="sched-card${live ? ' is-live' : ''}" style="animation-delay:${i * 0.07}s">
        ${item.poster ? `<img class="sched-thumb" src="${item.poster}" alt="${item.title||''}" loading="lazy">` : ''}
        <div class="sched-info">
          <div class="sched-title">${item.title || ''}</div>
          <div class="sched-meta">
            ${hasDay  ? `<span class="sched-day">${item.day}</span>` : ''}
            ${(hasDay && (hasTime || hasType)) ? '<span class="sched-dot">•</span>' : ''}
            ${hasTime ? `<span class="sched-day" style="color:var(--blue-lt)">${item.time}</span>` : ''}
            ${hasType ? `${hasTime ? '<span class="sched-dot">•</span>' : ''}<span class="sched-type">${item.type}</span>` : ''}
            ${live    ? `<span class="sched-live">● LIVE</span>` : ''}
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
}

/* ============================================================
   RECOMMENDED
   ============================================================ */
async function initRecommended() {
  const scroll = document.getElementById('rec-scroll');
  if (!scroll) return;

  const series = await seriesReady;
  let slugs = [];
  try { const r = await fetch('recommended.json'); if (r.ok) slugs = await r.json(); } catch {}

  let picks = [];
  if (Array.isArray(slugs) && slugs.length) {
    slugs.slice(0, 5).forEach(slug => { const s = series.find(x => x.slug === slug); if (s) picks.push(s); });
  }
  if (!picks.length) picks = series.slice(0, 5);

  scroll.innerHTML = picks.map((s, i) => `
    <a class="card card-anim" href="series.html?series=${s.slug}" style="flex:0 0 110px;width:110px;min-width:110px;transition-delay:${i*60}ms">
      <img src="${s.poster}" alt="${s.title}" loading="lazy" decoding="async">
      <div class="title">${s.title}</div>
    </a>`).join('');

  setTimeout(() => scroll.querySelectorAll('.card-anim').forEach(c => c.classList.add('visible')), 100);
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

  grid.innerHTML = Array(10).fill('<div class="skeleton"></div>').join('');

  const SERIES = await seriesReady;
  const qs = new URLSearchParams(location.search);
  const state = {
    track: qs.get('track') || localStorage.getItem('track')   || 'dubbed',
    lang:  qs.get('lang')  || localStorage.getItem('subLang') || 'en',
  };

  function setPrimary(track) {
    state.track = track;
    localStorage.setItem('track', track);
    [pillDub, pillSub].forEach(p => { if (!p) return; p.classList.remove('active'); p.setAttribute('aria-pressed','false'); });
    const active = track === 'dubbed' ? pillDub : pillSub;
    active?.classList.add('active'); active?.setAttribute('aria-pressed','true');
    subLangs?.classList.toggle('visible', track === 'sub');
  }

  function setLang(lang) {
    state.lang = lang;
    localStorage.setItem('subLang', lang);
    subLangs?.querySelectorAll('.pill').forEach(b => {
      const on = b.dataset.lang === lang;
      b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on));
    });
  }

  function render() {
    let list = SERIES;
    if (state.track === 'dubbed') list = list.filter(s => s.track === 'dubbed');
    else list = list.filter(s => s.track === 'sub' && s.subLang === state.lang);

    if (!list.length) { grid.innerHTML = `<p style="color:var(--muted);padding:16px 4px;grid-column:1/-1;">No series found.</p>`; return; }

    grid.innerHTML = list.map((s, i) => `
      <a class="card card-anim" href="series.html?series=${s.slug}" style="transition-delay:${Math.min(i*40,400)}ms">
        <img src="${s.poster}" alt="${s.title}" loading="lazy" decoding="async">
        <div class="title">${s.title}</div>
      </a>`).join('');

    // Reveal with IntersectionObserver
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.05, rootMargin: '0px 0px 60px 0px' });
    grid.querySelectorAll('.card-anim').forEach(c => io.observe(c));
    // Force-reveal in-viewport items immediately
    setTimeout(() => {
      grid.querySelectorAll('.card-anim').forEach(c => {
        const r = c.getBoundingClientRect();
        if (r.top < window.innerHeight) c.classList.add('visible');
      });
    }, 80);
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
  const overlay   = document.getElementById('search-overlay');
  const openBtn   = document.getElementById('hdr-search');
  const cancelBtn = document.getElementById('srch-cancel');
  const input     = document.getElementById('srch-input');
  const clearBtn  = document.getElementById('srch-clear');
  const results   = document.getElementById('srch-results');
  const status    = document.getElementById('srch-status');
  if (!overlay || !input) return;

  const SERIES = await seriesReady;

  let _scrollY = 0;
const openOverlay = () => {
  _scrollY = window.scrollY;
  document.documentElement.style.setProperty('--scroll-y', `-${_scrollY}px`);
  document.body.classList.add('search-open');
  overlay.classList.add('open');
  setTimeout(() => input.focus(), 350);
  renderResults('');
};
const closeOverlay = () => {
  overlay.classList.remove('open');
  document.body.classList.remove('search-open');
  window.scrollTo(0, _scrollY);
  input.value = '';
  clearBtn.classList.remove('visible');
  results.innerHTML = '';
  status.textContent = '';
};

  function renderResults(q) {
    const query = q.trim().toLowerCase();
    if (!query) {
      status.textContent = '';
      results.innerHTML = `<div class="srch-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><p>Type to search series…</p></div>`;
      return;
    }
    const list = SERIES.filter(s => (s.title||'').toLowerCase().includes(query));
    status.textContent = list.length ? `Found ${list.length} result${list.length!==1?'s':''} for "${q.trim()}"` : '';
    if (!list.length) {
      results.innerHTML = `<div class="srch-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><p>No results for "<strong>${q.trim()}</strong>"</p></div>`;
      return;
    }
    results.innerHTML = list.map((s, i) => `
      <a class="card" href="series.html?series=${s.slug}"
         style="animation:srchCardIn .3s ${Math.min(i*40,280)}ms both ease;opacity:1;">
        <img src="${s.poster || s.thumb || ''}" alt="${s.title}" loading="lazy" decoding="async"
             onerror="this.style.height='110px';this.style.background='var(--card)'">
        <div class="title">${s.title}</div>
      </a>`).join('');
  }

  openBtn?.addEventListener('click', openOverlay);
  cancelBtn?.addEventListener('click', closeOverlay);
  clearBtn?.addEventListener('click', () => { input.value=''; clearBtn.classList.remove('visible'); input.focus(); renderResults(''); });
  input?.addEventListener('input', e => { clearBtn.classList.toggle('visible', e.target.value.length > 0); renderResults(e.target.value); });
  document.addEventListener('keydown', e => { if (e.key==='Escape' && overlay.classList.contains('open')) closeOverlay(); });
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
});
