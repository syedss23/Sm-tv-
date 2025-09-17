// series.js - works for en, hi, ur, dub with correctly matched file names
(function() {
  const qs = new URLSearchParams(location.search);
  const slug = (qs.get('series') || '').trim();  // MUST MATCH your JSON file prefix

  // Supported languages
  const SUPPORTED = ['dub', 'en', 'hi', 'ur'];
  let lang = (qs.get('lang') || '').toLowerCase();
  if (!SUPPORTED.includes(lang)) lang = 'en';

  function jsonFor(season) {
    return `episode-data/${slug}-s${season}-${lang}.json`;
  }

  function bust(url) {
    const v = (qs.get('v') || '18');
    return url + (url.includes('?') ? '&' : '?') + 'v=' + v;
  }

  function toast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);background:#122231;color:#9fe6ff;padding:10px 14px;border-radius:9px;border:1px solid #2d4b6a;font-weight:700;z-index:9999';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  // Load series meta
  fetch('series.json')
    .then(r => r.json())
    .then(arr => {
      const meta = Array.isArray(arr) ? arr.find(s => s.slug === slug) : null;
      if (!meta) {
        document.getElementById('series-details').innerHTML = `<div style="color:#fff;padding:20px;">Series not found.</div>`;
        return;
      }

      // SEO
      document.title = `${meta.title} – SmTv Urdu`;
      const md = document.querySelector('meta[name="description"]');
      if (md) md.setAttribute('content', `${meta.title} - Watch all episodes of ${meta.title} in Urdu on SmTv Urdu. Turkish historical drama complete series.`);

      // Header
      document.getElementById('series-details').innerHTML = `
        <section class="pro-series-header-pro">
          <a href="index.html" class="pro-series-back-btn-pro" title="Back">
            <svg width="24" height="24" viewBox="0 0 20 20" style="vertical-align: middle;">
              <polyline points="12 4 6 10 12 16" fill="none" stroke="#23c6ed" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></polyline>
            </svg>
          </a>
          <img class="pro-series-poster-pro" src="${meta.poster}" alt="${meta.title}">
          <div class="pro-series-meta-pro">
            <h2 class="pro-series-title-pro">${meta.title}</h2>
            <div class="pro-series-desc-pro">${meta.desc && meta.desc.en ? meta.desc.en : ""}</div>
          </div>
        </section>
        <nav class="pro-seasons-tabs-pro" id="pro-seasons-tabs"></nav>
        <section class="pro-episodes-row-wrap-pro" id="pro-episodes-row-wrap"></section>
      `;

      // Seasons
      let seasons = [];
      if (typeof meta.seasons === 'number') {
        for (let i = 1; i <= meta.seasons; i++) seasons.push(String(i));
      } else if (Array.isArray(meta.seasons)) {
        seasons = meta.seasons.map(s => String(s));
      } else {
        seasons = ['1'];
      }

      // Tabs
      const tabs = document.getElementById('pro-seasons-tabs');
      tabs.innerHTML = seasons.map(s => `<button data-season="${s}" class="pro-season-tab-pro${s == seasons[0] ? ' active' : ''}">Season ${s}</button>`).join('');
      tabs.querySelectorAll('.pro-season-tab-pro').forEach(btn => {
        btn.addEventListener('click', () => {
          tabs.querySelectorAll('.pro-season-tab-pro').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderSeason(btn.dataset.season);
        });
      });

      // Initial
      renderSeason(seasons[0]);

      function renderSeason(season) {
        const url = bust(jsonFor(season));
        fetch(url)
          .then(r => { if (!r.ok) throw new Error(url); return r.json(); })
          .then(episodes => {
            if (!Array.isArray(episodes) || episodes.length === 0) {
              document.getElementById('pro-episodes-row-wrap').innerHTML = `<div style="color:#fff;padding:28px 0 0 0;">No episodes for this season.</div>`;
              return;
            }
            const html = `<div class="pro-episodes-row-pro">` + episodes.map(ep => `
              <a class="pro-episode-card-pro" href="episode.html?series=${slug}&season=${season}&ep=${ep.ep}&lang=${lang}">
                <div class="pro-ep-thumb-wrap-pro">
                  <img src="${ep.thumb || 'default-thumb.jpg'}" class="pro-ep-thumb-pro" alt="Ep ${ep.ep}">
                  <span class="pro-ep-num-pro">Ep ${ep.ep}</span>
                </div>
                <div class="pro-ep-title-pro">${ep.title || ('Episode ' + ep.ep)}</div>
              </a>
            `).join('') + `</div>`;
            document.getElementById('pro-episodes-row-wrap').innerHTML = html;
          })
          .catch(e => {
            document.getElementById('pro-episodes-row-wrap').innerHTML = `<div style="color:#fff;padding:28px 0 0 0;">No episodes for this season.</div>`;
            toast('Missing file: ' + e.message);
          });
      }
    })
    .catch(() => {
      document.getElementById('series-details').innerHTML = `<div style="color:#fff;padding:30px;">Could not load series info. Try again later.</div>`;
    });
})();
