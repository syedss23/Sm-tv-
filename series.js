// series.js - FULLY FIXED & OPTIMIZED VERSION
(function () {
  'use strict';

  const qs = new URLSearchParams(location.search);
  const slug = (qs.get('series') || '').trim();
  const lang = (qs.get('lang') || '').toLowerCase();
  const seasonQuery = qs.get('season') || '1';

  let currentSource = 1;

  // ✅ Default config (prevents race condition)
  let featureConfig = { shortlink: false, sponsorPopup: true };

  let currentEpisodesData = [];

  const HOWTO_PROCESS_1 = `<iframe class="rumble" src="https://rumble.com/embed/v6yg45g/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;
  const HOWTO_PROCESS_2 = `<iframe class="rumble" src="https://rumble.com/embed/v6yg466/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;

  // ================= CONFIG =================
  async function loadFeatureConfig() {
    try {
      const response = await fetch('/config.json', { cache: 'no-cache' });
      if (response.ok) {
        const config = await response.json();
        if (config && config.redirectionFeatures) {
          featureConfig = config.redirectionFeatures;
        }
      }
      console.log('Feature config:', featureConfig);
    } catch (error) {
      console.warn('Config load failed, using default:', featureConfig);
    }
  }

  // ================= TOAST (FIXED) =================
  function toast(msg) {
    try {
      const t = document.createElement('div');
      t.textContent = msg;

      t.style.cssText = `
        position:fixed;
        left:50%;
        bottom:18px;
        transform:translateX(-50%);
        background:#122231;
        color:#9fe6ff;
        padding:10px 14px;
        border-radius:9px;
        border:1px solid #2d4b6a;
        font-weight:700;
        z-index:99999;
        font-family:Montserrat,sans-serif;
        opacity:1;
        transition:opacity .3s ease;
      `;

      document.body.appendChild(t);

      setTimeout(() => {
        t.style.opacity = "0";
        setTimeout(() => {
          if (t.parentNode) t.parentNode.removeChild(t);
        }, 300);
      }, 2300);

    } catch (e) {
      console.error('Toast error:', e);
    }
  }

  // ================= SHORTLINK + NAVIGATION =================
  function handleEpisodeClick(event, episodeData) {
    event.preventDefault();

    const { seriesSlug, season, episode, lang, source } = episodeData;

    // ✅ FIXED: Always prioritize shortlink if enabled
    if (featureConfig.shortlink) {

      const episodeObj = currentEpisodesData.find(
        ep => Number(ep.ep) === Number(episode)
      );

      if (episodeObj && episodeObj.shortlink) {

        // ✅ SECURITY CHECK
        if (!/^https?:\/\//.test(episodeObj.shortlink)) {
          console.warn('Blocked invalid shortlink:', episodeObj.shortlink);
        } else {

          console.log('Redirecting to shortlink:', episodeObj.shortlink);

          if (typeof gtag !== 'undefined') {
            gtag('event', 'shortlink_redirect', {
              episode: `${seriesSlug}_s${season}e${episode}`
            });
          }

          window.location.href = episodeObj.shortlink;
          return;
        }
      }
    }

    // ================= FALLBACK: NORMAL PAGE =================
    let url = `episode.html?series=${encodeURIComponent(seriesSlug)}&season=${encodeURIComponent(season)}&ep=${encodeURIComponent(episode)}`;

    if (lang) url += '&lang=' + encodeURIComponent(lang);
    if (source) url += '&source=' + encodeURIComponent(source);

    if (typeof gtag !== 'undefined') {
      gtag('event', 'episode_page_visit', {
        episode: `${seriesSlug}_s${season}e${episode}`
      });
    }

    window.location.href = url;
  }

  // ================= UTILS =================
  function bust(url) {
    const v = (qs.get('v') || '1');
    return url + (url.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(v);
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"'`=/]/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;' }[c])
    );
  }

  // ================= FETCH =================
  async function fetchEpisodes(season) {
    const file = `/episode-data/${slug}-s${season}.json`;
    const res = await fetch(bust(file), { cache: 'no-cache' });

    if (!res.ok) throw new Error('Episode file not found');

    const data = await res.json();
    return data;
  }

  // ================= INIT =================
  (async function init() {

    await loadFeatureConfig();

    if (document.readyState !== 'complete') {
      await new Promise(r => window.addEventListener('load', r, { once: true }));
    }

    const wrap = document.getElementById('pro-episodes-row-wrap');
    if (!wrap) return;

    try {

      const episodes = await fetchEpisodes(seasonQuery);
      currentEpisodesData = episodes;

      if (!Array.isArray(episodes) || !episodes.length) {
        wrap.innerHTML = `<div style="color:#fff;">No episodes</div>`;
        return;
      }

      wrap.innerHTML = episodes.map(ep => {
        const epNum = escapeHtml(ep.ep);
        const title = escapeHtml(ep.title || `Episode ${epNum}`);
        const thumb = escapeHtml(ep.thumb || 'fallback.jpg');

        return `
          <a class="pro-episode-card-pro"
            href="#"
            data-series="${slug}"
            data-season="${seasonQuery}"
            data-episode="${epNum}"
            data-lang="${lang}"
            data-source="${currentSource}">
            
            <img src="${thumb}" alt="${title}">
            <div>${title}</div>
          </a>
        `;
      }).join('');

      // attach click
      wrap.querySelectorAll('.pro-episode-card-pro').forEach(card => {
        card.addEventListener('click', function (e) {
          handleEpisodeClick(e, {
            seriesSlug: this.dataset.series,
            season: this.dataset.season,
            episode: this.dataset.episode,
            lang: this.dataset.lang,
            source: this.dataset.source ? Number(this.dataset.source) : null
          });
        });
      });

    } catch (err) {
      console.error(err);
      wrap.innerHTML = `<div style="color:red;">Error loading episodes</div>`;
    }

  })();

})();
