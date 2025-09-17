// --- series.js (language-aware: dub | en | hi | ur) ---
(function(){
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('series');

  // 1) Determine active language reliably
  function getActiveLang() {
    // a) URL has highest priority
    const qs = (params.get('lang') || '').toLowerCase();
    if (['dub','en','hi','ur'].includes(qs)) return qs;

    // b) Infer from visible title text if present
    const titleText = (document.querySelector('.pro-series-title-pro')?.textContent || '').toLowerCase();
    if (titleText.includes('dub'))   return 'dub';
    if (titleText.includes('hindi')) return 'hi';
    if (titleText.includes('urdu'))  return 'ur';
    if (titleText.includes('english')) return 'en';

    // c) Default to English subs
    return 'en';
  }

  // 2) Build the correct episode JSON path
  function getEpisodeFile(slug, season) {
    const lang = getActiveLang();
    const suffix = lang === 'dub' ? 'dub' : lang; // dubbed uses -dub.json
    return `episode-data/${slug}-s${season}-${suffix}.json`;
  }

  // 3) Load series meta
  fetch('series.json')
    .then(r => r.json())
    .then(seriesList => {
      const meta = Array.isArray(seriesList) ? seriesList.find(s => s.slug === slug) : null;
      if (!meta) {
        document.getElementById('series-details').innerHTML = `<div style="color:#fff;">Series not found.</div>`;
        return;
      }

      // SEO
      document.title = `${meta.title} – SmTv Urdu`;
      const metaDescTag = document.querySelector('meta[name="description"]');
      if (metaDescTag) {
        metaDescTag.setAttribute('content', `${meta.title} - Watch all episodes of ${meta.title} in Urdu on SmTv Urdu. Turkish historical drama complete series.`);
      }

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

      // Season tabs
      const tabs = document.getElementById('pro-seasons-tabs');
      tabs.innerHTML = seasonNums.map(season =>
        `<button data-season="${season}" class="pro-season-tab-pro${season == seasonNums[0] ? ' active' : ''}">Season ${season}</button>`
      ).join('');

      tabs.querySelectorAll('.pro-season-tab-pro').forEach(btn => {
        btn.addEventListener('click', () => {
          tabs.querySelectorAll('.pro-season-tab-pro').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderProEpisodesRow(btn.dataset.season);
        });
      });

      // Initial render
      renderProEpisodesRow(seasonNums[0]);

      // 4) Render episodes
      function renderProEpisodesRow(seasonNumber) {
        const url = getEpisodeFile(slug, seasonNumber);
        fetch(url)
          .then(r => {
            if (!r.ok) throw new Error('File not found');
            return r.json();
          })
          .then(episodes => {
            let rowHTML = '';
            if (!Array.isArray(episodes) || episodes.length === 0) {
              rowHTML = `<div style="color:#fff;padding:28px 0 0 0;">No episodes for this season.</div>`;
            } else {
              rowHTML = `<div class="pro-episodes-row-pro">` + episodes.map(ep => `
                <a class="pro-episode-card-pro" href="episode.html?series=${slug}&season=${seasonNumber}&ep=${ep.ep}">
                  <div class="pro-ep-thumb-wrap-pro">
                    <img src="${ep.thumb || 'default-thumb.jpg'}" class="pro-ep-thumb-pro" alt="Ep ${ep.ep}">
                    <span class="pro-ep-num-pro">Ep ${ep.ep}</span>
                  </div>
                  <div class="pro-ep-title-pro">${ep.title ? ep.title : 'Episode ' + ep.ep}</div>
                </a>
              `).join('') + `</div>`;
            }
            document.getElementById('pro-episodes-row-wrap').innerHTML = rowHTML;
          })
          .catch(() => {
            document.getElementById('pro-episodes-row-wrap').innerHTML =
              `<div style="color:#fff;padding:28px 0 0 0;">No episodes for this season.</div>`;
          });
      }
    })
    .catch(() => {
      document.getElementById('series-details').innerHTML =
        `<div style="color:#fff;padding:30px;">Could not load series info. Try again later.</div>`;
    });
})();
