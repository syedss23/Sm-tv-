// --- series.js (strict language via ?lang=dub|en|hi|ur) ---
(function(){
  const params = new URLSearchParams(window.location.search);
  const slug = (params.get('series') || '').trim();
  const lang = (params.get('lang') || '').toLowerCase(); // REQUIRED

  // Enforce explicit language to avoid mismatches
  const LANGS = ['dub','en','hi','ur'];
  function requireLang() {
    if (!LANGS.includes(lang)) {
      const box = document.createElement('div');
      box.style.cssText = 'margin:18px;color:#ffd66b;background:#2a2433;border:1px solid #5a4b77;padding:12px 14px;border-radius:10px;font-weight:600';
      box.textContent = 'Select a language: add ?lang=dub | en | hi | ur to the URL, e.g., ?series=kurulus-osman&lang=en';
      document.getElementById('series-details')?.appendChild(box);
      return false;
    }
    return true;
  }

  function jsonPath(s, l) {
    const suffix = l === 'dub' ? 'dub' : l;    // dubbed uses -dub.json
    return `episode-data/${s}-s{SEASON}-${suffix}.json`;
  }

  function toast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);background:#122231;color:#9fe6ff;padding:10px 14px;border-radius:9px;border:1px solid #2d4b6a;font-weight:700;z-index:9999';
    document.body.appendChild(t);
    setTimeout(()=>t.remove(), 2600);
  }

  // Load series meta
  fetch('series.json')
    .then(r => r.json())
    .then(seriesList => {
      const meta = Array.isArray(seriesList) ? seriesList.find(s => s.slug === slug) : null;
      if (!meta) {
        document.getElementById('series-details').innerHTML = `<div style="color:#fff;padding:20px;">Series not found.</div>`;
        return;
      }

      // SEO
      document.title = `${meta.title} – SmTv Urdu`;
      const metaDescTag = document.querySelector('meta[name="description"]');
      if (metaDescTag) metaDescTag.setAttribute('content', `${meta.title} - Watch all episodes of ${meta.title} in Urdu on SmTv Urdu. Turkish historical drama complete series.`);

      // Header
      const headerHTML = `
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
      document.getElementById('series-details').innerHTML = headerHTML;

      // Seasons
      let seasonNums = [];
      if (typeof meta.seasons === 'number') {
        for (let i = 1; i <= meta.seasons; i++) seasonNums.push(String(i));
      } else if (Array.isArray(meta.seasons)) {
        seasonNums = meta.seasons.map(s => String(s));
      } else {
        seasonNums = ['1'];
      }

      // Tabs
      const tabs = document.getElementById('pro-seasons-tabs');
      tabs.innerHTML = seasonNums.map(season =>
        `<button data-season="${season}" class="pro-season-tab-pro${season == seasonNums[0] ? ' active' : ''}">Season ${season}</button>`
      ).join('');
      tabs.querySelectorAll('.pro-season-tab-pro').forEach(btn => {
        btn.addEventListener('click', () => {
          tabs.querySelectorAll('.pro-season-tab-pro').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderSeason(btn.dataset.season);
        });
      });

      // Require explicit lang once UI exists (shows hint neatly)
      if (!requireLang()) return;

      // Initial render
      renderSeason(seasonNums[0]);

      function renderSeason(season) {
        const url = jsonPath(slug, lang).replace('{SEASON}', season);
        fetch(url)
          .then(r => {
            if (!r.ok) throw new Error(url);
            return r.json();
          })
          .then(episodes => {
            if (!Array.isArray(episodes) || episodes.length === 0) {
              document.getElementById('pro-episodes-row-wrap').innerHTML = `<div style="color:#fff;padding:28px 0 0 0;">No episodes for this season.</div>`;
              return;
            }
            const row = `<div class="pro-episodes-row-pro">` + episodes.map(ep => `
              <a class="pro-episode-card-pro" href="episode.html?series=${slug}&season=${season}&ep=${ep.ep}&lang=${lang}">
                <div class="pro-ep-thumb-wrap-pro">
                  <img src="${ep.thumb || 'default-thumb.jpg'}" class="pro-ep-thumb-pro" alt="Ep ${ep.ep}">
                  <span class="pro-ep-num-pro">Ep ${ep.ep}</span>
                </div>
                <div class="pro-ep-title-pro">${ep.title ? ep.title : 'Episode ' + ep.ep}</div>
              </a>
            `).join('') + `</div>`;
            document.getElementById('pro-episodes-row-wrap').innerHTML = row;
          })
          .catch((e) => {
            document.getElementById('pro-episodes-row-wrap').innerHTML = `<div style="color:#fff;padding:28px 0 0 0;">No episodes for this season.</div>`;
            toast('Missing file: ' + e.message); // shows which path failed
          });
      }
    })
    .catch(() => {
      document.getElementById('series-details').innerHTML = `<div style="color:#fff;padding:30px;">Could not load series info. Try again later.</div>`;
    });
})();
