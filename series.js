// series.js - STABLE FINAL VERSION (FIXED EVERYTHING)
(function () {
  'use strict';

  const qs = new URLSearchParams(location.search);
  const slug = (qs.get('series') || '').trim();
  const lang = (qs.get('lang') || '').toLowerCase();
  const seasonQuery = qs.get('season') || '1';

  let currentSource = 1;

  // ✅ Default config (prevents blank screen)
  let featureConfig = { shortlink: false, sponsorPopup: true };

  let currentEpisodesData = [];

  // ================= CONFIG =================
  async function loadFeatureConfig() {
    try {
      const res = await fetch('config.json', { cache: 'no-cache' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.redirectionFeatures) {
          featureConfig = data.redirectionFeatures;
        }
      }
      console.log("Config:", featureConfig);
    } catch (e) {
      console.warn("Using default config");
    }
  }

  // ================= TOAST =================
  function toast(msg) {
    try {
      const t = document.createElement('div');
      t.textContent = msg;

      t.style.cssText = `
        position:fixed;left:50%;bottom:18px;
        transform:translateX(-50%);
        background:#122231;color:#9fe6ff;
        padding:10px 14px;border-radius:9px;
        border:1px solid #2d4b6a;font-weight:700;
        z-index:99999;font-family:Montserrat,sans-serif;
        opacity:1;transition:opacity .3s;
      `;

      document.body.appendChild(t);

      setTimeout(() => {
        t.style.opacity = "0";
        setTimeout(() => {
          if (t.parentNode) t.parentNode.removeChild(t);
        }, 300);
      }, 2300);

    } catch (e) {
      console.error(e);
    }
  }

  // ================= FETCH WITH FALLBACK =================
  async function fetchEpisodes(season) {
    const files = [
      `episode-data/${slug}-${lang}-sub-s${season}.json`,
      `episode-data/${slug}-s${season}.json`,
      `episode-data/${slug}-s${season}-${lang}.json`,
      `episode-data/${slug}-s${season}-en.json`,
      `episode-data/${slug}-s${season}-hi.json`,
      `episode-data/${slug}-s${season}-ur.json`
    ];

    for (const file of files) {
      try {
        console.log("Trying:", file);

        const res = await fetch(file, { cache: 'no-cache' });
        if (!res.ok) continue;

        const text = await res.text();

        try {
          return JSON.parse(text);
        } catch (e) {
          console.error("JSON error:", file);
        }

      } catch (e) {
        console.warn("Fetch failed:", file);
      }
    }

    throw new Error("No episode file found");
  }

  // ================= CLICK HANDLER =================
  function handleEpisodeClick(e, data) {
    e.preventDefault();

    const { seriesSlug, season, episode, lang, source } = data;

    // ✅ Shortlink priority
    if (featureConfig.shortlink) {

      const ep = currentEpisodesData.find(
        x => Number(x.ep) === Number(episode)
      );

      if (ep && ep.shortlink && /^https?:\/\//.test(ep.shortlink)) {
        window.location.href = ep.shortlink;
        return;
      }
    }

    // fallback
    let url = `episode.html?series=${seriesSlug}&season=${season}&ep=${episode}`;

    if (lang) url += `&lang=${lang}`;
    if (source) url += `&source=${source}`;

    window.location.href = url;
  }

  // ================= INIT =================
  (async function init() {

    await loadFeatureConfig();

    // wait DOM
    if (document.readyState !== 'complete') {
      await new Promise(r => window.addEventListener('load', r, { once: true }));
    }

    const wrap = document.getElementById('pro-episodes-row-wrap');

    // ❌ CRITICAL FIX
    if (!wrap) {
      console.error("Missing #pro-episodes-row-wrap in HTML");
      return;
    }

    if (!slug) {
      wrap.innerHTML = `<div style="color:#fff">No series selected</div>`;
      return;
    }

    try {
      const episodes = await fetchEpisodes(seasonQuery);

      currentEpisodesData = episodes;

      if (!Array.isArray(episodes) || episodes.length === 0) {
        wrap.innerHTML = `<div style="color:#fff">No episodes found</div>`;
        return;
      }

      wrap.innerHTML = episodes.map(ep => {
        const num = ep.ep;
        const title = ep.title || `Episode ${num}`;
        const thumb = ep.thumb || 'fallback.jpg';

        return `
          <a class="pro-episode-card-pro"
             href="#"
             data-series="${slug}"
             data-season="${seasonQuery}"
             data-episode="${num}"
             data-lang="${lang}"
             data-source="${currentSource}">
             
            <img src="${thumb}" 
                 style="width:100%;height:120px;object-fit:cover;">
                 
            <div style="padding:6px">${title}</div>
          </a>
        `;
      }).join('');

      // attach click
      wrap.querySelectorAll('.pro-episode-card-pro').forEach(el => {
        el.addEventListener('click', function (e) {
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

      wrap.innerHTML = `
        <div style="color:#ff6b6b;padding:20px">
          ⚠️ Failed to load episodes<br>
          Check JSON file path
        </div>
      `;
    }

  })();

})();
